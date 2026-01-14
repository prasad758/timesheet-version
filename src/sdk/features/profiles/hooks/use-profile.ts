/**
 * useProfile Hook
 * React hook for fetching a single profile
 * Uses React Query
 */

import { useQuery } from '@tanstack/react-query';
import { getProfileById } from '../api';
import type { EmployeeProfile } from '../types';

/**
 * Hook to fetch a single employee profile by ID
 */
export function useProfile(profileId: string | undefined) {
  return useQuery<EmployeeProfile>({
    queryKey: ['profiles', profileId],
    queryFn: async () => {
      if (!profileId) throw new Error('Profile ID is required');
      const response = await getProfileById(profileId);
      return response.profile;
    },
    enabled: !!profileId,
    staleTime: 30000, // 30 seconds
  });
}

