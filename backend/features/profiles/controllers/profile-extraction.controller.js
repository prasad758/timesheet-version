/**
 * Profile Extraction Controller
 * Handles file upload and profile extraction requests
 */

import * as extractionService from '../services/profile-extraction.service.js';
import pool from '../../../shared/database/pool.js';

/**
 * Extract profile from uploaded file
 * POST /api/profiles/extract
 */
export async function extractProfile(req, res) {
  try {
    if (!req.file && !req.files) {
      return res.status(400).json({
        error: 'No file provided',
        message: 'Please upload a PDF, Word, Excel, or text file'
      });
    }

    const file = req.file || (req.files && req.files[0]);
    if (!file) {
      return res.status(400).json({
        error: 'Invalid file',
        message: 'File upload failed'
      });
    }

    // Extract profile from file
    const profile = await extractionService.extractProfileFromFile(
      file.buffer,
      file.mimetype,
      file.originalname
    );

    // Map canonical extraction fields to frontend DTO shape
    const mapToFrontendDto = (p) => ({
      // Do not set `id` to employee identifier (which is not a UUID).
      // `id` should represent the user's UUID in the system — leave null
      // for extracted previews. The frontend will use `employee_id` field
      // for display and later linking.
      id: null,
      email: p.Official_Email || p.official_email || null,
      full_name: p.Full_Name || p.full_name || null,
      role: p.Role || p.role || 'user',
      phone: p.Phone_Number || p.phone_number || null,
      skills: p.Skills || p.skills || [],
      join_date: p.Date_of_Joining || p.date_of_joining || null,
      experience_years: p.Total_Experience_Years || p.total_experience_years || null,
      previous_projects: p.Past_Projects || p.past_projects || [],
      bio: p.Notes || p.notes || null,
      linkedin_url: p.LinkedIn || p.linkedin_url || null,
      github_url: p.GitHub || p.github_url || null,
      avatar_url: null,
      job_title: p.Role || p.job_title || null,
      department: p.Department || p.department || null,
      employment_type: p.Employment_Type || p.employment_type || null,
      employee_id: p.Employee_ID || p.employee_id || null,
      reporting_manager: p.Manager_Name || p.manager_name || null,
      personal_email: p.Official_Email || p.personal_email || null,
      emergency_contact: null,
      education: p.Education || p.education || [],
      certifications: p.Certifications || p.certifications || [],
      project_history: p.Past_Projects || p.project_history || [],
      performance_reviews: [],
      documents: [],
      burnout_score: p.Burnout_Score || p.burnout_score || null,
      created_at: new Date().toISOString(),
      updated_at: null,
    });

    res.json({
      success: true,
      profile: mapToFrontendDto(profile),
      filename: file.originalname
    });
  } catch (error) {
    console.error('[profile-extraction] Controller error:', error);
    res.status(500).json({
      error: 'Extraction failed',
      message: error.message || 'Failed to extract profile from file'
    });
  }
}

/**
 * Extract profiles from multiple files
 * POST /api/profiles/extract/batch
 */
export async function extractProfilesBatch(req, res) {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'No files provided',
        message: 'Please upload one or more files'
      });
    }

    const files = req.files.map(file => ({
      buffer: file.buffer,
      mimeType: file.mimetype,
      filename: file.originalname
    }));

    const results = await extractionService.extractProfilesFromFiles(files);

    res.json({
      success: true,
      results,
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    });
  } catch (error) {
    console.error('[profile-extraction] Batch controller error:', error);
    res.status(500).json({
      error: 'Batch extraction failed',
      message: error.message || 'Failed to extract profiles from files'
    });
  }
}

/**
 * Extract and create/update profile
 * POST /api/profiles/extract-and-save
 */
export async function extractAndSaveProfile(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file provided',
        message: 'Please upload a file'
      });
    }

    const userId = req.userId;
    const isAdmin = req.isAdmin;

    // Extract profile from file
    const extractedProfile = await extractionService.extractProfileFromFile(
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname
    );

    // Map extracted fields to database schema
    const profileData = mapExtractedToProfileSchema(extractedProfile);

    // Check if user exists (by email or employee_id)
    let targetUserId = userId;
    
    if (extractedProfile.Official_Email) {
      const userCheck = await pool.query(
        'SELECT id FROM erp.users WHERE email = $1',
        [extractedProfile.Official_Email]
      );
      
      if (userCheck.rows.length > 0) {
        targetUserId = userCheck.rows[0].id;
      } else if (isAdmin && extractedProfile.Employee_ID) {
        // Admin can create new user if employee_id provided
        // For now, we'll just update existing user or return error
        return res.status(404).json({
          error: 'User not found',
          message: `No user found with email ${extractedProfile.Official_Email}. Please create user first.`,
          extracted_profile: extractedProfile
        });
      }
    }

    // Check if user exists
    const userExists = await pool.query(
      'SELECT id FROM erp.users WHERE id = $1',
      [targetUserId]
    );

    if (userExists.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User does not exist. Please create user first.',
        extracted_profile: extractedProfile
      });
    }

    // Update user full_name if provided
    if (profileData.full_name) {
      await pool.query(
        'UPDATE erp.users SET full_name = $1, updated_at = now() WHERE id = $2',
        [profileData.full_name, targetUserId]
      );
    }

    // Insert or update profile
    await pool.query(
      `INSERT INTO erp.profiles (
        id, phone, skills, join_date, experience_years, 
        previous_projects, full_name,
        job_title, department, employment_type, employee_id,
        reporting_manager, personal_email,
        certifications, project_history,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, now())
      ON CONFLICT (id) DO UPDATE SET
        phone = COALESCE(EXCLUDED.phone, profiles.phone),
        skills = COALESCE(EXCLUDED.skills, profiles.skills),
        join_date = COALESCE(EXCLUDED.join_date, profiles.join_date),
        experience_years = COALESCE(EXCLUDED.experience_years, profiles.experience_years),
        previous_projects = COALESCE(EXCLUDED.previous_projects, profiles.previous_projects),
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        job_title = COALESCE(EXCLUDED.job_title, profiles.job_title),
        department = COALESCE(EXCLUDED.department, profiles.department),
        employment_type = COALESCE(EXCLUDED.employment_type, profiles.employment_type),
        employee_id = COALESCE(EXCLUDED.employee_id, profiles.employee_id),
        reporting_manager = COALESCE(EXCLUDED.reporting_manager, profiles.reporting_manager),
        personal_email = COALESCE(EXCLUDED.personal_email, profiles.personal_email),
        certifications = COALESCE(EXCLUDED.certifications, profiles.certifications),
        project_history = COALESCE(EXCLUDED.project_history, profiles.project_history),
        updated_at = now()`,
      [
        targetUserId,
        profileData.phone || null,
        profileData.skills ? JSON.stringify(profileData.skills) : null,
        profileData.join_date || null,
        profileData.experience_years || null,
        profileData.previous_projects ? JSON.stringify(profileData.previous_projects) : null,
        profileData.full_name || null,
        profileData.job_title || null,
        profileData.department || null,
        profileData.employment_type || null,
        profileData.employee_id || null,
        profileData.reporting_manager || null,
        profileData.personal_email || null,
        profileData.certifications ? JSON.stringify(profileData.certifications) : null,
        profileData.project_history ? JSON.stringify(profileData.project_history) : null
      ]
    );

    res.json({
      success: true,
      message: 'Profile extracted and saved successfully',
      profile_id: targetUserId,
      extracted_profile: extractedProfile
    });
  } catch (error) {
    console.error('[profile-extraction] Extract and save error:', error);
    res.status(500).json({
      error: 'Failed to extract and save profile',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Map extracted profile to database schema
 */
function mapExtractedToProfileSchema(extracted) {
  return {
    employee_id: extracted.Employee_ID,
    full_name: extracted.Full_Name,
    personal_email: extracted.Official_Email, // Note: official email goes to personal_email field
    phone: extracted.Phone_Number,
    join_date: extracted.Date_of_Joining,
    department: extracted.Department,
    job_title: extracted.Role,
    employment_type: extracted.Employment_Type,
    experience_years: extracted.Total_Experience_Years,
    skills: extracted.Skills,
    certifications: extracted.Certifications,
    previous_projects: extracted.Past_Projects,
    reporting_manager: extracted.Manager_Name,
    project_history: extracted.Current_Project ? [{
      name: extracted.Current_Project,
      status: 'current',
      start_date: null
    }] : null
  };
}

/**
 * Save edited profile data
 * POST /api/profiles/save-edited
 */
export async function saveEditedProfile(req, res) {
  try {
    const { profile } = req.body;
    const userId = req.userId;

    if (!profile) {
      return res.status(400).json({
        error: 'No profile data provided',
        message: 'Profile data is required'
      });
    }

    // Map edited profile to database schema
    const profileData = mapExtractedToProfileSchema(profile);

    // Check if user exists (by email)
    let targetUserId = userId;

    if (profile.Official_Email) {
      const userCheck = await pool.query(
        'SELECT id FROM erp.users WHERE email = $1',
        [profile.Official_Email]
      );

      if (userCheck.rows.length > 0) {
        targetUserId = userCheck.rows[0].id;
      } else {
        // Create new user if not exists
        const newUser = await pool.query(
          'INSERT INTO erp.users (id, email, full_name, created_at, updated_at) VALUES (uuid_generate_v4(), $1, $2, now(), now()) RETURNING id',
          [profile.Official_Email, profile.Full_Name || '']
        );
        targetUserId = newUser.rows[0].id;
      }
    }

    // Update user full_name if provided
    if (profileData.full_name) {
      await pool.query(
        'UPDATE erp.users SET full_name = $1, updated_at = now() WHERE id = $2',
        [profileData.full_name, targetUserId]
      );
    }

    // Insert or update profile
    await pool.query(
      `INSERT INTO erp.profiles (
        id, phone, skills, join_date, experience_years,
        previous_projects, full_name,
        job_title, department, employment_type, employee_id,
        reporting_manager, personal_email,
        certifications, project_history,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, now())
      ON CONFLICT (id) DO UPDATE SET
        phone = COALESCE(EXCLUDED.phone, profiles.phone),
        skills = COALESCE(EXCLUDED.skills, profiles.skills),
        join_date = COALESCE(EXCLUDED.join_date, profiles.join_date),
        experience_years = COALESCE(EXCLUDED.experience_years, profiles.experience_years),
        previous_projects = COALESCE(EXCLUDED.previous_projects, profiles.previous_projects),
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        job_title = COALESCE(EXCLUDED.job_title, profiles.job_title),
        department = COALESCE(EXCLUDED.department, profiles.department),
        employment_type = COALESCE(EXCLUDED.employment_type, profiles.employment_type),
        employee_id = COALESCE(EXCLUDED.employee_id, profiles.employee_id),
        reporting_manager = COALESCE(EXCLUDED.reporting_manager, profiles.reporting_manager),
        personal_email = COALESCE(EXCLUDED.personal_email, profiles.personal_email),
        certifications = COALESCE(EXCLUDED.certifications, profiles.certifications),
        project_history = COALESCE(EXCLUDED.project_history, profiles.project_history),
        updated_at = now()`,
      [
        targetUserId,
        profileData.phone || null,
        profileData.skills ? JSON.stringify(profileData.skills) : null,
        profileData.join_date || null,
        profileData.experience_years || null,
        profileData.previous_projects ? JSON.stringify(profileData.previous_projects) : null,
        profileData.full_name || null,
        profileData.job_title || null,
        profileData.department || null,
        profileData.employment_type || null,
        profileData.employee_id || null,
        profileData.reporting_manager || null,
        profileData.personal_email || null,
        profileData.certifications ? JSON.stringify(profileData.certifications) : null,
        profileData.project_history ? JSON.stringify(profileData.project_history) : null
      ]
    );

    res.json({
      success: true,
      message: 'Profile saved successfully',
      profile_id: targetUserId
    });
  } catch (error) {
    console.error('[profile-extraction] Save edited profile error:', error);
    res.status(500).json({
      error: 'Failed to save profile',
      message: error.message || 'Internal server error'
    });
  }
}

/**
 * Upload and save multiple profiles from Excel/CSV file
 * POST /api/profiles/upload-batch
 */
export async function uploadBatchProfiles(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file provided',
        message: 'Please upload an Excel or CSV file'
      });
    }

    const file = req.file;
    
    // Parse the Excel/CSV file to extract profiles
    const profilesData = await extractionService.parseBatchProfilesFile(
      file.buffer,
      file.mimetype,
      file.originalname
    );
    
    const userId = req.userId;
    const results = [];
    // const isAdmin = req.isAdmin;
    
    // if (!isAdmin) {
    //   return res.status(403).json({
    //     error: 'Permission denied',
    //     message: 'Only admin users can upload batch profiles'
    //   });
    // }
    
    console.log('[batch-upload] Total profiles to process:', profilesData.length);
    console.log('[batch-upload] Parsed profiles:', JSON.stringify(profilesData, null, 2));
    
    if (profilesData.length === 0) {
      return res.status(400).json({
        error: 'No valid profiles found',
        message: 'The uploaded file does not contain any valid profile data. Please ensure the file has data rows with at least an email or name, and remove the sample row.'
      });
    }
    
    for (const profileData of profilesData) {
      try {
        console.log('[batch-upload] Processing profile:', JSON.stringify(profileData, null, 2));
        
        // Map extracted fields to database schema
        const mappedProfile = mapExtractedToProfileSchema(profileData);
        
        // Find user by email or employee_id
        let targetUserId = null;
        
        if (profileData.Official_Email) {
          const userCheck = await pool.query(
            'SELECT id FROM erp.users WHERE email = $1',
            [profileData.Official_Email]
          );
          
          if (userCheck.rows.length > 0) {
            targetUserId = userCheck.rows[0].id;
          } else {
            // Create new user if not exists
            const newUser = await pool.query(
              'INSERT INTO erp.users (id, email, full_name, created_at, updated_at) VALUES (uuid_generate_v4(), $1, $2, now(), now()) RETURNING id',
              [profileData.Official_Email, profileData.Full_Name || '']
            );
            targetUserId = newUser.rows[0].id;
          }
        } else {
          results.push({
            success: false,
            email: profileData.Official_Email,
            error: 'Missing email - email is required to create or identify user'
          });
          continue;
        }
        
        // Update user full_name if provided
        if (mappedProfile.full_name) {
          await pool.query(
            'UPDATE erp.users SET full_name = $1, updated_at = now() WHERE id = $2',
            [mappedProfile.full_name, targetUserId]
          );
        }
        
        // Insert or update profile (with available fields)
        await pool.query(
          `INSERT INTO erp.profiles (
            id, full_name, phone, skills, join_date, experience_years, 
            previous_projects, job_title, department, employment_type, 
            employee_id, reporting_manager, personal_email, certifications,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, now())
          ON CONFLICT (id) DO UPDATE SET
            full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
            phone = COALESCE(EXCLUDED.phone, profiles.phone),
            skills = COALESCE(EXCLUDED.skills, profiles.skills),
            join_date = COALESCE(EXCLUDED.join_date, profiles.join_date),
            experience_years = COALESCE(EXCLUDED.experience_years, profiles.experience_years),
            previous_projects = COALESCE(EXCLUDED.previous_projects, profiles.previous_projects),
            job_title = COALESCE(EXCLUDED.job_title, profiles.job_title),
            department = COALESCE(EXCLUDED.department, profiles.department),
            employment_type = COALESCE(EXCLUDED.employment_type, profiles.employment_type),
            employee_id = COALESCE(EXCLUDED.employee_id, profiles.employee_id),
            reporting_manager = COALESCE(EXCLUDED.reporting_manager, profiles.reporting_manager),
            personal_email = COALESCE(EXCLUDED.personal_email, profiles.personal_email),
            certifications = COALESCE(EXCLUDED.certifications, profiles.certifications),
            updated_at = now()`,
          [
            targetUserId,
            mappedProfile.full_name || null,
            mappedProfile.phone || null,
            // `skills` column is stored as a Postgres array; pass JS array directly
            mappedProfile.skills ? (Array.isArray(mappedProfile.skills) ? mappedProfile.skills : String(mappedProfile.skills).split(',').map(s => s.trim()).filter(Boolean)) : null,
            mappedProfile.join_date || null,
            mappedProfile.experience_years || null,
            mappedProfile.previous_projects ? JSON.stringify(mappedProfile.previous_projects) : null,
            mappedProfile.job_title || null,
            mappedProfile.department || null,
            mappedProfile.employment_type || null,
            mappedProfile.employee_id || null,
            mappedProfile.reporting_manager || null,
            mappedProfile.personal_email || null,
            mappedProfile.certifications ? JSON.stringify(mappedProfile.certifications) : null
          ]
        );
        
        results.push({
          success: true,
          email: profileData.Official_Email,
          name: profileData.Full_Name,
          message: 'Profile created/updated successfully'
        });
        
      } catch (error) {
        console.error('[batch-upload] Error processing profile:', error);
        console.error('[batch-upload] Error stack:', error.stack);
        console.error('[batch-upload] Profile data that failed:', JSON.stringify(profileData, null, 2));
        results.push({
          success: false,
          email: profileData.Official_Email || 'N/A',
          name: profileData.Full_Name || 'N/A',
          error: error.message || String(error)
        });
      }
    }
    
    res.json({
      success: true,
      message: `Batch upload completed. ${results.filter(r => r.success).length} successful, ${results.filter(r => !r.success).length} failed`,
      results,
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    });
    
  } catch (error) {
    console.error('[batch-upload] Controller error:', error);
    res.status(500).json({
      error: 'Batch upload failed',
      message: error.message || 'Failed to process batch upload'
    });
  }
}

