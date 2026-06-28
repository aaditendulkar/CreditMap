import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { CreditScore } from './entities/credit-score.entity';
import { IncomeRecord } from '../income/entities/income-record.entity';
import { BillPayment } from '../bills/entities/bill-payment.entity';
import { Transaction, TransactionType, TransactionChannel } from '../transactions/entities/transaction.entity';
import { UserProfile, Occupation } from '../profile/entities/user-profile.entity';

export interface ScoreResult {
  totalScore: number;     // 300–850
  incomeScore: number;    // 0–100
  billScore: number;      // 0–100
  cashFlowScore: number;  // 0–100
  profileScore: number;   // 0–100
  dataScore: number;      // 0–100
  scoreVersion: string;
}

// Bump this when the algorithm changes — lets users see which version scored them
const SCORE_VERSION = '1.0.0';

// Weights must sum to 1.0
const WEIGHTS = {
  income:   0.25,
  bill:     0.30,
  cashFlow: 0.20,
  profile:  0.15,
  data:     0.10,
} as const;

@Injectable()
export class ScoringEngineService {
  constructor(
    @InjectRepository(CreditScore)
    private readonly scoreRepo: Repository<CreditScore>,
    @InjectRepository(IncomeRecord)
    private readonly incomeRepo: Repository<IncomeRecord>,
    @InjectRepository(BillPayment)
    private readonly billRepo: Repository<BillPayment>,
    @InjectRepository(Transaction)
    private readonly txnRepo: Repository<Transaction>,
    @InjectRepository(UserProfile)
    private readonly profileRepo: Repository<UserProfile>,
  ) {}

  // Called by the job processor — fetches data, computes, persists
  async computeAndSave(userId: string): Promise<CreditScore> {
    const [incomeRecords, billPayments, transactions, profile] = await Promise.all([
      this.incomeRepo.find({ where: { userId } }),
      this.billRepo.find({ where: { userId } }),
      this.txnRepo.find({ where: { userId } }),
      this.profileRepo.findOne({ where: { userId } }),
    ]);

    const result = this.compute(incomeRecords, billPayments, transactions, profile);
    const score = this.scoreRepo.create({ userId, ...result });
    return this.scoreRepo.save(score);
  }

  // Pure function — exposed for testing and future use
  compute(
    incomeRecords: IncomeRecord[],
    billPayments: BillPayment[],
    transactions: Transaction[],
    profile: UserProfile | null,
  ): ScoreResult {
    const incomeScore   = this.incomeScore(incomeRecords);
    const billScore     = this.billScore(billPayments);
    const cashFlowScore = this.cashFlowScore(transactions);
    const profileScore  = this.profileScore(profile);
    const dataScore     = this.dataScore(incomeRecords, billPayments, transactions);

    const weighted =
      incomeScore   * WEIGHTS.income   +
      billScore     * WEIGHTS.bill     +
      cashFlowScore * WEIGHTS.cashFlow +
      profileScore  * WEIGHTS.profile  +
      dataScore     * WEIGHTS.data;

    // Map 0–100 weighted average to 300–850 (550-point range)
    const totalScore = Math.round(300 + (weighted / 100) * 550);

    return { totalScore, incomeScore, billScore, cashFlowScore, profileScore, dataScore, scoreVersion: SCORE_VERSION };
  }

  // ── Sub-score functions ───────────────────────────────────────────────────

  private incomeScore(records: IncomeRecord[]): number {
    if (records.length === 0) return 0;

    // Consistency: unique months with any income recorded, capped at 12 (0–40 pts)
    const months = new Set(records.map(r => r.recordMonth.substring(0, 7)));
    const consistencyPts = Math.min(months.size / 12, 1) * 40;

    // Regularity: fraction of entries marked as regular income (0–35 pts)
    const regularPct = records.filter(r => r.isRegular).length / records.length;
    const regularityPts = regularPct * 35;

    // Income level: average monthly in INR, banded for informal economy (0–25 pts)
    const total = records.reduce((s, r) => s + parseFloat(r.amount), 0);
    const avgMonthly = total / months.size;
    const levelPts =
      avgMonthly >= 50_000 ? 25 :
      avgMonthly >= 30_000 ? 20 :
      avgMonthly >= 15_000 ? 15 :
      avgMonthly >=  5_000 ? 10 : 5;

    return Math.round(consistencyPts + regularityPts + levelPts);
  }

  private billScore(bills: BillPayment[]): number {
    if (bills.length === 0) return 0;

    const paid   = bills.filter(b => b.isPaid);
    const onTime = paid.filter(b => b.paidDate !== null && b.paidDate <= b.dueDate);

    // On-time rate among paid bills — most important signal (0–50 pts)
    const onTimePts = paid.length > 0 ? (onTime.length / paid.length) * 50 : 0;

    // Payment rate: how many bills were paid at all (0–30 pts)
    const paymentPts = (paid.length / bills.length) * 30;

    // Bill type variety: more types = more diverse payment history (0–20 pts, max 5 types)
    const types = new Set(bills.map(b => b.billType));
    const varietyPts = Math.min(types.size / 5, 1) * 20;

    return Math.round(onTimePts + paymentPts + varietyPts);
  }

  private cashFlowScore(transactions: Transaction[]): number {
    if (transactions.length === 0) return 0;

    const credits = transactions.filter(t => t.type === TransactionType.CREDIT);
    const debits  = transactions.filter(t => t.type === TransactionType.DEBIT);

    const totalCredits = credits.reduce((s, t) => s + parseFloat(t.amount), 0);
    const totalDebits  = debits.reduce((s, t)  => s + parseFloat(t.amount), 0);

    // Net flow positivity: ratio of (credits - debits) / credits (0–40 pts)
    const netFlowPts = totalCredits > 0
      ? Math.max(0, Math.min((totalCredits - totalDebits) / totalCredits, 1)) * 40
      : 0;

    // Digital payment preference: UPI/bank transfer/NEFT/IMPS > cash (0–40 pts)
    const DIGITAL = new Set<string>(['upi', 'bank_transfer', 'neft', 'imps']);
    const withChannel = transactions.filter(t => t.channel !== null);
    const digitalPts = withChannel.length > 0
      ? (withChannel.filter(t => DIGITAL.has(t.channel as string)).length / withChannel.length) * 40
      : 0;

    // Channel variety: distinct digital channels used (0–20 pts)
    const usedDigital = new Set(
      transactions
        .map(t => t.channel)
        .filter((c): c is TransactionChannel => c !== null && DIGITAL.has(c as string)),
    );
    const varietyPts = Math.min(usedDigital.size / 4, 1) * 20;

    return Math.round(netFlowPts + digitalPts + varietyPts);
  }

  private profileScore(profile: UserProfile | null): number {
    if (!profile) return 0;

    let score = 0;

    // Banking access signals — key for India's informal economy (0–60 pts)
    if (profile.hasBankAccount) score += 25;
    if (profile.hasUpi)         score += 20;
    if (profile.hasJanDhan)     score += 15;

    // Occupation stability (0–25 pts)
    const occupationPts: Record<Occupation, number> = {
      [Occupation.SALARIED]:      25,
      [Occupation.SELF_EMPLOYED]: 20,
      [Occupation.GIG]:           15,
      [Occupation.FARM]:          12,
      [Occupation.DAILY_WAGE]:    10,
      [Occupation.STUDENT]:        5,
      [Occupation.OTHER]:          5,
    };
    score += profile.occupation ? (occupationPts[profile.occupation] ?? 5) : 0;

    // Profile completeness: state, district, dob, gender, category (0–15 pts)
    const fields = [profile.state, profile.district, profile.dateOfBirth, profile.gender, profile.category];
    score += Math.round((fields.filter(f => f !== null).length / fields.length) * 15);

    return Math.min(score, 100);
  }

  private dataScore(
    incomeRecords: IncomeRecord[],
    bills: BillPayment[],
    transactions: Transaction[],
  ): number {
    const incomeMonths = new Set(incomeRecords.map(r => r.recordMonth.substring(0, 7))).size;

    // 6+ months of income = full 35 pts
    const incomePts = Math.min(incomeMonths / 6, 1) * 35;
    // 6+ bill records = full 35 pts
    const billPts   = Math.min(bills.length / 6, 1) * 35;
    // 12+ transactions = full 30 pts
    const txnPts    = Math.min(transactions.length / 12, 1) * 30;

    return Math.round(incomePts + billPts + txnPts);
  }
}
