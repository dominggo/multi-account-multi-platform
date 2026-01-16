/**
 * WhatsApp Backend Service
 * Handles WhatsApp account management and messaging using Baileys
 */

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import { createServer } from 'http';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  isJidBroadcast,
  isJidStatusBroadcast,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import pino from 'pino';

// Load environment variables
dotenv.config();

// Configuration
const HOST = process.env.HOST || '0.0.0.0';
const PORT = parseInt(process.env.PORT || '8002');
const SESSION_DIR = process.env.SESSION_DIR || './sessions';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'];
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// Ensure directories exist
if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
}
if (!fs.existsSync('./logs')) {
  fs.mkdirSync('./logs', { recursive: true });
}

// Logger
const logger = pino({
  level: LOG_LEVEL,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
    },
  },
});

// Express app
const app: Express = express();
const httpServer = createServer(app);

// Socket.io for real-time updates
const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory storage for active WhatsApp sockets
const activeSessions = new Map<string, WASocket>();
const sessionQRCodes = new Map<string, string>();

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Sanitize phone number for session directory name
 */
function sanitizePhoneNumber(phone: string): string {
  return phone.replace(/[^0-9]/g, '');
}

/**
 * Get session directory for a phone number
 */
function getSessionDir(phone: string): string {
  return path.join(SESSION_DIR, sanitizePhoneNumber(phone));
}

/**
 * Create WhatsApp socket connection
 */
async function createWhatsAppSocket(phoneNumber: string): Promise<WASocket> {
  const sessionDir = getSessionDir(phoneNumber);

  // Create auth state
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

  // Create socket
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }), // Reduce baileys logging
    browser: ['Multi-Account Platform', 'Chrome', '120.0.0'],
  });

  // Event: Connection update
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // QR Code received
    if (qr) {
      try {
        const qrDataURL = await QRCode.toDataURL(qr);
        sessionQRCodes.set(phoneNumber, qrDataURL);
        logger.info(`QR Code generated for ${phoneNumber}`);

        // Emit QR code via Socket.io
        io.emit('qr-code', { phoneNumber, qrCode: qrDataURL });
      } catch (err) {
        logger.error(`Failed to generate QR code for ${phoneNumber}:`, err);
      }
    }

    // Connection closed
    if (connection === 'close') {
      const shouldReconnect =
        (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;

      logger.info(
        `Connection closed for ${phoneNumber}. Reconnecting: ${shouldReconnect}`
      );

      if (shouldReconnect) {
        // Retry connection
        setTimeout(() => {
          createWhatsAppSocket(phoneNumber);
        }, 5000);
      } else {
        // Logged out - remove session
        activeSessions.delete(phoneNumber);
        sessionQRCodes.delete(phoneNumber);
      }
    }

    // Connection open
    if (connection === 'open') {
      logger.info(`WhatsApp connected for ${phoneNumber}`);
      sessionQRCodes.delete(phoneNumber);

      // Store active session
      activeSessions.set(phoneNumber, sock);

      // Emit connection status
      io.emit('connection-status', {
        phoneNumber,
        status: 'connected',
      });
    }
  });

  // Event: Save credentials
  sock.ev.on('creds.update', saveCreds);

  // Event: New messages
  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      if (!msg.message) continue;

      // Ignore broadcast messages
      if (isJidBroadcast(msg.key.remoteJid || '')) continue;
      if (isJidStatusBroadcast(msg.key.remoteJid || '')) continue;

      const messageData = {
        phoneNumber,
        chatId: msg.key.remoteJid,
        messageId: msg.key.id,
        fromMe: msg.key.fromMe,
        message: msg.message,
        timestamp: msg.messageTimestamp,
      };

      logger.info(`New message for ${phoneNumber} from ${msg.key.remoteJid}`);

      // Emit message via Socket.io
      io.emit('new-message', messageData);

      // TODO: Save to database
    }
  });

  return sock;
}

// ============================================================================
// API Routes
// ============================================================================

/**
 * Health check
 */
app.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'WhatsApp Backend',
    status: 'running',
    version: '1.0.0',
    active_accounts: activeSessions.size,
  });
});

/**
 * Start authentication (generate QR code)
 */
app.post('/auth/start', async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone_number } = req.body;

    if (!phone_number) {
      res.status(400).json({ error: 'phone_number is required' });
      return;
    }

    // Check if already connected
    if (activeSessions.has(phone_number)) {
      res.json({
        success: true,
        message: 'Already connected',
        status: 'connected',
      });
      return;
    }

    // Create socket to trigger QR generation
    await createWhatsAppSocket(phone_number);

    // Wait a bit for QR to be generated
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const qrCode = sessionQRCodes.get(phone_number);

    res.json({
      success: true,
      phone_number,
      qr_code: qrCode,
      message: 'Scan QR code with WhatsApp',
    });
  } catch (error: any) {
    logger.error('Error starting auth:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get QR code for a phone number
 */
app.get('/auth/qr/:phone_number', (req: Request, res: Response): void => {
  const { phone_number } = req.params;
  const qrCode = sessionQRCodes.get(phone_number);

  if (!qrCode) {
    res.status(404).json({ error: 'QR code not found or session already connected' });
    return;
  }

  res.json({
    phone_number,
    qr_code: qrCode,
  });
});

/**
 * Get account status
 */
app.get('/account/status/:phone_number', async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone_number } = req.params;
    const sock = activeSessions.get(phone_number);

    if (!sock) {
      res.json({
        phone_number,
        is_connected: false,
      });
      return;
    }

    // Get user info
    const user = sock.user;

    res.json({
      phone_number,
      is_connected: true,
      user_info: {
        id: user?.id,
        name: user?.name,
      },
    });
  } catch (error: any) {
    logger.error('Error getting status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Send a message
 */
app.post('/message/send', async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone_number, chat_id, message } = req.body;

    if (!phone_number || !chat_id || !message) {
      res.status(400).json({
        error: 'phone_number, chat_id, and message are required',
      });
      return;
    }

    const sock = activeSessions.get(phone_number);

    if (!sock) {
      res.status(404).json({ error: 'Account not connected' });
      return;
    }

    // Send message
    const result = await sock.sendMessage(chat_id, { text: message });

    logger.info(`Message sent from ${phone_number} to ${chat_id}`);

    res.json({
      success: true,
      message_id: result?.key.id,
      timestamp: result?.messageTimestamp,
    });
  } catch (error: any) {
    logger.error('Error sending message:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get chats
 */
app.get('/chats/:phone_number', async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone_number } = req.params;
    const sock = activeSessions.get(phone_number);

    if (!sock) {
      res.status(404).json({ error: 'Account not connected' });
      return;
    }

    // Get chats (this is a simplified version - you may need to implement proper chat retrieval)
    const chats: any[] = [];

    res.json({
      phone_number,
      chats,
    });
  } catch (error: any) {
    logger.error('Error getting chats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Disconnect account
 */
app.post('/account/disconnect/:phone_number', async (req: Request, res: Response) => {
  try {
    const { phone_number } = req.params;
    const sock = activeSessions.get(phone_number);

    if (sock) {
      await sock.logout();
      activeSessions.delete(phone_number);
      sessionQRCodes.delete(phone_number);
    }

    // Delete session files
    const sessionDir = getSessionDir(phone_number);
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    }

    logger.info(`Disconnected ${phone_number}`);

    res.json({
      success: true,
      phone_number,
      message: 'Account disconnected',
    });
  } catch (error: any) {
    logger.error('Error disconnecting:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get all active sessions
 */
app.get('/accounts/active', (_req: Request, res: Response) => {
  const sessions: Array<{
    phone_number: string;
    is_connected: boolean;
    has_qr_pending: boolean;
    qr_code?: string;
    user_info?: { id?: string; name?: string };
  }> = [];

  // Add connected sessions
  for (const [phoneNumber, sock] of activeSessions) {
    sessions.push({
      phone_number: phoneNumber,
      is_connected: true,
      has_qr_pending: false,
      user_info: {
        id: sock.user?.id,
        name: sock.user?.name,
      },
    });
  }

  // Add sessions waiting for QR scan
  for (const [phoneNumber, qrCode] of sessionQRCodes) {
    if (!activeSessions.has(phoneNumber)) {
      sessions.push({
        phone_number: phoneNumber,
        is_connected: false,
        has_qr_pending: true,
        qr_code: qrCode,
      });
    }
  }

  // Check for session directories without active connections
  if (fs.existsSync(SESSION_DIR)) {
    const sessionDirs = fs.readdirSync(SESSION_DIR);
    for (const dir of sessionDirs) {
      const phoneNumber = dir;
      if (!activeSessions.has(phoneNumber) && !sessionQRCodes.has(phoneNumber)) {
        const sessionPath = path.join(SESSION_DIR, dir, 'creds.json');
        if (fs.existsSync(sessionPath)) {
          sessions.push({
            phone_number: phoneNumber,
            is_connected: false,
            has_qr_pending: false,
          });
        }
      }
    }
  }

  res.json({
    success: true,
    sessions,
    total: sessions.length,
  });
});

// ============================================================================
// Socket.io Events
// ============================================================================

io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });

  // Client can request connection status for a phone number
  socket.on('get-status', (phoneNumber: string) => {
    const isConnected = activeSessions.has(phoneNumber);
    const qrCode = sessionQRCodes.get(phoneNumber);

    socket.emit('connection-status', {
      phoneNumber,
      isConnected,
      qrCode,
    });
  });
});

// ============================================================================
// Start Server
// ============================================================================

httpServer.listen(PORT, HOST, () => {
  logger.info(`WhatsApp Backend running at http://${HOST}:${PORT}`);
  logger.info(`Session directory: ${SESSION_DIR}`);
  logger.info(`Active sessions: ${activeSessions.size}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');

  // Disconnect all sessions
  for (const [phoneNumber, sock] of activeSessions) {
    try {
      await sock.logout();
      logger.info(`Disconnected ${phoneNumber}`);
    } catch (error) {
      logger.error(`Error disconnecting ${phoneNumber}:`, error);
    }
  }

  process.exit(0);
});
