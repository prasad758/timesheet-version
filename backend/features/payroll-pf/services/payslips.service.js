/**
 * Payslips Service
 * Business logic for payslips
 * NO Express objects, NO database queries
 */

import * as payslipModel from '../models/payslips.pg.js';
import * as auditLogModel from '../models/payroll-audit-log.pg.js';

/**
 * Transform raw payslip to DTO
 */
function transformPayslip(payslip) {
  if (!payslip) return null;

  return {
    id: payslip.id,
    user_id: payslip.user_id,
    employee_id: payslip.employee_id,
    email: payslip.email,
    full_name: payslip.full_name,
    month: payslip.month,
    year: payslip.year,
    basic_pay: parseFloat(payslip.basic_pay || 0),
    hra: parseFloat(payslip.hra || 0),
    special_allowance: parseFloat(payslip.special_allowance || 0),
    bonus: parseFloat(payslip.bonus || 0),
    incentives: parseFloat(payslip.incentives || 0),
    other_earnings: parseFloat(payslip.other_earnings || 0),
    total_earnings: parseFloat(payslip.total_earnings || 0),
    pf_employee: parseFloat(payslip.pf_employee || 0),
    pf_employer: parseFloat(payslip.pf_employer || 0),
    esi_employee: parseFloat(payslip.esi_employee || 0),
    esi_employer: parseFloat(payslip.esi_employer || 0),
    professional_tax: parseFloat(payslip.professional_tax || 0),
    tds: parseFloat(payslip.tds || 0),
    other_deductions: parseFloat(payslip.other_deductions || 0),
    total_deductions: parseFloat(payslip.total_deductions || 0),
    net_pay: parseFloat(payslip.net_pay || 0),
    payslip_id: payslip.payslip_id,
    document_url: payslip.document_url,
    status: payslip.status,
    is_locked: payslip.is_locked,
    released_at: payslip.released_at,
    released_by: payslip.released_by,
    released_by_name: payslip.released_by_name,
    company_name: payslip.company_name,
    company_address: payslip.company_address,
    issue_date: payslip.issue_date,
    created_at: payslip.created_at,
    updated_at: payslip.updated_at,
    created_by: payslip.created_by,
    created_by_name: payslip.created_by_name
  };
}

/**
 * Calculate payslip totals
 */
function calculatePayslipTotals(payslipData) {
  const earnings = (payslipData.basic_pay || 0) +
                  (payslipData.hra || 0) +
                  (payslipData.special_allowance || 0) +
                  (payslipData.bonus || 0) +
                  (payslipData.incentives || 0) +
                  (payslipData.other_earnings || 0);

  const deductions = (payslipData.pf_employee || 0) +
                     (payslipData.pf_employer || 0) +
                     (payslipData.esi_employee || 0) +
                     (payslipData.esi_employer || 0) +
                     (payslipData.professional_tax || 0) +
                     (payslipData.tds || 0) +
                     (payslipData.other_deductions || 0);

  const netPay = earnings - deductions;

  return {
    total_earnings: earnings,
    total_deductions: deductions,
    net_pay: netPay
  };
}

/**
 * Get payslips
 */
export async function getPayslips(filters = {}) {
  try {
    const payslips = await payslipModel.getPayslips(filters);
    return payslips.map(transformPayslip).filter(p => p !== null);
  } catch (error) {
    console.error('[payroll-pf] Error in getPayslips service:', error);
    throw error;
  }
}

/**
 * Get payslip by ID
 */
export async function getPayslipById(payslipId) {
  try {
    const payslip = await payslipModel.getPayslipById(payslipId);
    return transformPayslip(payslip);
  } catch (error) {
    console.error('[payroll-pf] Error in getPayslipById service:', error);
    throw error;
  }
}

/**
 * Create or update payslip
 */
export async function upsertPayslip(payslipData) {
  try {
    // Calculate totals
    const totals = calculatePayslipTotals(payslipData);
    const finalData = {
      ...payslipData,
      ...totals
    };

    // Generate payslip ID if not provided
    if (!finalData.payslip_id) {
      const monthStr = String(finalData.month).padStart(2, '0');
      finalData.payslip_id = `PS-${finalData.employee_id || finalData.user_id}-${finalData.year}${monthStr}`;
    }

    // Allow admin to override locked payslips
    // Check both isAdmin from payslipData and finalData to ensure we catch it
    const isAdminUser = payslipData.isAdmin === true || payslipData.isAdmin === 'true' || 
                        finalData.isAdmin === true || finalData.isAdmin === 'true';
    const hasId = !!(payslipData.id || finalData.id);
    if (isAdminUser && hasId) {
      finalData.allowAdminOverride = true;
      console.log('[payroll-pf] Admin override enabled for payslip:', payslipData.id || finalData.id, 'isAdmin:', payslipData.isAdmin);
    } else {
      console.log('[payroll-pf] Admin override NOT enabled. isAdmin:', payslipData.isAdmin, 'hasId:', hasId, 'payslipData.id:', payslipData.id, 'finalData.id:', finalData.id);
    }

    const payslip = await payslipModel.upsertPayslip(finalData);

    // Add audit log
    await auditLogModel.addPayrollAuditLog({
      user_id: finalData.user_id,
      action: payslipData.id ? 'payslip_updated' : 'payslip_created',
      entity_type: 'payslip',
      entity_id: payslip.id,
      performed_by: finalData.created_by,
      details: { month: finalData.month, year: finalData.year }
    });

    return transformPayslip(payslip);
  } catch (error) {
    console.error('[payroll-pf] Error in upsertPayslip service:', error);
    throw error;
  }
}

/**
 * Release payslip
 */
export async function releasePayslip(payslipId, releasedBy) {
  try {
    const payslip = await payslipModel.updatePayslipStatus(payslipId, 'released', releasedBy);

    // Add audit log
    await auditLogModel.addPayrollAuditLog({
      user_id: payslip.user_id,
      action: 'payslip_released',
      entity_type: 'payslip',
      entity_id: payslipId,
      performed_by: releasedBy
    });

    return transformPayslip(payslip);
  } catch (error) {
    console.error('[payroll-pf] Error in releasePayslip service:', error);
    throw error;
  }
}

/**
 * Lock payslip
 */
export async function lockPayslip(payslipId, lockedBy) {
  try {
    const payslip = await payslipModel.updatePayslipStatus(payslipId, 'locked', null);

    // Add audit log
    await auditLogModel.addPayrollAuditLog({
      user_id: payslip.user_id,
      action: 'payslip_locked',
      entity_type: 'payslip',
      entity_id: payslipId,
      performed_by: lockedBy
    });

    return transformPayslip(payslip);
  } catch (error) {
    console.error('[payroll-pf] Error in lockPayslip service:', error);
    throw error;
  }
}

