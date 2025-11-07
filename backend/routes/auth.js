/**
 * Authentication Routes
 * Handles login, register, and user session management
 */

import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import pool from '../db/connection.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Register new user
 * POST /api/auth/register
 */
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('full_name').optional().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, full_name } = req.body;

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM erp.users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ 
        error: 'User already exists',
        message: 'Email is already registered' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await pool.query(
      `INSERT INTO erp.users (email, password_hash, full_name) 
       VALUES ($1, $2, $3) 
       RETURNING id, email, full_name, created_at`,
      [email, hashedPassword, full_name || null]
    );

    const user = result.rows[0];

    // Create default role (user)
    await pool.query(
      'INSERT INTO erp.user_roles (user_id, role) VALUES ($1, $2)',
      [user.id, 'user']
    );

    // Create profile
    await pool.query(
      'INSERT INTO erp.profiles (id, full_name) VALUES ($1, $2)',
      [user.id, full_name || null]
    );

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
      },
      token,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ 
      error: 'Registration failed',
      message: 'Internal server error' 
    });
  }
});

/**
 * Login user
 * POST /api/auth/login
 */
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let { email, password } = req.body;
    // Trim email to handle any whitespace
    email = email.trim().toLowerCase();

    console.log('Login attempt for:', email);

    // Get user with password hash
    const result = await pool.query(
      `SELECT u.id, u.email, u.password_hash, u.full_name, 
              ur.role
       FROM erp.users u
       LEFT JOIN erp.user_roles ur ON u.id = ur.user_id
       WHERE u.email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      console.log('User not found:', email);
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'Email or password is incorrect' 
      });
    }

    const user = result.rows[0];

    // Verify password
    if (!user.password_hash) {
      console.error('User has no password hash:', email);
      return res.status(500).json({ 
        error: 'Server error',
        message: 'User account configuration error' 
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      console.log('Password mismatch for:', email);
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'Email or password is incorrect' 
      });
    }

    console.log('Login successful for:', email);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role || 'user',
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Server error',
      message: error.message || 'An error occurred during login' 
    });
  }
});

/**
 * Get current user
 * GET /api/auth/me
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    // This will be protected by auth middleware
    const userId = req.userId;

    const result = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.created_at,
              ur.role
       FROM erp.users u
       LEFT JOIN erp.user_roles ur ON u.id = ur.user_id
       WHERE u.id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }

    res.json({
      user: result.rows[0],
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      error: 'Failed to get user',
      message: 'Internal server error' 
    });
  }
});

/**
 * Update user profile
 * PUT /api/auth/profile
 */
router.put('/profile', authenticate, [
  body('full_name').optional().trim(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const userId = req.userId;
    const { full_name } = req.body;

    const result = await pool.query(
      `UPDATE erp.users 
       SET full_name = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, email, full_name`,
      [full_name || null, userId]
    );

    // Update profile table too
    await pool.query(
      'UPDATE erp.profiles SET full_name = $1, updated_at = NOW() WHERE id = $2',
      [full_name || null, userId]
    );

    res.json({
      message: 'Profile updated successfully',
      user: result.rows[0],
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      error: 'Failed to update profile',
      message: 'Internal server error' 
    });
  }
});

/**
 * Forgot password - send reset email
 * POST /api/auth/forgot-password
 */
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    // Check if user exists
    const result = await pool.query(
      'SELECT id, email FROM erp.users WHERE email = $1',
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      // Don't reveal if user exists or not for security
      return res.json({
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
    }

    const user = result.rows[0];

    // Generate reset token
    const resetToken = jwt.sign(
      { userId: user.id, email: user.email, type: 'password_reset' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Store reset token in database
    // Note: You may need to add password_reset_token and password_reset_expires columns to users table
    await pool.query(
      `UPDATE erp.users 
       SET password_reset_token = $1, 
           password_reset_expires = NOW() + INTERVAL '1 hour' 
       WHERE id = $2`,
      [resetToken, user.id]
    ).catch(async (err) => {
      // If columns don't exist, create them first
      if (err.code === '42703') {
        console.log('Adding password reset columns to users table...');
        await pool.query(`
          ALTER TABLE erp.users 
          ADD COLUMN IF NOT EXISTS password_reset_token TEXT,
          ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP
        `);
        // Retry the update
        await pool.query(
          `UPDATE erp.users 
           SET password_reset_token = $1, 
               password_reset_expires = NOW() + INTERVAL '1 hour' 
           WHERE id = $2`,
          [resetToken, user.id]
        );
      } else {
        throw err;
      }
    });

    // In production, send email here with reset link
    // For now, we'll return the token (in production, don't do this!)
    console.log(`Password reset token for ${normalizedEmail}: ${resetToken}`);
    
    res.json({
      message: 'Password reset link sent to your email.',
      // In production, remove this token from response
      resetToken: resetToken, // Only for development/testing
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      error: 'Failed to process request',
      message: error.message || 'Internal server error',
    });
  }
});

/**
 * Reset password with token
 * POST /api/auth/reset-password
 */
router.post('/reset-password', [
  body('token').notEmpty(),
  body('newPassword').isLength({ min: 6 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, newPassword } = req.body;

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.type !== 'password_reset') {
        return res.status(400).json({
          error: 'Invalid token',
          message: 'Invalid reset token',
        });
      }
    } catch (error) {
      return res.status(400).json({
        error: 'Invalid token',
        message: 'Reset token is invalid or expired',
      });
    }

    // Check if token exists in database and is not expired
    const userResult = await pool.query(
      `SELECT id, email, password_reset_token, password_reset_expires 
       FROM erp.users 
       WHERE id = $1 AND password_reset_token = $2 
       AND password_reset_expires > NOW()`,
      [decoded.userId, token]
    ).catch(async (err) => {
      // If columns don't exist, create them
      if (err.code === '42703') {
        await pool.query(`
          ALTER TABLE erp.users 
          ADD COLUMN IF NOT EXISTS password_reset_token TEXT,
          ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP
        `);
        return { rows: [] };
      }
      throw err;
    });

    if (userResult.rows.length === 0) {
      return res.status(400).json({
        error: 'Invalid token',
        message: 'Reset token is invalid or expired',
      });
    }

    const user = userResult.rows[0];

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    await pool.query(
      `UPDATE erp.users 
       SET password_hash = $1, 
           password_reset_token = NULL, 
           password_reset_expires = NULL 
       WHERE id = $2`,
      [hashedPassword, user.id]
    );

    console.log(`Password reset successful for: ${user.email}`);

    res.json({
      message: 'Password reset successfully',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      error: 'Failed to reset password',
      message: error.message || 'Internal server error',
    });
  }
});

export default router;
