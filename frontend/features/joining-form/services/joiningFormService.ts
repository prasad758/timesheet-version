// Create a new joining form (profile) and return the created form (with id)
import type { JoiningForm } from "./types";
export async function createJoiningForm(data: Partial<JoiningForm>): Promise<JoiningForm> {
  // Step 1: Create new profile to get ID
  // Extract email from the joining form data (employee_info)
  const email = data?.employee_info?.email;
  if (!email) throw new Error("Email is required to create a profile");
  const createRes = await api.post("/joining-form/create", { email });
  console.log('Create response:', createRes); // Debug log
  const profileId = createRes.profileId || (createRes.data && createRes.data.profileId);
  if (!profileId) throw new Error("Failed to create profileId");
  // Step 2: Save form data to the new profile
  const saveRes = await api.post(`/joining-form/${profileId}`, data);
  // Return the saved form with id
  return { ...(data as any), id: profileId, ...(saveRes.form || {}) };
}
/**
 * Joining Form Services
 */

import { api } from "@/lib/api";
import type { JoiningForm, JoiningFormSummary } from "./types";

const API_BASE = "/joining-form";

export async function getAllJoiningForms(): Promise<JoiningFormSummary[]> {
  const response = await api.get(API_BASE);
  return response.forms || [];
}

export async function getJoiningFormById(id: string): Promise<JoiningForm | null> {
  const response = await api.get(`${API_BASE}/${id}`);
  return response.form || null;
}

export async function saveJoiningForm(id: string, data: Partial<JoiningForm>): Promise<void> {
  await api.post(`${API_BASE}/${id}`, data);
}

export async function updateEmployeeInfo(id: string, data: Partial<JoiningForm['employee_info']>): Promise<void> {
  await api.put(`${API_BASE}/${id}/employee-info`, data);
}

export async function addFamilyMember(id: string, data: JoiningForm['family_members'][0]): Promise<any> {
  const response = await api.post(`${API_BASE}/${id}/family`, data);
  return response.member;
}

export async function updateFamilyMember(id: string, memberId: string, data: JoiningForm['family_members'][0]): Promise<any> {
  const response = await api.put(`${API_BASE}/${id}/family/${memberId}`, data);
  return response.member;
}

export async function deleteFamilyMember(id: string, memberId: string): Promise<void> {
  await api.delete(`${API_BASE}/${id}/family/${memberId}`);
}

export async function addAcademicInfo(id: string, data: JoiningForm['academic_info'][0]): Promise<any> {
  const response = await api.post(`${API_BASE}/${id}/academic`, data);
  return response.academic;
}

export async function updateAcademicInfo(id: string, academicId: string, data: JoiningForm['academic_info'][0]): Promise<any> {
  const response = await api.put(`${API_BASE}/${id}/academic/${academicId}`, data);
  return response.academic;
}

export async function deleteAcademicInfo(id: string, academicId: string): Promise<void> {
  await api.delete(`${API_BASE}/${id}/academic/${academicId}`);
}

export async function addPreviousEmployment(id: string, data: JoiningForm['previous_employment'][0]): Promise<any> {
  const response = await api.post(`${API_BASE}/${id}/employment`, data);
  return response.employment;
}

export async function updatePreviousEmployment(id: string, employmentId: string, data: JoiningForm['previous_employment'][0]): Promise<any> {
  const response = await api.put(`${API_BASE}/${id}/employment/${employmentId}`, data);
  return response.employment;
}

export async function deletePreviousEmployment(id: string, employmentId: string): Promise<void> {
  await api.delete(`${API_BASE}/${id}/employment/${employmentId}`);
}

export async function completeOnboarding(id: string): Promise<void> {
  await api.post(`${API_BASE}/${id}/complete`);
}

export async function getPendingOnboarding(): Promise<JoiningFormSummary[]> {
  const response = await api.get(`${API_BASE}/pending`);
  return response.employees || [];
}
