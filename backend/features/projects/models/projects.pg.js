/**
 * Projects Model
 * PostgreSQL queries for project operations
 */

import pool from '../../../shared/database/connection.js';

/**
 * Get all projects from issues
 */
export async function getAllProjects() {
  const result = await pool.query(
    `SELECT 
      project_name as name,
      COUNT(*) as issue_count,
      COUNT(CASE WHEN status = 'open' THEN 1 END) as open_issues,
      COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_issues,
      MIN(created_at) as created_at
    FROM erp.issues 
    WHERE project_name IS NOT NULL AND project_name != ''
    GROUP BY project_name
    ORDER BY MIN(created_at) DESC`
  );
  return result.rows;
}

/**
 * Get project by ID or name
 */
export async function getProjectById(id) {
  const result = await pool.query(
    `SELECT 
      project_name as name,
      description,
      COUNT(*) as issue_count,
      COUNT(CASE WHEN status = 'open' THEN 1 END) as open_issues,
      COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_issues,
      MIN(created_at) as created_at
    FROM erp.issues 
    WHERE id = $1 OR project_name = (SELECT project_name FROM erp.issues WHERE id = $1)
    GROUP BY project_name, description`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Create project (creates an issue entry)
 */
export async function createProject(name, description, userId) {
  const result = await pool.query(
    `INSERT INTO erp.issues (title, description, status, priority, project_name, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      `${name} - Project`,
      description || `Project: ${name}`,
      'open',
      'medium',
      name,
      userId
    ]
  );
  return result.rows[0];
}

/**
 * Get GitLab project
 */
export async function getGitLabProject(id) {
  const result = await pool.query(
    'SELECT * FROM erp.gitlab_projects WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Update GitLab project
 */
export async function updateGitLabProject(id, updates) {
  const updateFields = [];
  const updateValues = [];
  let paramCount = 1;

  Object.entries(updates).forEach(([key, value]) => {
    updateFields.push(`${key} = $${paramCount}`);
    updateValues.push(value);
    paramCount++;
  });

  if (updateFields.length === 0) {
    return null;
  }

  updateValues.push(id);
  const updateQuery = `
    UPDATE erp.gitlab_projects 
    SET ${updateFields.join(', ')}, updated_at = NOW()
    WHERE id = $${paramCount}
    RETURNING *
  `;

  const result = await pool.query(updateQuery, updateValues);
  return result.rows[0];
}

/**
 * Delete GitLab project
 */
export async function deleteGitLabProject(id) {
  const result = await pool.query(
    'DELETE FROM erp.gitlab_projects WHERE id = $1 RETURNING *',
    [id]
  );
  return result.rows[0] || null;
}

