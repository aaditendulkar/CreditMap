export type TransactionType = 'credit' | 'debit';

export type TransactionCategory =
  | 'rent'
  | 'food'
  | 'utilities'
  | 'emi'
  | 'salary'
  | 'freelance'
  | 'business'
  | 'transfer'
  | 'medical'
  | 'other';

export type TransactionChannel = 'upi' | 'cash' | 'bank_transfer' | 'neft' | 'imps' | 'other';

export const TXN_TYPE_LABELS: Record<TransactionType, string> = {
  credit: 'Credit',
  debit:  'Debit',
};

export const TXN_CATEGORY_LABELS: Record<TransactionCategory, string> = {
  rent:      'Rent',
  food:      'Food',
  utilities: 'Utilities',
  emi:       'EMI',
  salary:    'Salary',
  freelance: 'Freelance',
  business:  'Business',
  transfer:  'Transfer',
  medical:   'Medical',
  other:     'Other',
};

export const TXN_CHANNEL_LABELS: Record<TransactionChannel, string> = {
  upi:          'UPI',
  cash:         'Cash',
  bank_transfer: 'Bank Transfer',
  neft:         'NEFT',
  imps:         'IMPS',
  other:        'Other',
};

export interface Transaction {
  id: string;
  userId: string;
  txnDate: string;               // "YYYY-MM-DD"
  type: TransactionType;
  amount: string;                // decimal returned as string
  category: TransactionCategory;
  description: string | null;
  channel: TransactionChannel | null;
  createdAt: string;
}

export interface PaginatedTransactions {
  data: Transaction[];
  total: number;
  page: number;
  limit: number;
}

export interface MonthlyCreditDebit {
  month: string;   // "YYYY-MM"
  credits: number;
  debits: number;
}

export interface ByCategoryEntry {
  category: TransactionCategory;
  total: number;
  count: number;
}

export interface TransactionSummary {
  totalCredits: number;
  totalDebits: number;
  netFlow: number;
  byCategory: ByCategoryEntry[];
  monthlyTrend: MonthlyCreditDebit[];
}

export interface CreateTransactionRequest {
  txnDate: string;
  type: TransactionType;
  amount: number;
  category: TransactionCategory;
  description?: string;
  channel?: TransactionChannel;
}
