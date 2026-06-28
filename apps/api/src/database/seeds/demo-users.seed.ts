import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { User, UserRole } from '../../modules/users/entities/user.entity';
import { UserProfile, Occupation, Gender, Category } from '../../modules/profile/entities/user-profile.entity';
import { IncomeRecord, IncomeSource } from '../../modules/income/entities/income-record.entity';
import { BillPayment, BillType } from '../../modules/bills/entities/bill-payment.entity';
import { Transaction, TransactionType, TransactionChannel, TransactionCategory } from '../../modules/transactions/entities/transaction.entity';
import { CreditScore } from '../../modules/scores/entities/credit-score.entity';
import { ScoringEngineService } from '../../modules/scores/scoring-engine.service';

const dataSource = new DataSource({
  type:        'postgres',
  host:        process.env['POSTGRES_HOST']     ?? 'localhost',
  port:        parseInt(process.env['POSTGRES_PORT'] ?? '5432'),
  username:    process.env['POSTGRES_USER']     ?? 'creditmap',
  password:    process.env['POSTGRES_PASSWORD'] ?? 'creditmap_secret',
  database:    process.env['POSTGRES_DB']       ?? 'creditmap_dev',
  entities:    [User, UserProfile, IncomeRecord, BillPayment, Transaction, CreditScore],
  synchronize: false,
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function findOrSkip(email: string): Promise<string | null> {
  const existing = await dataSource.getRepository(User).findOne({ where: { email } });
  if (existing) {
    console.log(`  → skipping ${email} (already exists, id=${existing.id})`);
    return existing.id;
  }
  return null;
}

async function createUser(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
}): Promise<string> {
  const hashed = await bcrypt.hash(data.password, 10);
  const user = dataSource.getRepository(User).create({
    email:     data.email,
    password:  hashed,
    firstName: data.firstName,
    lastName:  data.lastName,
    role:      data.role ?? UserRole.USER,
  });
  const saved = await dataSource.getRepository(User).save(user);
  return saved.id;
}

// ── Seed ──────────────────────────────────────────────────────────────────────

async function seed() {
  await dataSource.initialize();
  console.log('Connected to database\n');

  const userRepo    = dataSource.getRepository(User);
  const profileRepo = dataSource.getRepository(UserProfile);
  const incomeRepo  = dataSource.getRepository(IncomeRecord);
  const billRepo    = dataSource.getRepository(BillPayment);
  const txnRepo     = dataSource.getRepository(Transaction);
  const scoreRepo   = dataSource.getRepository(CreditScore);

  const scoringEngine = new ScoringEngineService(
    scoreRepo, incomeRepo, billRepo, txnRepo, profileRepo,
  );

  // ── USER 1 — Meera Devi (Poor) ─────────────────────────────────────────────

  console.log('1/5 Meera Devi');
  let meeraId = await findOrSkip('meera@demo.creditmap.in');
  if (!meeraId) {
    meeraId = await createUser({
      email: 'meera@demo.creditmap.in', password: 'Demo@1234',
      firstName: 'Meera', lastName: 'Devi',
    });
    await profileRepo.save(profileRepo.create({
      userId: meeraId,
      state: 'Uttar Pradesh', occupation: Occupation.DAILY_WAGE,
      hasBankAccount: false, hasJanDhan: false, hasUpi: false,
      onboardingComplete: true,
    }));
    await incomeRepo.save([
      incomeRepo.create({ userId: meeraId, recordMonth: '2025-01-01', source: IncomeSource.DAILY_WAGE, amount: '7500',  isRegular: false }),
      incomeRepo.create({ userId: meeraId, recordMonth: '2025-02-01', source: IncomeSource.DAILY_WAGE, amount: '8200',  isRegular: false }),
      incomeRepo.create({ userId: meeraId, recordMonth: '2025-03-01', source: IncomeSource.DAILY_WAGE, amount: '6800',  isRegular: false }),
      incomeRepo.create({ userId: meeraId, recordMonth: '2025-04-01', source: IncomeSource.DAILY_WAGE, amount: '9000',  isRegular: false }),
    ]);
    console.log('  → created');
  }

  // ── USER 2 — Raju Sharma (Good) ────────────────────────────────────────────

  console.log('2/5 Raju Sharma');
  let rajuId = await findOrSkip('raju@demo.creditmap.in');
  if (!rajuId) {
    rajuId = await createUser({
      email: 'raju@demo.creditmap.in', password: 'Demo@1234',
      firstName: 'Raju', lastName: 'Sharma',
    });
    await profileRepo.save(profileRepo.create({
      userId: rajuId,
      state: 'Maharashtra', occupation: Occupation.SELF_EMPLOYED,
      hasBankAccount: true, hasJanDhan: false, hasUpi: true,
      dateOfBirth: '1995-06-15', gender: Gender.M, category: Category.GENERAL,
      onboardingComplete: true,
    }));
    // 8 months income, all ₹22,000, regular
    const rajuIncome = ['2024-09', '2024-10', '2024-11', '2024-12', '2025-01', '2025-02', '2025-03', '2025-04']
      .map(m => incomeRepo.create({ userId: rajuId!, recordMonth: `${m}-01`, source: IncomeSource.SALARY, amount: '22000', isRegular: true }));
    await incomeRepo.save(rajuIncome);
    // 12 bills across 4 types — Jan/Feb/Mar × 4 types = 12
    // Jan: all 4 on time
    // Feb: 2 on time, 2 paid 3 days late
    // Mar: 2 on time, 2 unpaid
    await billRepo.save([
      billRepo.create({ userId: rajuId, billType: BillType.ELECTRICITY, billMonth: '2025-01-01', amount: '800',   dueDate: '2025-01-15', paidDate: '2025-01-10', isPaid: true }),
      billRepo.create({ userId: rajuId, billType: BillType.MOBILE,      billMonth: '2025-01-01', amount: '500',   dueDate: '2025-01-15', paidDate: '2025-01-12', isPaid: true }),
      billRepo.create({ userId: rajuId, billType: BillType.BROADBAND,   billMonth: '2025-01-01', amount: '700',   dueDate: '2025-01-15', paidDate: '2025-01-10', isPaid: true }),
      billRepo.create({ userId: rajuId, billType: BillType.RENT,        billMonth: '2025-01-01', amount: '8000',  dueDate: '2025-01-15', paidDate: '2025-01-05', isPaid: true }),
      billRepo.create({ userId: rajuId, billType: BillType.ELECTRICITY, billMonth: '2025-02-01', amount: '850',   dueDate: '2025-02-15', paidDate: '2025-02-12', isPaid: true }),
      billRepo.create({ userId: rajuId, billType: BillType.MOBILE,      billMonth: '2025-02-01', amount: '500',   dueDate: '2025-02-15', paidDate: '2025-02-10', isPaid: true }),
      billRepo.create({ userId: rajuId, billType: BillType.BROADBAND,   billMonth: '2025-02-01', amount: '700',   dueDate: '2025-02-15', paidDate: '2025-02-18', isPaid: true }), // 3 days late
      billRepo.create({ userId: rajuId, billType: BillType.RENT,        billMonth: '2025-02-01', amount: '8000',  dueDate: '2025-02-15', paidDate: '2025-02-18', isPaid: true }), // 3 days late
      billRepo.create({ userId: rajuId, billType: BillType.ELECTRICITY, billMonth: '2025-03-01', amount: '900',   dueDate: '2025-03-15', paidDate: '2025-03-10', isPaid: true }),
      billRepo.create({ userId: rajuId, billType: BillType.MOBILE,      billMonth: '2025-03-01', amount: '500',   dueDate: '2025-03-15', paidDate: '2025-03-12', isPaid: true }),
      billRepo.create({ userId: rajuId, billType: BillType.BROADBAND,   billMonth: '2025-03-01', amount: '700',   dueDate: '2025-03-15', paidDate: null,         isPaid: false }),
      billRepo.create({ userId: rajuId, billType: BillType.RENT,        billMonth: '2025-03-01', amount: '8000',  dueDate: '2025-03-15', paidDate: null,         isPaid: false }),
    ]);
    // 20 transactions: 8 UPI credits (salary), 8 UPI debits, 4 cash debits
    await txnRepo.save([
      // Salary credits (UPI)
      ...['2024-09-01','2024-10-01','2024-11-01','2024-12-01','2025-01-01','2025-02-01','2025-03-01','2025-04-01'].map(d =>
        txnRepo.create({ userId: rajuId!, txnDate: d, type: TransactionType.CREDIT, amount: '22000', category: TransactionCategory.SALARY,    channel: TransactionChannel.UPI })
      ),
      // Expense debits via UPI
      txnRepo.create({ userId: rajuId, txnDate: '2025-01-05', type: TransactionType.DEBIT, amount: '8000',  category: TransactionCategory.RENT,      channel: TransactionChannel.UPI }),
      txnRepo.create({ userId: rajuId, txnDate: '2025-01-10', type: TransactionType.DEBIT, amount: '2000',  category: TransactionCategory.UTILITIES,  channel: TransactionChannel.UPI }),
      txnRepo.create({ userId: rajuId, txnDate: '2025-02-05', type: TransactionType.DEBIT, amount: '8000',  category: TransactionCategory.RENT,      channel: TransactionChannel.UPI }),
      txnRepo.create({ userId: rajuId, txnDate: '2025-02-12', type: TransactionType.DEBIT, amount: '1800',  category: TransactionCategory.FOOD,      channel: TransactionChannel.UPI }),
      txnRepo.create({ userId: rajuId, txnDate: '2025-03-05', type: TransactionType.DEBIT, amount: '8000',  category: TransactionCategory.RENT,      channel: TransactionChannel.UPI }),
      txnRepo.create({ userId: rajuId, txnDate: '2025-03-15', type: TransactionType.DEBIT, amount: '2200',  category: TransactionCategory.UTILITIES,  channel: TransactionChannel.UPI }),
      txnRepo.create({ userId: rajuId, txnDate: '2025-04-05', type: TransactionType.DEBIT, amount: '8000',  category: TransactionCategory.RENT,      channel: TransactionChannel.UPI }),
      txnRepo.create({ userId: rajuId, txnDate: '2025-04-18', type: TransactionType.DEBIT, amount: '1500',  category: TransactionCategory.FOOD,      channel: TransactionChannel.UPI }),
      // Cash debits (lower digital score)
      txnRepo.create({ userId: rajuId, txnDate: '2025-01-20', type: TransactionType.DEBIT, amount: '3000',  category: TransactionCategory.FOOD,      channel: TransactionChannel.CASH }),
      txnRepo.create({ userId: rajuId, txnDate: '2025-02-20', type: TransactionType.DEBIT, amount: '2500',  category: TransactionCategory.OTHER,     channel: TransactionChannel.CASH }),
      txnRepo.create({ userId: rajuId, txnDate: '2025-03-20', type: TransactionType.DEBIT, amount: '3500',  category: TransactionCategory.FOOD,      channel: TransactionChannel.CASH }),
      txnRepo.create({ userId: rajuId, txnDate: '2025-04-20', type: TransactionType.DEBIT, amount: '2000',  category: TransactionCategory.FOOD,      channel: TransactionChannel.CASH }),
    ]);
    console.log('  → created');
  }

  // ── USER 3 — Sunita Yadav (Excellent) ──────────────────────────────────────

  console.log('3/5 Sunita Yadav');
  let sunitaId = await findOrSkip('sunita@demo.creditmap.in');
  if (!sunitaId) {
    sunitaId = await createUser({
      email: 'sunita@demo.creditmap.in', password: 'Demo@1234',
      firstName: 'Sunita', lastName: 'Yadav',
    });
    await profileRepo.save(profileRepo.create({
      userId: sunitaId,
      state: 'Karnataka', district: 'Bengaluru', occupation: Occupation.SALARIED,
      hasBankAccount: true, hasJanDhan: true, hasUpi: true,
      dateOfBirth: '1990-03-22', gender: Gender.F, category: Category.OBC,
      onboardingComplete: true,
    }));
    // 12 months income Jan–Dec 2024, ₹35,000, regular
    const sunitaIncome = Array.from({ length: 12 }, (_, i) => {
      const m = String(i + 1).padStart(2, '0');
      return incomeRepo.create({ userId: sunitaId!, recordMonth: `2024-${m}-01`, source: IncomeSource.SALARY, amount: '35000', isRegular: true });
    });
    await incomeRepo.save(sunitaIncome);
    // 20 bills — 4 types × 5 months, all paid 3–5 days early
    const BILL_TYPES = [BillType.ELECTRICITY, BillType.WATER, BillType.MOBILE, BillType.RENT, BillType.BROADBAND];
    const sunitaBills: BillPayment[] = [];
    for (let m = 1; m <= 4; m++) {
      const month = String(m).padStart(2, '0');
      const due = `2025-${month}-15`;
      const paid = `2025-${month}-11`; // 4 days early
      for (const t of BILL_TYPES) {
        sunitaBills.push(billRepo.create({ userId: sunitaId!, billType: t, billMonth: `2025-${month}-01`, amount: '1000', dueDate: due, paidDate: paid, isPaid: true }));
      }
    }
    await billRepo.save(sunitaBills);
    // 48 transactions — 4 per month × 12 months (salary credit + 3 debits), all UPI
    const sunitaTxns: Transaction[] = [];
    for (let m = 1; m <= 12; m++) {
      const month = String(m).padStart(2, '0');
      const year = m <= 12 ? '2024' : '2025';
      const d = `${year}-${month}-01`;
      sunitaTxns.push(txnRepo.create({ userId: sunitaId!, txnDate: d, type: TransactionType.CREDIT, amount: '35000', category: TransactionCategory.SALARY,   channel: TransactionChannel.UPI }));
      sunitaTxns.push(txnRepo.create({ userId: sunitaId!, txnDate: `${year}-${month}-05`, type: TransactionType.DEBIT, amount: '8000',  category: TransactionCategory.RENT,    channel: TransactionChannel.UPI }));
      sunitaTxns.push(txnRepo.create({ userId: sunitaId!, txnDate: `${year}-${month}-10`, type: TransactionType.DEBIT, amount: '3000',  category: TransactionCategory.FOOD,    channel: TransactionChannel.UPI }));
      sunitaTxns.push(txnRepo.create({ userId: sunitaId!, txnDate: `${year}-${month}-20`, type: TransactionType.DEBIT, amount: '2000',  category: TransactionCategory.MEDICAL, channel: TransactionChannel.UPI }));
    }
    await txnRepo.save(sunitaTxns);
    console.log('  → created');
  }

  // ── USER 4 — Ahmed Khan (Fair) ──────────────────────────────────────────────

  console.log('4/5 Ahmed Khan');
  let ahmedId = await findOrSkip('ahmed@demo.creditmap.in');
  if (!ahmedId) {
    ahmedId = await createUser({
      email: 'ahmed@demo.creditmap.in', password: 'Demo@1234',
      firstName: 'Ahmed', lastName: 'Khan',
    });
    await profileRepo.save(profileRepo.create({
      userId: ahmedId,
      state: 'Tamil Nadu', occupation: Occupation.GIG,
      hasBankAccount: true, hasJanDhan: false, hasUpi: true,
      onboardingComplete: true,
    }));
    // 6 months volatile income, isRegular=false
    const ahmedAmounts = [5000, 28000, 3000, 32000, 7000, 25000];
    const ahmedIncome = ahmedAmounts.map((amount, i) => {
      const m = String(i + 1).padStart(2, '0');
      return incomeRepo.create({ userId: ahmedId!, recordMonth: `2025-${m}-01`, source: IncomeSource.FREELANCE, amount: String(amount), isRegular: false });
    });
    await incomeRepo.save(ahmedIncome);
    // 6 bills: 4 on time, 2 paid 15+ days late
    await billRepo.save([
      billRepo.create({ userId: ahmedId, billType: BillType.ELECTRICITY, billMonth: '2025-01-01', amount: '600',  dueDate: '2025-01-15', paidDate: '2025-01-10', isPaid: true }),
      billRepo.create({ userId: ahmedId, billType: BillType.MOBILE,      billMonth: '2025-02-01', amount: '400',  dueDate: '2025-02-15', paidDate: '2025-02-12', isPaid: true }),
      billRepo.create({ userId: ahmedId, billType: BillType.ELECTRICITY, billMonth: '2025-03-01', amount: '650',  dueDate: '2025-03-15', paidDate: '2025-03-13', isPaid: true }),
      billRepo.create({ userId: ahmedId, billType: BillType.MOBILE,      billMonth: '2025-04-01', amount: '400',  dueDate: '2025-04-15', paidDate: '2025-04-10', isPaid: true }),
      billRepo.create({ userId: ahmedId, billType: BillType.ELECTRICITY, billMonth: '2025-05-01', amount: '700',  dueDate: '2025-05-15', paidDate: '2025-06-01', isPaid: true }), // 17 days late
      billRepo.create({ userId: ahmedId, billType: BillType.MOBILE,      billMonth: '2025-06-01', amount: '400',  dueDate: '2025-06-15', paidDate: '2025-07-05', isPaid: true }), // 20 days late
    ]);
    // 12 transactions: mix of UPI and cash, some months net negative
    await txnRepo.save([
      txnRepo.create({ userId: ahmedId, txnDate: '2025-01-15', type: TransactionType.CREDIT, amount: '5000',  category: TransactionCategory.FREELANCE, channel: TransactionChannel.UPI }),
      txnRepo.create({ userId: ahmedId, txnDate: '2025-01-25', type: TransactionType.DEBIT,  amount: '8000',  category: TransactionCategory.FOOD,      channel: TransactionChannel.CASH }),  // negative month
      txnRepo.create({ userId: ahmedId, txnDate: '2025-02-15', type: TransactionType.CREDIT, amount: '28000', category: TransactionCategory.FREELANCE, channel: TransactionChannel.UPI }),
      txnRepo.create({ userId: ahmedId, txnDate: '2025-02-25', type: TransactionType.DEBIT,  amount: '15000', category: TransactionCategory.RENT,      channel: TransactionChannel.UPI }),
      txnRepo.create({ userId: ahmedId, txnDate: '2025-03-15', type: TransactionType.CREDIT, amount: '3000',  category: TransactionCategory.FREELANCE, channel: TransactionChannel.UPI }),
      txnRepo.create({ userId: ahmedId, txnDate: '2025-03-25', type: TransactionType.DEBIT,  amount: '5000',  category: TransactionCategory.FOOD,      channel: TransactionChannel.CASH }),  // negative month
      txnRepo.create({ userId: ahmedId, txnDate: '2025-04-15', type: TransactionType.CREDIT, amount: '32000', category: TransactionCategory.FREELANCE, channel: TransactionChannel.UPI }),
      txnRepo.create({ userId: ahmedId, txnDate: '2025-04-25', type: TransactionType.DEBIT,  amount: '25000', category: TransactionCategory.OTHER,     channel: TransactionChannel.UPI }),
      txnRepo.create({ userId: ahmedId, txnDate: '2025-05-15', type: TransactionType.CREDIT, amount: '7000',  category: TransactionCategory.FREELANCE, channel: TransactionChannel.UPI }),
      txnRepo.create({ userId: ahmedId, txnDate: '2025-05-25', type: TransactionType.DEBIT,  amount: '12000', category: TransactionCategory.RENT,      channel: TransactionChannel.CASH }),  // negative month
      txnRepo.create({ userId: ahmedId, txnDate: '2025-06-15', type: TransactionType.CREDIT, amount: '25000', category: TransactionCategory.FREELANCE, channel: TransactionChannel.UPI }),
      txnRepo.create({ userId: ahmedId, txnDate: '2025-06-25', type: TransactionType.DEBIT,  amount: '20000', category: TransactionCategory.RENT,      channel: TransactionChannel.UPI }),
    ]);
    console.log('  → created');
  }

  // ── USER 5 — Admin ──────────────────────────────────────────────────────────

  console.log('5/5 Admin');
  let adminId = await findOrSkip('admin@creditmap.in');
  if (!adminId) {
    adminId = await createUser({
      email: 'admin@creditmap.in', password: 'Admin@1234',
      firstName: 'CreditMap', lastName: 'Admin',
      role: UserRole.ADMIN,
    });
    console.log('  → created');
  }

  // ── Score computation for users 1–4 ──────────────────────────────────────────

  console.log('\nComputing scores for demo users…');

  const scoreUsers = [
    { id: meeraId,  name: 'Meera Devi' },
    { id: rajuId,   name: 'Raju Sharma' },
    { id: sunitaId, name: 'Sunita Yadav' },
    { id: ahmedId,  name: 'Ahmed Khan' },
  ];

  for (const { id, name } of scoreUsers) {
    const score = await scoringEngine.computeAndSave(id);
    console.log(`  ✓ ${name}: ${score.totalScore} (${tierLabel(score.totalScore)})`);
  }

  await dataSource.destroy();
  console.log('\n✓ Demo seed complete');
  process.exit(0);
}

function tierLabel(total: number): string {
  if (total >= 750) return 'Excellent';
  if (total >= 700) return 'Very Good';
  if (total >= 650) return 'Good';
  if (total >= 550) return 'Fair';
  return 'Poor';
}

seed().catch((err: unknown) => {
  console.error('Demo seed failed:', err);
  process.exit(1);
});
