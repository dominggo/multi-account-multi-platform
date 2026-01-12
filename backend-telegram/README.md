# Telegram Backend Service

Python-based backend service for Telegram account management using Telethon.

## Features

- Multi-account authentication and management
- Real-time message receiving via WebSocket
- Message sending
- Chat list retrieval
- Session persistence
- 2FA support

## Setup

### 1. Install Dependencies

```bash
cd backend-telegram
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your credentials
```

Required configuration:
- Get Telegram API credentials from https://my.telegram.org
- Configure MySQL database connection
- Set allowed CORS origins

### 3. Run the Service

```bash
# Development mode with auto-reload
python main.py

# Or with uvicorn directly
uvicorn main:app --reload --port 8001
```

The service will be available at http://localhost:8001

## API Endpoints

### Authentication

1. **POST /auth/request-code**
   - Request verification code for phone number
   - Body: `{"phone_number": "+1234567890"}`

2. **POST /auth/verify-code**
   - Verify the received code
   - Body: `{"phone_number": "+1234567890", "code": "12345", "phone_code_hash": "..."}`

3. **POST /auth/verify-password**
   - Verify 2FA password (if required)
   - Body: `{"phone_number": "+1234567890", "password": "your_password"}`

### Account Management

4. **GET /account/status/{phone_number}**
   - Get account connection status and user info

5. **POST /account/disconnect/{phone_number}**
   - Disconnect an account

### Messaging

6. **POST /message/send**
   - Send a message
   - Body: `{"phone_number": "+1234567890", "chat_id": "username", "message": "Hello"}`

7. **GET /chats/{phone_number}**
   - Get recent chats
   - Query param: `limit` (default: 20)

### WebSocket

8. **WS /ws/{phone_number}**
   - Real-time message updates for an account

## Directory Structure

```
backend-telegram/
├── main.py              # Main FastAPI application
├── requirements.txt     # Python dependencies
├── .env.example        # Environment template
├── sessions/           # Telegram session files
└── logs/              # Application logs
```

## Security Notes

- Session files contain authentication tokens - keep them secure
- Never commit .env files to version control
- Use strong API secret keys in production
- Enable HTTPS in production environment

## Troubleshooting

### "API ID/Hash invalid"
- Verify credentials at https://my.telegram.org
- Ensure API_ID is an integer, not a string

### "Session file errors"
- Delete session files in `sessions/` directory
- Re-authenticate the account

### "Database connection failed"
- Check MySQL credentials in .env
- Ensure MySQL server is running
- Verify database exists and user has permissions
