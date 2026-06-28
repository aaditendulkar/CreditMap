import { apiClient } from './api-client';
import type { LoanOffersResponse, LoanProduct } from '@/types/loans';

export const loansApi = {
  getMyOffers: async (): Promise<LoanOffersResponse> => {
    const res = await apiClient.get<LoanOffersResponse>('/loans/offers');
    return res.data;
  },

  getAllProducts: async (): Promise<LoanProduct[]> => {
    const res = await apiClient.get<LoanProduct[]>('/loans/products');
    return res.data;
  },
};
