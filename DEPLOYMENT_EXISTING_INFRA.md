# Deployment with Existing Infrastructure

Deploy to your existing Proxmox setup using your current MySQL and Nginx servers.

## Your Current Infrastructure

Based on your ONBOARDING.md, you have:
- ✅ **Proxmox hypervisor** running
- ✅ **MySQL 8.0+** server (existing)
- ✅ **Nginx** reverse proxy (existing, with SSL)
- ✅ **Domain** configured with SSL certificate

## What We'll Create

**New LXC Containers Only:**

```
Your Proxmox
│
├── [EXISTING] MySQL Server (192.168.x.x)
│   └── We'll create new database: messaging_platform
│
├── [EXISTING] Nginx Proxy (192.168.x.x or same as MySQL)
│   └── We'll add new virtual host
│
├── [NEW] LXC: messaging-telegram
│   ├── Python 3.11 + Telethon
│   ├── Port: 8001
│   └── IP: 192.168.x.11 (adjust to your network)
│
├── [NEW] LXC: messaging-whatsapp
│   ├── Node.js 18 + Baileys
│   ├── Port: 8002
│   └── IP: 192.168.x.12 (adjust to your network)
│
└── [NEW] LXC: messaging-api
    ├── Node.js 18 + Express (API Gateway)
    ├── React build (static frontend)
    ├── Port: 3000
    └── IP: 192.168.x.13 (adjust to your network)
```

## Prerequisites

Before starting, gather this information:

```bash
# Your existing MySQL server
MYSQL_HOST=192.168.x.x  # Your MySQL server IP
MYSQL_PORT=3306
MYSQL_ROOT_PASSWORD=your_root_password

# Your existing Nginx server
NGINX_HOST=192.168.x.x  # Your Nginx server IP (may be same as MySQL)

# Your domain
DOMAIN=messages.yourdomain.com  # Your domain

# Your network
NETWORK_SUBNET=192.168.x.0/24
GATEWAY=192.168.x.1

# Telegram API (from https://my.telegram.org)
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash
```

## Step-by-Step Deployment

### 1. Prepare Existing MySQL Database

SSH to your existing MySQL server:

```bash
# Connect to your MySQL server
ssh root@192.168.x.x  # Your MySQL server IP

# Login to MySQL
mysql -u root -p
```

Run these SQL commands:

```sql
-- Create database
CREATE DATABASE messaging_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user (allow connections from new LXC containers)
CREATE USER 'msgplatform'@'%' IDENTIFIED BY 'YourSecurePassword123!';
GRANT ALL PRIVILEGES ON messaging_platform.* TO 'msgplatform'@'%';
FLUSH PRIVILEGES;

-- Verify
SHOW DATABASES LIKE 'messaging%';
SELECT user, host FROM mysql.user WHERE user = 'msgplatform';
EXIT;
```

**Import schema:**

```bash
# Download schema to MySQL server
cd /tmp
wget https://raw.githubusercontent.com/dominggo/multi-account-multi-platform/master/database/schema.sql

# Or copy from your repo
# scp database/schema.sql root@192.168.x.x:/tmp/

# Import schema
mysql -u msgplatform -p messaging_platform < /tmp/schema.sql

# Verify tables created
mysql -u msgplatform -p -e "USE messaging_platform; SHOW TABLES;"
```

**Configure MySQL to accept remote connections (if not already):**

```bash
# Edit MySQL config
nano /etc/mysql/mysql.conf.d/mysqld.cnf

# Find and change:
# bind-address = 127.0.0.1
# TO:
bind-address = 0.0.0.0

# Restart MySQL
systemctl restart mysql

# Verify MySQL is listening on all interfaces
netstat -tlnp | grep 3306
```

**Configure firewall (if using):**

```bash
# Allow connections from new LXC containers
# Add to your firewall rules (adjust IPs to your network)
ufw allow from 192.168.x.11 to any port 3306  # Telegram backend
ufw allow from 192.168.x.12 to any port 3306  # WhatsApp backend
ufw allow from 192.168.x.13 to any port 3306  # API Gateway
```

---

### 2. Create LXC Container: Telegram Backend

**In Proxmox web UI or CLI:**

```bash
# Adjust CT ID (101), IPs, and storage to match your setup
pct create 101 local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst \
  --hostname messaging-telegram \
  --memory 1024 \
  --cores 2 \
  --net0 name=eth0,bridge=vmbr0,ip=192.168.x.11/24,gw=192.168.x.1 \
  --storage local-lvm \
  --rootfs local-lvm:8 \
  --unprivileged 1 \
  --features nesting=1

# Start container
pct start 101

# Enter container
pct enter 101
```

**Inside container (101 - Telegram):**

```bash
# Update system
apt update && apt upgrade -y

# Install Python 3.11
apt install software-properties-common -y
add-apt-repository ppa:deadsnakes/ppa -y
apt update
apt install python3.11 python3.11-venv python3-pip git -y

# Create app directory
mkdir -p /opt/messaging-platform/telegram
cd /opt/messaging-platform/telegram

# Clone your repo (or copy files)
git clone https://github.com/dominggo/multi-account-multi-platform.git /tmp/repo
cp -r /tmp/repo/backend-telegram/* .

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Create .env file
cat > .env <<EOF
# Telegram API
TELEGRAM_API_ID=${TELEGRAM_API_ID}
TELEGRAM_API_HASH=${TELEGRAM_API_HASH}

# Database (your existing MySQL)
DB_HOST=192.168.x.x
DB_PORT=3306
DB_NAME=messaging_platform
DB_USER=msgplatform
DB_PASSWORD=YourSecurePassword123!

# Server
HOST=0.0.0.0
PORT=8001
DEBUG=False

# Session Storage
SESSION_DIR=/opt/messaging-platform/telegram/sessions

# Logging
LOG_LEVEL=INFO
LOG_FILE=/opt/messaging-platform/telegram/logs/telegram-backend.log

# API Security
API_SECRET_KEY=$(openssl rand -base64 32)
ALLOWED_ORIGINS=http://192.168.x.13:3000,https://${DOMAIN}
EOF

# Create directories
mkdir -p sessions logs

# Test connection to MySQL
python3.11 << PYEOF
import mysql.connector
try:
    conn = mysql.connector.connect(
        host='192.168.x.x',
        port=3306,
        user='msgplatform',
        password='YourSecurePassword123!',
        database='messaging_platform'
    )
    print("✅ MySQL connection successful!")
    conn.close()
except Exception as e:
    print(f"❌ MySQL connection failed: {e}")
PYEOF

# Create systemd service
cat > /etc/systemd/system/telegram-backend.service <<EOF
[Unit]
Description=Telegram Backend Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/messaging-platform/telegram
Environment="PATH=/opt/messaging-platform/telegram/venv/bin"
ExecStart=/opt/messaging-platform/telegram/venv/bin/python main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
systemctl daemon-reload
systemctl enable telegram-backend
systemctl start telegram-backend

# Check status
systemctl status telegram-backend

# Check logs
journalctl -u telegram-backend -f
# Press Ctrl+C to exit

# Test API
curl http://localhost:8001/
# Should return: {"service": "Telegram Backend", "status": "running", ...}

# Exit container
exit
```

---

### 3. Create LXC Container: WhatsApp Backend

**In Proxmox:**

```bash
# Create container
pct create 102 local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst \
  --hostname messaging-whatsapp \
  --memory 1024 \
  --cores 2 \
  --net0 name=eth0,bridge=vmbr0,ip=192.168.x.12/24,gw=192.168.x.1 \
  --storage local-lvm \
  --rootfs local-lvm:8 \
  --unprivileged 1 \
  --features nesting=1

pct start 102
pct enter 102
```

**Inside container (102 - WhatsApp):**

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install nodejs git -y

# Verify
node --version  # Should be v18.x
npm --version

# Create app directory
mkdir -p /opt/messaging-platform/whatsapp
cd /opt/messaging-platform/whatsapp

# Clone your repo
git clone https://github.com/dominggo/multi-account-multi-platform.git /tmp/repo
cp -r /tmp/repo/backend-whatsapp/* .

# Install dependencies
npm install

# Create .env file
cat > .env <<EOF
# Server
HOST=0.0.0.0
PORT=8002
NODE_ENV=production

# Database (your existing MySQL)
DB_HOST=192.168.x.x
DB_PORT=3306
DB_NAME=messaging_platform
DB_USER=msgplatform
DB_PASSWORD=YourSecurePassword123!

# Session Storage
SESSION_DIR=/opt/messaging-platform/whatsapp/sessions

# API Security
API_SECRET_KEY=$(openssl rand -base64 32)
ALLOWED_ORIGINS=http://192.168.x.13:3000,https://${DOMAIN}

# Logging
LOG_LEVEL=info
LOG_FILE=/opt/messaging-platform/whatsapp/logs/whatsapp-backend.log

# WhatsApp Configuration
WA_DEFAULT_TIMEOUT=60000
WA_RECONNECT_INTERVAL=5000
WA_MAX_RECONNECT_ATTEMPTS=10
EOF

# Create directories
mkdir -p sessions logs

# Build TypeScript
npm run build

# Test MySQL connection
node << NODEOF
const mysql = require('mysql2/promise');
(async () => {
  try {
    const conn = await mysql.createConnection({
      host: '192.168.x.x',
      port: 3306,
      user: 'msgplatform',
      password: 'YourSecurePassword123!',
      database: 'messaging_platform'
    });
    console.log('✅ MySQL connection successful!');
    await conn.end();
  } catch (err) {
    console.log('❌ MySQL connection failed:', err.message);
  }
})();
NODEOF

# Install PM2
npm install -g pm2

# Start service with PM2
pm2 start dist/index.js --name whatsapp-backend

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Run the command that PM2 outputs

# Check status
pm2 status
pm2 logs whatsapp-backend

# Test API
curl http://localhost:8002/
# Should return: {"service": "WhatsApp Backend", "status": "running", ...}

# Exit container
exit
```

---

### 4. Create LXC Container: API Gateway + Frontend

**In Proxmox:**

```bash
# Create container
pct create 103 local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst \
  --hostname messaging-api \
  --memory 2048 \
  --cores 2 \
  --net0 name=eth0,bridge=vmbr0,ip=192.168.x.13/24,gw=192.168.x.1 \
  --storage local-lvm \
  --rootfs local-lvm:10 \
  --unprivileged 1 \
  --features nesting=1

pct start 103
pct enter 103
```

**Inside container (103 - API Gateway):**

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install nodejs git -y

# Verify
node --version
npm --version

# Create directories
mkdir -p /opt/messaging-platform/api
mkdir -p /opt/messaging-platform/frontend-build

# === Setup API Gateway ===
cd /opt/messaging-platform/api

# Clone your repo
git clone https://github.com/dominggo/multi-account-multi-platform.git /tmp/repo
cp -r /tmp/repo/backend-api/* .

# Install dependencies
npm install

# Create .env file
cat > .env <<EOF
# Server
HOST=0.0.0.0
PORT=3000
NODE_ENV=production

# Database (your existing MySQL)
DB_HOST=192.168.x.x
DB_PORT=3306
DB_NAME=messaging_platform
DB_USER=msgplatform
DB_PASSWORD=YourSecurePassword123!

# JWT Configuration
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRES_IN=7d

# Session Configuration
SESSION_SECRET=$(openssl rand -base64 32)
SESSION_MAX_AGE=1800000

# CORS
ALLOWED_ORIGINS=https://${DOMAIN},http://192.168.x.13:3000

# Backend Services (point to new LXC containers)
TELEGRAM_API_URL=http://192.168.x.11:8001
WHATSAPP_API_URL=http://192.168.x.12:8002

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE=/opt/messaging-platform/api/logs/api-gateway.log

# Security
BCRYPT_ROUNDS=10
EOF

# Create logs directory
mkdir -p logs

# Build TypeScript
npm run build

# Test MySQL connection
node << NODEOF
const mysql = require('mysql2/promise');
(async () => {
  try {
    const conn = await mysql.createConnection({
      host: '192.168.x.x',
      port: 3306,
      user: 'msgplatform',
      password: 'YourSecurePassword123!',
      database: 'messaging_platform'
    });
    console.log('✅ MySQL connection successful!');
    await conn.end();
  } catch (err) {
    console.log('❌ MySQL connection failed:', err.message);
  }
})();
NODEOF

# Install PM2
npm install -g pm2

# Start API Gateway
pm2 start dist/index.js --name api-gateway
pm2 save
pm2 startup
# Run the command that PM2 outputs

# Check status
pm2 status
pm2 logs api-gateway

# Test API
curl http://localhost:3000/
# Should return: {"service": "Multi-Account Messaging Platform API", ...}

# === Setup Frontend ===
cd /opt/messaging-platform

# Copy frontend files
cp -r /tmp/repo/frontend .
cd frontend

# Install dependencies
npm install

# Create production .env
cat > .env.production <<EOF
VITE_API_URL=https://${DOMAIN}/api
VITE_WS_URL=wss://${DOMAIN}
EOF

# Build frontend
npm run build

# Copy build files to serve directory
cp -r dist/* /opt/messaging-platform/frontend-build/

# List files
ls -la /opt/messaging-platform/frontend-build/

# Exit container
exit
```

---

### 5. Configure Your Existing Nginx

SSH to your existing Nginx server:

```bash
ssh root@192.168.x.x  # Your Nginx server IP
```

**Create new virtual host:**

```bash
# Create nginx configuration
nano /etc/nginx/sites-available/messaging
```

**Add this configuration:**

```nginx
# Upstream backends
upstream api_backend {
    server 192.168.x.13:3000;  # API Gateway LXC
    keepalive 64;
}

upstream telegram_backend {
    server 192.168.x.11:8001;  # Telegram LXC
    keepalive 32;
}

upstream whatsapp_backend {
    server 192.168.x.12:8002;  # WhatsApp LXC
    keepalive 32;
}

# HTTP -> HTTPS redirect
server {
    listen 80;
    server_name messages.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# Main HTTPS server
server {
    listen 443 ssl http2;
    server_name messages.yourdomain.com;

    # SSL certificates (using your existing SSL setup)
    ssl_certificate /etc/letsencrypt/live/messages.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/messages.yourdomain.com/privkey.pem;

    # SSL configuration (use your existing SSL settings)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Logging
    access_log /var/log/nginx/messaging-access.log;
    error_log /var/log/nginx/messaging-error.log;

    # Frontend (React SPA) - served from API Gateway LXC
    location / {
        # Serve static files via NFS/SSHFS mount OR proxy to API container
        # Option 1: Direct file serving (if you mount the directory)
        root /mnt/messaging-frontend;  # Mount from LXC 103
        try_files $uri $uri/ /index.html;

        # Option 2: Proxy to a simple static file server (easier)
        # proxy_pass http://192.168.x.13:8080;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API Gateway
    location /api {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket support
    location /socket.io {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Direct backend access (optional, for debugging)
    location /direct/telegram {
        proxy_pass http://telegram_backend;
        # Add authentication here in production
    }

    location /direct/whatsapp {
        proxy_pass http://whatsapp_backend;
        # Add authentication here in production
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Client max body size (for file uploads)
    client_max_body_size 50M;
}
```

**Serve frontend files (choose one method):**

**Option A: Mount frontend directory via NFS/SSHFS (recommended):**

```bash
# Install sshfs
apt install sshfs -y

# Create mount point
mkdir -p /mnt/messaging-frontend

# Mount from API LXC
sshfs root@192.168.x.13:/opt/messaging-platform/frontend-build /mnt/messaging-frontend

# Add to /etc/fstab for automatic mounting
echo "root@192.168.x.13:/opt/messaging-platform/frontend-build /mnt/messaging-frontend fuse.sshfs defaults,_netdev,allow_other 0 0" >> /etc/fstab
```

**Option B: Copy files manually (simpler but needs updates):**

```bash
# Create directory
mkdir -p /var/www/messaging

# Copy from API LXC
scp -r root@192.168.x.13:/opt/messaging-platform/frontend-build/* /var/www/messaging/

# Update nginx config to use /var/www/messaging instead
```

**Enable site:**

```bash
# Enable the site
ln -s /etc/nginx/sites-available/messaging /etc/nginx/sites-enabled/

# Test nginx configuration
nginx -t

# If OK, reload nginx
systemctl reload nginx
```

**Get SSL certificate (if domain is new):**

```bash
# If you don't have SSL for this domain yet
certbot --nginx -d messages.yourdomain.com

# Or renew existing
certbot renew
```

---

### 6. Verify Everything Works

**Test from your workstation:**

```bash
# Test each backend directly
curl http://192.168.x.11:8001/  # Telegram
curl http://192.168.x.12:8002/  # WhatsApp
curl http://192.168.x.13:3000/  # API Gateway

# Test via Nginx (from outside your network if port forwarded)
curl https://messages.yourdomain.com/api/

# Open in browser
https://messages.yourdomain.com
```

**Expected results:**
- ✅ All curl commands return JSON with `"status": "running"`
- ✅ Website loads in browser
- ✅ No console errors in browser devtools

---

## Network Diagram

```
Internet
    │
    ├─► Port 443 (forwarded)
    │
    ▼
[Existing Nginx] 192.168.x.x
    │
    ├─► proxy /api/* ──────────► [LXC 103] API Gateway (192.168.x.13:3000)
    │                               │
    │                               ├─► [LXC 101] Telegram (192.168.x.11:8001)
    │                               ├─► [LXC 102] WhatsApp (192.168.x.12:8002)
    │                               └─► [Existing MySQL] (192.168.x.x:3306)
    │
    └─► serve / ────────────────► [Static Files] from LXC 103
```

---

## Resource Usage

| Component | RAM | CPU | Storage | IP |
|-----------|-----|-----|---------|------|
| Telegram LXC | 1 GB | 2 | 8 GB | 192.168.x.11 |
| WhatsApp LXC | 1 GB | 2 | 8 GB | 192.168.x.12 |
| API LXC | 2 GB | 2 | 10 GB | 192.168.x.13 |
| **Total NEW** | **4 GB** | **6 cores** | **26 GB** | |
| Existing MySQL | 0 | 0 | +2 GB | 192.168.x.x |
| Existing Nginx | 0 | 0 | 0 | 192.168.x.x |

---

## Maintenance

### Update a service

```bash
# Update Telegram backend
pct enter 101
cd /opt/messaging-platform/telegram
git pull
source venv/bin/activate
pip install -r requirements.txt
systemctl restart telegram-backend
exit

# Update WhatsApp backend
pct enter 102
cd /opt/messaging-platform/whatsapp
git pull
npm install
npm run build
pm2 restart whatsapp-backend
exit

# Update API Gateway
pct enter 103
cd /opt/messaging-platform/api
git pull
npm install
npm run build
pm2 restart api-gateway
exit

# Update Frontend
pct enter 103
cd /opt/messaging-platform/frontend
git pull
npm install
npm run build
cp -r dist/* /opt/messaging-platform/frontend-build/
exit
```

### Check logs

```bash
# Telegram
pct enter 101
journalctl -u telegram-backend -f

# WhatsApp
pct enter 102
pm2 logs whatsapp-backend

# API Gateway
pct enter 103
pm2 logs api-gateway

# Nginx
ssh root@nginx-server
tail -f /var/log/nginx/messaging-error.log
```

### Backup

```bash
# Proxmox backups (use Proxmox web UI)
# Backup containers: 101, 102, 103

# Database backup (on MySQL server)
mysqldump -u msgplatform -p messaging_platform > /backup/messaging_$(date +%Y%m%d).sql
```

---

## Summary

**What you now have:**

1. ✅ **3 new LXC containers** (Telegram, WhatsApp, API)
2. ✅ **Using your existing MySQL** (just added new database)
3. ✅ **Using your existing Nginx** (just added new virtual host)
4. ✅ **All services isolated** but working together
5. ✅ **Easy to maintain** each service independently

**Next steps:**

1. Add your first Telegram account via API
2. Add your first WhatsApp account via QR code
3. Test message sending/receiving
4. Configure keep-alive system
5. Build out the full web UI

This setup gives you **maximum efficiency** by reusing existing infrastructure while keeping new services isolated in LXC containers!
