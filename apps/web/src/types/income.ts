export type IncomeSource =
  | 'salary'
  | 'daily_wage'
  | 'business'
  | 'freelance'
  | 'farm'
  | 'rent'
  | 'other';

export const INCOME_SOURCE_LABELS: Record<IncomeSource, string> = {
  salary: 'Salary',
  daily_wage: 'Daily wage',
  business: 'Business',
  freelance: 'Freelance',
  farm: 'Farming',
  rent: 'Rent income',
  other: 'Other',
};

export interface IncomeRecord {
  id: string;
  userId: string;
  recordMonth: string; // "YYYY-MM-DD" (always 01)
  source: IncomeSource;
  amount: string; // TypeORM returns decimal as string
  isRegular: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedIncomeRecords {
  data: IncomeRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface MonthlyTrendEntry {
  month: string; // "YYYY-MM"
  amount: number;
}

export interface SourceBreakdownEntry {
  source: IncomeSource;
  total: number;
  count: number;
}

export interface IncomeSummary {
  avgMonthly: number;
  totalIncome: number;
  recordCount: number;
  monthsOfData: number;
  monthlyTrend: MonthlyTrendEntry[];
  sourceBreakdown: SourceBreakdownEntry[];
}

export interface CreateIncomeRequest {
  recordMonth: string; // "YYYY-MM-01"
  source: IncomeSource;
  amount: number;
  isRegular?: boolean;
  notes?: string;
}

export type UpdateIncomeRequest = Partial<CreateIncomeRequest>;
