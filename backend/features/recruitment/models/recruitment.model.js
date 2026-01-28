/**
 * Add candidate calendar event (e.g., interview)
 */
export async function addCandidateCalendarEvent(candidateId, { title, description, start_time, end_time, event_type = 'interview' }) {
  const id = uuidv4();
  const result = await pool.query(`
    INSERT INTO erp.candidate_calendar_events (
      id, candidate_id, event_type, title, description, start_time, end_time
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [
    id,
    candidateId,
    event_type,
    title,
    description || null,
    start_time,
    end_time
  ]);
  return result.rows[0];
}
// ...duplicate updateVerification removed...
/**
 * Recruitment Model
 * PostgreSQL queries for 3-stage hiring process
 */

import pool from '../../../shared/database/connection.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Get all candidates
 */
export async function getAllCandidates() {
  const result = await pool.query(`
    SELECT 
      id,
      full_name,
      email,
      phone,
      position_applied,
      department,
      current_stage,
      interview_status,
      verification_status,
      final_status,
      created_at
    FROM erp.recruitment_candidates
    ORDER BY created_at DESC
  `);
  return result.rows;
}

/**
 * Get candidate by ID with all details
 */
export async function getCandidateById(id) {
  const candidateResult = await pool.query(`
    SELECT * FROM erp.recruitment_candidates WHERE id = $1
  `, [id]);

  if (candidateResult.rows.length === 0) {
    return null;
  }

  const candidate = candidateResult.rows[0];

  // Get interview rounds
  const interviewsResult = await pool.query(`
    SELECT * FROM erp.recruitment_interviews 
    WHERE candidate_id = $1 
    ORDER BY created_at
  `, [id]);

  // Get background verifications
  const verificationsResult = await pool.query(`
    SELECT * FROM erp.recruitment_verifications 
    WHERE candidate_id = $1 
    ORDER BY created_at
  `, [id]);

  return {
    ...candidate,
    interview_rounds: interviewsResult.rows,
    background_verifications: verificationsResult.rows
  };
}

/**
 * Create new candidate
 */
export async function createCandidate(candidateInfo) {
  const id = uuidv4();
  const result = await pool.query(`
    INSERT INTO erp.recruitment_candidates (
      id, full_name, email, phone, position_applied, department,
      experience_years, current_company, current_ctc, expected_ctc, notice_period,
      resume_url, photo_url, current_stage, interview_status, verification_status,
      onboarding_status, final_status
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
      'interview', 'pending', 'pending', 'pending', 'pending'
    )
    RETURNING *
  `, [
    id,
    candidateInfo.full_name,
    candidateInfo.email,
    candidateInfo.phone,
    candidateInfo.position_applied,
    candidateInfo.department,
    candidateInfo.experience_years || 0,
    candidateInfo.current_company || null,
    candidateInfo.current_ctc || null,
    candidateInfo.expected_ctc || null,
    candidateInfo.notice_period || null,
    candidateInfo.resume_url || null,
    candidateInfo.photo_url || null
  ]);

  return result.rows[0];
}

/**
 * Update candidate
 */
export async function updateCandidate(id, data) {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  Object.keys(data).forEach(key => {
    if (data[key] !== undefined && key !== 'id') {
      fields.push(`${key} = $${paramIndex}`);
      values.push(data[key]);
      paramIndex++;
    }
  });

  if (fields.length === 0) {
    return getCandidateById(id);
  }

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const result = await pool.query(`
    UPDATE erp.recruitment_candidates 
    SET ${fields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `, values);

  return result.rows[0];
}

/**
 * Delete candidate
 */
export async function deleteCandidate(id) {
  await pool.query(`DELETE FROM erp.recruitment_verifications WHERE candidate_id = $1`, [id]);
  await pool.query(`DELETE FROM erp.recruitment_interviews WHERE candidate_id = $1`, [id]);
  await pool.query(`DELETE FROM erp.recruitment_candidates WHERE id = $1`, [id]);
}

/**
 * Add interview round
 */
export async function addInterviewRound(candidateId, roundData) {
  const id = uuidv4();
  const result = await pool.query(`
    INSERT INTO erp.recruitment_interviews (
      id, candidate_id, round_name, interviewer_name, interview_date,
      status, result, feedback, score
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `, [
    id,
    candidateId,
    roundData.round_name,
    roundData.interviewer_name,
    roundData.interview_date || null,
    roundData.status || 'scheduled',
    roundData.result || 'pending',
    roundData.feedback || null,
    roundData.score || null
  ]);

  return result.rows[0];
}

/**
 * Update interview round
 */
export async function updateInterviewRound(candidateId, roundId, data) {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  Object.keys(data).forEach(key => {
    if (data[key] !== undefined) {
      fields.push(`${key} = $${paramIndex}`);
      values.push(data[key]);
      paramIndex++;
    }
  });

  if (fields.length === 0) {
    const result = await pool.query(`SELECT * FROM erp.recruitment_interviews WHERE id = $1`, [roundId]);
    return result.rows[0];
  }

  fields.push(`updated_at = NOW()`);
  values.push(roundId);

  const result = await pool.query(`
    UPDATE erp.recruitment_interviews 
    SET ${fields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `, values);

  return result.rows[0];
}

/**
 * Delete interview round
 */
export async function deleteInterviewRound(candidateId, roundId) {
  await pool.query(`DELETE FROM erp.recruitment_interviews WHERE id = $1 AND candidate_id = $2`, [roundId, candidateId]);
}

/**
 * Add verification
 */
export async function addVerification(candidateId, verificationData) {
  const id = uuidv4();
  const result = await pool.query(`
    INSERT INTO erp.recruitment_verifications (
      id, candidate_id, verification_type, verification_name,
      status, verified_by, verified_at, notes, documents
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `, [
    id,
    candidateId,
    verificationData.verification_type,
    verificationData.verification_name,
    verificationData.status || 'pending',
    verificationData.verified_by || null,
    verificationData.verified_at || null,
    verificationData.notes || null,
    JSON.stringify(verificationData.documents || [])
  ]);

  return result.rows[0];
}

/**
 * Update verification
 */
export async function updateVerification(candidateId, verificationId, data) {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  Object.keys(data).forEach(key => {
    if (data[key] !== undefined) {
      if (key === 'documents') {
        fields.push(`${key} = $${paramIndex}`);
        values.push(JSON.stringify(data[key]));
      } else {
        fields.push(`${key} = $${paramIndex}`);
        values.push(data[key]);
      }
      paramIndex++;
    }
  });

  if (fields.length === 0) {
    const result = await pool.query(`SELECT * FROM erp.recruitment_verifications WHERE id = $1`, [verificationId]);
    return result.rows[0];
  }

  fields.push(`updated_at = NOW()`);
  values.push(verificationId);

  const result = await pool.query(`
    UPDATE erp.recruitment_verifications 
    SET ${fields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `, values);

  return result.rows[0];
}

/**
 * Delete verification
 */
export async function deleteVerification(candidateId, verificationId) {
  await pool.query(`DELETE FROM erp.recruitment_verifications WHERE id = $1 AND candidate_id = $2`, [verificationId, candidateId]);
}

/**
 * Complete interview stage
 */
export async function completeInterviewStage(id, passed, notes) {
  const newStage = passed ? 'verification' : 'interview';
  const newStatus = passed ? 'passed' : 'failed';
  const finalStatus = passed ? 'pending' : 'rejected';

  const result = await pool.query(`
    UPDATE erp.recruitment_candidates 
    SET interview_status = $1, 
        current_stage = $2,
        final_status = $3,
        interview_notes = $4,
        updated_at = NOW()
    WHERE id = $5
    RETURNING *
  `, [newStatus, newStage, finalStatus, notes, id]);

  return result.rows[0];
}

/**
 * Complete verification stage
 */
export async function completeVerificationStage(id, passed, notes) {
  const newStage = passed ? 'onboarding' : 'verification';
  const newStatus = passed ? 'passed' : 'failed';
  const finalStatus = passed ? 'pending' : 'rejected';

  const result = await pool.query(`
    UPDATE erp.recruitment_candidates 
    SET verification_status = $1, 
        current_stage = $2,
        final_status = $3,
        verification_notes = $4,
        updated_at = NOW()
    WHERE id = $5
    RETURNING *
  `, [newStatus, newStage, finalStatus, notes, id]);

  return result.rows[0];
}

/**
 * Complete onboarding - Create employee and update candidate status
 */
export async function completeOnboarding(id, joiningDate) {
  const result = await pool.query(`
    UPDATE erp.recruitment_candidates 
    SET onboarding_status = 'passed',
        final_status = 'hired',
        joining_date = $1,
        updated_at = NOW()
    WHERE id = $2
    RETURNING *
  `, [joiningDate, id]);

  return result.rows[0];
}

/**
 * Reject candidate
 */
export async function rejectCandidate(id, reason) {
  const result = await pool.query(`
    UPDATE erp.recruitment_candidates 
    SET final_status = 'rejected',
        rejection_reason = $1,
        updated_at = NOW()
    WHERE id = $2
    RETURNING *
  `, [reason, id]);

  return result.rows[0];
}
