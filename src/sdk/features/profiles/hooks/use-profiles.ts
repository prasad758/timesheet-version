/**
 * useProfiles Hook
 * React hook for fetching all profiles
 * Uses React Query
 */

import { useQuery } from '@tanstack/react-query';
import { getAllProfiles } from '../api';
import type { EmployeeProfile } from '../types';

/**
 * Hook to fetch all employee profiles
 */
export function useProfiles() {
  return useQuery<EmployeeProfile[]>({
    queryKey: ['profiles', 'all'],
    queryFn: async () => {
      const response = await getAllProfiles();
      return response.profiles;
    },
    staleTime: 30000, // 30 seconds
  });
}

