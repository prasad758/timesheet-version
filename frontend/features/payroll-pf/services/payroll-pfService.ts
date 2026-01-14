/**
 * Payroll & PF Service
 * HTTP calls to backend
 * Feature-prefixed endpoints
 * Typed responses
 */

import type {
  Payslip,
  PfDetails,
  PfContribution,
  PfDocument,
  PayrollAuditLog,
  UpsertPayslipRequest,
  UpsertPfDetailsRequest,
  CreatePfContributionRequest,
  AddPfDocumentRequest,
  GetPayslipsResponse,
  GetPayslipResponse,
  UpsertPayslipResponse,
  GetPfDetailsResponse,
  UpsertPfDetailsResponse,
  GetPfContributionsResponse,
  CreatePfContributionResponse,
  GetPfDocumentsResponse,
  AddPfDocumentResponse,
  GetPayrollAuditLogResponse
} from '../types';

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
    const errorMessage = error.message || error.error || `HTTP error! status: ${response.status}`;
    console.error(`[API Error] ${fullUrl}:`, errorMessage, error);
    throw new Error(errorMessage);
  }

  const data = await response.json();
  console.log(`[API Success] ${fullUrl}:`, data);
  return data;
}

/**
 * Get payslips
 */
export async function getPayslips(filters?: {
  user_id?: string;
  month?: number;
  year?: number;
  status?: string;
  department?: string;
  upcoming_only?: boolean;
}): Promise<GetPayslipsResponse> {
  const queryParams = new URLSearchParams();
  if (filters?.user_id) queryParams.append('user_id', filters.user_id);
  if (filters?.month) queryParams.append('month', String(filters.month));
  if (filters?.year) queryParams.append('year', String(filters.year));
  if (filters?.status) queryParams.append('status', filters.status);
  if (filters?.department) queryParams.append('department', filters.department);
  if (filters?.upcoming_only) queryParams.append('upcoming_only', 'true');
  
  const query = queryParams.toString();
  return apiRequest<GetPayslipsResponse>(`/payroll-pf/payslips${query ? `?${query}` : ''}`);
}

/**
 * Get payslip by ID
 */
export async function getPayslipById(id: string): Promise<GetPayslipResponse> {
  return apiRequest<GetPayslipResponse>(`/payroll-pf/payslips/${id}`);
}

/**
 * Create or update payslip
 */
export async function upsertPayslip(data: UpsertPayslipRequest): Promise<UpsertPayslipResponse> {
  const method = data.id ? 'PUT' : 'POST';
  const url = data.id ? `/payroll-pf/payslips/${data.id}` : '/payroll-pf/payslips';
  return apiRequest<UpsertPayslipResponse>(url, {
    method,
    body: JSON.stringify(data),
  });
}

/**
 * Release payslip
 */
export async function releasePayslip(id: string): Promise<UpsertPayslipResponse> {
  return apiRequest<UpsertPayslipResponse>(`/payroll-pf/payslips/${id}/release`, {
    method: 'PUT',
  });
}

/**
 * Lock payslip
 */
export async function lockPayslip(id: string): Promise<UpsertPayslipResponse> {
  return apiRequest<UpsertPayslipResponse>(`/payroll-pf/payslips/${id}/lock`, {
    method: 'PUT',
  });
}

/**
 * Get PF details
 */
export async function getPfDetails(userId?: string): Promise<GetPfDetailsResponse> {
  const url = userId ? `/payroll-pf/pf-details/${userId}` : '/payroll-pf/pf-details';
  return apiRequest<GetPfDetailsResponse>(url);
}

/**
 * Create or update PF details
 */
export async function upsertPfDetails(data: UpsertPfDetailsRequest, userId?: string): Promise<UpsertPfDetailsResponse> {
  const method = userId ? 'PUT' : 'POST';
  const url = userId ? `/payroll-pf/pf-details/${userId}` : '/payroll-pf/pf-details';
  return apiRequest<UpsertPfDetailsResponse>(url, {
    method,
    body: JSON.stringify(data),
  });
}

/**
 * Get PF contributions
 */
export async function getPfContributions(filters?: {
  user_id?: string;
  month?: number;
  year?: number;
}): Promise<GetPfContributionsResponse> {
  const queryParams = new URLSearchParams();
  if (filters?.user_id) queryParams.append('user_id', filters.user_id);
  if (filters?.month) queryParams.append('month', String(filters.month));
  if (filters?.year) queryParams.append('year', String(filters.year));
  
  const query = queryParams.toString();
  return apiRequest<GetPfContributionsResponse>(`/payroll-pf/pf-contributions${query ? `?${query}` : ''}`);
}

/**
 * Create PF contribution
 */
export async function createPfContribution(data: CreatePfContributionRequest): Promise<CreatePfContributionResponse> {
  return apiRequest<CreatePfContributionResponse>('/payroll-pf/pf-contributions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get PF documents
 */
export async function getPfDocuments(filters?: {
  user_id?: string;
  document_type?: string;
}): Promise<GetPfDocumentsResponse> {
  const queryParams = new URLSearchParams();
  if (filters?.user_id) queryParams.append('user_id', filters.user_id);
  if (filters?.document_type) queryParams.append('document_type', filters.document_type);
  
  const query = queryParams.toString();
  return apiRequest<GetPfDocumentsResponse>(`/payroll-pf/pf-documents${query ? `?${query}` : ''}`);
}

/**
 * Add PF document
 */
export async function addPfDocument(data: AddPfDocumentRequest): Promise<AddPfDocumentResponse> {
  return apiRequest<AddPfDocumentResponse>('/payroll-pf/pf-documents', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get payroll audit log
 */
export async function getPayrollAuditLog(filters?: {
  user_id?: string;
  action?: string;
  entity_type?: string;
  limit?: number;
}): Promise<GetPayrollAuditLogResponse> {
  const queryParams = new URLSearchParams();
  if (filters?.user_id) queryParams.append('user_id', filters.user_id);
  if (filters?.action) queryParams.append('action', filters.action);
  if (filters?.entity_type) queryParams.append('entity_type', filters.entity_type);
  if (filters?.limit) queryParams.append('limit', String(filters.limit));
  
  const query = queryParams.toString();
  return apiRequest<GetPayrollAuditLogResponse>(`/payroll-pf/audit-log${query ? `?${query}` : ''}`);
}

