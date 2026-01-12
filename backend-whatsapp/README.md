# WhatsApp Backend Service

Node.js/TypeScript backend service for WhatsApp account management using Baileys library.

## Features

- Multi-account authentication via QR code
- Real-time message receiving via Socket.io
- Message sending
- Chat list retrieval
- Session persistence
- Multi-device support

## Setup

### 1. Install Dependencies

```bash
cd backend-whatsapp
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Run the Service

```bash
# Development mode with auto-reload
npm run dev

# Build TypeScript
npm run build

# Production mode
npm start
```

The service will be available at http://localhost:8002

## API Endpoints

### Authentication

1. **POST /auth/start**
   - Start authentication and generate QR code
   - Body: `{"phone_number": "+1234567890"}`
   - Response includes base64 QR code image

2. **GET /auth/qr/:phone_number**
   - Get current QR code for a phone number
   - Returns QR code if still pending scan

### Account Management

3. **GET /account/status/:phone_number**
   - Get account connection status and user info

4. **POST /account/disconnect/:phone_number**
   - Disconnect and logout an account

### Messaging

5. **POST /message/send**
   - Send a message
   - Body: `{"phone_number": "+1234567890", "chat_id": "1234567890@s.whatsapp.net", "message": "Hello"}`

6. **GET /chats/:phone_number**
   - Get recent chats for an account

### Socket.io Events

**Server → Client Events:**
- `qr-code` - New QR code generated
- `connection-status` - Connection status changed
- `new-message` - New message received

**Client → Server Events:**
- `get-status` - Request connection status for a phone number

## Authentication Flow

1. Client calls `POST /auth/start` with phone number
2. Server generates QR code and returns it
3. User scans QR code with WhatsApp mobile app
4. Server detects successful connection
5. Session is saved for future use

## Directory Structure

```
backend-whatsapp/
├── src/
│   └── index.ts         # Main application
├── dist/               # Compiled JavaScript
├── sessions/           # WhatsApp session files
├── logs/              # Application logs
├── package.json       # Dependencies
├── tsconfig.json      # TypeScript config
└── .env.example       # Environment template
```

## Security Notes

- Session files contain authentication credentials - keep them secure
- Never commit .env or session files to version control
- Use HTTPS in production
- Implement rate limiting for API endpoints
- Validate all user inputs

## Known Limitations

⚠️ **Important:** WhatsApp does not officially support third-party clients. Using this service may result in:
- Account bans or suspensions
- Service interruptions
- Terms of Service violations

**Recommendations:**
- Use with dedicated phone numbers (not personal accounts)
- Consider WhatsApp Business API for production use
- Monitor account health regularly
- Have backup communication channels

## Troubleshooting

### QR Code not generated
- Check logs for errors
- Ensure session directory is writable
- Try deleting old session files

### Connection keeps dropping
- Check network stability
- Review WhatsApp's rate limits
- Ensure only one instance per phone number

### Messages not sending
- Verify account is connected (`GET /account/status`)
- Check chat_id format (must include @s.whatsapp.net)
- Ensure message content is valid
