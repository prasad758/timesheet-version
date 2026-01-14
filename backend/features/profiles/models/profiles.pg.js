/**
 * Profiles Model
 * PostgreSQL queries only - NO business logic
 */

import pool from '../../../shared/database/connection.js';

/**
 * Get all profiles from database
 */
export async function getAllProfiles() {
  try {
    // Check if burnout_score column exists, if not use COALESCE to handle it
    const result = await pool.query(
      `SELECT 
        u.id,
        u.email,
        u.full_name,
        u.created_at,
        ur.role,
        p.phone,
        p.skills,
        p.join_date,
        p.experience_years,
        p.previous_projects,
        p.bio,
        p.linkedin_url,
        p.github_url,
        p.avatar_url,
        p.job_title,
        p.department,
        p.employment_type,
        p.employee_id,
        p.reporting_manager,
        p.personal_email,
        p.emergency_contact,
        p.education,
        p.certifications,
        p.project_history,
        p.performance_reviews,
        p.documents,
        COALESCE(p.burnout_score, 0) as burnout_score,
        p.updated_at
      FROM erp.users u
      LEFT JOIN erp.user_roles ur ON u.id = ur.user_id
      LEFT JOIN erp.profiles p ON u.id = p.id
      ORDER BY p.join_date DESC NULLS LAST, u.created_at DESC`
    );
    return result.rows;
  } catch (error) {
    console.error('[profiles] Error in getAllProfiles model:', error);
    console.error('[profiles] Error details:', error.message, error.stack);
    throw error;
  }
}

/**
 * Get profile by user ID
 */
export async function getProfileById(userId) {
  const result = await pool.query(
    `SELECT 
      u.id,
      u.email,
      u.full_name,
      u.created_at,
      ur.role,
      p.phone,
      p.skills,
      p.join_date,
      p.experience_years,
      p.previous_projects,
      p.bio,
      p.linkedin_url,
      p.github_url,
      p.avatar_url,
      p.job_title,
      p.department,
      p.employment_type,
      p.employee_id,
      p.reporting_manager,
      p.personal_email,
      p.emergency_contact,
      p.education,
      p.certifications,
      p.project_history,
      p.performance_reviews,
      p.documents,
      COALESCE(p.burnout_score, 0) as burnout_score,
      p.updated_at
    FROM erp.users u
    LEFT JOIN erp.user_roles ur ON u.id = ur.user_id
    LEFT JOIN erp.profiles p ON u.id = p.id
    WHERE u.id = $1`,
    [userId]
  );
  return result.rows[0] || null;
}

/**
 * Check if user exists
 */
export async function userExists(userId) {
  const result = await pool.query(
    'SELECT id FROM erp.users WHERE id = $1',
    [userId]
  );
  return result.rows.length > 0;
}

/**
 * Update user full_name
 */
export async function updateUserName(userId, fullName) {
  await pool.query(
    'UPDATE erp.users SET full_name = $1, updated_at = now() WHERE id = $2',
    [fullName, userId]
  );
}

/**
 * Insert or update profile
 */
export async function upsertProfile(profileData) {
  const {
    id,
    phone,
    skills,
    join_date,
    experience_years,
    previous_projects,
    bio,
    linkedin_url,
    github_url,
    full_name,
    job_title,
    department,
    employment_type,
    employee_id,
    reporting_manager,
    personal_email,
    emergency_contact,
    education,
    certifications,
    project_history,
    performance_reviews,
    documents,
    burnout_score
  } = profileData;

  await pool.query(
    `INSERT INTO erp.profiles (
      id, phone, skills, join_date, experience_years, 
      previous_projects, bio, linkedin_url, github_url, full_name,
      job_title, department, employment_type, employee_id,
      reporting_manager, personal_email, emergency_contact,
      education, certifications, project_history, performance_reviews, documents,
      burnout_score, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, now())
    ON CONFLICT (id) DO UPDATE SET
      phone = COALESCE(EXCLUDED.phone, profiles.phone),
      skills = COALESCE(EXCLUDED.skills, profiles.skills),
      join_date = COALESCE(EXCLUDED.join_date, profiles.join_date),
      experience_years = COALESCE(EXCLUDED.experience_years, profiles.experience_years),
      previous_projects = COALESCE(EXCLUDED.previous_projects, profiles.previous_projects),
      bio = COALESCE(EXCLUDED.bio, profiles.bio),
      linkedin_url = COALESCE(EXCLUDED.linkedin_url, profiles.linkedin_url),
      github_url = COALESCE(EXCLUDED.github_url, profiles.github_url),
      full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
      job_title = COALESCE(EXCLUDED.job_title, profiles.job_title),
      department = COALESCE(EXCLUDED.department, profiles.department),
      employment_type = COALESCE(EXCLUDED.employment_type, profiles.employment_type),
      employee_id = COALESCE(EXCLUDED.employee_id, profiles.employee_id),
      reporting_manager = COALESCE(EXCLUDED.reporting_manager, profiles.reporting_manager),
      personal_email = COALESCE(EXCLUDED.personal_email, profiles.personal_email),
      emergency_contact = COALESCE(EXCLUDED.emergency_contact, profiles.emergency_contact),
      education = COALESCE(EXCLUDED.education, profiles.education),
      certifications = COALESCE(EXCLUDED.certifications, profiles.certifications),
      project_history = COALESCE(EXCLUDED.project_history, profiles.project_history),
      performance_reviews = COALESCE(EXCLUDED.performance_reviews, profiles.performance_reviews),
      documents = COALESCE(EXCLUDED.documents, profiles.documents),
      burnout_score = COALESCE(EXCLUDED.burnout_score, profiles.burnout_score),
      updated_at = now()`,
    [
      id,
      phone || null,
      skills || null,
      join_date || null,
      experience_years || null,
      previous_projects ? JSON.stringify(previous_projects) : null,
      bio || null,
      linkedin_url || null,
      github_url || null,
      full_name || null,
      job_title || null,
      department || null,
      employment_type || null,
      employee_id || null,
      reporting_manager || null,
      personal_email || null,
      emergency_contact || null,
      education ? JSON.stringify(education) : null,
      certifications ? JSON.stringify(certifications) : null,
      project_history ? JSON.stringify(project_history) : null,
      performance_reviews ? JSON.stringify(performance_reviews) : null,
      documents ? JSON.stringify(documents) : null,
      burnout_score !== undefined && burnout_score !== null ? parseInt(burnout_score) : 0,
    ]
  );
}

/**
 * Delete profile row by user id
 */
export async function deleteProfileById(userId) {
  console.log('[profiles.model] Deleting profile for userId:', userId);
  const result = await pool.query('DELETE FROM erp.profiles WHERE id = $1 RETURNING id', [userId]);
  console.log('[profiles.model] Delete result:', result.rowCount, 'rows deleted');
  return result;
}

