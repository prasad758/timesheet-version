/**
 * Profiles Routes
 * Handles employee profile management operations
 */

import express from 'express';
import pool from '../db/connection.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

/**
 * Get all employee profiles
 * GET /api/profiles
 */
router.get('/', async (req, res) => {
  try {
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
        p.burnout_score,
        p.updated_at
      FROM erp.users u
      LEFT JOIN erp.user_roles ur ON u.id = ur.user_id
      LEFT JOIN erp.profiles p ON u.id = p.id
      ORDER BY p.join_date DESC NULLS LAST, u.created_at DESC`
    );

    res.json({
      profiles: result.rows.map(profile => {
        // Helper function to safely parse JSONB fields
        const parseJsonb = (value) => {
          if (value === null || value === undefined) return [];
          if (typeof value === 'object') return value;
          if (typeof value === 'string') {
            try {
              return JSON.parse(value);
            } catch (e) {
              return [];
            }
          }
          return [];
        };

        return {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          role: profile.role || 'user',
          phone: profile.phone || null,
          skills: Array.isArray(profile.skills) ? profile.skills : (profile.skills || []),
          join_date: profile.join_date ? (typeof profile.join_date === 'string' ? profile.join_date.split('T')[0] : profile.join_date) : (profile.created_at ? (typeof profile.created_at === 'string' ? profile.created_at.split('T')[0] : null) : null),
          experience_years: profile.experience_years ? parseFloat(profile.experience_years) : null,
          previous_projects: parseJsonb(profile.previous_projects),
          bio: profile.bio || null,
          linkedin_url: profile.linkedin_url || null,
          github_url: profile.github_url || null,
          avatar_url: profile.avatar_url || null,
          job_title: profile.job_title || null,
          department: profile.department || null,
          employment_type: profile.employment_type || null,
          employee_id: profile.employee_id || null,
          reporting_manager: profile.reporting_manager || null,
          personal_email: profile.personal_email || null,
          emergency_contact: profile.emergency_contact || null,
          education: parseJsonb(profile.education),
          certifications: parseJsonb(profile.certifications),
          project_history: parseJsonb(profile.project_history),
          performance_reviews: parseJsonb(profile.performance_reviews),
          documents: parseJsonb(profile.documents),
          burnout_score: profile.burnout_score || null,
          created_at: profile.created_at,
          updated_at: profile.updated_at,
        };
      }),
    });
  } catch (error) {
    console.error('Get profiles error:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to get profiles',
      message: error.message || 'Internal server error' 
    });
  }
});

/**
 * Get single employee profile
 * GET /api/profiles/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const isAdmin = req.isAdmin;

    // Users can only see their own profile unless admin
    if (id !== userId && !isAdmin) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'You can only view your own profile' 
      });
    }

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
        p.burnout_score,
        p.updated_at
      FROM erp.users u
      LEFT JOIN erp.user_roles ur ON u.id = ur.user_id
      LEFT JOIN erp.profiles p ON u.id = p.id
      WHERE u.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const profile = result.rows[0];
    res.json({
      profile: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role || 'user',
        phone: profile.phone || null,
        skills: profile.skills || [],
        join_date: profile.join_date || profile.created_at?.split('T')[0] || null,
        experience_years: profile.experience_years || null,
        previous_projects: profile.previous_projects || [],
        bio: profile.bio || null,
        linkedin_url: profile.linkedin_url || null,
        github_url: profile.github_url || null,
        avatar_url: profile.avatar_url || null,
        job_title: profile.job_title || null,
        department: profile.department || null,
        employment_type: profile.employment_type || null,
        employee_id: profile.employee_id || null,
        reporting_manager: profile.reporting_manager || null,
        personal_email: profile.personal_email || null,
        emergency_contact: profile.emergency_contact || null,
        education: profile.education || [],
        certifications: profile.certifications || [],
        project_history: profile.project_history || [],
        performance_reviews: profile.performance_reviews || [],
        documents: profile.documents || [],
        burnout_score: profile.burnout_score || null,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      error: 'Failed to get profile',
      message: 'Internal server error' 
    });
  }
});

/**
 * Update employee profile
 * PUT /api/profiles/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const isAdmin = req.isAdmin;

    // Users can only update their own profile unless admin
    if (id !== userId && !isAdmin) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'You can only update your own profile' 
      });
    }

    const {
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
      burnout_score,
    } = req.body;

    // Check if user exists
    const userCheck = await pool.query(
      'SELECT id FROM erp.users WHERE id = $1',
      [id]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user full_name if provided
    if (full_name) {
      await pool.query(
        'UPDATE erp.users SET full_name = $1, updated_at = now() WHERE id = $2',
        [full_name, id]
      );
    }

    // Insert or update profile
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
        burnout_score || null,
      ]
    );

    res.json({
      message: 'Profile updated successfully',
      profile_id: id,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to update profile',
      message: error.message || 'Internal server error' 
    });
  }
});

/**
 * Delete employee profile
 * DELETE /api/profiles/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const isAdmin = req.isAdmin;

    // Only allow owner or admin to delete profile
    if (id !== userId && !isAdmin) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only delete your own profile'
      });
    }

    // Check if profile exists
    const existing = await pool.query('SELECT id FROM erp.profiles WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Delete the profile row (keeps user record intact)
    await pool.query('DELETE FROM erp.profiles WHERE id = $1', [id]);

    res.json({
      message: 'Profile deleted successfully',
      profile_id: id
    });
  } catch (error) {
    console.error('Delete profile error:', error);
    res.status(500).json({
      error: 'Failed to delete profile',
      message: error.message || 'Internal server error'
    });
  }
});

export default router;

