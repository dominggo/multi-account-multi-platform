/**
 * API Gateway
 * Coordinates between frontend and backend services (Telegram & WhatsApp)
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import session from 'express-session';
import rateLimit from 'express-rate-limit';
import axios from 'axios';
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

dotenv.config();

// Configuration
const HOST = process.env.HOST || '0.0.0.0';
const PORT = parseInt(process.env.PORT || '3000');
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'];
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';
const TELEGRAM_API = process.env.TELEGRAM_API_URL || 'http://localhost:8001';
const WHATSAPP_API = process.env.WHATSAPP_API_URL || 'http://localhost:8002';

// Express app
const app: Express = express();

// Security middleware
app.use(helmet());
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'change-this-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: parseInt(process.env.SESSION_MAX_AGE || '1800000'),
    },
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
});
app.use('/api/', limiter);

// Database pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// ============================================================================
// Middleware
// ============================================================================

interface AuthRequest extends Request {
  userId?: number;
  userRole?: string;
}

async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ============================================================================
// Routes
// ============================================================================

app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'Multi-Account Messaging Platform API',
    version: '1.0.0',
    status: 'running',
  });
});

// Auth routes
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    const [rows]: any = await pool.query(
      'SELECT * FROM users WHERE username = ? AND is_active = TRUE',
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Telegram routes (proxy to Python backend)
app.post('/api/telegram/*', authMiddleware, async (req: AuthRequest, res: Response) => {
  const path = req.path.replace('/api/telegram', '');
  try {
    const response = await axios({
      method: req.method,
      url: `${TELEGRAM_API}${path}`,
      data: req.body,
      headers: { 'Content-Type': 'application/json' },
    });
    res.json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(
      error.response?.data || { error: 'Telegram service error' }
    );
  }
});

app.get('/api/telegram/*', authMiddleware, async (req: AuthRequest, res: Response) => {
  const path = req.path.replace('/api/telegram', '');
  try {
    const response = await axios.get(`${TELEGRAM_API}${path}`);
    res.json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(
      error.response?.data || { error: 'Telegram service error' }
    );
  }
});

// WhatsApp routes (proxy to Node backend)
app.post('/api/whatsapp/*', authMiddleware, async (req: AuthRequest, res: Response) => {
  const path = req.path.replace('/api/whatsapp', '');
  try {
    const response = await axios({
      method: req.method,
      url: `${WHATSAPP_API}${path}`,
      data: req.body,
      headers: { 'Content-Type': 'application/json' },
    });
    res.json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(
      error.response?.data || { error: 'WhatsApp service error' }
    );
  }
});

app.get('/api/whatsapp/*', authMiddleware, async (req: AuthRequest, res: Response) => {
  const path = req.path.replace('/api/whatsapp', '');
  try {
    const response = await axios.get(`${WHATSAPP_API}${path}`);
    res.json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(
      error.response?.data || { error: 'WhatsApp service error' }
    );
  }
});

// Accounts routes
app.get('/api/accounts', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, phone_number, country_code, platform, display_name, status, last_active, keep_alive_enabled FROM accounts ORDER BY created_at DESC'
    );
    res.json({ accounts: rows });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Start server
app.listen(PORT, HOST, () => {
  console.log(`API Gateway running at http://${HOST}:${PORT}`);
  console.log(`Telegram API: ${TELEGRAM_API}`);
  console.log(`WhatsApp API: ${WHATSAPP_API}`);
});
