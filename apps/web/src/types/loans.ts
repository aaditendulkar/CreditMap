export type LoanProductType = 'personal' | 'microfinance' | 'business' | 'secured';

export interface LoanProduct {
  id: string;
  lenderName: string;
  productName: string;
  productType: LoanProductType;
  minScore: number;
  maxScore: number;
  minMonthlyIncome: number | null;
  loanAmountMin: number;
  loanAmountMax: number;
  interestRatePA: string;       // decimal returned as string from TypeORM
  tenureMonthsMin: number;
  tenureMonthsMax: number;
  processingFeePercent: string | null;
  targetSegments: string[] | null;
  applyUrl: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface LoanOffersResponse {
  hasScore: boolean;
  score?: number;
  tier?: string;
  offers: LoanProduct[];
}
