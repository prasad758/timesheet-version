// Service for joining form onboarding API
import { apiRequest } from "@/lib/api";

export async function createJoiningProfile(email: string) {
  if (!email) throw new Error("Email is required");
  return apiRequest("/joining-form/create", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}
