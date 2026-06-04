import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/database.js';
import { generateToken } from '../utils/jwt.js';
import { authenticateToken } from '../middleware/auth.js';
import { LoginRequest, LoginResponse, AuthUser } from '../types/index.js';
import { withAudit } from '../utils/withAudit.js';

const router = express.Router();

router.post('/login', async (req: Request<{}, {}, LoginRequest>, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Query auth_users table
    const result = await pool.query(
      'SELECT id, email, password, role, zk_user_id FROM auth_users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const authUser = result.rows[0];

    // Compare passwords
    const passwordMatch = await bcrypt.compare(password, authUser.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Get additional user info from users table
    const userResult = await pool.query(
      'SELECT name FROM users WHERE zk_user_id = $1',
      [authUser.zk_user_id]
    );

    const name = userResult.rows[0]?.name || authUser.email.split('@')[0];

    // Generate JWT token
    const token = generateToken({
      id: authUser.id,
      email: authUser.email,
      role: authUser.role,
      zk_user_id: authUser.zk_user_id,
    });

    const response: LoginResponse = {
      id: authUser.id,
      name,
      email: authUser.email,
      role: authUser.role,
      token,
    };

    res.json(response);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

router.post('/logout', authenticateToken, (req: Request, res: Response) => {
  // JWT is stateless, so logout just returns success
  // Client should delete the token from localStorage
  res.json({ message: 'Logged out successfully' });
});

router.get('/verify', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const result = await pool.query(
      'SELECT id, email, role, zk_user_id FROM auth_users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const authUser = result.rows[0];

    // Get user info from users table
    const userResult = await pool.query(
      'SELECT name FROM users WHERE zk_user_id = $1',
      [authUser.zk_user_id]
    );

    const name = userResult.rows[0]?.name || authUser.email.split('@')[0];

    res.json({
      id: authUser.id,
      name,
      email: authUser.email,
      role: authUser.role,
      token: req.headers.authorization?.split(' ')[1],
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ message: 'Server error during verification' });
  }
});

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, role, zk_user_id } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ message: 'Email, password, and role are required' });
    }

    // Check if user already exists
    const existing = await pool.query(
      'SELECT id FROM auth_users WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new auth user with audit
    const result = await withAudit(
      {
        zk_user_id: 'system', // Registration is often a system action or done by an admin
        action: 'CREATE',
        entity: 'AUTH_USER',
        entity_id: email,
        details: `Registered new user: ${email} with role ${role}`,
      },
      async () => {
        return await pool.query(
          'INSERT INTO auth_users (email, password, role, zk_user_id) VALUES ($1, $2, $3, $4) RETURNING id, email, role',
          [email, hashedPassword, role, zk_user_id]
        );
      }
    );

    const newUser = result.rows[0];

    res.status(201).json({
      message: 'User registered successfully',
      user: newUser,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

export default router;
