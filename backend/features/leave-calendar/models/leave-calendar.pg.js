/**
 * Leave Calendar Model
 * PostgreSQL queries only - NO business logic
 */

import pool from '../../../shared/database/connection.js';

/**
 * Get leave balances for a user
 */
export async function getLeaveBalances(userId) {
  const result = await pool.query(
    `SELECT * FROM erp.leave_balances
     WHERE user_id = $1
     ORDER BY leave_type, financial_year DESC`,
    [userId]
  );
  return result.rows;
}

/**
 * Update leave balance
 */
export async function updateLeaveBalance(balanceData) {
  const { user_id, leave_type, financial_year, opening_balance, availed, balance, lapse, lapse_date } = balanceData;

  const result = await pool.query(
    `INSERT INTO erp.leave_balances (
      user_id, leave_type, financial_year, opening_balance, availed, balance, lapse, lapse_date
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (user_id, leave_type, financial_year)
    DO UPDATE SET
      opening_balance = EXCLUDED.opening_balance,
      availed = EXCLUDED.availed,
      balance = EXCLUDED.balance,
      lapse = EXCLUDED.lapse,
      lapse_date = EXCLUDED.lapse_date,
      updated_at = NOW()
    RETURNING *`,
    [user_id, leave_type, financial_year, opening_balance, availed, balance, lapse, lapse_date]
  );
  return result.rows[0];
}

/**
 * Get shift roster for a date range
 */
export async function getShiftRoster(startDate, endDate) {
  const result = await pool.query(
    `SELECT sr.*, u.email, u.full_name
     FROM erp.shift_roster sr
     JOIN erp.users u ON sr.user_id = u.id
     WHERE sr.date BETWEEN $1 AND $2
     ORDER BY sr.date, u.full_name`,
    [startDate, endDate]
  );
  return result.rows;
}

/**
 * Update shift roster
 */
export async function updateShiftRoster(shiftData) {
    const { user_id, date, shift_type, start_time, end_time } = shiftData;
    const result = await pool.query(
        `INSERT INTO erp.shift_roster (user_id, date, shift_type, start_time, end_time)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, date)
     DO UPDATE SET
       shift_type = EXCLUDED.shift_type,
       start_time = EXCLUDED.start_time,
       end_time = EXCLUDED.end_time,
       updated_at = NOW()
     RETURNING *`,
        [user_id, date, shift_type, start_time, end_time]
    );
    return result.rows[0];
}

/**
 * Get attendance records for a date range
 */
export async function getAttendance(startDate, endDate) {
  const result = await pool.query(
    `SELECT a.*, u.email, u.full_name, sr.shift_type
     FROM erp.attendance a
     JOIN erp.users u ON a.user_id = u.id
     LEFT JOIN erp.shift_roster sr ON a.user_id = sr.user_id AND a.date = sr.date
     WHERE a.date BETWEEN $1 AND $2
     ORDER BY a.date, u.full_name`,
    [startDate, endDate]
  );
  return result.rows;
}

/**
 * Update attendance record
 */
export async function updateAttendanceRecord(attendanceData) {
  const { user_id, date, shift_id, clock_in, clock_out, total_hours, status, notes } = attendanceData;

  const result = await pool.query(
    `INSERT INTO erp.attendance (
      user_id, date, shift_id, clock_in, clock_out, total_hours, status, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (user_id, date)
    DO UPDATE SET
      shift_id = EXCLUDED.shift_id,
      clock_in = EXCLUDED.clock_in,
      clock_out = EXCLUDED.clock_out,
      total_hours = EXCLUDED.total_hours,
      status = EXCLUDED.status,
      notes = EXCLUDED.notes,
      updated_at = NOW()
    RETURNING *`,
    [user_id, date, shift_id, clock_in, clock_out, total_hours, status, notes]
  );
  return result.rows[0];
}

/**
 * Get all leave requests
 */
export async function getAllLeaveRequests(userId, isAdmin) {
  let query = `
    SELECT 
      lr.*,
      u.email as user_email,
      COALESCE(u.full_name, '') as user_full_name
    FROM erp.leave_requests lr
    LEFT JOIN erp.users u ON lr.user_id = u.id
  `;

  const params = [];

  if (!isAdmin) {
    query += ` WHERE lr.user_id = $1`;
    params.push(userId);
  }

  query += ` ORDER BY lr.created_at DESC`;

  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * Create leave request
 */
export async function createLeaveRequest(userId, startDate, endDate, leaveType, reason) {
  const result = await pool.query(
    `INSERT INTO erp.leave_requests (
      id, user_id, start_date, end_date, leave_type, reason, status
    )
    VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'pending')
    RETURNING *`,
    [userId, startDate, endDate, leaveType, reason || null]
  );
  return result.rows[0];
}

/**
 * Update leave request status
 */
export async function updateLeaveRequestStatus(id, status, reviewedBy, adminNotes) {
  const result = await pool.query(
    `UPDATE erp.leave_requests 
     SET status = $1,
         reviewed_by = $2,
         reviewed_at = NOW(),
         admin_notes = $3,
         updated_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [status, reviewedBy, adminNotes || null, id]
  );
  return result.rows[0];
}

/**
 * Get leave history for a user
 */
export async function getLeaveHistory(userId) {
    const query = `
    SELECT 
      id,
      start_date,
      end_date,
      leave_type,
      session,
      reason,
      status,
      admin_notes,
      created_at
    FROM erp.leave_requests
    WHERE user_id = $1
    ORDER BY start_date DESC
  `;
    const result = await pool.query(query, [userId]);
    return result.rows;
}

/**
 * Get monthly attendance report (Admin only)
 */
export async function getMonthlyAttendanceReport(month, year) {
    const query = `
    SELECT
      u.id as user_id,
      u.full_name,
      u.email,
      d.date,
      a.status,
      a.clock_in,
      a.clock_out,
      lr.leave_type,
      lr.session
    FROM
      (SELECT generate_series(
        make_date($2, $1, 1),
        (make_date($2, $1, 1) + '1 month'::interval - '1 day'::interval)::date,
        '1 day'::interval
      )::date AS date) AS d
    CROSS JOIN erp.users u
    LEFT JOIN erp.attendance a ON d.date = a.date AND u.id = a.user_id
    LEFT JOIN erp.leave_requests lr ON u.id = lr.user_id AND d.date BETWEEN lr.start_date AND lr.end_date AND lr.status = 'approved'
    ORDER BY u.id, d.date;
  `;
    const result = await pool.query(query, [month, year]);
    return result.rows;
}

/**
 * Get shift-wise attendance analysis (Admin only)
 */
export async function getShiftWiseAttendanceAnalysis(startDate, endDate) {
    const query = `
    SELECT
      sr.shift_type,
      sr.date,
      COUNT(a.id) as present_count,
      (SELECT COUNT(DISTINCT u.id) FROM erp.shift_roster u WHERE u.date = sr.date AND u.shift_type = sr.shift_type) - COUNT(a.id) as absent_count
    FROM erp.shift_roster sr
    LEFT JOIN erp.attendance a ON sr.user_id = a.user_id AND sr.date = a.date AND a.status = 'present'
    WHERE sr.date BETWEEN $1 AND $2
    GROUP BY sr.date, sr.shift_type
    ORDER BY sr.date, sr.shift_type;
  `;
    const result = await pool.query(query, [startDate, endDate]);
    return result.rows;
}

