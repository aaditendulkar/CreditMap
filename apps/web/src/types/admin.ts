export interface AdminStats {
  totalUsers: number;
  usersWithScore: number;
  avgScore: number;
  scoreDistribution: {
    poor: number;
    fair: number;
    good: number;
    veryGood: number;
    excellent: number;
  };
  newUsersThisWeek: number;
  totalIncomeRecords: number;
  totalBillRecords: number;
  totalTransactions: number;
  totalDocuments: number;
  totalLoansOfferClicks: number;
}

export interface AdminUserRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
  role: string;
  profile: {
    state: string | null;
    occupation: string | null;
    onboardingComplete: boolean;
  } | null;
  latestScore: {
    totalScore: number;
    tier: string;
    computedAt: string;
  } | null;
  counts: {
    income: number;
    bills: number;
    transactions: number;
    documents: number;
  };
}

export interface AdminUsersResponse {
  data: AdminUserRow[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminUserDocument {
  id: string;
  docType: string;
  displayName: string;
  fileSize: number | null;
  mimeType: string | null;
  isVerified: boolean;
  uploadedAt: string;
}

export interface AdminScoreRow {
  totalScore: number;
  tier: string;
  incomeScore: number;
  billScore: number;
  cashFlowScore: number;
  profileScore: number;
  dataScore: number;
  computedAt: string;
}

export interface AdminUserDetail {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isEmailVerified: boolean;
    createdAt: string;
    updatedAt: string;
  };
  profile: Record<string, unknown> | null;
  scores: AdminScoreRow[];
  counts: {
    income: number;
    bills: number;
    transactions: number;
    documents: number;
  };
  documents: AdminUserDocument[];
}
