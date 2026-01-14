/**
 * Issues Service
 * Business logic for issue management
 */

import * as issueModel from '../models/issues.pg.js';
import * as gitlabService from './gitlab.service.js';

/**
 * Get all issues
 */
export async function getAllIssues(userId, isAdmin, filters) {
  const issues = await issueModel.getAllIssues({
    ...filters,
    userId,
    isAdmin
  });

  return issues.map(issue => ({
    ...issue,
    assignees: issue.assignees || [],
    labels: issue.labels || [],
  }));
}

/**
 * Get issue by ID
 */
export async function getIssueById(issueId) {
  const issue = await issueModel.getIssueById(issueId);
  
  if (!issue) {
    throw new Error('Issue not found');
  }

  const [assignees, labels, comments, activity] = await Promise.all([
    issueModel.getIssueAssignees(issueId),
    issueModel.getIssueLabels(issueId),
    issueModel.getIssueComments(issueId),
    issueModel.getIssueActivity(issueId)
  ]);

  return {
    ...issue,
    assignees,
    labels,
    comments,
    activity,
  };
}

/**
 * Create issue
 */
export async function createIssue(issueData, userId) {
  const {
    title,
    description,
    status,
    priority,
    project_id,
    assignee_ids,
    label_ids,
    estimate_hours,
    start_date,
    due_date
  } = issueData;

  // Get project info
  const project = await issueModel.getGitLabProject(project_id);
  if (!project) {
    throw new Error('Project not found');
  }

  // Get label names for GitLab
  const labelNames = label_ids ? await issueModel.getLabelsByIds(label_ids) : [];

  // Create issue in GitLab
  let gitlabIssue;
  try {
    gitlabIssue = await gitlabService.createGitLabIssue(project.gitlab_project_id, {
      title,
      description,
      labelNames,
      assigneeIds: assignee_ids,
      estimateHours: estimate_hours,
      dueDate: due_date
    });
  } catch (gitlabError) {
    throw new Error(`Failed to create issue in GitLab: ${gitlabError.response?.data?.message || gitlabError.message}`);
  }

  // Create issue in local database
  const issue = await issueModel.createGitLabIssue({
    gitlab_issue_id: gitlabIssue.id,
    gitlab_iid: gitlabIssue.iid,
    project_id: project.gitlab_project_id,
    title,
    description,
    status: status || 'open',
    priority: priority || 'medium',
    created_by: userId,
    estimate_hours,
    start_date,
    due_date
  });

  // Add activity
  await issueModel.addIssueActivity(issue.id, userId, 'created', {
    title,
    gitlab_iid: gitlabIssue.iid
  });

  // Assign users
  if (assignee_ids && Array.isArray(assignee_ids)) {
    await issueModel.assignUsersToIssue(issue.id, assignee_ids, userId);
  }

  // Add labels
  if (label_ids && Array.isArray(label_ids)) {
    for (const labelId of label_ids) {
      await issueModel.addLabelToIssue(issue.id, labelId);
    }
  }

  return {
    ...issue,
    gitlab_url: gitlabIssue.web_url,
    project_name: project.name
  };
}

/**
 * Update issue
 */
export async function updateIssue(issueId, updates, userId) {
  const existing = await issueModel.getGitLabIssue(issueId);
  
  if (!existing) {
    throw new Error('Issue not found');
  }

  // Update in GitLab
  try {
    await gitlabService.updateGitLabIssue(
      existing.gitlab_project_id,
      existing.gitlab_iid,
      updates
    );
  } catch (gitlabError) {
    throw new Error(`Failed to update issue in GitLab: ${gitlabError.response?.data?.message || gitlabError.message}`);
  }

  // Update in local database
  const updatedIssue = await issueModel.updateGitLabIssue(issueId, updates);

  // Track status change
  if (updates.status && updates.status !== existing.status) {
    await issueModel.addIssueActivity(issueId, userId, 'status_changed', {
      old_status: existing.status,
      new_status: updates.status,
    });
  }

  return updatedIssue;
}

/**
 * Add comment
 */
export async function addComment(issueId, userId, comment) {
  const issueInfo = await issueModel.getGitLabIssueInfo(issueId);
  
  if (!issueInfo) {
    throw new Error('Issue not found');
  }

  // Post comment to GitLab
  try {
    await gitlabService.postCommentToGitLab(
      issueInfo.gitlab_project_id,
      issueInfo.gitlab_iid,
      comment
    );
  } catch (gitlabError) {
    console.error('GitLab comment post failed:', gitlabError.response?.data || gitlabError.message);
    // Continue with local save
  }

  // Add comment locally
  const commentRecord = await issueModel.addComment(issueId, userId, comment);
  const commentWithUser = await issueModel.getCommentWithUser(commentRecord.id);

  // Add activity
  await issueModel.addIssueActivity(issueId, userId, 'commented', {
    comment: comment.substring(0, 100)
  });

  return commentWithUser;
}

/**
 * Assign users to issue
 */
export async function assignUsers(issueId, assigneeIds, assignedBy) {
  // Verify issue exists
  const issue = await issueModel.getIssueById(issueId);
  if (!issue) {
    throw new Error('Issue not found');
  }

  // Verify users exist
  for (const assigneeId of assigneeIds) {
    const assigneeIdStr = String(assigneeId).trim();
    const userExists = await issueModel.checkUserExists(assigneeIdStr);
    if (!userExists) {
      throw new Error(`User ${assigneeIdStr} not found`);
    }
  }

  // Assign users
  const assigned = await issueModel.assignUsersToIssue(issueId, assigneeIds, assignedBy);

  // Add activity for each assigned user
  for (const assigneeId of assigned) {
    await issueModel.addIssueActivity(issueId, assignedBy, 'assigned_user', {
      assigned_user_id: assigneeId
    });
  }

  return assigned;
}

/**
 * Unassign user from issue
 */
export async function unassignUser(issueId, userId, unassignedBy) {
  const issue = await issueModel.getIssueById(issueId);
  if (!issue) {
    throw new Error('Issue not found');
  }

  const removed = await issueModel.unassignUserFromIssue(issueId, userId);
  if (!removed) {
    throw new Error('User assignment not found');
  }

  await issueModel.addIssueActivity(issueId, unassignedBy, 'unassigned_user', {
    unassigned_user_id: userId
  });

  return true;
}

/**
 * Add label to issue
 */
export async function addLabel(issueId, labelId, userId) {
  const issue = await issueModel.getIssueById(issueId);
  if (!issue) {
    throw new Error('Issue not found');
  }

  const label = await issueModel.getLabelById(labelId);
  if (!label) {
    throw new Error('Label not found');
  }

  // Check if already assigned
  const existing = await issueModel.getIssueLabels(issueId);
  if (existing.some(l => l.id === labelId)) {
    return { message: 'Label already assigned' };
  }

  await issueModel.addLabelToIssue(issueId, labelId);
  await issueModel.addIssueActivity(issueId, userId, 'added_label', {
    label_id: labelId,
    label_name: label.name
  });

  return { message: 'Label added successfully' };
}

/**
 * Remove label from issue
 */
export async function removeLabel(issueId, labelId, userId) {
  const issue = await issueModel.getIssueById(issueId);
  if (!issue) {
    throw new Error('Issue not found');
  }

  const label = await issueModel.getLabelById(labelId);
  const removed = await issueModel.removeLabelFromIssue(issueId, labelId);
  
  if (!removed) {
    throw new Error('Label assignment not found');
  }

  await issueModel.addIssueActivity(issueId, userId, 'removed_label', {
    label_id: labelId,
    label_name: label?.name || 'Unknown'
  });

  return { message: 'Label removed successfully' };
}

