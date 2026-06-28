import { apiClient } from './api-client';
import type { AdminStats, AdminUsersResponse, AdminUserDetail } from '@/types/admin';

export const adminApi = {
  getStats: async (): Promise<AdminStats> => {
    const res = await apiClient.get<AdminStats>('/admin/stats');
    return res.data;
  },

  getUsers: async (params: {
    search?: string;
    state?: string;
    scoreBand?: string;
    page?: number;
    limit?: number;
  }): Promise<AdminUsersResponse> => {
    const res = await apiClient.get<AdminUsersResponse>('/admin/users', { params });
    return res.data;
  },

  getUserDetail: async (id: string): Promise<AdminUserDetail> => {
    const res = await apiClient.get<AdminUserDetail>(`/admin/users/${id}`);
    return res.data;
  },

  verifyDocument: async (userId: string, documentId: string): Promise<void> => {
    await apiClient.patch(`/admin/users/${userId}/verify-document`, { documentId });
  },
};
