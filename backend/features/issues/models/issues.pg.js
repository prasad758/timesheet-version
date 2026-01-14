/**
 * Issues Model
 * PostgreSQL queries for issue operations
 */

import pool from '../../../shared/database/connection.js';

/**
 * Get all issues with filters
 */
export async function getAllIssues(filters) {
  const { status, assignee, project, userId, isAdmin } = filters;

  let query = `
    SELECT 
      i.*,
      json_agg(DISTINCT jsonb_build_object(
        'user_id', ia.user_id
      )) FILTER (WHERE ia.user_id IS NOT NULL) as assignees,
      json_agg(DISTINCT jsonb_build_object(
        'label_id', il.label_id,
        'name', l.name,
        'color', l.color
      )) FILTER (WHERE l.id IS NOT NULL) as labels
    FROM erp.issues i
    LEFT JOIN erp.issue_assignees ia ON i.id = ia.issue_id
    LEFT JOIN erp.issue_labels il ON i.id = il.issue_id
    LEFT JOIN erp.labels l ON il.label_id = l.id
  `;

  const conditions = [];
  const params = [];
  let paramCount = 1;

  if (status && status !== 'all') {
    conditions.push(`i.status = $${paramCount++}`);
    params.push(status);
  }

  if (assignee && assignee !== 'all') {
    if (isAdmin) {
      conditions.push(`EXISTS (
        SELECT 1 FROM erp.issue_assignees 
        WHERE issue_id = i.id AND user_id = $${paramCount++}
      )`);
      params.push(assignee);
    } else {
      conditions.push(`EXISTS (
        SELECT 1 FROM erp.issue_assignees 
        WHERE issue_id = i.id AND user_id = $${paramCount++}
      )`);
      params.push(userId);
    }
  } else if (!isAdmin) {
    conditions.push(`EXISTS (
      SELECT 1 FROM erp.issue_assignees 
      WHERE issue_id = i.id AND user_id = $${paramCount++}
    )`);
    params.push(userId);
  }

  if (project) {
    conditions.push(`i.project_name = $${paramCount++}`);
    params.push(project);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += `
    GROUP BY i.id
    ORDER BY i.created_at DESC
  `;

  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * Get issue by ID
 */
export async function getIssueById(issueId) {
  const result = await pool.query(
    'SELECT * FROM erp.issues WHERE id = $1',
    [issueId]
  );
  return result.rows[0] || null;
}

/**
 * Get issue assignees
 */
export async function getIssueAssignees(issueId) {
  const result = await pool.query(
    `SELECT 
      ia.user_id,
      u.email,
      COALESCE(u.full_name, '') as full_name
     FROM erp.issue_assignees ia
     JOIN erp.users u ON ia.user_id = u.id
     WHERE ia.issue_id = $1`,
    [issueId]
  );
  return result.rows;
}

/**
 * Get issue labels
 */
export async function getIssueLabels(issueId) {
  const result = await pool.query(
    `SELECT l.*
     FROM erp.issue_labels il
     JOIN erp.labels l ON il.label_id = l.id
     WHERE il.issue_id = $1`,
    [issueId]
  );
  return result.rows;
}

/**
 * Get issue comments
 */
export async function getIssueComments(issueId) {
  const result = await pool.query(
    `SELECT 
      ic.id,
      ic.issue_id,
      ic.user_id,
      ic.comment,
      ic.created_at,
      ic.updated_at,
      u.email,
      COALESCE(u.full_name, '') as full_name
     FROM erp.issue_comments ic
     JOIN erp.users u ON ic.user_id = u.id
     WHERE ic.issue_id = $1
     ORDER BY ic.created_at ASC`,
    [issueId]
  );
  return result.rows;
}

/**
 * Get issue activity
 */
export async function getIssueActivity(issueId) {
  const result = await pool.query(
    `SELECT 
      ia.id,
      ia.issue_id,
      ia.user_id,
      ia.action,
      ia.details,
      ia.created_at,
      u.email,
      COALESCE(u.full_name, '') as full_name
     FROM erp.issue_activity ia
     LEFT JOIN erp.users u ON ia.user_id = u.id
     WHERE ia.issue_id = $1
     ORDER BY ia.created_at DESC`,
    [issueId]
  );
  return result.rows;
}

/**
 * Create GitLab issue
 */
export async function createGitLabIssue(issueData) {
  const {
    gitlab_issue_id,
    gitlab_iid,
    project_id,
    title,
    description,
    status,
    priority,
    created_by,
    estimate_hours,
    start_date,
    due_date
  } = issueData;

  const result = await pool.query(
    `INSERT INTO erp.gitlab_issues (
      gitlab_issue_id, gitlab_iid, project_id, title, description, 
      status, priority, created_by, estimate_hours, start_date, due_date
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      gitlab_issue_id,
      gitlab_iid,
      project_id,
      title,
      description || null,
      status || 'open',
      priority || 'medium',
      created_by,
      estimate_hours || null,
      start_date || null,
      due_date || null
    ]
  );
  return result.rows[0];
}

/**
 * Get GitLab project
 */
export async function getGitLabProject(projectId) {
  const result = await pool.query(
    'SELECT gitlab_project_id, name FROM erp.gitlab_projects WHERE id = $1',
    [projectId]
  );
  return result.rows[0] || null;
}

/**
 * Get labels by IDs
 */
export async function getLabelsByIds(labelIds) {
  const result = await pool.query(
    'SELECT name FROM erp.labels WHERE id = ANY($1)',
    [labelIds]
  );
  return result.rows.map(row => row.name);
}

/**
 * Add issue activity
 */
export async function addIssueActivity(issueId, userId, action, details) {
  await pool.query(
    `INSERT INTO erp.issue_activity (issue_id, user_id, action, details)
     VALUES ($1, $2, $3, $4)`,
    [issueId, userId, action, JSON.stringify(details)]
  );
}

/**
 * Assign users to issue
 */
export async function assignUsersToIssue(issueId, assigneeIds, assignedBy) {
  const assigned = [];
  for (const assigneeId of assigneeIds) {
    const assigneeIdStr = String(assigneeId).trim();
    
    // Check if already assigned
    const existing = await pool.query(
      'SELECT id FROM erp.issue_assignees WHERE issue_id = $1 AND user_id = $2',
      [issueId, assigneeIdStr]
    );

    if (existing.rows.length === 0) {
      await pool.query(
        `INSERT INTO erp.issue_assignees (issue_id, user_id, assigned_by)
         VALUES ($1, $2, $3)
         ON CONFLICT (issue_id, user_id) DO NOTHING`,
        [issueId, assigneeIdStr, assignedBy]
      );
      assigned.push(assigneeIdStr);
    }
  }
  return assigned;
}

/**
 * Unassign user from issue
 */
export async function unassignUserFromIssue(issueId, userId) {
  const result = await pool.query(
    `DELETE FROM erp.issue_assignees
     WHERE issue_id = $1 AND user_id = $2`,
    [issueId, userId]
  );
  return result.rowCount > 0;
}

/**
 * Add label to issue
 */
export async function addLabelToIssue(issueId, labelId) {
  await pool.query(
    `INSERT INTO erp.issue_labels (issue_id, label_id)
     VALUES ($1, $2)
     ON CONFLICT (issue_id, label_id) DO NOTHING`,
    [issueId, labelId]
  );
}

/**
 * Remove label from issue
 */
export async function removeLabelFromIssue(issueId, labelId) {
  const result = await pool.query(
    `DELETE FROM erp.issue_labels
     WHERE issue_id = $1 AND label_id = $2`,
    [issueId, labelId]
  );
  return result.rowCount > 0;
}

/**
 * Get label by ID
 */
export async function getLabelById(labelId) {
  const result = await pool.query(
    'SELECT id, name FROM erp.labels WHERE id = $1',
    [labelId]
  );
  return result.rows[0] || null;
}

/**
 * Add comment to issue
 */
export async function addComment(issueId, userId, comment) {
  const result = await pool.query(
    `INSERT INTO erp.issue_comments (issue_id, user_id, comment)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [issueId, userId, comment]
  );
  return result.rows[0];
}

/**
 * Get comment with user info
 */
export async function getCommentWithUser(commentId) {
  const result = await pool.query(
    `SELECT 
      ic.*,
      u.email,
      COALESCE(u.full_name, '') as full_name
     FROM erp.issue_comments ic
     JOIN erp.users u ON ic.user_id = u.id
     WHERE ic.id = $1`,
    [commentId]
  );
  return result.rows[0] || null;
}

/**
 * Get GitLab issue info
 */
export async function getGitLabIssueInfo(issueId) {
  const result = await pool.query(
    'SELECT gi.gitlab_iid, gi.gitlab_issue_id, gp.gitlab_project_id FROM erp.gitlab_issues gi JOIN erp.gitlab_projects gp ON gi.project_id = gp.gitlab_project_id WHERE gi.id = $1',
    [issueId]
  );
  return result.rows[0] || null;
}

/**
 * Get existing GitLab issue
 */
export async function getGitLabIssue(issueId) {
  const result = await pool.query(
    'SELECT gi.*, gp.gitlab_project_id FROM erp.gitlab_issues gi JOIN erp.gitlab_projects gp ON gi.project_id = gp.gitlab_project_id WHERE gi.id = $1',
    [issueId]
  );
  return result.rows[0] || null;
}

/**
 * Update GitLab issue
 */
export async function updateGitLabIssue(issueId, updates) {
  const result = await pool.query(
    `UPDATE erp.gitlab_issues 
     SET title = COALESCE($1, title),
         description = COALESCE($2, description),
         status = COALESCE($3, status),
         priority = COALESCE($4, priority),
         estimate_hours = COALESCE($5, estimate_hours),
         start_date = COALESCE($6, start_date),
         due_date = COALESCE($7, due_date),
         updated_at = NOW()
     WHERE id = $8
     RETURNING *`,
    [
      updates.title,
      updates.description,
      updates.status,
      updates.priority,
      updates.estimate_hours,
      updates.start_date,
      updates.due_date,
      issueId
    ]
  );
  return result.rows[0];
}

/**
 * Check if user exists
 */
export async function checkUserExists(userId) {
  const result = await pool.query(
    'SELECT id, email FROM erp.users WHERE id = $1',
    [userId]
  );
  return result.rows.length > 0;
}

