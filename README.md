# Multi-Account Messaging Platform

**Unified Telegram & WhatsApp Web Client** for managing multiple accounts from different countries.

A web-based multi-account messaging client designed for travelers with multiple international SIM cards.

## Features

- Multi-account support for Telegram and WhatsApp
- Web-based interface accessible from anywhere
- Real-time messaging with WebSocket support
- Automated keep-alive system to prevent account deactivation
- Message history persistence in MySQL database
- Multi-tab interface for simultaneous account management

## Architecture

```
proxmox_t730 (192.168.5.15)
│
├── LXC 106 - Nginx (192.168.5.17)
│   └── Reverse proxy for all services
│
├── LXC 107 - MariaDB (192.168.5.20)
│   └── Database: messaging_platform
│
├── LXC 108 - API Gateway + Frontend (192.168.5.108:3000)
│   └── Node.js 20 + Express + React
│
├── LXC 113 - Telegram Backend (192.168.5.113:8001)
│   └── Python 3.11 + Telethon + FastAPI
│
└── LXC 114 - WhatsApp Backend (192.168.5.114:8002)
    └── Node.js 20 + Baileys
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React + TypeScript + Vite + Tailwind CSS |
| API Gateway | Node.js 20 + Express |
| Telegram Backend | Python 3.11 + Telethon + FastAPI |
| WhatsApp Backend | Node.js 20 + Baileys |
| Database | MariaDB 10.11 |
| Web Server | Nginx |

## Quick Start

See **[PROXMOX_DEPLOYMENT.md](./PROXMOX_DEPLOYMENT.md)** for step-by-step deployment instructions.

### Prerequisites

- Proxmox VE with existing Nginx (LXC 106) and MariaDB (LXC 107)
- Telegram API credentials from https://my.telegram.org
- 3GB RAM, 3 CPU cores, 40GB disk for new containers

## Project Structure

```
multi-account-multi-platform/
├── frontend/              # React + Vite frontend
├── backend-api/           # API Gateway (Node.js)
├── backend-telegram/      # Telegram service (Python)
├── backend-whatsapp/      # WhatsApp service (Node.js)
├── database/              # Database schema
└── PROXMOX_DEPLOYMENT.md  # Deployment guide
```

## Configuration

### Environment Variables

Each service has its own `.env` file. Key variables:

- `TELEGRAM_API_ID` / `TELEGRAM_API_HASH` - From https://my.telegram.org
- `DB_HOST` - MariaDB server (192.168.5.20)
- `DB_NAME` - Database name (messaging_platform)
- `JWT_SECRET` - Secret for JWT tokens

## Usage

### Adding Accounts

1. **Telegram**: Enter phone number → Receive code → Enter code → Connected
2. **WhatsApp**: Enter phone number → Scan QR code → Connected

### Keep-Alive System

- Configurable interval (default: 24 hours)
- Sends to "Saved Messages" (Telegram) or self-chat (WhatsApp)
- Prevents account deactivation due to inactivity

## Security

- Never commit `.env` files to version control
- Use strong passwords for database and JWT secrets
- Enable HTTPS in production
- WhatsApp: Unofficial clients may result in bans

## Maintenance

```bash
# Update services
pct enter 113 && cd /opt/telegram-backend && git pull && systemctl restart telegram-backend
pct enter 114 && cd /opt/whatsapp-backend && git pull && npm install && systemctl restart whatsapp-backend
pct enter 108 && cd /opt/api-gateway && git pull && npm install && systemctl restart api-gateway

# Backup
vzdump 108 113 114 --storage local --mode snapshot --compress zstd
```

## License

Educational and personal use only. Users are responsible for platform ToS compliance.

---

**Status**: In Development
**Infrastructure**: Proxmox t730 (192.168.5.15)
