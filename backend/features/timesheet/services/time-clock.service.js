/**
 * Time Clock Service
 * Business logic for time clock operations
 */

import * as timeClockModel from '../models/time-clock.pg.js';
import * as timesheetModel from '../models/timesheet.pg.js';
import * as utils from './timesheet-utils.service.js';

/**
 * Clock in
 */
export async function clockIn(userId, clockInData) {
  const { issue_id, project_name, latitude, longitude, location_address } = clockInData;

  // Check if user already has an active clock-in
  const activeEntry = await timeClockModel.getActiveEntry(userId);
  if (activeEntry) {
    throw new Error('Already clocked in');
  }

  // Create new clock-in entry
  return await timeClockModel.createClockIn(
    userId,
    issue_id,
    project_name,
    latitude,
    longitude,
    location_address
  );
}

/**
 * Clock out
 */
export async function clockOut(userId, comment) {
  // Get active entry
  const activeEntry = await timeClockModel.getActiveEntry(userId);
  if (!activeEntry) {
    throw new Error('No active entry');
  }

  const clockOutTime = new Date();
  const clockInTime = new Date(activeEntry.clock_in);
  const pausedDuration = activeEntry.paused_duration || 0;

  // Calculate total hours
  const totalHours = utils.calculateTotalHours(clockInTime, clockOutTime, pausedDuration);

  // Update entry
  const updatedEntry = await timeClockModel.updateClockOut(activeEntry.id, clockOutTime, totalHours);

  // Add comment to issue if provided
  if (comment && activeEntry.issue_id) {
    await timesheetModel.addIssueComment(activeEntry.issue_id, userId, comment);
    await timesheetModel.addIssueActivity(activeEntry.issue_id, userId, 'work_completed', {
      comment: comment.substring(0, 100),
      hours_worked: totalHours,
    });
  }

  // Add to weekly timesheet
  let timesheetUpdateSuccess = false;
  try {
    if (totalHours > 0) {
      const weekStartStr = utils.getWeekStartMonday(clockOutTime);
      const weekEndStr = utils.getWeekEnd(weekStartStr);
      
      const localDateStr = clockOutTime.toLocaleDateString('en-CA');
      const [year, month, day] = localDateStr.split('-').map(Number);
      const localDate = new Date(year, month - 1, day);
      const dayOfWeek = localDate.getDay();
      const dayColumn = utils.getDayColumn(dayOfWeek);

      // Determine project and task
      let project = activeEntry.project_name || 'General';
      let task = 'General Work';

      if (activeEntry.issue_id) {
        const issue = await timesheetModel.getIssueDetails(activeEntry.issue_id);
        if (issue) {
          project = issue.project_name || activeEntry.project_name || 'General';
          task = `Issue #${activeEntry.issue_id}: ${issue.title || 'Untitled'}`;
        } else {
          project = activeEntry.project_name || 'General';
          task = `Issue #${activeEntry.issue_id}`;
        }
      }

      project = (project || 'General').trim();
      task = (task || 'General Work').trim();

      // Get or create timesheet
      let timesheet = await timesheetModel.getTimesheetByWeek(userId, weekStartStr);
      let timesheetId;
      
      if (timesheet) {
        timesheetId = timesheet.id;
      } else {
        timesheetId = await timesheetModel.createTimesheet(userId, weekStartStr, weekEndStr);
      }

      // Find or create entry
      const existingEntry = await timesheetModel.getOrCreateTimeClockEntry(timesheetId, project, task);
      
      if (existingEntry) {
        const currentHours = parseFloat(existingEntry[dayColumn]) || 0;
        const newHours = Math.round((currentHours + totalHours) * 100) / 100;
        await timesheetModel.updateTimesheetEntryHours(existingEntry.id, dayColumn, newHours);
      } else {
        await timesheetModel.createTimesheetEntryForDay(timesheetId, project, task, dayColumn, totalHours);
      }
      
      timesheetUpdateSuccess = true;
    }
  } catch (error) {
    console.error('Error adding to timesheet:', error);
    // Don't throw - allow clock-out to succeed even if timesheet update fails
  }

  return {
    entry: updatedEntry,
    total_hours: totalHours,
    timesheet_updated: timesheetUpdateSuccess,
  };
}

/**
 * Pause time
 */
export async function pauseTime(userId, reason) {
  const activeEntry = await timeClockModel.getActiveEntry(userId);
  if (!activeEntry || activeEntry.status !== 'clocked_in') {
    throw new Error('No active entry');
  }

  return await timeClockModel.pauseEntry(activeEntry.id, reason);
}

/**
 * Resume time
 */
export async function resumeTime(userId) {
  const pausedEntry = await timeClockModel.getActiveEntry(userId);
  if (!pausedEntry || pausedEntry.status !== 'paused') {
    throw new Error('No paused entry');
  }

  const pauseStart = new Date(pausedEntry.pause_start);
  const now = new Date();
  const pauseDurationMs = now.getTime() - pauseStart.getTime();
  const pauseDurationHours = pauseDurationMs / (1000 * 60 * 60);
  const totalPausedHours = (pausedEntry.paused_duration || 0) + pauseDurationHours;

  return await timeClockModel.resumeEntry(pausedEntry.id, totalPausedHours);
}

/**
 * Get current time entry
 */
export async function getCurrentEntry(userId) {
  const entry = await timeClockModel.getCurrentEntry(userId);
  if (!entry) {
    return null;
  }

  return {
    ...entry,
    issue: entry.issue_id ? {
      id: entry.issue_id,
      title: entry.issue_title,
      project_name: entry.issue_project,
    } : null,
  };
}

/**
 * Get time clock entries
 */
export async function getTimeClockEntries(userId, isAdmin, filters) {
  const entries = await timeClockModel.getTimeClockEntries(userId, isAdmin, filters);
  
  return entries.map(entry => ({
    ...entry,
    issue: entry.issue_id ? {
      id: entry.issue_id,
      title: entry.issue_title,
      project_name: entry.issue_project,
    } : null,
  }));
}

/**
 * Get all active entries
 */
export async function getAllActiveEntries() {
  const entries = await timeClockModel.getAllActiveEntries();
  
  return entries.map(entry => ({
    ...entry,
    issue: entry.issue_id ? {
      id: entry.issue_id,
      title: entry.issue_title,
      project_name: entry.issue_project,
    } : null,
  }));
}

