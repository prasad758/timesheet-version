/**
 * API Client for Backend
 * Uses PostgreSQL database via Express.js backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Get auth token from localStorage
const getToken = () => {
  return localStorage.getItem('auth_token');
};

// API request helper
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const fullUrl = `${API_BASE_URL}${endpoint}`;
  
  console.log(`📡 API Request: ${options.method || 'GET'} ${fullUrl}`);
  if (token) {
    console.log('📡 Auth token present:', token.substring(0, 20) + '...');
  } else {
    console.warn('⚠️ No auth token found!');
  }
  
  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    console.log(`📡 Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      // Handle connection errors more gracefully
      if (response.status === 0 || response.type === 'error') {
        console.error('❌ Connection error - server may not be running');
        throw new Error('Cannot connect to server. Please make sure the backend server is running on http://localhost:3001');
      }
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      console.error('❌ API Error:', error);
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ API Success: ${endpoint}`, data);
    return data;
  } catch (error: any) {
    console.error(`❌ API Request failed for ${endpoint}:`, error);
    throw error;
  }
}

// API methods
export const api = {
  // Auth
  auth: {
    sendMagicLink: (email: string) =>
      apiRequest('/auth/send-magic-link', { 
        method: 'POST', 
        body: JSON.stringify({ email }) 
      }),
    
    verifyMagicLink: (token: string) =>
      apiRequest('/auth/verify-magic-link', { 
        method: 'POST', 
        body: JSON.stringify({ token }) 
      }),
    
    getMe: () => apiRequest('/auth/me'),
    
    updateProfile: (data: { full_name?: string }) =>
      apiRequest('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),
  },

  // Projects
  projects: {
    getAll: () => apiRequest('/projects'),
    
    getById: (id: string) => apiRequest(`/projects/${id}`),
    
    create: (data: {
      name: string;
      description?: string;
      visibility?: 'private' | 'internal' | 'public';
    }) => apiRequest('/projects', { method: 'POST', body: JSON.stringify(data) }),
    
    update: (id: string, data: any) =>
      apiRequest(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    
    delete: (id: string) =>
      apiRequest(`/projects/${id}`, { method: 'DELETE' }),
    
    getMembers: (id: string) => apiRequest(`/projects/${id}/members`),
    
    addMember: (id: string, data: { user_id: string; access_level?: number }) =>
      apiRequest(`/projects/${id}/members`, { method: 'POST', body: JSON.stringify(data) }),
  },

  // Issues
  issues: {
    getAll: (params?: { status?: string; assignee?: string }) => {
      const query = new URLSearchParams(params as any).toString();
      return apiRequest(`/issues?${query}`);
    },
    
    getById: (id: string) => apiRequest(`/issues/${id}`),
    
    create: (data: any) =>
      apiRequest('/issues', { method: 'POST', body: JSON.stringify(data) }),
    
    update: (id: string, data: any) =>
      apiRequest(`/issues/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    
    addComment: (id: string, comment: string) =>
      apiRequest(`/issues/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ comment }),
      }),
    
    assignUser: (id: string, user_id: string) =>
      apiRequest(`/issues/${id}/assign`, {
        method: 'POST',
        body: JSON.stringify({ user_id }),
      }),
    
    unassignUser: (id: string, user_id: string) =>
      apiRequest(`/issues/${id}/assign/${user_id}`, {
        method: 'DELETE',
      }),
    
    addLabel: (id: string, label_id: string) =>
      apiRequest(`/issues/${id}/labels`, {
        method: 'POST',
        body: JSON.stringify({ label_id }),
      }),
    
    removeLabel: (id: string, label_id: string) =>
      apiRequest(`/issues/${id}/labels/${label_id}`, {
        method: 'DELETE',
      }),
  },

  // Timesheets
  timesheets: {
    clockIn: (data: any) =>
      apiRequest('/timesheets/clock-in', { method: 'POST', body: JSON.stringify(data) }),
    
    clockOut: (data?: { comment?: string }) =>
      apiRequest('/timesheets/clock-out', { method: 'POST', body: JSON.stringify(data || {}) }),
    
    pause: (data?: { reason?: string }) =>
      apiRequest('/timesheets/pause', { method: 'POST', body: JSON.stringify(data || {}) }),
    
    resume: () =>
      apiRequest('/timesheets/resume', { method: 'POST' }),
    
    getCurrent: () => apiRequest('/timesheets/current'),
    
    getEntries: (params?: any) => {
      const query = new URLSearchParams(params).toString();
      return apiRequest(`/timesheets/entries?${query}`);
    },
    
    getTimesheets: (params?: { week_start?: string; user_id?: string }) => {
      const query = new URLSearchParams(params as any).toString();
      const url = `/timesheets${query ? `?${query}` : ''}`;
      console.log('🌐 Frontend calling:', `${API_BASE_URL}${url}`);
      console.log('🌐 With params:', params);
      return apiRequest(url);
    },
    
    getActive: () => apiRequest('/timesheets/active'),
    
    save: (data: { week_start: string; entries: any[] }) =>
      apiRequest('/timesheets', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Users
  users: {
    getAll: () => apiRequest('/users'),
    
    getWithRoles: () => apiRequest('/users/with-roles'),
    
    updateRole: (id: string, role: string) =>
      apiRequest(`/users/${id}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
      }),
  },

  // Profiles
  profiles: {
    getAll: () => apiRequest('/profiles'),
    
    getById: (id: string) => apiRequest(`/profiles/${id}`),
    
    update: (id: string, data: {
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
    }) =>
      apiRequest(`/profiles/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  // Notifications
  notifications: {
    getAll: (unreadOnly?: boolean) => {
      const query = unreadOnly ? '?unread_only=true' : '';
      return apiRequest(`/notifications${query}`);
    },
    
    markRead: (id: string) =>
      apiRequest(`/notifications/${id}/read`, { method: 'PUT' }),
    
    markAllRead: () =>
      apiRequest('/notifications/read-all', { method: 'PUT' }),
    
    getUnreadCount: () => apiRequest('/notifications/unread-count'),
  },

  // Leave
  leave: {
    getAll: () => apiRequest('/leave'),
    
    create: (data: any) =>
      apiRequest('/leave', { method: 'POST', body: JSON.stringify(data) }),
    
    updateStatus: (id: string, status: string, admin_notes?: string) =>
      apiRequest(`/leave/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, admin_notes }),
      }),
  },

  // Leave Calendar (extended features)
  leaveCalendar: {
    // Leave Balances
    getBalances: () => apiRequest('/leave-calendar/balances'),
    
    getBalancesForUser: (userId: string) => 
      apiRequest(`/leave-calendar/balances/${userId}`),
    
    updateBalance: (data: {
      user_id: string;
      leave_type: string;
      financial_year: string;
      opening_balance: number;
      availed: number;
      balance: number;
      lapse: number;
      lapse_date?: string;
    }) => apiRequest('/leave-calendar/balances', { 
      method: 'PUT', 
      body: JSON.stringify(data) 
    }),

    // Shift Roster
    getShifts: (start_date: string, end_date: string) =>
      apiRequest(`/leave-calendar/shifts?start_date=${start_date}&end_date=${end_date}`),
    
    updateShift: (data: {
      user_id: string;
      date: string;
      shift_type: string;
      start_time: string;
      end_time: string;
    }) => apiRequest('/leave-calendar/shifts', { 
      method: 'POST', 
      body: JSON.stringify(data) 
    }),

    // Attendance
    getAttendance: (start_date: string, end_date: string) =>
      apiRequest(`/leave-calendar/attendance?start_date=${start_date}&end_date=${end_date}`),
    
    updateAttendance: (data: {
      user_id: string;
      date: string;
      status?: string;
      clock_in?: string;
      clock_out?: string;
      total_hours?: number;
    }) => apiRequest('/leave-calendar/attendance', { 
      method: 'POST', 
      body: JSON.stringify(data) 
    }),
  },

  // Labels
  labels: {
    getAll: () => apiRequest('/labels'),
    
    create: (data: any) =>
      apiRequest('/labels', { method: 'POST', body: JSON.stringify(data) }),
  },

  // Git
  git: {
    getCommits: () => apiRequest('/git/commits'),
    
    getIssues: () => apiRequest('/git/issues'),
    
    getCommit: (sha: string) => apiRequest(`/git/commits/${sha}`),
    
    getIssue: (id: string) => apiRequest(`/git/issues/${id}`),
    
    syncUsers: () => apiRequest('/git/sync-users', { method: 'POST' }),
    
    syncIssues: () => apiRequest('/git/sync-issues', { method: 'POST' }),
    
    getUsers: () => apiRequest('/git/users'),
  },
};

