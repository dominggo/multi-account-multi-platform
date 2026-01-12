# Proxmox Deployment Guide

Deploy the Multi-Account Messaging Platform on Proxmox without Docker.

## Architecture Overview

```
Proxmox Host
│
├── LXC: messaging-db (MySQL)
│   └── 192.168.1.10:3306
│
├── LXC: messaging-telegram
│   ├── Python 3.11 + Telethon
│   └── 192.168.1.11:8001
│
├── LXC: messaging-whatsapp
│   ├── Node.js 18 + Baileys
│   └── 192.168.1.12:8002
│
└── LXC: messaging-web
    ├── Node.js 18 (API Gateway)
    ├── React (Frontend - built)
    ├── Nginx (Reverse Proxy)
    └── 192.168.1.13:80/443
```

## Step-by-Step Deployment

### 1. Create LXC Containers

#### Container 1: MySQL Database

```bash
# In Proxmox web UI or CLI
pct create 100 local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst \
  --hostname messaging-db \
  --memory 2048 \
  --cores 2 \
  --net0 name=eth0,bridge=vmbr0,ip=192.168.1.10/24,gw=192.168.1.1 \
  --storage local-lvm \
  --rootfs local-lvm:8

# Start container
pct start 100

# Enter container
pct enter 100
```

**Inside messaging-db container:**

```bash
# Update system
apt update && apt upgrade -y

# Install MySQL
apt install mysql-server -y

# Secure MySQL
mysql_secure_installation

# Configure MySQL to accept remote connections
nano /etc/mysql/mysql.conf.d/mysqld.cnf
# Change: bind-address = 0.0.0.0

systemctl restart mysql

# Create database and user
mysql -u root -p
```

```sql
CREATE DATABASE messaging_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'msgplatform'@'%' IDENTIFIED BY 'YourSecurePassword123!';
GRANT ALL PRIVILEGES ON messaging_platform.* TO 'msgplatform'@'%';
FLUSH PRIVILEGES;
EXIT;
```

```bash
# Import schema (copy from host first)
# From Proxmox host:
pct push 100 /path/to/database/schema.sql /root/schema.sql

# Inside container:
mysql -u msgplatform -p messaging_platform < /root/schema.sql
```

#### Container 2: Telegram Backend

```bash
# Create container
pct create 101 local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst \
  --hostname messaging-telegram \
  --memory 1024 \
  --cores 2 \
  --net0 name=eth0,bridge=vmbr0,ip=192.168.1.11/24,gw=192.168.1.1 \
  --storage local-lvm \
  --rootfs local-lvm:8

pct start 101
pct enter 101
```

**Inside messaging-telegram container:**

```bash
# Update system
apt update && apt upgrade -y

# Install Python 3.11
apt install software-properties-common -y
add-apt-repository ppa:deadsnakes/ppa -y
apt update
apt install python3.11 python3.11-venv python3-pip -y

# Create app directory
mkdir -p /opt/messaging-platform/telegram
cd /opt/messaging-platform/telegram

# Copy files from Proxmox host
# From Proxmox host:
pct push 101 /path/to/backend-telegram/main.py /opt/messaging-platform/telegram/main.py
pct push 101 /path/to/backend-telegram/requirements.txt /opt/messaging-platform/telegram/requirements.txt

# Inside container:
# Install dependencies
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create .env file
nano .env
# Add your configuration (see backend-telegram/.env.example)

# Create systemd service
nano /etc/systemd/system/telegram-backend.service
```

```ini
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
```

```bash
# Enable and start service
systemctl daemon-reload
systemctl enable telegram-backend
systemctl start telegram-backend
systemctl status telegram-backend
```

#### Container 3: WhatsApp Backend

```bash
# Create container
pct create 102 local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst \
  --hostname messaging-whatsapp \
  --memory 1024 \
  --cores 2 \
  --net0 name=eth0,bridge=vmbr0,ip=192.168.1.12/24,gw=192.168.1.1 \
  --storage local-lvm \
  --rootfs local-lvm:8

pct start 102
pct enter 102
```

**Inside messaging-whatsapp container:**

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install nodejs -y

# Verify installation
node --version
npm --version

# Create app directory
mkdir -p /opt/messaging-platform/whatsapp
cd /opt/messaging-platform/whatsapp

# Copy files from Proxmox host
# From Proxmox host:
pct push 102 /path/to/backend-whatsapp /opt/messaging-platform/whatsapp --recursive

# Inside container:
# Install dependencies
npm install

# Create .env file
nano .env
# Add your configuration (see backend-whatsapp/.env.example)

# Build TypeScript
npm run build

# Install PM2 (process manager)
npm install -g pm2

# Start service with PM2
pm2 start dist/index.js --name whatsapp-backend
pm2 save
pm2 startup

# Follow the instructions from pm2 startup command
```

#### Container 4: Web (API + Frontend)

```bash
# Create container
pct create 103 local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst \
  --hostname messaging-web \
  --memory 2048 \
  --cores 2 \
  --net0 name=eth0,bridge=vmbr0,ip=192.168.1.13/24,gw=192.168.1.1 \
  --storage local-lvm \
  --rootfs local-lvm:10

pct start 103
pct enter 103
```

**Inside messaging-web container:**

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install nodejs nginx certbot python3-certbot-nginx -y

# Create app directories
mkdir -p /opt/messaging-platform/api
mkdir -p /opt/messaging-platform/frontend
mkdir -p /var/www/messaging

cd /opt/messaging-platform

# Copy files from Proxmox host
# From Proxmox host:
pct push 103 /path/to/backend-api /opt/messaging-platform/api --recursive
pct push 103 /path/to/frontend /opt/messaging-platform/frontend --recursive

# Inside container:

# === API Gateway Setup ===
cd /opt/messaging-platform/api

# Install dependencies
npm install

# Create .env file
nano .env
```

```bash
# API Gateway .env
DB_HOST=192.168.1.10
DB_PORT=3306
DB_NAME=messaging_platform
DB_USER=msgplatform
DB_PASSWORD=YourSecurePassword123!

JWT_SECRET=your_jwt_secret_here
SESSION_SECRET=your_session_secret_here

TELEGRAM_API_URL=http://192.168.1.11:8001
WHATSAPP_API_URL=http://192.168.1.12:8002

PORT=3000
HOST=0.0.0.0
```

```bash
# Build TypeScript
npm run build

# Install PM2
npm install -g pm2

# Start API Gateway
pm2 start dist/index.js --name api-gateway
pm2 save
pm2 startup

# === Frontend Setup ===
cd /opt/messaging-platform/frontend

# Install dependencies
npm install

# Create production .env
nano .env.production
```

```bash
# Frontend .env.production
VITE_API_URL=https://messages.yourdomain.com/api
VITE_WS_URL=wss://messages.yourdomain.com
```

```bash
# Build frontend
npm run build

# Copy build to nginx directory
cp -r dist/* /var/www/messaging/
```

**Configure Nginx:**

```bash
nano /etc/nginx/sites-available/messaging
```

```nginx
# Upstream backend
upstream api_backend {
    server 127.0.0.1:3000;
    keepalive 64;
}

# HTTP -> HTTPS redirect
server {
    listen 80;
    server_name messages.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name messages.yourdomain.com;

    # SSL certificates (configure after obtaining)
    # ssl_certificate /etc/letsencrypt/live/messages.yourdomain.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/messages.yourdomain.com/privkey.pem;

    # Frontend (React SPA)
    location / {
        root /var/www/messaging;
        try_files $uri $uri/ /index.html;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API Gateway proxy
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

    # WebSocket proxy
    location /socket.io {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
}
```

```bash
# Enable site
ln -s /etc/nginx/sites-available/messaging /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default

# Test configuration
nginx -t

# Restart nginx
systemctl restart nginx

# Get SSL certificate (after DNS is configured)
certbot --nginx -d messages.yourdomain.com
```

### 2. Configure Proxmox Firewall

In Proxmox web UI → Datacenter → Firewall:

```
# Allow traffic between containers
Source: 192.168.1.11  Destination: 192.168.1.10  Port: 3306  (Telegram → MySQL)
Source: 192.168.1.12  Destination: 192.168.1.10  Port: 3306  (WhatsApp → MySQL)
Source: 192.168.1.13  Destination: 192.168.1.10  Port: 3306  (Web → MySQL)
Source: 192.168.1.13  Destination: 192.168.1.11  Port: 8001  (Web → Telegram)
Source: 192.168.1.13  Destination: 192.168.1.12  Port: 8002  (Web → WhatsApp)

# Allow external access to web server
Source: 0.0.0.0/0  Destination: 192.168.1.13  Port: 80,443
```

### 3. Port Forwarding (if needed)

If you want external access, configure port forwarding on your router:

```
External Port 80   → 192.168.1.13:80
External Port 443  → 192.168.1.13:443
```

### 4. DNS Configuration

Point your domain to your public IP:

```
A Record: messages.yourdomain.com → Your Public IP
```

## Monitoring & Maintenance

### Check Service Status

```bash
# Telegram backend
pct enter 101
systemctl status telegram-backend
journalctl -u telegram-backend -f

# WhatsApp backend
pct enter 102
pm2 status
pm2 logs whatsapp-backend

# API Gateway
pct enter 103
pm2 status
pm2 logs api-gateway

# Nginx
pct enter 103
systemctl status nginx
tail -f /var/log/nginx/access.log
```

### Backup Strategy

```bash
# Proxmox automated backups
# In Proxmox web UI → Datacenter → Backup

# Schedule:
# - Daily backups of all LXC containers
# - Retention: 7 days
# - Mode: Snapshot (for running containers)

# Manual backup:
vzdump 100 101 102 103 --storage local --mode snapshot
```

### Update Services

```bash
# Update Telegram backend
pct enter 101
cd /opt/messaging-platform/telegram
git pull  # if using git
source venv/bin/activate
pip install -r requirements.txt
systemctl restart telegram-backend

# Update WhatsApp backend
pct enter 102
cd /opt/messaging-platform/whatsapp
git pull
npm install
npm run build
pm2 restart whatsapp-backend

# Update API Gateway
pct enter 103
cd /opt/messaging-platform/api
git pull
npm install
npm run build
pm2 restart api-gateway

# Update Frontend
cd /opt/messaging-platform/frontend
git pull
npm install
npm run build
cp -r dist/* /var/www/messaging/
```

## Resource Allocation

**Recommended specs:**

| Container | RAM | CPU | Storage | Purpose |
|-----------|-----|-----|---------|---------|
| MySQL | 2 GB | 2 cores | 20 GB | Database |
| Telegram | 1 GB | 2 cores | 10 GB | Sessions + logs |
| WhatsApp | 1 GB | 2 cores | 10 GB | Sessions + logs |
| Web | 2 GB | 2 cores | 10 GB | API + Frontend |
| **Total** | **6 GB** | **8 cores** | **50 GB** | |

## Advantages of This Setup

1. **Native Performance** - No Docker overhead
2. **Easy Backups** - Proxmox snapshots
3. **Isolation** - Each service in its own container
4. **Scalability** - Easy to add more containers
5. **Monitoring** - Direct systemd/PM2 logs
6. **Updates** - Independent service updates
7. **Resource Control** - Proxmox resource limits

## Troubleshooting

### Container won't start

```bash
# Check container status
pct status 100

# Check logs
pct enter 100
dmesg | tail
```

### Network issues

```bash
# Test connectivity between containers
pct enter 101
ping 192.168.1.10  # MySQL
curl http://192.168.1.10:3306
```

### Service crashes

```bash
# Check logs
pct enter 101
journalctl -u telegram-backend -n 100

pct enter 102
pm2 logs whatsapp-backend --lines 100
```

---

**This setup gives you full control without Docker complexity, perfect for Proxmox environments!**
