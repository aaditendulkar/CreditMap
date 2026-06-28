export type ScoreTier = 'Poor' | 'Fair' | 'Good' | 'Very Good' | 'Excellent';

export interface ScoreBreakdown {
  id: string;
  totalScore: number;
  tier: ScoreTier;
  incomeScore: number;
  billScore: number;
  cashFlowScore: number;
  profileScore: number;
  dataScore: number;
  scoreVersion: string;
  computedAt: string;
}

export interface ScoreResponse {
  score: ScoreBreakdown | null;
}

export interface ScoreHistoryItem {
  id: string;
  totalScore: number;
  tier: ScoreTier;
  computedAt: string;
}

export interface ScoreHistoryResponse {
  history: ScoreHistoryItem[];
}
