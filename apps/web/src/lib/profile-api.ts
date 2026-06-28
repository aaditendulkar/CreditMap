import { apiClient } from './api-client';
import type { UserProfile, UpsertProfileRequest } from '@/types/profile';

export const profileApi = {
  getMyProfile: async (): Promise<UserProfile> => {
    const res = await apiClient.get<UserProfile>('/profile/me');
    return res.data;
  },

  updateMyProfile: async (data: UpsertProfileRequest): Promise<UserProfile> => {
    const res = await apiClient.put<UserProfile>('/profile/me', data);
    return res.data;
  },

  completeOnboarding: async (): Promise<UserProfile> => {
    const res = await apiClient.post<UserProfile>('/profile/me/complete');
    return res.data;
  },
};
