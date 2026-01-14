/**
 * Notifications Routes
 * Handles notification operations
 */

import express from 'express';
import pool from '../../shared/database/connection.js';
import { authenticate } from '../../core/auth/authMiddleware.js';

const router = express.Router();
router.use(authenticate);

/**
 * Get notifications
 * GET /api/notifications
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.userId;
    const { unread_only } = req.query;

    console.log('=== GET NOTIFICATIONS ===');
    console.log('Requesting user ID:', userId);
    console.log('Unread only:', unread_only);

    let query = `
      SELECT * FROM erp.notifications
      WHERE user_id = $1
    `;

    const params = [userId];

    if (unread_only === 'true') {
      query += ` AND read = false`;
    }

    query += ` ORDER BY created_at DESC LIMIT 50`;

    const result = await pool.query(query, params);

    console.log('Found notifications:', result.rows.length);
    console.log('Notification user_ids:', result.rows.map(r => r.user_id));

    res.json({
      notifications: result.rows,
    });
  } catch (error) {
    console.error('❌ Get notifications error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to get notifications',
      message: error.message || 'Internal server error' 
    });
  }
});

/**
 * Mark notification as read
 * PUT /api/notifications/:id/read
 */
router.put('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const result = await pool.query(
      `UPDATE erp.notifications 
       SET read = true
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({
      message: 'Notification marked as read',
      notification: result.rows[0],
    });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ 
      error: 'Failed to mark as read',
      message: 'Internal server error' 
    });
  }
});

/**
 * Mark all as read
 * PUT /api/notifications/read-all
 */
router.put('/read-all', async (req, res) => {
  try {
    const userId = req.userId;

    await pool.query(
      `UPDATE erp.notifications 
       SET read = true
       WHERE user_id = $1 AND read = false`,
      [userId]
    );

    res.json({
      message: 'All notifications marked as read',
    });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ 
      error: 'Failed to mark all as read',
      message: 'Internal server error' 
    });
  }
});

/**
 * Get unread count
 * GET /api/notifications/unread-count
 */
router.get('/unread-count', async (req, res) => {
  try {
    const userId = req.userId;

    const result = await pool.query(
      'SELECT erp.get_unread_notification_count($1) as count',
      [userId]
    );

    res.json({
      count: parseInt(result.rows[0].count),
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ 
      error: 'Failed to get unread count',
      message: 'Internal server error' 
    });
  }
});

export default router;

