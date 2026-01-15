# Proxmox Deployment Guide - Multi-Account Messaging Platform

Deploy to your existing **proxmox_t730** infrastructure using existing MySQL and Nginx.

## Infrastructure Overview

| Container | Purpose | IP | Status |
|-----------|---------|-----|--------|
| LXC 106 | Nginx Reverse Proxy | 192.168.5.17 | Existing |
| LXC 107 | MariaDB 10.11 | 192.168.5.20 | Existing |
| LXC 113 | Telegram Backend | 192.168.5.113:8001 | New |
| LXC 114 | WhatsApp Backend | 192.168.5.114:8002 | New |
| LXC 108 | API Gateway + Frontend | 192.168.5.108:3000 | New |

## Architecture

```
proxmox_t730 (192.168.5.15)
│
├── [EXISTING] LXC 106 - Nginx (192.168.5.17)
│   └── Reverse proxy → /api/* → LXC 108
│
├── [EXISTING] LXC 107 - MariaDB (192.168.5.20)
│   └── Database: messaging_platform
│
├── [NEW] LXC 113 - Telegram Backend (192.168.5.113:8001)
│   └── Python 3.11 + Telethon + FastAPI
│
├── [NEW] LXC 114 - WhatsApp Backend (192.168.5.114:8002)
│   └── Node.js 20 + Baileys
│
└── [NEW] LXC 108 - API Gateway + Frontend (192.168.5.108:3000)
    └── Node.js 20 + Express + React
```

## Resource Requirements

| Container | RAM | CPU | Disk |
|-----------|-----|-----|------|
| LXC 113 (Telegram) | 1GB | 1 core | 15GB |
| LXC 114 (WhatsApp) | 1GB | 1 core | 15GB |
| LXC 108 (API) | 1GB | 1 core | 10GB |
| **Total New** | **3GB** | **3 cores** | **40GB** |

---

## Step 1: Database Setup (LXC 107)

```bash
ssh root@192.168.5.15
pct enter 107
mysql -u root -p
```

```sql
CREATE DATABASE messaging_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'msgplatform'@'192.168.5.%' IDENTIFIED BY 'YourSecurePassword123!';
GRANT ALL PRIVILEGES ON messaging_platform.* TO 'msgplatform'@'192.168.5.%';
FLUSH PRIVILEGES;
EXIT;
```

Import schema:
```bash
cd /tmp
wget https://raw.githubusercontent.com/dominggo/multi-account-multi-platform/master/database/schema.sql
mysql -u msgplatform -p messaging_platform < schema.sql
exit
```

---

## Step 2: Create LXC 113 - Telegram Backend

```bash
pct create 113 local:vztmpl/debian-12-standard_12.12-1_amd64.tar.zst \
  --hostname telegram-backend \
  --memory 1024 \
  --cores 1 \
  --rootfs local-lvm:15 \
  --net0 name=eth0,bridge=vmbr0,ip=192.168.5.113/24,gw=192.168.5.1 \
  --unprivileged 1 \
  --features nesting=1 \
  --onboot 1 \
  --start 1

pct enter 113
```

Inside LXC 113:
```bash
apt update && apt install -y python3 python3-pip python3-venv git curl

cd /opt
git clone https://github.com/dominggo/multi-account-multi-platform.git
mv multi-account-multi-platform/backend-telegram /opt/telegram-backend
rm -rf multi-account-multi-platform

cd /opt/telegram-backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create .env
cp .env.example .env
nano .env  # Add your TELEGRAM_API_ID, TELEGRAM_API_HASH, DB credentials

# Create systemd service
cat > /etc/systemd/system/telegram-backend.service << 'EOF'
[Unit]
Description=Telegram Backend Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/telegram-backend
Environment=PATH=/opt/telegram-backend/venv/bin:/usr/bin
ExecStart=/opt/telegram-backend/venv/bin/python main.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable telegram-backend
systemctl start telegram-backend
exit
```

---

## Step 3: Create LXC 114 - WhatsApp Backend

```bash
pct create 114 local:vztmpl/debian-12-standard_12.12-1_amd64.tar.zst \
  --hostname whatsapp-backend \
  --memory 1024 \
  --cores 1 \
  --rootfs local-lvm:15 \
  --net0 name=eth0,bridge=vmbr0,ip=192.168.5.114/24,gw=192.168.5.1 \
  --unprivileged 1 \
  --features nesting=1 \
  --onboot 1 \
  --start 1

pct enter 114
```

Inside LXC 114:
```bash
apt update && apt install -y curl git
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

cd /opt
git clone https://github.com/dominggo/multi-account-multi-platform.git
mv multi-account-multi-platform/backend-whatsapp /opt/whatsapp-backend
rm -rf multi-account-multi-platform

cd /opt/whatsapp-backend
npm install

# Create .env
cp .env.example .env
nano .env  # Add DB credentials

# Create systemd service
cat > /etc/systemd/system/whatsapp-backend.service << 'EOF'
[Unit]
Description=WhatsApp Backend Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/whatsapp-backend
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable whatsapp-backend
systemctl start whatsapp-backend
exit
```

---

## Step 4: Create LXC 108 - API Gateway + Frontend

```bash
pct create 108 local:vztmpl/debian-12-standard_12.12-1_amd64.tar.zst \
  --hostname api-gateway \
  --memory 1024 \
  --cores 1 \
  --rootfs local-lvm:10 \
  --net0 name=eth0,bridge=vmbr0,ip=192.168.5.108/24,gw=192.168.5.1 \
  --unprivileged 1 \
  --features nesting=1 \
  --onboot 1 \
  --start 1

pct enter 108
```

Inside LXC 108:
```bash
apt update && apt install -y curl git
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

cd /opt
git clone https://github.com/dominggo/multi-account-multi-platform.git
mv multi-account-multi-platform/backend-api /opt/api-gateway
mv multi-account-multi-platform/frontend /opt/frontend
rm -rf multi-account-multi-platform

# Setup API Gateway
cd /opt/api-gateway
npm install
cp .env.example .env
nano .env  # Configure DB, JWT_SECRET, backend URLs

# Setup Frontend
cd /opt/frontend
npm install
npm run build

# Create systemd service for API
cat > /etc/systemd/system/api-gateway.service << 'EOF'
[Unit]
Description=API Gateway Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/api-gateway
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable api-gateway
systemctl start api-gateway
exit
```

---

## Step 5: Configure Nginx (LXC 106)

```bash
pct enter 106

cat > /etc/nginx/sites-available/messaging << 'EOF'
upstream api_backend {
    server 192.168.5.108:3000;
}

server {
    listen 80;
    server_name messages.local;

    # API Gateway
    location /api {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket
    location /socket.io {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Frontend
    location / {
        root /var/www/messaging;
        try_files $uri $uri/ /index.html;
    }
}
EOF

mkdir -p /var/www/messaging
# Copy frontend build from LXC 108
scp -r root@192.168.5.108:/opt/frontend/dist/* /var/www/messaging/

ln -sf /etc/nginx/sites-available/messaging /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
exit
```

---

## Verification

```bash
# Test services
curl http://192.168.5.113:8001/    # Telegram
curl http://192.168.5.114:8002/    # WhatsApp
curl http://192.168.5.108:3000/    # API Gateway
curl http://192.168.5.17/          # Frontend via Nginx
```

---

## Maintenance

### Update Services
```bash
# Telegram
pct enter 113
cd /opt/telegram-backend && git pull
source venv/bin/activate && pip install -r requirements.txt
systemctl restart telegram-backend

# WhatsApp
pct enter 114
cd /opt/whatsapp-backend && git pull && npm install
systemctl restart whatsapp-backend

# API Gateway
pct enter 108
cd /opt/api-gateway && git pull && npm install
systemctl restart api-gateway
```

### Backup
```bash
vzdump 108 113 114 --storage local --mode snapshot --compress zstd
pct enter 107
mysqldump -u msgplatform -p messaging_platform > /backup/messaging_$(date +%Y%m%d).sql
```

---

## Summary

| VMID | Hostname | IP | Purpose |
|------|----------|-----|---------|
| 106 | webserver | 192.168.5.17 | Nginx (existing) |
| 107 | mariadb | 192.168.5.20 | MariaDB (existing) |
| 108 | api-gateway | 192.168.5.108:3000 | API + Frontend |
| 113 | telegram-backend | 192.168.5.113:8001 | Telegram |
| 114 | whatsapp-backend | 192.168.5.114:8002 | WhatsApp |
