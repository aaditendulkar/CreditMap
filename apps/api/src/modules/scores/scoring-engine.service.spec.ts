import { ScoringEngineService } from './scoring-engine.service';
import { IncomeSource } from '../income/entities/income-record.entity';
import type { IncomeRecord } from '../income/entities/income-record.entity';
import { BillType } from '../bills/entities/bill-payment.entity';
import type { BillPayment } from '../bills/entities/bill-payment.entity';
import { TransactionType, TransactionChannel } from '../transactions/entities/transaction.entity';
import type { Transaction } from '../transactions/entities/transaction.entity';
import { Occupation, Gender, Category } from '../profile/entities/user-profile.entity';
import type { UserProfile } from '../profile/entities/user-profile.entity';

// ── Factories (minimal objects — compute() only reads the fields it uses) ──────

function inc(month: string, amount: number, isRegular = true): IncomeRecord {
  return {
    recordMonth: month,
    amount: String(amount),
    isRegular,
    source: IncomeSource.SALARY,
  } as unknown as IncomeRecord;
}

function bill(
  isPaid: boolean,
  paidDate: string | null,
  dueDate = '2025-01-15',
  billType: BillType = BillType.ELECTRICITY,
): BillPayment {
  return { isPaid, paidDate, dueDate, billType } as unknown as BillPayment;
}

function txn(
  type: TransactionType,
  amount: number,
  channel: TransactionChannel | null = TransactionChannel.UPI,
): Transaction {
  return { type, amount: String(amount), channel } as unknown as Transaction;
}

function profile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    hasBankAccount: false,
    hasUpi:         false,
    hasJanDhan:     false,
    occupation:     null,
    state:          null,
    district:       null,
    dateOfBirth:    null,
    gender:         null,
    category:       null,
    ...overrides,
  } as unknown as UserProfile;
}

// ── Test suite ─────────────────────────────────────────────────────────────────

describe('ScoringEngineService.compute()', () => {
  // compute() is a pure function — repos are never called, so pass null for all
  let engine: ScoringEngineService;

  beforeEach(() => {
    engine = new ScoringEngineService(
      null as any, null as any, null as any, null as any, null as any,
    );
  });

  // ── Test 1 ──────────────────────────────────────────────────────────────────

  it('empty user gets minimum score of 300', () => {
    const result = engine.compute([], [], [], null);
    expect(result.totalScore).toBe(300);
  });

  // ── Test 2 ──────────────────────────────────────────────────────────────────

  it('6 consistent salary months gives incomeScore >= 70', () => {
    const income: IncomeRecord[] = [
      inc('2025-01', 22_000),
      inc('2025-02', 22_000),
      inc('2025-03', 22_000),
      inc('2025-04', 22_000),
      inc('2025-05', 22_000),
      inc('2025-06', 22_000),
    ];
    const { incomeScore } = engine.compute(income, [], [], null);
    // consistencyPts=(6/12)*40=20, regularityPts=35, levelPts=15 → 70
    expect(incomeScore).toBeGreaterThanOrEqual(70);
  });

  // ── Test 3 ──────────────────────────────────────────────────────────────────

  it('irregular income scores lower than consistent income with same average', () => {
    const consistent: IncomeRecord[] = [
      inc('2025-01', 22_000, true),
      inc('2025-02', 22_000, true),
      inc('2025-03', 22_000, true),
      inc('2025-04', 22_000, true),
      inc('2025-05', 22_000, true),
      inc('2025-06', 22_000, true),
    ];
    // Same 6-month average (₹22,000) but volatile amounts and not regular
    const volatile: IncomeRecord[] = [
      inc('2025-01', 10_000, false),
      inc('2025-02', 34_000, false),
      inc('2025-03', 10_000, false),
      inc('2025-04', 34_000, false),
      inc('2025-05', 10_000, false),
      inc('2025-06', 34_000, false),
    ];
    const a = engine.compute(consistent, [], [], null);
    const b = engine.compute(volatile,   [], [], null);
    expect(a.incomeScore).toBeGreaterThan(b.incomeScore);
  });

  // ── Test 4 ──────────────────────────────────────────────────────────────────

  it('100% on-time bills with 5 types gives billScore >= 80', () => {
    const bills: BillPayment[] = [
      bill(true, '2025-01-10', '2025-01-15', BillType.ELECTRICITY),
      bill(true, '2025-02-10', '2025-02-15', BillType.WATER),
      bill(true, '2025-03-10', '2025-03-15', BillType.MOBILE),
      bill(true, '2025-04-10', '2025-04-15', BillType.RENT),
      bill(true, '2025-05-10', '2025-05-15', BillType.BROADBAND),
      bill(true, '2025-06-10', '2025-06-15', BillType.GAS),
    ];
    const { billScore } = engine.compute([], bills, [], null);
    // onTimePts=50, paymentPts=30, varietyPts=20 (5+ types) → 100
    expect(billScore).toBeGreaterThanOrEqual(80);
  });

  // ── Test 5 ──────────────────────────────────────────────────────────────────

  it('late bills reduce bill score compared to perfect payment history', () => {
    const perfect: BillPayment[] = [
      bill(true, '2025-01-10', '2025-01-15', BillType.ELECTRICITY),
      bill(true, '2025-02-10', '2025-02-15', BillType.WATER),
      bill(true, '2025-03-10', '2025-03-15', BillType.MOBILE),
      bill(true, '2025-04-10', '2025-04-15', BillType.RENT),
      bill(true, '2025-05-10', '2025-05-15', BillType.BROADBAND),
      bill(true, '2025-06-10', '2025-06-15', BillType.GAS),
    ];
    const withLate: BillPayment[] = [
      bill(true, '2025-01-10', '2025-01-15', BillType.ELECTRICITY),
      bill(true, '2025-02-10', '2025-02-15', BillType.WATER),
      bill(true, '2025-03-10', '2025-03-15', BillType.MOBILE),
      bill(true, '2025-04-10', '2025-04-15', BillType.RENT),
      // Paid 10 days after due date — NOT on time
      bill(true, '2025-05-25', '2025-05-15', BillType.BROADBAND),
      bill(true, '2025-06-25', '2025-06-15', BillType.GAS),
    ];
    const perfectScore = engine.compute([], perfect,   [], null).billScore;
    const lateScore    = engine.compute([], withLate,  [], null).billScore;
    expect(lateScore).toBeLessThan(perfectScore);
  });

  // ── Test 6 ──────────────────────────────────────────────────────────────────

  it('no bills gives billScore of 0', () => {
    const income = [inc('2025-01', 22_000)];
    const { billScore } = engine.compute(income, [], [], null);
    expect(billScore).toBe(0);
  });

  // ── Test 7 ──────────────────────────────────────────────────────────────────

  it('positive cash flow scores higher than negative cash flow', () => {
    // A: credits=₹50k, debits=₹30k → net positive
    const positiveFlow: Transaction[] = [
      ...Array.from({ length: 5 }, () => txn(TransactionType.CREDIT, 10_000)),
      ...Array.from({ length: 5 }, () => txn(TransactionType.DEBIT,   6_000)),
    ];
    // B: credits=₹50k, debits=₹55k → spending more than earning
    const negativeFlow: Transaction[] = [
      ...Array.from({ length: 5 }, () => txn(TransactionType.CREDIT, 10_000)),
      ...Array.from({ length: 5 }, () => txn(TransactionType.DEBIT,  11_000)),
    ];
    const a = engine.compute([], [], positiveFlow, null);
    const b = engine.compute([], [], negativeFlow, null);
    expect(a.cashFlowScore).toBeGreaterThan(b.cashFlowScore);
  });

  // ── Test 8 ──────────────────────────────────────────────────────────────────

  it('UPI transactions score higher than cash transactions (same amounts)', () => {
    const upiTxns: Transaction[] = [
      ...Array.from({ length: 5 }, () => txn(TransactionType.CREDIT, 10_000, TransactionChannel.UPI)),
      ...Array.from({ length: 5 }, () => txn(TransactionType.DEBIT,   8_000, TransactionChannel.UPI)),
    ];
    const cashTxns: Transaction[] = [
      ...Array.from({ length: 5 }, () => txn(TransactionType.CREDIT, 10_000, TransactionChannel.CASH)),
      ...Array.from({ length: 5 }, () => txn(TransactionType.DEBIT,   8_000, TransactionChannel.CASH)),
    ];
    const a = engine.compute([], [], upiTxns,  null);
    const b = engine.compute([], [], cashTxns, null);
    expect(a.cashFlowScore).toBeGreaterThan(b.cashFlowScore);
  });

  // ── Test 9 ──────────────────────────────────────────────────────────────────

  it('complete profile boosts profileScore >= 70', () => {
    const fullProfile = profile({
      hasBankAccount: true,
      hasUpi:         true,
      hasJanDhan:     true,
      occupation:     Occupation.SALARIED,
      state:          'Karnataka',
      district:       'Bengaluru',
      dateOfBirth:    '1990-03-22',
      gender:         Gender.F,
      category:       Category.OBC,
    });
    // hasBankAccount=25, hasUpi=20, hasJanDhan=15, salaried=25, 5/5 fields=15 → 100
    const { profileScore } = engine.compute([], [], [], fullProfile);
    expect(profileScore).toBeGreaterThanOrEqual(70);
  });

  // ── Test 10 ─────────────────────────────────────────────────────────────────

  it('null profile gives profileScore of 0', () => {
    const income = [inc('2025-01', 22_000)];
    const { profileScore } = engine.compute(income, [], [], null);
    expect(profileScore).toBe(0);
  });

  // ── Test 11 ─────────────────────────────────────────────────────────────────

  it('richer data history gives higher dataScore', () => {
    const richIncome: IncomeRecord[] = Array.from({ length: 6 }, (_, i) =>
      inc(`2025-0${i + 1}`, 20_000),
    );
    const richBills: BillPayment[] = Array.from({ length: 6 }, () =>
      bill(true, '2025-01-10', '2025-01-15'),
    );
    const richTxns: Transaction[] = Array.from({ length: 12 }, () =>
      txn(TransactionType.CREDIT, 5_000),
    );

    const sparseIncome: IncomeRecord[] = [inc('2025-01', 20_000), inc('2025-02', 20_000)];
    const sparseBills: BillPayment[]   = [bill(true, '2025-01-10'), bill(true, '2025-02-10')];
    const sparseTxns: Transaction[]    = Array.from({ length: 3 }, () =>
      txn(TransactionType.CREDIT, 5_000),
    );

    const rich   = engine.compute(richIncome,   richBills,   richTxns,   null);
    const sparse = engine.compute(sparseIncome, sparseBills, sparseTxns, null);

    // rich: incomePts=35, billPts=35, txnPts=30 → 100
    // sparse: incomePts≈11, billPts≈11, txnPts=7 → ~31
    expect(rich.dataScore).toBeGreaterThan(sparse.dataScore);
  });

  // ── Test 12 ─────────────────────────────────────────────────────────────────

  it('totalScore always stays within 300–850 regardless of input', () => {
    // Case A: absolute zero input
    const min = engine.compute([], [], [], null);
    expect(min.totalScore).toBeGreaterThanOrEqual(300);
    expect(min.totalScore).toBeLessThanOrEqual(850);

    // Case B: near-perfect input
    const income: IncomeRecord[] = Array.from({ length: 12 }, (_, i) =>
      inc(`2024-${String(i + 1).padStart(2, '0')}`, 60_000),
    );
    const bills: BillPayment[] = Array.from({ length: 12 }, (_, i) =>
      bill(true, `2025-${String(i % 12 + 1).padStart(2, '0')}-05`, `2025-${String(i % 12 + 1).padStart(2, '0')}-15`, BillType.ELECTRICITY),
    );
    const txns: Transaction[] = [
      ...Array.from({ length: 6 }, () => txn(TransactionType.CREDIT, 20_000, TransactionChannel.UPI)),
      ...Array.from({ length: 6 }, () => txn(TransactionType.DEBIT,   5_000, TransactionChannel.UPI)),
    ];
    const fullProfile = profile({
      hasBankAccount: true,
      hasUpi:         true,
      hasJanDhan:     true,
      occupation:     Occupation.SALARIED,
      state:          'Karnataka',
      district:       'Bengaluru',
      dateOfBirth:    '1990-01-01',
      gender:         Gender.M,
      category:       Category.GENERAL,
    });
    const max = engine.compute(income, bills, txns, fullProfile);
    expect(max.totalScore).toBeGreaterThanOrEqual(300);
    expect(max.totalScore).toBeLessThanOrEqual(850);
  });
});
