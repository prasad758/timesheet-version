/**
 * useProfileMutation Hook
 * React hook for updating profiles
 * Uses React Query mutations
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateProfile } from '../api';
import type { UpdateProfileRequest, UpdateProfileResponse } from '../types';

/**
 * Hook to update an employee profile
 */
export function useProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation<UpdateProfileResponse, Error, { id: string; data: UpdateProfileRequest }>({
    mutationFn: async ({ id, data }) => {
      return updateProfile(id, data);
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch profiles
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
  });
}

