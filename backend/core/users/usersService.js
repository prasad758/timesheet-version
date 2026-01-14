/**
 * Users Service
 * Business logic for user management
 */

import pool from '../../shared/database/connection.js';

/**
 * Get all users
 */
export async function getAllUsers() {
  const result = await pool.query(
    `SELECT 
      u.id,
      u.email,
      u.full_name,
      u.created_at,
      ur.role,
      p.full_name as profile_name
    FROM erp.users u
    LEFT JOIN erp.user_roles ur ON u.id = ur.user_id
    LEFT JOIN erp.profiles p ON u.id = p.id
    ORDER BY u.created_at DESC`
  );

  return result.rows.map(user => ({
    id: user.id,
    email: user.email,
    full_name: user.profile_name || user.full_name,
    role: user.role || 'user',
    created_at: user.created_at,
  }));
}

/**
 * Get all users with roles (using function)
 */
export async function getAllUsersWithRoles() {
  const result = await pool.query('SELECT * FROM erp.get_all_users_with_roles()');
  return result.rows;
}

/**
 * Get user by ID
 */
export async function getUserById(userId) {
  const result = await pool.query(
    `SELECT 
      u.id,
      u.email,
      u.full_name,
      u.created_at,
      ur.role
    FROM erp.users u
    LEFT JOIN erp.user_roles ur ON u.id = ur.user_id
    WHERE u.id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error('User not found');
  }

  return result.rows[0];
}

/**
 * Update user role
 */
export async function updateUserRole(userId, role) {
  if (!role || !['admin', 'user'].includes(role)) {
    throw new Error('Invalid role');
  }

  // Check if user exists
  const userCheck = await pool.query(
    'SELECT id FROM erp.users WHERE id = $1',
    [userId]
  );

  if (userCheck.rows.length === 0) {
    throw new Error('User not found');
  }

  // Update or insert role
  await pool.query(
    `INSERT INTO erp.user_roles (user_id, role)
     VALUES ($1, $2)
     ON CONFLICT (user_id, role) DO UPDATE SET role = $2`,
    [userId, role]
  );

  return { user_id: userId, role };
}

