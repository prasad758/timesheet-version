/**
 * Profiles API
 * HTTP calls to backend
 * Feature-prefixed endpoints
 * Typed responses
 */

import { 
  EmployeeProfile, 
  UpdateProfileRequest,
  GetAllProfilesResponse,
  GetProfileResponse,
  UpdateProfileResponse
} from './types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Get auth token from localStorage
 */
const getToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

/**
 * API request helper
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const fullUrl = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(fullUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/**
 * Get all employee profiles
 */
export async function getAllProfiles(): Promise<GetAllProfilesResponse> {
  return apiRequest<GetAllProfilesResponse>('/profiles');
}

/**
 * Get profile by ID
 */
export async function getProfileById(id: string): Promise<GetProfileResponse> {
  return apiRequest<GetProfileResponse>(`/profiles/${id}`);
}

/**
 * Update profile
 */
export async function updateProfile(
  id: string, 
  data: UpdateProfileRequest
): Promise<UpdateProfileResponse> {
  return apiRequest<UpdateProfileResponse>(`/profiles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

