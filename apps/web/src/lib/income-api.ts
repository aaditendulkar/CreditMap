import { apiClient } from './api-client';
import type {
  IncomeRecord,
  PaginatedIncomeRecords,
  IncomeSummary,
  CreateIncomeRequest,
  UpdateIncomeRequest,
} from '@/types/income';

export const incomeApi = {
  create: async (data: CreateIncomeRequest): Promise<IncomeRecord> => {
    const res = await apiClient.post<IncomeRecord>('/income', data);
    return res.data;
  },

  getAll: async (page = 1, limit = 12): Promise<PaginatedIncomeRecords> => {
    const res = await apiClient.get<PaginatedIncomeRecords>('/income', {
      params: { page, limit },
    });
    return res.data;
  },

  getSummary: async (): Promise<IncomeSummary> => {
    const res = await apiClient.get<IncomeSummary>('/income/summary');
    return res.data;
  },

  getById: async (id: string): Promise<IncomeRecord> => {
    const res = await apiClient.get<IncomeRecord>(`/income/${id}`);
    return res.data;
  },

  update: async (id: string, data: UpdateIncomeRequest): Promise<IncomeRecord> => {
    const res = await apiClient.patch<IncomeRecord>(`/income/${id}`, data);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/income/${id}`);
  },
};
