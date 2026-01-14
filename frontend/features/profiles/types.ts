/**
 * Profiles Feature Types
 * DTOs, API response types, and domain types
 */

/**
 * Employee Profile DTO
 */
export interface EmployeeProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone: string | null;
  skills: string[];
  join_date: string | null;
  experience_years: number | null;
  previous_projects: any[];
  bio: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  avatar_url: string | null;
  job_title?: string | null;
  department?: string | null;
  employment_type?: string | null;
  employee_id?: string | null;
  reporting_manager?: string | null;
  personal_email?: string | null;
  emergency_contact?: string | null;
  education?: any[];
  certifications?: any[];
  project_history?: any[];
  performance_reviews?: any[];
  documents?: any[];
  burnout_score?: number;
  created_at: string;
  updated_at: string | null;
}

/**
 * Create/Update Profile Request
 */
export interface UpdateProfileRequest {
  phone?: string;
  skills?: string[];
  join_date?: string;
  experience_years?: number;
  previous_projects?: any[];
  bio?: string;
  linkedin_url?: string;
  github_url?: string;
  full_name?: string;
  job_title?: string;
  department?: string;
  employment_type?: string;
  employee_id?: string;
  reporting_manager?: string;
  personal_email?: string;
  emergency_contact?: string;
  education?: any[];
  certifications?: any[];
  project_history?: any[];
  performance_reviews?: any[];
  documents?: any[];
  burnout_score?: number;
}

/**
 * API Response Types
 */
export interface GetAllProfilesResponse {
  profiles: EmployeeProfile[];
}

export interface GetProfileResponse {
  profile: EmployeeProfile;
}

export interface UpdateProfileResponse {
  message: string;
  profile_id: string;
}

