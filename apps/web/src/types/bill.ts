export type BillType =
  | 'electricity'
  | 'water'
  | 'gas'
  | 'mobile'
  | 'broadband'
  | 'rent'
  | 'insurance'
  | 'other';

export const BILL_TYPE_LABELS: Record<BillType, string> = {
  electricity: 'Electricity',
  water: 'Water',
  gas: 'Gas',
  mobile: 'Mobile',
  broadband: 'Broadband',
  rent: 'Rent',
  insurance: 'Insurance',
  other: 'Other',
};

export interface BillPayment {
  id: string;
  userId: string;
  billType: BillType;
  provider: string | null;
  billMonth: string;  // "YYYY-MM-DD" (always 01)
  amount: string;     // decimal returned as string
  dueDate: string;    // "YYYY-MM-DD"
  paidDate: string | null;
  isPaid: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedBills {
  data: BillPayment[];
  total: number;
  page: number;
  limit: number;
}

export interface ByTypeEntry {
  type: BillType;
  count: number;
  onTimePct: number;
}

export interface BillSummary {
  totalBills: number;
  onTimePct: number;    // 0–1
  lateCount: number;
  avgDaysLate: number;
  byType: ByTypeEntry[];
}

export interface CreateBillRequest {
  billType: BillType;
  provider?: string;
  billMonth: string;  // "YYYY-MM-01"
  amount: number;
  dueDate: string;    // "YYYY-MM-DD"
  paidDate?: string;
  isPaid?: boolean;
}

export type UpdateBillRequest = Partial<CreateBillRequest>;
