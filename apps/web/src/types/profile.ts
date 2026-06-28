export type Gender = 'M' | 'F' | 'O';
export type Category = 'SC' | 'ST' | 'OBC' | 'General';
export type Occupation =
  | 'salaried'
  | 'self_employed'
  | 'daily_wage'
  | 'gig'
  | 'student'
  | 'farm'
  | 'other';

export interface UserProfile {
  id: string;
  userId: string;
  state: string | null;
  district: string | null;
  pinCode: string | null;
  dateOfBirth: string | null;
  gender: Gender | null;
  category: Category | null;
  occupation: Occupation | null;
  monthlyIncomeStated: number | null;
  hasBankAccount: boolean;
  hasJanDhan: boolean;
  hasUpi: boolean;
  onboardingComplete: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertProfileRequest {
  state?: string;
  district?: string;
  pinCode?: string;
  dateOfBirth?: string;
  gender?: Gender;
  category?: Category;
  occupation?: Occupation;
  monthlyIncomeStated?: number;
  hasBankAccount?: boolean;
  hasJanDhan?: boolean;
  hasUpi?: boolean;
}
