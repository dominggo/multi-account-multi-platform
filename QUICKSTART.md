# Quick Start Guide

Get your multi-account messaging platform running in 10 minutes!

## Prerequisites Check

Before starting, ensure you have:

- [ ] **Node.js 18+** installed → `node --version`
- [ ] **Python 3.11+** installed → `python --version`
- [ ] **MySQL 8.0+** running → `mysql --version`
- [ ] **Telegram API credentials** from https://my.telegram.org

## Step-by-Step Setup

### 1. Get Telegram API Credentials (5 minutes)

1. Visit https://my.telegram.org
2. Login with your phone number
3. Click "API Development Tools"
4. Fill in application details:
   - App title: `My Messaging Platform`
   - Short name: `msgplatform`
   - Platform: `Other`
5. Copy your `api_id` and `api_hash`

### 2. Database Setup (2 minutes)

```bash
# Login to MySQL
mysql -u root -p

# Run these commands in MySQL:
CREATE DATABASE messaging_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'msgplatform'@'localhost' IDENTIFIED BY 'YourSecurePassword123!';
GRANT ALL PRIVILEGES ON messaging_platform.* TO 'msgplatform'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Import schema
mysql -u msgplatform -p messaging_platform < database/schema.sql
```

### 3. Environment Configuration (2 minutes)

```bash
# Copy environment template
cp .env.example .env

# Generate secrets
echo "JWT_SECRET=$(openssl rand -base64 32)"
echo "SESSION_SECRET=$(openssl rand -base64 32)"
echo "API_SECRET_KEY=$(openssl rand -base64 32)"

# Edit .env and fill in:
# - DB_PASSWORD (from step 2)
# - TELEGRAM_API_ID (from step 1)
# - TELEGRAM_API_HASH (from step 1)
# - JWT_SECRET, SESSION_SECRET, API_SECRET_KEY (from above commands)
```

### 4. Install Dependencies (3-5 minutes)

```bash
# Backend services
cd backend-telegram && pip install -r requirements.txt && cd ..
cd backend-whatsapp && npm install && cd ..
cd backend-api && npm install && cd ..
cd frontend && npm install && cd ..
```

### 5. Configure Each Service

```bash
# Telegram Backend
cd backend-telegram
cp .env.example .env
# Copy credentials from root .env
cd ..

# WhatsApp Backend
cd backend-whatsapp
cp .env.example .env
# Copy credentials from root .env
cd ..

# API Gateway
cd backend-api
cp .env.example .env
# Copy credentials from root .env
cd ..
```

### 6. Start All Services

Open **4 terminal windows**:

**Terminal 1 - Telegram Backend:**
```bash
cd backend-telegram
python main.py
```
Wait for: `Telegram Backend starting...`

**Terminal 2 - WhatsApp Backend:**
```bash
cd backend-whatsapp
npm run dev
```
Wait for: `WhatsApp Backend running at http://0.0.0.0:8002`

**Terminal 3 - API Gateway:**
```bash
cd backend-api
npm run dev
```
Wait for: `API Gateway running at http://0.0.0.0:3000`

**Terminal 4 - Frontend:**
```bash
cd frontend
npm run dev
```
Wait for: `Local: http://localhost:5173/`

### 7. Access the Application

Open your browser and go to: **http://localhost:5173**

You should see the Multi-Account Messaging Platform welcome page!

## Testing the Setup

### Test 1: Backend Health Checks

```bash
# Test Telegram backend
curl http://localhost:8001/

# Test WhatsApp backend
curl http://localhost:8002/

# Test API Gateway
curl http://localhost:3000/
```

All should return JSON with `"status": "running"`

### Test 2: Add Your First Telegram Account

1. Go to http://localhost:5173 (when UI is implemented)
2. Click "Add Account" → "Telegram"
3. Enter phone: `+1234567890`
4. Enter code from Telegram
5. Account connected!

## Troubleshooting

### "Port already in use"

```bash
# Find and kill process on port 3000 (example)
# On Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# On Mac/Linux:
lsof -i :3000
kill -9 <PID>
```

### "Database connection failed"

```bash
# Check MySQL is running
# Windows:
sc query MySQL80

# Mac:
brew services list

# Linux:
systemctl status mysql

# Test connection manually
mysql -u msgplatform -p -h localhost messaging_platform
```

### "Python packages not found"

```bash
# Make sure you're using Python 3.11+
python --version

# Install in a virtual environment (recommended)
cd backend-telegram
python -m venv venv
source venv/bin/activate  # Mac/Linux
# or
venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

### "npm ERR! code ENOENT"

```bash
# Clear npm cache and reinstall
cd backend-whatsapp  # or backend-api, frontend
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

## Next Steps

1. **Read ONBOARDING.md** for detailed architecture and features
2. **Implement the full UI** - current frontend is just a placeholder
3. **Set up Keep-Alive system** - configure automated messaging
4. **Add authentication** - create user login for web interface
5. **Deploy to production** - use nginx, SSL, Docker

## Need Help?

- Check **README.md** for full documentation
- See **ONBOARDING.md** for architecture details
- Open an issue on GitHub
- Review service-specific README files in each backend folder

## Security Reminders

- Never commit `.env` files
- Use strong passwords for database
- Keep Telegram API credentials private
- Enable HTTPS in production
- Regular database backups

---

**Estimated Setup Time**: 10-15 minutes (excluding dependency downloads)

**Stuck?** Most issues are environment-related. Double-check:
1. All prerequisites are installed
2. MySQL is running
3. Environment variables are set correctly
4. Ports 3000, 5173, 8001, 8002 are available
