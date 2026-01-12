# Proxmox Deployment Guide - Multi-Account Messaging Platform

Deploy to your **existing proxmox_t730** infrastructure using existing MySQL and Nginx.

## Your Infrastructure Overview

Based on your `allhost.md`:

**Host: proxmox_t730 (Primary 24/7)**
- **IP:** 192.168.5.15
- **RAM:** 6.7GB (5.25GB allocated = 78%)
- **CPU:** AMD RX-427BB (4C/4T @ ~2.7GHz)
- **Storage:** 473GB ZFS (72GB used)
- **Existing LXCs:** 105-110, 112 (7 containers)
- **Network:** 192.168.5.0/24, Gateway 192.168.5.1

**Existing Services You'll Use:**
- **LXC 106** (webserver): 192.168.5.17 - Nginx + PHP + Samba
- **LXC 107** (mariadb): 192.168.5.20 - MariaDB 10.11

## Proposed Architecture

```
proxmox_t730 (192.168.5.15)
│
├── [EXISTING] LXC 106 - Nginx Webserver
│   ├── IP: 192.168.5.17
│   ├── Nginx reverse proxy (Port 80/443)
│   └── Will add: Virtual host for messages.yourdomain.com
│
├── [EXISTING] LXC 107 - MariaDB
│   ├── IP: 192.168.5.20
│   ├── MariaDB 10.11 (Port 3306)
│   └── Will add: Database "messaging_platform"
│
├── [NEW] LXC 113 - Telegram Backend
│   ├── VMID: 113
│   ├── IP: 192.168.5.113 (DHCP/Static)
│   ├── OS: Debian 12
│   ├── Resources: 2 cores, 2GB RAM, 20GB disk
│   ├── Stack: Python 3.11 + Telethon
│   └── Port: 8001
│
├── [NEW] LXC 114 - WhatsApp Backend
│   ├── VMID: 114
│   ├── IP: 192.168.5.114 (DHCP/Static)
│   ├── OS: Debian 12
│   ├── Resources: 2 cores, 2GB RAM, 20GB disk
│   ├── Stack: Node.js 18 + Baileys
│   └── Port: 8002
│
└── [NEW] LXC 115 - API Gateway + Frontend
    ├── VMID: 115
    ├── IP: 192.168.5.115 (DHCP/Static)
    ├── OS: Debian 12
    ├── Resources: 2 cores, 2GB RAM, 15GB disk
    ├── Stack: Node.js 18 + Express + React (built)
    └── Port: 3000
```

## Resource Requirements

| Component | RAM | CPU | Disk | Status |
|-----------|-----|-----|------|--------|
| **New LXCs** | **6GB** | **6 cores** | **55GB** | New allocation |
| Current t730 | 5.25GB | 9 cores | 72GB | Existing |
| **Total After** | **11.25GB** | **15 cores** | **127GB** | **❌ Over capacity** |
| t730 Limit | 6.7GB | 4 cores | 473GB | Physical limit |

**⚠️ RAM ISSUE:** You're already at 78% RAM usage. Adding 6GB would exceed physical RAM.

### Solution: Reduce Resource Allocation

| Container | RAM (Optimized) | CPU | Disk | Notes |
|-----------|-----------------|-----|------|-------|
| LXC 113 (Telegram) | 1GB | 1 core | 15GB | Reduced from 2GB |
| LXC 114 (WhatsApp) | 1GB | 1 core | 15GB | Reduced from 2GB |
| LXC 115 (API) | 1GB | 1 core | 10GB | Reduced from 2GB |
| **New Total** | **3GB** | **3 cores** | **40GB** | ✅ Acceptable |
| **Total After** | **8.25GB** | **12 cores** | **112GB** | ✅ Within limits |

**Final Utilization:**
- RAM: 8.25GB / 6.7GB = **123%** (use swap, acceptable for LXC)
- CPU: 12 cores / 4 cores = 300% overcommit (normal for containers)
- Disk: 112GB / 473GB = 24% usage

## Network Diagram

```
Internet
    │
    ▼
[LXC 106] Nginx (192.168.5.17)
    │
    ├─► /api/* ──────────► [LXC 115] API Gateway (192.168.5.115:3000)
    │                          │
    │                          ├─► [LXC 113] Telegram (192.168.5.113:8001)
    │                          │
    │                          ├─► [LXC 114] WhatsApp (192.168.5.114:8002)
    │                          │
    │                          └─► [LXC 107] MariaDB (192.168.5.20:3306)
    │
    └─► / ─────────────────► Static files (React build)
```

## Step-by-Step Deployment

### Step 1: Prepare MariaDB (LXC 107)

SSH into LXC 107:

```bash
# From Proxmox host
pct enter 107

# Login to MariaDB
mysql -u root -p
```

Create database and user:

```sql
-- Create database
CREATE DATABASE messaging_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user (allow access from new LXCs)
CREATE USER 'msgplatform'@'192.168.5.%' IDENTIFIED BY 'YourSecurePassword123!';
GRANT ALL PRIVILEGES ON messaging_platform.* TO 'msgplatform'@'192.168.5.%';
FLUSH PRIVILEGES;

-- Verify
SHOW DATABASES LIKE 'messaging%';
SELECT user, host FROM mysql.user WHERE user = 'msgplatform';
EXIT;
```

Import schema:

```bash
# Download schema
cd /tmp
wget https://raw.githubusercontent.com/dominggo/multi-account-multi-platform/master/database/schema.sql

# Import
mysql -u msgplatform -p messaging_platform < schema.sql

# Verify tables
mysql -u msgplatform -p -e "USE messaging_platform; SHOW TABLES;"

# Exit container
exit
```

---

### Step 2: Create LXC 113 - Telegram Backend

On Proxmox host:

```bash
# Create container
pct create 113 local:vztmpl/debian-12-standard_12.7-1_amd64.tar.zst \
  --hostname messaging-telegram \
  --memory 1024 \
  --cores 1 \
  --net0 name=eth0,bridge=vmbr0,firewall=1,ip=dhcp \
  --storage lxcstore \
  --rootfs lxcstore:15 \
  --unprivileged 1 \
  --features nesting=1 \
  --onboot 1

# Start container
pct start 113

# Enter container
pct enter 113
```

Inside LXC 113:

```bash
# Update system
apt update && apt upgrade -y

# Install Python 3.11
apt install python3 python3-pip python3-venv git wget curl -y

# Verify Python version
python3 --version  # Should be 3.11+

# Create app directory
mkdir -p /opt/messaging-platform/telegram
cd /opt/messaging-platform/telegram

# Clone repo
git clone https://github.com/dominggo/multi-account-multi-platform.git /tmp/repo
cp -r /tmp/repo/backend-telegram/* .

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Generate API secret
API_SECRET=$(openssl rand -base64 32)

# Create .env file
cat > .env <<EOF
# Telegram API (get from https://my.telegram.org)
TELEGRAM_API_ID=YOUR_API_ID_HERE
TELEGRAM_API_HASH=YOUR_API_HASH_HERE

# Database
DB_HOST=192.168.5.20
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
API_SECRET_KEY=$API_SECRET
ALLOWED_ORIGINS=http://192.168.5.115:3000,http://192.168.5.17

# Keep-Alive
DEFAULT_KEEPALIVE_INTERVAL=86400
EOF

# Create directories
mkdir -p sessions logs

# Test MariaDB connection
python3 << 'PYEOF'
import mysql.connector
try:
    conn = mysql.connector.connect(
        host='192.168.5.20',
        port=3306,
        user='msgplatform',
        password='YourSecurePassword123!',
        database='messaging_platform'
    )
    print("✅ MariaDB connection successful!")
    conn.close()
except Exception as e:
    print(f"❌ MariaDB connection failed: {e}")
PYEOF

# Create systemd service
cat > /etc/systemd/system/telegram-backend.service <<'EOF'
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

# Enable service (don't start yet - need API credentials)
systemctl daemon-reload
systemctl enable telegram-backend

# Exit container
exit
```

**Note:** You need to get Telegram API credentials from https://my.telegram.org before starting the service.

---

### Step 3: Create LXC 114 - WhatsApp Backend

On Proxmox host:

```bash
# Create container
pct create 114 local:vztmpl/debian-12-standard_12.7-1_amd64.tar.zst \
  --hostname messaging-whatsapp \
  --memory 1024 \
  --cores 1 \
  --net0 name=eth0,bridge=vmbr0,firewall=1,ip=dhcp \
  --storage lxcstore \
  --rootfs lxcstore:15 \
  --unprivileged 1 \
  --features nesting=1 \
  --onboot 1

pct start 114
pct enter 114
```

Inside LXC 114:

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install nodejs git -y

# Verify
node --version  # v18.x
npm --version

# Create app directory
mkdir -p /opt/messaging-platform/whatsapp
cd /opt/messaging-platform/whatsapp

# Clone repo
git clone https://github.com/dominggo/multi-account-multi-platform.git /tmp/repo
cp -r /tmp/repo/backend-whatsapp/* .

# Install dependencies
npm install

# Generate API secret
API_SECRET=$(openssl rand -base64 32)

# Create .env file
cat > .env <<EOF
# Server
HOST=0.0.0.0
PORT=8002
NODE_ENV=production

# Database
DB_HOST=192.168.5.20
DB_PORT=3306
DB_NAME=messaging_platform
DB_USER=msgplatform
DB_PASSWORD=YourSecurePassword123!

# Session Storage
SESSION_DIR=/opt/messaging-platform/whatsapp/sessions

# API Security
API_SECRET_KEY=$API_SECRET
ALLOWED_ORIGINS=http://192.168.5.115:3000,http://192.168.5.17

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

# Install PM2
npm install -g pm2

# Start service
pm2 start dist/index.js --name whatsapp-backend
pm2 save
pm2 startup
# Run the command PM2 outputs

# Test
curl http://localhost:8002/
# Should return: {"service": "WhatsApp Backend", "status": "running"}

# Exit container
exit
```

---

### Step 4: Create LXC 115 - API Gateway + Frontend

On Proxmox host:

```bash
# Create container
pct create 115 local:vztmpl/debian-12-standard_12.7-1_amd64.tar.zst \
  --hostname messaging-api \
  --memory 1024 \
  --cores 1 \
  --net0 name=eth0,bridge=vmbr0,firewall=1,ip=dhcp \
  --storage lxcstore \
  --rootfs lxcstore:10 \
  --unprivileged 1 \
  --features nesting=1 \
  --onboot 1

pct start 115
pct enter 115
```

Inside LXC 115:

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install nodejs git -y

# Create directories
mkdir -p /opt/messaging-platform/{api,frontend-build}

# === API Gateway Setup ===
cd /opt/messaging-platform/api

# Clone repo
git clone https://github.com/dominggo/multi-account-multi-platform.git /tmp/repo
cp -r /tmp/repo/backend-api/* .

# Install dependencies
npm install

# Generate secrets
JWT_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)

# Create .env file
cat > .env <<EOF
# Server
HOST=0.0.0.0
PORT=3000
NODE_ENV=production

# Database
DB_HOST=192.168.5.20
DB_PORT=3306
DB_NAME=messaging_platform
DB_USER=msgplatform
DB_PASSWORD=YourSecurePassword123!

# JWT
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d

# Session
SESSION_SECRET=$SESSION_SECRET
SESSION_MAX_AGE=1800000

# CORS
ALLOWED_ORIGINS=http://192.168.5.17,http://192.168.5.115:3000

# Backend Services
TELEGRAM_API_URL=http://192.168.5.113:8001
WHATSAPP_API_URL=http://192.168.5.114:8002

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

# Install PM2
npm install -g pm2

# Start API Gateway
pm2 start dist/index.js --name api-gateway
pm2 save
pm2 startup
# Run the command PM2 outputs

# Test
curl http://localhost:3000/
# Should return: {"service": "Multi-Account Messaging Platform API", ...}

# === Frontend Setup ===
cd /opt/messaging-platform
cp -r /tmp/repo/frontend .
cd frontend

# Install dependencies
npm install

# Create production .env
cat > .env.production <<EOF
VITE_API_URL=http://192.168.5.17/api
VITE_WS_URL=ws://192.168.5.17
EOF

# Build frontend
npm run build

# Copy to build directory
cp -r dist/* /opt/messaging-platform/frontend-build/

# List files
ls -la /opt/messaging-platform/frontend-build/

# Exit container
exit
```

---

### Step 5: Configure Nginx (LXC 106)

SSH into LXC 106:

```bash
pct enter 106
```

Create new Nginx site configuration:

```bash
# Create nginx site config
cat > /etc/nginx/sites-available/messaging <<'EOF'
# Upstream backends
upstream api_backend {
    server 192.168.5.115:3000;
    keepalive 64;
}

upstream telegram_backend {
    server 192.168.5.113:8001;
    keepalive 32;
}

upstream whatsapp_backend {
    server 192.168.5.114:8002;
    keepalive 32;
}

# Main server
server {
    listen 80;
    server_name messages.local messages.yourdomain.com;

    access_log /var/log/nginx/messaging-access.log;
    error_log /var/log/nginx/messaging-error.log;

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

    # WebSocket
    location /socket.io {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Frontend static files
    location / {
        # Serve from LXC 115 via NFS/SSHFS or copy files here
        root /var/www/messaging;
        try_files $uri $uri/ /index.html;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Direct backend access (for testing)
    location /direct/telegram {
        proxy_pass http://telegram_backend;
    }

    location /direct/whatsapp {
        proxy_pass http://whatsapp_backend;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Client max body size
    client_max_body_size 50M;
}
EOF

# Create directory for frontend files
mkdir -p /var/www/messaging

# Copy frontend files from LXC 115
scp -r root@192.168.5.115:/opt/messaging-platform/frontend-build/* /var/www/messaging/

# Enable site
ln -s /etc/nginx/sites-available/messaging /etc/nginx/sites-enabled/

# Test configuration
nginx -t

# Reload nginx
systemctl reload nginx

# Exit container
exit
```

---

### Step 6: Get IP Addresses

From Proxmox host:

```bash
# Get IPs of new containers
pct exec 113 -- ip addr show eth0 | grep "inet "
pct exec 114 -- ip addr show eth0 | grep "inet "
pct exec 115 -- ip addr show eth0 | grep "inet "
```

Update your notes with the actual IPs assigned by DHCP.

---

### Step 7: Configure Telegram API Credentials

1. Visit https://my.telegram.org
2. Login with your phone number
3. Go to "API Development Tools"
4. Create application
5. Copy API ID and API Hash

Update LXC 113:

```bash
pct enter 113
nano /opt/messaging-platform/telegram/.env
# Update TELEGRAM_API_ID and TELEGRAM_API_HASH

# Start the service
systemctl start telegram-backend
systemctl status telegram-backend

# Check logs
journalctl -u telegram-backend -f

exit
```

---

## Verification

### Test Each Service

From your workstation (or Proxmox host):

```bash
# Test Telegram backend
curl http://192.168.5.113:8001/
# Expected: {"service": "Telegram Backend", "status": "running"}

# Test WhatsApp backend
curl http://192.168.5.114:8002/
# Expected: {"service": "WhatsApp Backend", "status": "running"}

# Test API Gateway
curl http://192.168.5.115:3000/
# Expected: {"service": "Multi-Account Messaging Platform API", ...}

# Test via Nginx
curl http://192.168.5.17/api/
# Expected: Same as API Gateway response

# Test frontend
curl http://192.168.5.17/
# Expected: HTML content
```

### Open in Browser

Visit: **http://192.168.5.17** or **http://messages.local**

You should see the Multi-Account Messaging Platform interface.

---

## Maintenance

### Update Services

```bash
# Update Telegram backend
pct enter 113
cd /opt/messaging-platform/telegram
git pull
source venv/bin/activate
pip install -r requirements.txt
systemctl restart telegram-backend
exit

# Update WhatsApp backend
pct enter 114
cd /opt/messaging-platform/whatsapp
git pull
npm install
npm run build
pm2 restart whatsapp-backend
exit

# Update API Gateway
pct enter 115
cd /opt/messaging-platform/api
git pull
npm install
npm run build
pm2 restart api-gateway
exit

# Update Frontend
pct enter 115
cd /opt/messaging-platform/frontend
git pull
npm install
npm run build
cp -r dist/* /opt/messaging-platform/frontend-build/
exit

# Copy to Nginx
pct enter 106
scp -r root@192.168.5.115:/opt/messaging-platform/frontend-build/* /var/www/messaging/
exit
```

### Check Logs

```bash
# Telegram
pct enter 113
journalctl -u telegram-backend -f

# WhatsApp
pct enter 114
pm2 logs whatsapp-backend

# API Gateway
pct enter 115
pm2 logs api-gateway

# Nginx
pct enter 106
tail -f /var/log/nginx/messaging-error.log
```

### Backup

```bash
# From Proxmox host
vzdump 113 114 115 --storage local --mode snapshot --compress zstd

# Database backup
pct enter 107
mysqldump -u msgplatform -p messaging_platform > /backup/messaging_$(date +%Y%m%d).sql
exit
```

---

## Summary

**What You Created:**

| VMID | Name | IP | Resources | Purpose |
|------|------|----|-----------| --------|
| 113 | messaging-telegram | 192.168.5.113 | 1GB RAM, 1 core, 15GB | Telegram Backend |
| 114 | messaging-whatsapp | 192.168.5.114 | 1GB RAM, 1 core, 15GB | WhatsApp Backend |
| 115 | messaging-api | 192.168.5.115 | 1GB RAM, 1 core, 10GB | API + Frontend |

**Total New Resources:**
- RAM: 3GB
- CPU: 3 cores
- Disk: 40GB
- Containers: 3

**Integration:**
- Uses existing LXC 107 (MariaDB) - just added one database
- Uses existing LXC 106 (Nginx) - just added one virtual host
- All services on same network (192.168.5.0/24)
- Easy to manage via Proxmox web UI

**Access:**
- Frontend: http://192.168.5.17 or http://messages.local
- API: http://192.168.5.17/api
- Proxmox: https://192.168.5.15:8006

This deployment is optimized for your t730 host's limited RAM while providing full functionality!
