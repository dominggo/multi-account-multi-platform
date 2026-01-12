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
- **Database**: MySQL 8.0+ with InnoDB
- **Optional**: Redis for session caching

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
├── docker-compose.yml       # Docker orchestration
├── .env.example            # Environment template
└── ONBOARDING.md           # Detailed documentation
```

## Quick Start

### Prerequisites

- **Node.js 18+** (for WhatsApp backend & API gateway & frontend)
- **Python 3.11+** (for Telegram backend)
- **MySQL 8.0+** (or use Docker)
- **Git**
- **Telegram API credentials** from https://my.telegram.org

### Option 1: Using Existing MySQL

#### 1. Clone the Repository

```bash
git clone https://github.com/dominggo/multi-account-multi-platform.git
cd multi-account-multi-platform
```

#### 2. Set Up Environment

```bash
cp .env.example .env
# Edit .env with your actual credentials
```

Required configuration:
- MySQL database credentials
- Telegram API ID and Hash (from https://my.telegram.org)
- JWT and session secrets (use `openssl rand -base64 32`)

#### 3. Set Up Database

```bash
# Login to MySQL
mysql -u root -p

# Create database and user
CREATE DATABASE messaging_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'msgplatform'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON messaging_platform.* TO 'msgplatform'@'localhost';
FLUSH PRIVILEGES;

# Import schema
mysql -u msgplatform -p messaging_platform < database/schema.sql
```

#### 4. Install Dependencies

```bash
# Telegram backend (Python)
cd backend-telegram
pip install -r requirements.txt
cd ..

# WhatsApp backend (Node.js)
cd backend-whatsapp
npm install
cd ..

# API Gateway (Node.js)
cd backend-api
npm install
cd ..

# Frontend (React)
cd frontend
npm install
cd ..
```

#### 5. Start Services

Open **4 separate terminals**:

```bash
# Terminal 1: Telegram Backend
cd backend-telegram
cp .env.example .env  # Edit with your config
python main.py

# Terminal 2: WhatsApp Backend
cd backend-whatsapp
cp .env.example .env  # Edit with your config
npm run dev

# Terminal 3: API Gateway
cd backend-api
cp .env.example .env  # Edit with your config
npm run dev

# Terminal 4: Frontend
cd frontend
npm run dev
```

#### 6. Access the Application

Open your browser and navigate to:
- **Frontend**: http://localhost:5173
- **API Gateway**: http://localhost:3000
- **Telegram Backend**: http://localhost:8001
- **WhatsApp Backend**: http://localhost:8002

### Option 2: Using Docker Compose

```bash
# Copy environment file
cp .env.example .env
# Edit .env with your credentials

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

Services will be available at the same ports as Option 1.

## Configuration

### Telegram API Credentials

1. Visit https://my.telegram.org
2. Login with your phone number
3. Go to "API Development Tools"
4. Create a new application
5. Copy `api_id` and `api_hash` to your `.env` file

### Environment Variables

See `.env.example` for all available configuration options. Key variables:

- `TELEGRAM_API_ID` - Your Telegram API ID
- `TELEGRAM_API_HASH` - Your Telegram API Hash
- `DB_*` - Database connection settings
- `JWT_SECRET` - Secret for JWT tokens
- `SESSION_SECRET` - Secret for sessions

## Usage

### Adding a Telegram Account

1. Navigate to the web interface
2. Click "Add Account" → Select "Telegram"
3. Enter phone number with country code (e.g., +1234567890)
4. Enter the verification code sent to your Telegram
5. If 2FA is enabled, enter your password

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
3. **Enable HTTPS** in production (use nginx reverse proxy)
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

**Recommendations**:
- Use dedicated phone numbers (not personal accounts)
- Consider WhatsApp Business API for production
- Monitor account health regularly

### Telegram

- Requires official API credentials
- Subject to Telegram's rate limits
- 2FA accounts need additional authentication step

## Troubleshooting

### Database Connection Failed

```bash
# Check MySQL is running
systemctl status mysql  # Linux
# or
brew services list  # macOS

# Test connection
mysql -u msgplatform -p -h localhost messaging_platform
```

### Telegram API Errors

- Verify API credentials at https://my.telegram.org
- Ensure `TELEGRAM_API_ID` is a number, not a string
- Check session files in `backend-telegram/sessions/`

### WhatsApp QR Code Not Generated

- Check backend logs: `npm run dev` output
- Delete old session files in `backend-whatsapp/sessions/`
- Ensure only one instance per phone number

### Port Already in Use

```bash
# Find process using port (example: 3000)
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill the process or change port in .env
```

## Development

### Running Tests

```bash
# Backend tests (when implemented)
cd backend-api
npm test

# Frontend tests
cd frontend
npm test
```

### Building for Production

```bash
# Build all services
cd backend-api && npm run build
cd ../backend-whatsapp && npm run build
cd ../frontend && npm run build
```

### Code Quality

```bash
# Lint backend
cd backend-api && npm run lint
cd backend-whatsapp && npm run lint

# Format code (if configured)
npm run format
```

## Documentation

- **[ONBOARDING.md](./ONBOARDING.md)** - Comprehensive project documentation
- **[backend-telegram/README.md](./backend-telegram/README.md)** - Telegram service docs
- **[backend-whatsapp/README.md](./backend-whatsapp/README.md)** - WhatsApp service docs

## Roadmap

### Phase 1: MVP (Current)
- [x] Multi-account authentication (Telegram & WhatsApp)
- [x] Basic messaging
- [x] Database schema
- [ ] Web interface implementation
- [ ] Keep-alive system

### Phase 2: Enhanced Features
- [ ] Media file support
- [ ] Group chat management
- [ ] Account dashboard
- [ ] Usage statistics

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
- **Documentation**: See `docs/` folder and ONBOARDING.md
- **Email**: [Your email]

## Acknowledgments

- [Telethon](https://docs.telethon.dev/) - Telegram client library
- [Baileys](https://github.com/WhiskeySockets/Baileys) - WhatsApp web client
- [React](https://react.dev/) - Frontend framework
- [FastAPI](https://fastapi.tiangolo.com/) - Python web framework
- [Express](https://expressjs.com/) - Node.js web framework

---

**Status**: 🚧 In Development
**Version**: 1.0.0
**Last Updated**: 2026-01-12

For detailed setup instructions and architecture documentation, see [ONBOARDING.md](./ONBOARDING.md).
