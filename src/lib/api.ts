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
    register: (data: { email: string; password: string; full_name?: string }) =>
      apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    
    login: (data: { email: string; password: string }) =>
      apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    
    getMe: () => apiRequest('/auth/me'),
    
    updateProfile: (data: { full_name?: string }) =>
      apiRequest('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),
    
    forgotPassword: (email: string) =>
      apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
    
    resetPassword: (token: string, newPassword: string) =>
      apiRequest('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
      }),
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

  // Labels
  labels: {
    getAll: () => apiRequest('/labels'),
    
    create: (data: any) =>
      apiRequest('/labels', { method: 'POST', body: JSON.stringify(data) }),
  },
};

