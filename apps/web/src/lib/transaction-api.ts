import { apiClient } from './api-client';
import type {
  Transaction,
  PaginatedTransactions,
  TransactionSummary,
  CreateTransactionRequest,
} from '@/types/transaction';

export const transactionApi = {
  create: async (data: CreateTransactionRequest): Promise<Transaction> => {
    const res = await apiClient.post<Transaction>('/transactions', data);
    return res.data;
  },

  getAll: async (page = 1, limit = 20): Promise<PaginatedTransactions> => {
    const res = await apiClient.get<PaginatedTransactions>('/transactions', {
      params: { page, limit },
    });
    return res.data;
  },

  getSummary: async (): Promise<TransactionSummary> => {
    const res = await apiClient.get<TransactionSummary>('/transactions/summary');
    return res.data;
  },

  getById: async (id: string): Promise<Transaction> => {
    const res = await apiClient.get<Transaction>(`/transactions/${id}`);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/transactions/${id}`);
  },
};
