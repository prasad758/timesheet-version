/**
 * Payslips Model
 * PostgreSQL queries for payslips only
 * NO business logic
 */

import pool from '../../../shared/database/connection.js';

/**
 * Get payslips for user or all (for HR/Admin)
 */
export async function getPayslips(filters = {}) {
  let query = `
    SELECT 
      p.*,
      u.email,
      u.full_name,
      pr.full_name as created_by_name,
      rb.full_name as released_by_name
    FROM erp.payslips p
    LEFT JOIN erp.users u ON p.user_id = u.id
    LEFT JOIN erp.users pr ON p.created_by = pr.id
    LEFT JOIN erp.users rb ON p.released_by = rb.id
    WHERE 1=1
  `;
  const params = [];
  let paramCount = 1;

  if (filters.user_id) {
    query += ` AND p.user_id = $${paramCount}`;
    params.push(filters.user_id);
    paramCount++;
  }

  if (filters.month) {
    query += ` AND p.month = $${paramCount}`;
    params.push(filters.month);
    paramCount++;
  }

  if (filters.year) {
    query += ` AND p.year = $${paramCount}`;
    params.push(filters.year);
    paramCount++;
  }

  if (filters.status) {
    query += ` AND p.status = $${paramCount}`;
    params.push(filters.status);
    paramCount++;
  }

  if (filters.department) {
    query += ` AND EXISTS (
      SELECT 1 FROM erp.profiles pr 
      WHERE pr.id = p.user_id AND pr.department = $${paramCount}
    )`;
    params.push(filters.department);
    paramCount++;
  }

  // Filter for upcoming payslips (one year from current date)
  if (filters.upcoming_only) {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const oneYearLater = new Date(currentDate);
    oneYearLater.setFullYear(currentYear + 1);
    const oneYearLaterYear = oneYearLater.getFullYear();
    const oneYearLaterMonth = oneYearLater.getMonth() + 1;
    
    // Include payslips from current month/year to one year later (inclusive)
    // This covers: current month to end of current year, all months in between years, and up to target month in target year
    query += ` AND (
      (p.year = $${paramCount} AND p.month >= $${paramCount + 1}) OR
      (p.year > $${paramCount} AND p.year < $${paramCount + 2}) OR
      (p.year = $${paramCount + 2} AND p.month <= $${paramCount + 3})
    )`;
    params.push(currentYear, currentMonth, oneYearLaterYear, oneYearLaterMonth);
    paramCount += 4;
  }

  query += ` ORDER BY p.year DESC, p.month DESC, p.created_at DESC`;

  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * Get payslip by ID
 */
export async function getPayslipById(payslipId) {
  const result = await pool.query(
    `SELECT 
      p.*,
      u.email,
      u.full_name,
      pr.full_name as created_by_name,
      rb.full_name as released_by_name
    FROM erp.payslips p
    LEFT JOIN erp.users u ON p.user_id = u.id
    LEFT JOIN erp.users pr ON p.created_by = pr.id
    LEFT JOIN erp.users rb ON p.released_by = rb.id
    WHERE p.id = $1`,
    [payslipId]
  );
  return result.rows[0] || null;
}

/**
 * Create or update payslip
 */
export async function upsertPayslip(payslipData) {
  const {
    id,
    user_id,
    employee_id,
    month,
    year,
    basic_pay,
    hra,
    special_allowance,
    bonus,
    incentives,
    other_earnings,
    total_earnings,
    pf_employee,
    pf_employer,
    esi_employee,
    esi_employer,
    professional_tax,
    tds,
    other_deductions,
    total_deductions,
    net_pay,
    payslip_id,
    document_url,
    status,
    is_locked,
    company_name,
    company_address,
    issue_date,
    created_by,
    allowAdminOverride = false
  } = payslipData;

  // Generate UUID for new payslips if not provided
  const payslipId = id || null;
  
  // Build the INSERT query - include id only if provided, otherwise let database generate it
  const insertColumns = payslipId 
    ? `id, user_id, employee_id, month, year,
       basic_pay, hra, special_allowance, bonus, incentives, other_earnings, total_earnings,
       pf_employee, pf_employer, esi_employee, esi_employer, professional_tax, tds, other_deductions, total_deductions,
       net_pay, payslip_id, document_url, status, is_locked,
       company_name, company_address, issue_date, created_by, updated_at`
    : `user_id, employee_id, month, year,
       basic_pay, hra, special_allowance, bonus, incentives, other_earnings, total_earnings,
       pf_employee, pf_employer, esi_employee, esi_employer, professional_tax, tds, other_deductions, total_deductions,
       net_pay, payslip_id, document_url, status, is_locked,
       company_name, company_address, issue_date, created_by, updated_at`;

  const insertValues = payslipId
    ? `$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, NOW()`
    : `$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, NOW()`;

  const params = payslipId
    ? [
        payslipId,
        user_id,
        employee_id || null,
        month,
        year,
        basic_pay || 0,
        hra || 0,
        special_allowance || 0,
        bonus || 0,
        incentives || 0,
        other_earnings || 0,
        total_earnings || 0,
        pf_employee || 0,
        pf_employer || 0,
        esi_employee || 0,
        esi_employer || 0,
        professional_tax || 0,
        tds || 0,
        other_deductions || 0,
        total_deductions || 0,
        net_pay || 0,
        payslip_id || null,
        document_url || null,
        status || 'pending',
        is_locked || false,
        company_name || null,
        company_address || null,
        issue_date || null,
        created_by || null
      ]
    : [
        user_id,
        employee_id || null,
        month,
        year,
        basic_pay || 0,
        hra || 0,
        special_allowance || 0,
        bonus || 0,
        incentives || 0,
        other_earnings || 0,
        total_earnings || 0,
        pf_employee || 0,
        pf_employer || 0,
        esi_employee || 0,
        esi_employer || 0,
        professional_tax || 0,
        tds || 0,
        other_deductions || 0,
        total_deductions || 0,
        net_pay || 0,
        payslip_id || null,
        document_url || null,
        status || 'pending',
        is_locked || false,
        company_name || null,
        company_address || null,
        issue_date || null,
        created_by || null
      ];

  // If ID is provided, use UPDATE instead of INSERT to handle locked payslips properly
  if (payslipId) {
    // Check if payslip exists and is locked
    const existing = await pool.query(
      'SELECT id, is_locked, status FROM erp.payslips WHERE id = $1',
      [payslipId]
    );

    if (existing.rows.length > 0 && existing.rows[0].is_locked && !allowAdminOverride) {
      console.log('[payroll-pf] Blocked update: payslip is locked and allowAdminOverride is', allowAdminOverride);
      throw new Error('Cannot update a locked payslip');
    }
    
    if (existing.rows.length > 0 && existing.rows[0].is_locked && allowAdminOverride) {
      console.log('[payroll-pf] Admin override: allowing update of locked payslip', payslipId);
    }

    // Update existing payslip
    const result = await pool.query(
      `UPDATE erp.payslips SET
        user_id = $2,
        employee_id = $3,
        month = $4,
        year = $5,
        basic_pay = $6,
        hra = $7,
        special_allowance = $8,
        bonus = $9,
        incentives = $10,
        other_earnings = $11,
        total_earnings = $12,
        pf_employee = $13,
        pf_employer = $14,
        esi_employee = $15,
        esi_employer = $16,
        professional_tax = $17,
        tds = $18,
        other_deductions = $19,
        total_deductions = $20,
        net_pay = $21,
        payslip_id = COALESCE($22, payslip_id),
        document_url = COALESCE($23, document_url),
        status = CASE WHEN is_locked THEN status ELSE COALESCE($24, status) END,
        company_name = COALESCE($25, company_name),
        company_address = COALESCE($26, company_address),
        issue_date = COALESCE($27, issue_date),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *`,
      [
        payslipId,
        user_id,
        employee_id || null,
        month,
        year,
        basic_pay || 0,
        hra || 0,
        special_allowance || 0,
        bonus || 0,
        incentives || 0,
        other_earnings || 0,
        total_earnings || 0,
        pf_employee || 0,
        pf_employer || 0,
        esi_employee || 0,
        esi_employer || 0,
        professional_tax || 0,
        tds || 0,
        other_deductions || 0,
        total_deductions || 0,
        net_pay || 0,
        payslip_id || null,
        document_url || null,
        status || null,
        company_name || null,
        company_address || null,
        issue_date || null,
      ]
    );
    return result.rows[0];
  }

  // Insert new payslip
  const result = await pool.query(
    `INSERT INTO erp.payslips (${insertColumns})
    VALUES (${insertValues})
    ON CONFLICT (user_id, month, year) DO UPDATE SET
      basic_pay = EXCLUDED.basic_pay,
      hra = EXCLUDED.hra,
      special_allowance = EXCLUDED.special_allowance,
      bonus = EXCLUDED.bonus,
      incentives = EXCLUDED.incentives,
      other_earnings = EXCLUDED.other_earnings,
      total_earnings = EXCLUDED.total_earnings,
      pf_employee = EXCLUDED.pf_employee,
      pf_employer = EXCLUDED.pf_employer,
      esi_employee = EXCLUDED.esi_employee,
      esi_employer = EXCLUDED.esi_employer,
      professional_tax = EXCLUDED.professional_tax,
      tds = EXCLUDED.tds,
      other_deductions = EXCLUDED.other_deductions,
      total_deductions = EXCLUDED.total_deductions,
      net_pay = EXCLUDED.net_pay,
      payslip_id = COALESCE(EXCLUDED.payslip_id, payslips.payslip_id),
      document_url = COALESCE(EXCLUDED.document_url, payslips.document_url),
      status = CASE WHEN payslips.is_locked THEN payslips.status ELSE EXCLUDED.status END,
      company_name = COALESCE(EXCLUDED.company_name, payslips.company_name),
      company_address = COALESCE(EXCLUDED.company_address, payslips.company_address),
      issue_date = COALESCE(EXCLUDED.issue_date, payslips.issue_date),
      updated_at = NOW()
    RETURNING *`,
    params
  );
  return result.rows[0];
}

/**
 * Update payslip status
 */
export async function updatePayslipStatus(payslipId, status, releasedBy = null) {
  const updateData = {
    status,
    updated_at: new Date()
  };

  if (status === 'released' && releasedBy) {
    updateData.released_at = new Date();
    updateData.released_by = releasedBy;
  }

  if (status === 'locked') {
    updateData.is_locked = true;
  }

  const fields = [];
  const values = [];
  let paramCount = 1;

  Object.keys(updateData).forEach(key => {
    if (updateData[key] !== undefined) {
      fields.push(`${key} = $${paramCount}`);
      values.push(updateData[key]);
      paramCount++;
    }
  });

  values.push(payslipId);

  const result = await pool.query(
    `UPDATE erp.payslips 
     SET ${fields.join(', ')}
     WHERE id = $${paramCount}
     RETURNING *`,
    values
  );
  return result.rows[0];
}

