/**
 * Leave Calendar Service
 * Business logic for leave requests
 */

import * as leaveModel from '../models/leave-calendar.pg.js';

/**
 * Get all leave requests
 */
export async function getAllLeaveRequests(userId, isAdmin) {
  return await leaveModel.getAllLeaveRequests(userId, isAdmin);
}

/**
 * Create leave request
 */
export async function createLeaveRequest(userId, leaveData) {
  const { start_date, end_date, leave_type, reason } = leaveData;

  // Validate date range
  if (new Date(end_date) < new Date(start_date)) {
    throw new Error('End date must be after start date');
  }

  return await leaveModel.createLeaveRequest(userId, start_date, end_date, leave_type, reason);
}

/**
 * Update leave request status
 */
export async function updateLeaveRequestStatus(id, status, reviewedBy, adminNotes) {
  const result = await leaveModel.updateLeaveRequestStatus(id, status, reviewedBy, adminNotes);
  
  if (!result) {
    throw new Error('Leave request not found');
  }

  return result;
}

/**
 * Get leave balances for a user
 */
export async function getLeaveBalances(userId) {
  return await leaveModel.getLeaveBalances(userId);
}

/**
 * Update leave balance for a user (Admin only)
 */
export async function updateLeaveBalance(balanceData) {
  // Balance = Opening Balance − Availed − Lapse
  balanceData.balance = balanceData.opening_balance - balanceData.availed - (balanceData.lapse || 0);
  return await leaveModel.updateLeaveBalance(balanceData);
}

/**
 * Get shift roster for a date range
 */
export async function getShiftRoster(startDate, endDate) {
  return await leaveModel.getShiftRoster(startDate, endDate);
}

/**
 * Update shift roster
 */
export async function updateShiftRoster(shiftData) {
  return await leaveModel.updateShiftRoster(shiftData);
}

/**
 * Get attendance records for a date range
 */
export async function getAttendance(startDate, endDate) {
  return await leaveModel.getAttendance(startDate, endDate);
}

/**
 * Update attendance record
 */
export async function updateAttendanceRecord(attendanceData) {
    return await leaveModel.updateAttendanceRecord(attendanceData);
}

/**
 * Get leave history for a user
 */
export async function getLeaveHistory(userId) {
    return await leaveModel.getLeaveHistory(userId);
}

/**
 * Get monthly attendance report (Admin only)
 */
export async function getMonthlyAttendanceReport(month, year) {
    return await leaveModel.getMonthlyAttendanceReport(month, year);
}

/**
 * Get shift-wise attendance analysis (Admin only)
 */
export async function getShiftWiseAttendanceAnalysis(startDate, endDate) {
    return await leaveModel.getShiftWiseAttendanceAnalysis(startDate, endDate);
}

