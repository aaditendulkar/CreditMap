import { apiClient } from './api-client';
import type {
  BillPayment,
  PaginatedBills,
  BillSummary,
  CreateBillRequest,
  UpdateBillRequest,
} from '@/types/bill';

export const billApi = {
  create: async (data: CreateBillRequest): Promise<BillPayment> => {
    const res = await apiClient.post<BillPayment>('/bills', data);
    return res.data;
  },

  getAll: async (page = 1, limit = 50): Promise<PaginatedBills> => {
    const res = await apiClient.get<PaginatedBills>('/bills', {
      params: { page, limit },
    });
    return res.data;
  },

  getSummary: async (): Promise<BillSummary> => {
    const res = await apiClient.get<BillSummary>('/bills/summary');
    return res.data;
  },

  getById: async (id: string): Promise<BillPayment> => {
    const res = await apiClient.get<BillPayment>(`/bills/${id}`);
    return res.data;
  },

  update: async (id: string, data: UpdateBillRequest): Promise<BillPayment> => {
    const res = await apiClient.patch<BillPayment>(`/bills/${id}`, data);
    return res.data;
  },

  markPaid: async (id: string): Promise<BillPayment> => {
    const res = await apiClient.patch<BillPayment>(`/bills/${id}/mark-paid`);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/bills/${id}`);
  },
};
