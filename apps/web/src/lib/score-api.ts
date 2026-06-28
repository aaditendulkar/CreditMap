import { apiClient } from './api-client';
import type { ScoreResponse, ScoreHistoryResponse } from '@/types/score';

export const scoreApi = {
  getMyScore: async (): Promise<ScoreResponse> => {
    const res = await apiClient.get<ScoreResponse>('/scores/me');
    return res.data;
  },

  getMyHistory: async (): Promise<ScoreHistoryResponse> => {
    const res = await apiClient.get<ScoreHistoryResponse>('/scores/me/history');
    return res.data;
  },

  recompute: async (): Promise<{ queued: boolean }> => {
    const res = await apiClient.post<{ queued: boolean }>('/scores/me/recompute');
    return res.data;
  },
};
