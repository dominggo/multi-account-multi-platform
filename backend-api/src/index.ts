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

// Trust proxy (for reverse proxy setups like Nginx/Caddy)
app.set('trust proxy', 1);

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

async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
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
app.post('/api/auth/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    const [rows]: any = await pool.query(
      'SELECT * FROM users WHERE username = ? AND is_active = TRUE',
      [username]
    );

    if (rows.length === 0) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const user = rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Update last login
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
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
      'SELECT id, phone_number, country_code, platform, display_name, status, registered_at, last_active, keep_alive_enabled, keep_alive_interval, notes, last_topup, last_message_at FROM accounts ORDER BY created_at DESC'
    );
    res.json({ accounts: rows });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/accounts', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { phone_number, country_code, platform, display_name, notes } = req.body;

    if (!phone_number || !platform) {
      res.status(400).json({ error: 'phone_number and platform are required' });
      return;
    }

    // Check if account already exists
    const [existing]: any = await pool.query(
      'SELECT id FROM accounts WHERE phone_number = ? AND platform = ?',
      [phone_number, platform]
    );

    if (existing.length > 0) {
      res.status(409).json({ error: 'Account already exists' });
      return;
    }

    // Insert new account
    const [result]: any = await pool.query(
      `INSERT INTO accounts (phone_number, country_code, platform, display_name, notes, status, registered_at, last_active, keep_alive_enabled, keep_alive_interval)
       VALUES (?, ?, ?, ?, ?, 'active', NOW(), NOW(), TRUE, 86400)`,
      [phone_number, country_code || 'US', platform, display_name || null, notes || null]
    );

    // Fetch the created account
    const [rows]: any = await pool.query(
      'SELECT * FROM accounts WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json(rows[0]);
  } catch (error: any) {
    console.error('Create account error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

app.delete('/api/accounts/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM accounts WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Password change route
app.post('/api/auth/change-password', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      res.status(400).json({ error: 'Current password and new password are required' });
      return;
    }

    if (new_password.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters' });
      return;
    }

    // Get current user
    const [rows]: any = await pool.query(
      'SELECT * FROM users WHERE id = ?',
      [req.userId]
    );

    if (rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = rows[0];

    // Verify current password
    const validPassword = await bcrypt.compare(current_password, user.password_hash);
    if (!validPassword) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(new_password, 10);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
      [newPasswordHash, req.userId]
    );

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error: any) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, HOST, () => {
  console.log(`API Gateway running at http://${HOST}:${PORT}`);
  console.log(`Telegram API: ${TELEGRAM_API}`);
  console.log(`WhatsApp API: ${WHATSAPP_API}`);
});
