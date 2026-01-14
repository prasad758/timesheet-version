/**
 * Git Service
 * Business logic for Git/GitLab integration
 */

import axios from 'axios';
import pool from '../../../shared/database/connection.js';

// GitLab configuration
const GITLAB_URL = process.env.GITLAB_URL || 'https://git.techiemaya.com';
const GITLAB_TOKEN = process.env.GITLAB_TOKEN;
const GITLAB_API = `${GITLAB_URL}/api/v4`;

/**
 * GitLab API helper
 */
const gitlabApi = axios.create({
  baseURL: GITLAB_API,
  headers: {
    'Authorization': `Bearer ${GITLAB_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

/**
 * Get all commits from GitLab
 */
export async function getCommits() {
  const projectId = process.env.GITLAB_PROJECT_ID || '1';
  const response = await gitlabApi.get(`/projects/${projectId}/repository/commits?per_page=20`);
  return Array.isArray(response.data) ? response.data : [];
}

/**
 * Get all issues from GitLab
 */
export async function getIssues() {
  const projectId = process.env.GITLAB_PROJECT_ID || '1';
  const response = await gitlabApi.get(`/projects/${projectId}/issues?per_page=20`);
  return Array.isArray(response.data) ? response.data : [];
}

/**
 * Get commit details
 */
export async function getCommit(sha) {
  const projectId = process.env.GITLAB_PROJECT_ID || '1';
  const response = await gitlabApi.get(`/projects/${projectId}/repository/commits/${sha}`);
  return response.data;
}

/**
 * Get issue details with comments
 */
export async function getIssue(id) {
  const projectId = process.env.GITLAB_PROJECT_ID || '1';
  
  const [issueResponse, notesResponse] = await Promise.all([
    gitlabApi.get(`/projects/${projectId}/issues/${id}`),
    gitlabApi.get(`/projects/${projectId}/issues/${id}/notes`).catch(() => ({ data: [] }))
  ]);

  return {
    ...issueResponse.data,
    notes: Array.isArray(notesResponse.data) ? notesResponse.data : []
  };
}

/**
 * Sync GitLab users with local users
 */
export async function syncUsers() {
  const response = await gitlabApi.get('/users?per_page=100');
  const gitlabUsers = response.data;
  let syncedCount = 0;

  for (const gitUser of gitlabUsers) {
    try {
      const existingUser = await pool.query(
        'SELECT id FROM erp.users WHERE email = $1 OR gitlab_id = $2',
        [gitUser.email, gitUser.id]
      );

      if (existingUser.rows.length === 0) {
        const insertResult = await pool.query(
          `INSERT INTO erp.users (email, full_name, gitlab_id, gitlab_username, created_at) 
           VALUES ($1, $2, $3, $4, NOW()) RETURNING id`,
          [gitUser.email, gitUser.name, gitUser.id, gitUser.username]
        );
        
        if (insertResult.rows.length > 0) {
          await pool.query(
            `INSERT INTO erp.user_roles (user_id, role, created_at) 
             VALUES ($1, 'user', NOW())`,
            [insertResult.rows[0].id]
          );
        }
        syncedCount++;
      } else {
        await pool.query(
          `UPDATE erp.users SET 
           gitlab_id = $1, 
           gitlab_username = $2, 
           full_name = COALESCE(NULLIF($3, ''), full_name)
           WHERE id = $4`,
          [gitUser.id, gitUser.username, gitUser.name, existingUser.rows[0].id]
        );
      }
    } catch (userError) {
      console.error('Error syncing user:', gitUser.email, userError.message);
    }
  }

  return { synced: syncedCount, total: gitlabUsers.length };
}

/**
 * Sync GitLab issues with local issues
 */
export async function syncIssues() {
  const projectId = process.env.GITLAB_PROJECT_ID || '1';
  const response = await gitlabApi.get(`/projects/${projectId}/issues?per_page=100&state=all`);
  const gitlabIssues = response.data;
  let syncedCount = 0;

  for (const gitIssue of gitlabIssues) {
    try {
      const existingIssue = await pool.query(
        'SELECT id FROM erp.issues WHERE gitlab_id = $1',
        [gitIssue.id]
      );

      let assignedUserId = null;
      if (gitIssue.assignee) {
        const assignedUser = await pool.query(
          'SELECT id FROM erp.users WHERE gitlab_id = $1',
          [gitIssue.assignee.id]
        );
        if (assignedUser.rows.length > 0) {
          assignedUserId = assignedUser.rows[0].id;
        }
      }

      let authorId = null;
      const author = await pool.query(
        'SELECT id FROM erp.users WHERE gitlab_id = $1',
        [gitIssue.author.id]
      );
      if (author.rows.length > 0) {
        authorId = author.rows[0].id;
      }

      if (existingIssue.rows.length === 0) {
        await pool.query(
          `INSERT INTO erp.issues (title, description, status, priority, gitlab_id, gitlab_iid, 
           created_by, assigned_to, created_at, updated_at) 
           VALUES ($1, $2, $3, 'medium', $4, $5, $6, $7, $8, $9)`,
          [
            gitIssue.title,
            gitIssue.description || '',
            gitIssue.state === 'closed' ? 'closed' : 'open',
            gitIssue.id,
            gitIssue.iid,
            authorId,
            assignedUserId,
            gitIssue.created_at,
            gitIssue.updated_at
          ]
        );
        syncedCount++;
      } else {
        await pool.query(
          `UPDATE erp.issues SET 
           title = $1, 
           description = $2, 
           status = $3,
           assigned_to = $4,
           updated_at = $5
           WHERE gitlab_id = $6`,
          [
            gitIssue.title,
            gitIssue.description || '',
            gitIssue.state === 'closed' ? 'closed' : 'open',
            assignedUserId,
            gitIssue.updated_at,
            gitIssue.id
          ]
        );
      }
    } catch (issueError) {
      console.error('Error syncing issue:', gitIssue.id, issueError.message);
    }
  }

  return { synced: syncedCount, total: gitlabIssues.length };
}

/**
 * Get mapped users (GitLab + local)
 */
export async function getMappedUsers() {
  const result = await pool.query(
    `SELECT u.id, u.email, u.full_name, u.gitlab_id, u.gitlab_username, ur.role, u.created_at
     FROM erp.users u
     LEFT JOIN erp.user_roles ur ON u.id = ur.user_id
     WHERE u.gitlab_id IS NOT NULL
     ORDER BY u.full_name`
  );
  return result.rows;
}

