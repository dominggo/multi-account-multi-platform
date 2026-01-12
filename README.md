# Multi-Account Messaging Platform

**Unified Telegram & WhatsApp Web Client** for managing multiple accounts from different countries.

A web-based multi-account messaging client designed for travelers with multiple international SIM cards who need to manage Telegram and WhatsApp accounts across devices.

## Features

- Multi-account support for both Telegram and WhatsApp
- Web-based interface accessible from anywhere
- Real-time messaging with WebSocket support
- Automated keep-alive system to prevent account deactivation
- Message history persistence in MySQL database
- Multi-tab interface for simultaneous account management
- Session management and device registration

## Architecture

The project uses a **hybrid microservices architecture**:

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **API Gateway**: Node.js + Express (authentication & routing)
- **Telegram Backend**: Python + Telethon (official API)
- **WhatsApp Backend**: Node.js + Baileys (web protocol)
- **Database**: MariaDB/MySQL 10.11+
- **Web Server**: Nginx (reverse proxy)

## Deployment Architecture (Proxmox t730)

```
proxmox_t730 (192.168.5.15)
│
├── [EXISTING] LXC 106 - Nginx (192.168.5.17)
│   └── Reverse proxy for all services
│
├── [EXISTING] LXC 107 - MariaDB (192.168.5.20)
│   └── Shared database server
│
├── [NEW] LXC 113 - Telegram Backend (192.168.5.113:8001)
│   ├── Python 3.11 + Telethon
│   └── 1GB RAM, 1 core, 15GB disk
│
├── [NEW] LXC 114 - WhatsApp Backend (192.168.5.114:8002)
│   ├── Node.js 18 + Baileys
│   └── 1GB RAM, 1 core, 15GB disk
│
└── [NEW] LXC 115 - API Gateway + Frontend (192.168.5.115:3000)
    ├── Node.js 18 + Express + React
    └── 1GB RAM, 1 core, 10GB disk
```

## Quick Start

### For Proxmox Infrastructure

**Deployment Guide:** 👉 **[PROXMOX_DEPLOYMENT.md](./PROXMOX_DEPLOYMENT.md)** 👈

This guide provides step-by-step instructions for deploying on your existing **proxmox_t730** infrastructure:

**What it does:**
- Uses your existing LXC 107 (MariaDB) - adds one new database
- Uses your existing LXC 106 (Nginx) - adds one virtual host
- Creates 3 new lightweight LXC containers
- Optimized for limited RAM (only 3GB total needed)

**Prerequisites:**
- Proxmox VE with existing Nginx and MariaDB
- Telegram API credentials from https://my.telegram.org
- Basic command line knowledge

**Estimated setup time:** 1-2 hours

## Project Structure

```
multi-account-multi-platform/
├── frontend/                 # React + Vite frontend
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
├── backend-api/             # API Gateway (Node.js)
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
├── backend-telegram/        # Telegram service (Python)
│   ├── main.py
│   ├── requirements.txt
│   └── sessions/
├── backend-whatsapp/        # WhatsApp service (Node.js)
│   ├── src/
│   ├── package.json
│   └── sessions/
├── database/                # Database schema
│   └── schema.sql
├── .env.example            # Environment template
├── ONBOARDING.md           # Comprehensive project documentation
└── PROXMOX_DEPLOYMENT.md   # Step-by-step deployment guide
```

## Configuration

### Telegram API Credentials

1. Visit https://my.telegram.org
2. Login with your phone number
3. Go to "API Development Tools"
4. Create a new application
5. Copy `api_id` and `api_hash` to your `.env` file

### Environment Variables

Key configuration in each service's `.env` file:

- `TELEGRAM_API_ID` - Your Telegram API ID
- `TELEGRAM_API_HASH` - Your Telegram API Hash
- `DB_HOST` - MariaDB server IP (192.168.5.20)
- `DB_NAME` - Database name (messaging_platform)
- `JWT_SECRET` - Secret for JWT tokens
- `SESSION_SECRET` - Secret for sessions

See each service's `.env.example` for full configuration options.

## Usage

### Adding a Telegram Account

1. Navigate to the web interface (http://192.168.5.17)
2. Click "Add Account" → Select "Telegram"
3. Enter phone number with country code (e.g., +1234567890)
4. Enter the verification code sent to your Telegram
5. If 2FA is enabled, enter your password
6. Account connected!

### Adding a WhatsApp Account

1. Click "Add Account" → Select "WhatsApp"
2. Enter phone number
3. Scan the QR code with WhatsApp on your phone
4. Account will be connected automatically

### Keep-Alive System

The keep-alive system automatically sends messages to prevent account deactivation:

- Configurable interval (default: 24 hours)
- Sends to "Saved Messages" (Telegram) or self-chat (WhatsApp)
- Random message templates to appear natural
- Monitors and logs all activity

## Security Considerations

⚠️ **Important Security Notes**:

1. **Never commit `.env` files** or session data to version control
2. **Use strong passwords** for database and JWT secrets
3. **Enable HTTPS** in production (use Nginx with SSL)
4. **WhatsApp risk**: Unofficial clients may violate ToS and result in bans
5. **Telegram**: Use official API only, respect rate limits
6. **Database**: Use encrypted connections in production
7. **Regular backups**: Backup database and session files

## Known Limitations

### WhatsApp

⚠️ Using WhatsApp via unofficial clients (Baileys) may result in:
- Account bans or suspensions
- Service interruptions
- Terms of Service violations

**Recommendations:**
- Use dedicated phone numbers (not personal accounts)
- Consider WhatsApp Business API for production
- Monitor account health regularly

### Telegram

- Requires official API credentials
- Subject to Telegram's rate limits
- 2FA accounts need additional authentication step

## Troubleshooting

### MariaDB Connection Failed

```bash
# Test connection from new LXC
pct enter 113  # or 114, 115
mysql -h 192.168.5.20 -u msgplatform -p messaging_platform
```

### Telegram API Errors

- Verify API credentials at https://my.telegram.org
- Ensure `TELEGRAM_API_ID` is correctly set in `.env`
- Check session files in `sessions/` directory

### WhatsApp QR Code Not Generated

- Check backend logs: `pct enter 114` then `pm2 logs whatsapp-backend`
- Delete old session files in `sessions/` directory
- Ensure only one instance per phone number

### Service Not Starting

```bash
# Check service status
pct enter 113
systemctl status telegram-backend
journalctl -u telegram-backend -f

# For Node.js services (WhatsApp, API)
pct enter 114
pm2 status
pm2 logs whatsapp-backend
```

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
git pull && npm install && npm run build
pm2 restart whatsapp-backend
exit

# Update API Gateway
pct enter 115
cd /opt/messaging-platform/api
git pull && npm install && npm run build
pm2 restart api-gateway
exit
```

### Check Logs

```bash
# Telegram
pct enter 113 && journalctl -u telegram-backend -f

# WhatsApp
pct enter 114 && pm2 logs whatsapp-backend

# API Gateway
pct enter 115 && pm2 logs api-gateway

# Nginx
pct enter 106 && tail -f /var/log/nginx/messaging-error.log
```

### Backup

```bash
# Backup all containers
vzdump 113 114 115 --storage local --mode snapshot --compress zstd

# Backup database
pct enter 107
mysqldump -u msgplatform -p messaging_platform > /backup/messaging_$(date +%Y%m%d).sql
exit
```

## Documentation

### Main Guides
- **[ONBOARDING.md](./ONBOARDING.md)** - Comprehensive project documentation with architecture diagrams
- **[PROXMOX_DEPLOYMENT.md](./PROXMOX_DEPLOYMENT.md)** - Step-by-step deployment guide for Proxmox

### Service Documentation
- **[backend-telegram/README.md](./backend-telegram/README.md)** - Telegram service details
- **[backend-whatsapp/README.md](./backend-whatsapp/README.md)** - WhatsApp service details

## Roadmap

### Phase 1: MVP (Current)
- [x] Multi-account authentication (Telegram & WhatsApp)
- [x] Basic messaging APIs
- [x] Database schema
- [x] Deployment guide for Proxmox
- [ ] Full web interface implementation
- [ ] Keep-alive automation system

### Phase 2: Enhanced Features
- [ ] Media file support (images, videos, documents)
- [ ] Group chat management
- [ ] Account status dashboard
- [ ] Usage statistics per account

### Phase 3: Advanced Features
- [ ] Auto-reply templates
- [ ] Scheduled messages
- [ ] Analytics and reporting
- [ ] API webhooks

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is provided for **educational and personal use only**.

### Disclaimer

Users are responsible for:
- Compliance with local laws and regulations
- Respecting platform Terms of Service (Telegram, WhatsApp)
- Protecting user privacy and data
- Any consequences of automated messaging

**WhatsApp**: Unofficial clients may violate WhatsApp's Terms of Service.
**Telegram**: Automation must comply with Telegram's Bot API policies.

## Support

- **Issues**: https://github.com/dominggo/multi-account-multi-platform/issues
- **Documentation**: See ONBOARDING.md and PROXMOX_DEPLOYMENT.md
- **Infrastructure**: Based on proxmox_t730 (see allhost.md for full details)

## Acknowledgments

- [Telethon](https://docs.telethon.dev/) - Telegram client library
- [Baileys](https://github.com/WhiskeySockets/Baileys) - WhatsApp web client
- [React](https://react.dev/) - Frontend framework
- [FastAPI](https://fastapi.tiangolo.com/) - Python web framework
- [Express](https://expressjs.com/) - Node.js web framework

---

**Status**: 🚧 Ready for Deployment
**Version**: 1.0.0
**Last Updated**: 2026-01-12
**Target Infrastructure**: Proxmox t730 (192.168.5.15)

For detailed setup instructions, see [PROXMOX_DEPLOYMENT.md](./PROXMOX_DEPLOYMENT.md).
