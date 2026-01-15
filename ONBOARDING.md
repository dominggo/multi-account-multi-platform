# Multi-Account Messaging Platform - Deployment Progress

**Project Name:** Unified Telegram & WhatsApp Web Client
**Date Created:** 2026-01-08
**Last Updated:** 2026-01-15
**Status:** 🔄 Phase 2 - Telegram Backend Deployment (In Progress)
**Purpose:** Web-based multi-account messaging client for travelers with multiple international SIM cards

---

## 🚀 CURRENT DEPLOYMENT STATUS

### Infrastructure (Proxmox t730 - 192.168.5.15)

**Existing Resources (DO NOT MODIFY)**
- **LXC 106**: Nginx Reverse Proxy (192.168.5.17) - ✅ Active
- **LXC 107**: MariaDB 10.11 (192.168.5.20) - ✅ Active

**New LXC Containers (Created for this project)**
- **LXC 113**: Telegram Backend - Python 3.11 + Telethon (192.168.5.113:8001) - ✅ Created, In Setup
- **LXC 114**: WhatsApp Backend - Node.js 18 + Baileys (192.168.5.114:8002) - ⏳ Pending
- **LXC 115**: API Gateway + Frontend - Node.js 18 + React (192.168.5.115:3000) - ⏳ Pending

### Database Configuration (LXC 107)
- **Database**: `messaging_platform` - ✅ Created
- **User**: `msgplatform` - ✅ Created
- **Password**: `PUNDEKpundek!1`
- **Host**: `192.168.5.20:3306`
- **Tables**: 8 tables, 2 views, 2 stored procedures - ✅ Imported

### Current Progress

**✅ Phase 1: Database Setup - COMPLETED**
- [x] Created database and user
- [x] Imported complete schema
- [x] Verified all tables and views

**🔄 Phase 2: Telegram Backend (LXC 113) - IN PROGRESS**
- [x] Created LXC 113 (Debian 12, 1GB RAM, 1 core, 15GB disk)
- [x] Installed Python 3.11 and system dependencies
- [x] Created application directory `/opt/telegram-backend`
- [x] Set up Python virtual environment
- [x] Installed Python packages (telethon, fastapi, uvicorn, etc.)
- [x] Created `main.py` (FastAPI + Telethon integration)
- [x] Created `requirements.txt`
- [ ] **NEXT STEP**: Configure `.env` file with Telegram API credentials
- [ ] Test backend startup
- [ ] Create systemd service
- [ ] Verify health endpoint

**Current Location**: Inside LXC 113 at `/opt/telegram-backend`

**Next Action**: Edit `.env` file with your Telegram API credentials from https://my.telegram.org

**⏳ Phase 3-6**: WhatsApp backend, API Gateway, Nginx config, Testing - All pending

---

## 📋 Quick Reference for Resuming Work

### Access LXC Containers
```bash
# SSH to Proxmox
ssh root@192.168.5.15

# Enter containers
pct enter 107  # MariaDB
pct enter 113  # Telegram Backend (CURRENT)
```

### Current Working Directory (LXC 113)
```bash
cd /opt/telegram-backend
source venv/bin/activate  # Activate Python environment
```

### Files Created in LXC 113
- `/opt/telegram-backend/main.py` - FastAPI application
- `/opt/telegram-backend/requirements.txt` - Python dependencies
- `/opt/telegram-backend/.env` - Configuration (needs Telegram API credentials)
- `/opt/telegram-backend/venv/` - Python virtual environment

### Next Steps
1. Edit `/opt/telegram-backend/.env` with Telegram credentials
2. Test: `python main.py`
3. Create systemd service
4. Move to LXC 114 creation

---

---

## 🎯 Project Overview

### Problem Statement

As a frequent traveler with multiple phone numbers from different countries, managing Telegram and WhatsApp accounts across devices becomes challenging. Current solutions require:
- Multiple physical devices for each number
- Constant SIM card switching
- No centralized message history or account management
- Risk of account deactivation due to inactivity

### Solution

A unified web-based client that:
- ✅ Registers as official devices for both Telegram and WhatsApp
- ✅ Supports multiple accounts simultaneously (multi-tab interface)
- ✅ Stores all account records and message history in MySQL database
- ✅ Auto-sends keep-alive messages to prevent account deactivation
- ✅ Runs on existing nginx infrastructure
- ✅ Accessible from anywhere via web browser

---

## 🏗️ Proposed Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Client Layer (Browser)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Tab 1: TG    │  │ Tab 2: WA    │  │ Tab 3: TG    │  ...     │
│  │ +1-555-0001  │  │ +44-20-1234  │  │ +91-98-5678  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Nginx Reverse Proxy                          │
│                    (Existing Infrastructure)                     │
│                    messages.yourdomain.com                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Application Server Layer                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Node.js / Python Backend                                  │ │
│  │  ┌──────────────┐        ┌────────────────┐              │ │
│  │  │ Telegram API │        │ WhatsApp API   │              │ │
│  │  │ (Telethon/   │        │ (Baileys/      │              │ │
│  │  │  GramJS)     │        │  whatsapp-web) │              │ │
│  │  └──────────────┘        └────────────────┘              │ │
│  │                                                            │ │
│  │  ┌──────────────────────────────────────────┐            │ │
│  │  │  Session Manager                          │            │ │
│  │  │  - Multi-account handling                 │            │ │
│  │  │  - Device registration                    │            │ │
│  │  │  - Authentication state management        │            │ │
│  │  └──────────────────────────────────────────┘            │ │
│  │                                                            │ │
│  │  ┌──────────────────────────────────────────┐            │ │
│  │  │  Keep-Alive Service                       │            │ │
│  │  │  - Scheduled message sending              │            │ │
│  │  │  - Account activity monitoring            │            │ │
│  │  │  - Health check pings                     │            │ │
│  │  └──────────────────────────────────────────┘            │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Database Layer (MySQL)                      │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐  │
│  │ accounts       │  │ messages       │  │ sessions         │  │
│  │ - phone_number │  │ - message_id   │  │ - session_token  │  │
│  │ - platform     │  │ - account_id   │  │ - device_info    │  │
│  │ - country_code │  │ - timestamp    │  │ - last_active    │  │
│  │ - status       │  │ - content      │  │ - auth_state     │  │
│  └────────────────┘  └────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 External Platform APIs                           │
│  ┌──────────────────────┐    ┌─────────────────────────┐        │
│  │  Telegram Servers    │    │  WhatsApp Servers       │        │
│  │  (Official API)      │    │  (Web Protocol)         │        │
│  └──────────────────────┘    └─────────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 Feature Requirements

### Phase 1: Core Functionality (MVP)
- [ ] **Multi-Account Registration**
  - [ ] Telegram device registration via official API
  - [ ] WhatsApp device registration via web protocol
  - [ ] Support for 10+ concurrent accounts
  - [ ] Phone number verification flow

- [ ] **Web Interface**
  - [ ] Multi-tab chat interface
  - [ ] Account switcher
  - [ ] Message send/receive in real-time
  - [ ] Contact list management
  - [ ] Search functionality

- [ ] **Database Integration**
  - [ ] Store all phone numbers with country codes
  - [ ] Message history persistence
  - [ ] Session state management
  - [ ] Account metadata (registration date, last login, etc.)

- [ ] **Keep-Alive System**
  - [ ] Automated message scheduling
  - [ ] Configurable intervals per account
  - [ ] Activity monitoring dashboard
  - [ ] Alert system for inactive accounts

### Phase 2: Enhanced Features
- [ ] **Advanced Messaging**
  - [ ] Media file support (images, videos, documents)
  - [ ] Group chat management
  - [ ] Message forwarding
  - [ ] Broadcast messaging

- [ ] **Account Management**
  - [ ] Bulk account operations
  - [ ] Account status dashboard
  - [ ] Usage statistics per number
  - [ ] Country-wise grouping

- [ ] **Security & Privacy**
  - [ ] End-to-end encryption support
  - [ ] Two-factor authentication
  - [ ] Session timeout controls
  - [ ] IP whitelist/blacklist

### Phase 3: Advanced Features
- [ ] **Automation**
  - [ ] Auto-reply templates
  - [ ] Scheduled messages
  - [ ] Message filtering rules
  - [ ] Webhook integrations

- [ ] **Analytics**
  - [ ] Message statistics
  - [ ] Account activity reports
  - [ ] Peak usage analysis
  - [ ] Export data functionality

---

## 🛠️ Technology Stack

### Frontend
| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Framework** | React or Vue.js | Modern, component-based UI |
| **UI Library** | Material-UI or Tailwind CSS | Professional, responsive design |
| **State Management** | Redux or Vuex | Multi-account state handling |
| **Real-time** | Socket.io client | Live message updates |
| **HTTP Client** | Axios | API communication |

### Backend
| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Runtime** | Node.js 18+ or Python 3.11+ | Async I/O for real-time messaging |
| **Framework** | Express.js or FastAPI | RESTful API + WebSocket support |
| **Telegram Client** | Telethon (Python) or GramJS (Node) | Official protocol implementation |
| **WhatsApp Client** | Baileys (Node) or whatsapp-web.js | Reverse-engineered web protocol |
| **Real-time** | Socket.io or WebSocket | Bidirectional communication |
| **Scheduler** | node-cron or APScheduler | Keep-alive automation |
| **Session Store** | Redis (optional) | Fast session retrieval |

### Database
| Component | Technology | Notes |
|-----------|-----------|-------|
| **Primary DB** | MySQL 8.0+ | Existing infrastructure |
| **Schema** | InnoDB engine | Transaction support |
| **ORM** | Sequelize (Node) or SQLAlchemy (Python) | Type-safe queries |

### Infrastructure
| Component | Technology | Notes |
|-----------|-----------|-------|
| **Web Server** | Nginx | Existing setup |
| **Reverse Proxy** | Nginx virtual host | SSL/TLS termination |
| **Container** | Docker (optional) | Isolated deployment |
| **Process Manager** | PM2 or systemd | Auto-restart on failure |

---

## 📊 Database Schema

### Table: `accounts`
```sql
CREATE TABLE accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phone_number VARCHAR(20) NOT NULL UNIQUE,
  country_code VARCHAR(5) NOT NULL,
  platform ENUM('telegram', 'whatsapp') NOT NULL,
  display_name VARCHAR(100),
  status ENUM('active', 'inactive', 'suspended', 'pending') DEFAULT 'pending',
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_active TIMESTAMP,
  keep_alive_enabled BOOLEAN DEFAULT TRUE,
  keep_alive_interval INT DEFAULT 86400, -- seconds (24 hours)
  notes TEXT,
  INDEX idx_platform (platform),
  INDEX idx_status (status),
  INDEX idx_country (country_code)
);
```

### Table: `sessions`
```sql
CREATE TABLE sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  account_id INT NOT NULL,
  session_token TEXT NOT NULL,
  device_model VARCHAR(100),
  device_os VARCHAR(50),
  app_version VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  INDEX idx_account (account_id)
);
```

### Table: `messages`
```sql
CREATE TABLE messages (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  account_id INT NOT NULL,
  platform_message_id VARCHAR(100),
  chat_id VARCHAR(100) NOT NULL,
  chat_name VARCHAR(200),
  sender_id VARCHAR(100),
  sender_name VARCHAR(200),
  content TEXT,
  message_type ENUM('text', 'image', 'video', 'audio', 'document', 'sticker') DEFAULT 'text',
  media_url VARCHAR(500),
  is_outgoing BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  INDEX idx_account_timestamp (account_id, timestamp),
  INDEX idx_chat (chat_id)
);
```

### Table: `keep_alive_logs`
```sql
CREATE TABLE keep_alive_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  account_id INT NOT NULL,
  message_sent VARCHAR(500),
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  INDEX idx_account_date (account_id, sent_at)
);
```

### Table: `contacts`
```sql
CREATE TABLE contacts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  account_id INT NOT NULL,
  contact_id VARCHAR(100) NOT NULL,
  phone_number VARCHAR(20),
  display_name VARCHAR(200),
  platform ENUM('telegram', 'whatsapp') NOT NULL,
  is_favorite BOOLEAN DEFAULT FALSE,
  last_message_at TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  UNIQUE KEY unique_account_contact (account_id, contact_id),
  INDEX idx_account (account_id)
);
```

---

## 🔐 Security Considerations

### Critical Security Requirements

1. **Authentication & Authorization**
   - [ ] Strong password policy for web access
   - [ ] Two-factor authentication (2FA)
   - [ ] Role-based access control (RBAC)
   - [ ] Session timeout (30 minutes inactivity)

2. **Data Protection**
   - [ ] Encrypted database connections (MySQL SSL)
   - [ ] Session tokens stored encrypted
   - [ ] Sensitive data at rest encryption
   - [ ] HTTPS only (TLS 1.3)

3. **API Security**
   - [ ] Rate limiting (prevent abuse)
   - [ ] CORS configuration
   - [ ] Input validation and sanitization
   - [ ] SQL injection prevention (parameterized queries)

4. **Platform Compliance**
   - ⚠️ **Telegram:** Use official API (requires API ID/Hash from Telegram)
   - ⚠️ **WhatsApp:** Unofficial web protocol (risk of account bans)
   - [ ] Respect platform rate limits
   - [ ] Handle account suspensions gracefully

5. **Privacy**
   - [ ] No storage of message content (optional - configurable)
   - [ ] Audit logs for account access
   - [ ] Data retention policies
   - [ ] GDPR compliance (if applicable)

### Known Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| WhatsApp account ban | HIGH | Use official Business API (paid) or accept risk |
| Session hijacking | MEDIUM | Rotate tokens, IP binding, browser fingerprinting |
| Database breach | HIGH | Encryption at rest, regular backups, access logs |
| DDoS attacks | MEDIUM | Cloudflare proxy, rate limiting |
| Phone number exposure | MEDIUM | Never log sensitive data, secure MySQL access |

---

## 🚀 Getting Started

### Prerequisites

- **Server Requirements:**
  - Linux server (Ubuntu 22.04 LTS recommended)
  - 4GB RAM minimum (8GB recommended for 20+ accounts)
  - 50GB storage (SSD preferred)
  - Nginx installed and configured

- **Software Requirements:**
  - Node.js 18+ or Python 3.11+
  - MySQL 8.0+
  - Git
  - Redis (optional, recommended for scaling)

- **API Credentials:**
  - Telegram API ID and API Hash (from https://my.telegram.org)
  - Domain with SSL certificate

### Installation Steps

#### Step 1: Clone Repository
```bash
# Create project directory
mkdir -p /var/www/messaging-platform
cd /var/www/messaging-platform

# Initialize git repository
git init
git remote add origin https://github.com/YOUR_USERNAME/messaging-platform.git
```

#### Step 2: Database Setup
```bash
# Login to MySQL
mysql -u root -p

# Create database
CREATE DATABASE messaging_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Create user (replace with secure password)
CREATE USER 'msgplatform'@'localhost' IDENTIFIED BY 'SECURE_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON messaging_platform.* TO 'msgplatform'@'localhost';
FLUSH PRIVILEGES;

# Import schema
mysql -u msgplatform -p messaging_platform < database/schema.sql
```

#### Step 3: Backend Setup (Node.js Example)
```bash
# Install Node.js dependencies
cd backend
npm install

# Create .env file
cat > .env <<EOF
# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=messaging_platform
DB_USER=msgplatform
DB_PASSWORD=SECURE_PASSWORD_HERE

# Telegram API
TELEGRAM_API_ID=YOUR_API_ID
TELEGRAM_API_HASH=YOUR_API_HASH

# Server
PORT=3000
NODE_ENV=production
SESSION_SECRET=$(openssl rand -base64 32)

# Security
JWT_SECRET=$(openssl rand -base64 32)
ALLOWED_ORIGINS=https://messages.yourdomain.com

# Keep-Alive Settings
DEFAULT_KEEPALIVE_INTERVAL=86400
MAX_ACCOUNTS_PER_USER=50
EOF

# Start server
npm run build
pm2 start dist/server.js --name messaging-platform
pm2 save
```

#### Step 4: Frontend Setup
```bash
cd ../frontend
npm install

# Configure API endpoint
cat > .env.production <<EOF
VITE_API_URL=https://messages.yourdomain.com/api
VITE_WS_URL=wss://messages.yourdomain.com
EOF

# Build for production
npm run build

# Copy build to nginx directory
sudo cp -r dist/* /var/www/messages.yourdomain.com/public/
```

#### Step 5: Nginx Configuration
```nginx
# /etc/nginx/sites-available/messages.yourdomain.com

upstream messaging_backend {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 443 ssl http2;
    server_name messages.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/messages.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/messages.yourdomain.com/privkey.pem;

    # Frontend
    location / {
        root /var/www/messages.yourdomain.com/public;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://messaging_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket
    location /socket.io {
        proxy_pass http://messaging_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name messages.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

```bash
# Enable site and reload nginx
sudo ln -s /etc/nginx/sites-available/messages.yourdomain.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### Step 6: SSL Certificate
```bash
# Using Let's Encrypt
sudo certbot --nginx -d messages.yourdomain.com
```

---

## 📱 Usage Guide

### Adding a New Account

1. **Login to Web Interface**
   - Navigate to https://messages.yourdomain.com
   - Login with credentials

2. **Add Account**
   - Click "Add Account" button
   - Select platform (Telegram or WhatsApp)
   - Enter phone number with country code
   - Wait for verification code (SMS/Call)
   - Enter verification code
   - Account registered!

3. **Configure Keep-Alive**
   - Go to Account Settings
   - Enable "Keep-Alive Messages"
   - Set interval (default: 24 hours)
   - Configure message template

### Managing Multiple Accounts

- **Tab Navigation:** Click account tabs at top
- **Bulk Actions:** Select multiple accounts for operations
- **Search:** Use search bar to find specific accounts
- **Filtering:** Filter by country, platform, status

---

## 🔄 Keep-Alive System

### How It Works

1. **Scheduling**
   - Cron job runs every hour
   - Checks accounts due for keep-alive message
   - Sends message based on configured interval

2. **Message Strategy**
   - Send to "Saved Messages" (Telegram) or self-chat (WhatsApp)
   - Random message templates to appear natural
   - Configurable per account

3. **Monitoring**
   - Dashboard shows last keep-alive timestamp
   - Alerts for failed sends
   - Activity log in database

### Example Keep-Alive Messages
```
"✓ Account active"
"📱 Status check"
"🌍 Travel update"
"⏰ Daily sync"
"👍 Connection test"
```

---

## 📈 Scaling Considerations

### For 10-20 Accounts
- Single server deployment
- MySQL on same server
- 4GB RAM sufficient

### For 50-100 Accounts
- Separate database server
- Redis for session storage
- Load balancer (multiple backend instances)
- 8-16GB RAM

### For 100+ Accounts
- Microservices architecture
- Message queue (RabbitMQ/Redis)
- Dedicated Telegram and WhatsApp workers
- Database replication
- Horizontal scaling with Kubernetes

---

## 🐛 Troubleshooting

### Common Issues

1. **Telegram API Errors**
   - Error: "API ID invalid"
   - Solution: Verify API credentials at https://my.telegram.org

2. **WhatsApp QR Code Not Working**
   - Error: Connection timeout
   - Solution: WhatsApp Web protocol may be blocked, use VPN or proxy

3. **Database Connection Failed**
   - Error: "ER_ACCESS_DENIED"
   - Solution: Check MySQL user permissions

4. **Keep-Alive Not Sending**
   - Check cron job is running: `pm2 logs`
   - Verify account status is "active"
   - Check MySQL `keep_alive_logs` table for errors

---

## 📝 Development Roadmap

### Month 1: MVP Development
- Week 1: Database schema, backend API setup
- Week 2: Telegram integration, authentication
- Week 3: WhatsApp integration, session management
- Week 4: Frontend development, deployment

### Month 2: Testing & Enhancement
- Week 1: Multi-account testing (10+ accounts)
- Week 2: Keep-alive system implementation
- Week 3: Security hardening, bug fixes
- Week 4: Documentation, user guide

### Month 3: Production & Monitoring
- Week 1: Production deployment
- Week 2: User training, feedback collection
- Week 3: Performance optimization
- Week 4: Advanced features (media support, groups)

---

## 💡 Best Practices

### Account Management
- Rotate phone numbers gradually (add 2-3 per day)
- Use different IP addresses for registration (VPN recommended)
- Don't exceed 50 accounts per server to avoid detection
- Keep country codes organized in database for easy filtering

### Message Handling
- Archive old messages after 90 days (configurable)
- Use pagination for large chat histories
- Compress media files before storage
- Implement message queue for high-volume sending

### Monitoring
- Set up alerts for:
  - Account suspensions
  - Failed keep-alive messages
  - Database connection errors
  - High memory usage
- Daily backup of MySQL database
- Weekly review of activity logs

---

## 📚 Resources

### Official Documentation
- [Telegram API Documentation](https://core.telegram.org/)
- [Telethon Python Library](https://docs.telethon.dev/)
- [Baileys WhatsApp Client](https://github.com/WhiskeySockets/Baileys)
- [MySQL 8.0 Reference](https://dev.mysql.com/doc/refman/8.0/en/)

### Community
- [Telegram Bot Developers](https://t.me/BotDevelopment)
- [WhatsApp Web.js GitHub](https://github.com/pedroslopez/whatsapp-web.js)

### Security
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

---

## ⚖️ Legal & Compliance

### Terms of Service Compliance

⚠️ **Important:** Using automated clients may violate platform Terms of Service:

- **Telegram:** Official API is allowed, but automation restrictions apply
- **WhatsApp:** Unofficial clients violate ToS, accounts may be banned
  - **Recommended:** Use WhatsApp Business API (official, paid)
  - **Alternative:** Accept risk with reverse-engineered clients

### Disclaimer

This software is provided for educational and personal use only. Users are responsible for:
- Compliance with local laws and regulations
- Respecting platform Terms of Service
- Protecting user privacy and data
- Any consequences of automated messaging

---

## 📞 Support & Contact

For technical support or questions about this project:
- Create an issue in GitHub repository
- Email: [Your email]
- Documentation: See `docs/` folder

---

## ✅ Pre-Launch Checklist

Before deploying to production:

- [ ] Database schema created and tested
- [ ] Telegram API credentials obtained
- [ ] SSL certificate installed
- [ ] Nginx configuration tested
- [ ] Backend API security reviewed
- [ ] Frontend build optimized
- [ ] Keep-alive system tested with 5+ accounts
- [ ] Backup strategy implemented
- [ ] Monitoring and alerts configured
- [ ] User documentation written
- [ ] Security audit completed
- [ ] Load testing performed (simulate 20+ accounts)

---

## 🎉 Next Steps

1. **Review this document** and customize based on your specific needs
2. **Set up development environment** on local machine or test server
3. **Obtain Telegram API credentials** from https://my.telegram.org
4. **Create MySQL database** and import schema
5. **Start with MVP features** (single account, basic messaging)
6. **Test extensively** before adding multiple accounts
7. **Deploy to production** with proper monitoring

---

**Last Updated:** 2026-01-08
**Version:** 1.0.0
**Status:** Ready for Development

**This document should be the starting point for your new GitHub repository. Customize as needed!**
