import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, type Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Document as DocumentEntity } from '../documents/entities/document.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { scoreTier } from '../scores/scores.service';
import type { GetAdminUsersDto, ScoreBand } from './dto/get-admin-users.dto';

// ── Types ──────────────────────────────────────────────────────────────────────

interface ScoreRow {
  users_with_score: string;
  avg_score: string;
  poor: string;
  fair: string;
  good: string;
  very_good: string;
  excellent: string;
}

interface UserRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
  role: string;
  state: string | null;
  occupation: string | null;
  onboarding_complete: boolean | null;
  total_score: string | null;
  score_computed_at: string | null;
  income_count: string;
  bill_count: string;
  txn_count: string;
  doc_count: string;
  total_count: string;
}

function bandCondition(band: ScoreBand): string {
  switch (band) {
    case 'poor':      return 'ls.total_score < 550';
    case 'fair':      return 'ls.total_score >= 550 AND ls.total_score < 650';
    case 'good':      return 'ls.total_score >= 650 AND ls.total_score < 700';
    case 'veryGood':  return 'ls.total_score >= 700 AND ls.total_score < 750';
    case 'excellent': return 'ls.total_score >= 750';
  }
}

// ── Service ────────────────────────────────────────────────────────────────────

@Injectable()
export class AdminService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(DocumentEntity)
    private readonly documentRepo: Repository<DocumentEntity>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getStats() {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [counts, scoreStats] = await Promise.all([
      this.dataSource.query<Array<Record<string, string>>>(`
        SELECT
          (SELECT COUNT(*) FROM users)::int                                          AS total_users,
          (SELECT COUNT(*) FROM users WHERE created_at >= $1)::int                  AS new_this_week,
          (SELECT COUNT(*) FROM income_records)::int                                AS income,
          (SELECT COUNT(*) FROM bill_payments)::int                                 AS bills,
          (SELECT COUNT(*) FROM transactions)::int                                  AS txns,
          (SELECT COUNT(*) FROM documents)::int                                     AS docs
      `, [weekAgo]),

      this.dataSource.query<ScoreRow[]>(`
        WITH latest AS (
          SELECT DISTINCT ON (user_id) user_id, total_score
          FROM credit_scores
          ORDER BY user_id, computed_at DESC
        )
        SELECT
          COUNT(*)::int                                                              AS users_with_score,
          COALESCE(ROUND(AVG(total_score)), 0)::int                                 AS avg_score,
          COUNT(CASE WHEN total_score < 550            THEN 1 END)::int             AS poor,
          COUNT(CASE WHEN total_score BETWEEN 550 AND 649 THEN 1 END)::int         AS fair,
          COUNT(CASE WHEN total_score BETWEEN 650 AND 699 THEN 1 END)::int         AS good,
          COUNT(CASE WHEN total_score BETWEEN 700 AND 749 THEN 1 END)::int         AS very_good,
          COUNT(CASE WHEN total_score >= 750            THEN 1 END)::int            AS excellent
        FROM latest
      `),
    ]);

    // Both queries use aggregate functions with no GROUP BY — always one row
    const c  = counts[0]!;
    const sc = scoreStats[0]!;

    return {
      totalUsers:           Number(c.total_users),
      usersWithScore:       Number(sc.users_with_score),
      avgScore:             Number(sc.avg_score),
      scoreDistribution: {
        poor:      Number(sc.poor),
        fair:      Number(sc.fair),
        good:      Number(sc.good),
        veryGood:  Number(sc.very_good),
        excellent: Number(sc.excellent),
      },
      newUsersThisWeek:     Number(c.new_this_week),
      totalIncomeRecords:   Number(c.income),
      totalBillRecords:     Number(c.bills),
      totalTransactions:    Number(c.txns),
      totalDocuments:       Number(c.docs),
      totalLoansOfferClicks: 0,
    };
  }

  async getUsers(opts: GetAdminUsersDto) {
    const page  = opts.page  ?? 1;
    const limit = opts.limit ?? 20;
    const offset = (page - 1) * limit;

    const params: unknown[] = [];
    const conditions: string[] = [];

    if (opts.search) {
      params.push(`%${opts.search}%`);
      const idx = params.length;
      conditions.push(
        `(u.first_name ILIKE $${idx} OR u.last_name ILIKE $${idx} OR u.email ILIKE $${idx})`,
      );
    }

    if (opts.state) {
      params.push(opts.state);
      conditions.push(`p.state = $${params.length}`);
    }

    if (opts.scoreBand) {
      conditions.push(`(${bandCondition(opts.scoreBand)})`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    params.push(limit);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const rows = await this.dataSource.query<UserRow[]>(`
      WITH latest_scores AS (
        SELECT DISTINCT ON (user_id) user_id, total_score, computed_at
        FROM credit_scores
        ORDER BY user_id, computed_at DESC
      )
      SELECT
        u.id, u.first_name, u.last_name, u.email, u.created_at, u.role,
        p.state, p.occupation, p.onboarding_complete,
        ls.total_score, ls.computed_at AS score_computed_at,
        (SELECT COUNT(*)::int FROM income_records WHERE user_id = u.id) AS income_count,
        (SELECT COUNT(*)::int FROM bill_payments    WHERE user_id = u.id) AS bill_count,
        (SELECT COUNT(*)::int FROM transactions     WHERE user_id = u.id) AS txn_count,
        (SELECT COUNT(*)::int FROM documents        WHERE user_id = u.id) AS doc_count,
        COUNT(*) OVER() AS total_count
      FROM users u
      LEFT JOIN user_profiles  p  ON p.user_id = u.id
      LEFT JOIN latest_scores  ls ON ls.user_id = u.id
      ${where}
      ORDER BY u.created_at DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `, params);

    const total = rows.length > 0 ? Number(rows[0]!.total_count) : 0;

    const data = rows.map((r) => ({
      id:        r.id,
      firstName: r.first_name,
      lastName:  r.last_name,
      email:     r.email,
      createdAt: r.created_at,
      role:      r.role,
      profile:   r.state != null || r.occupation != null
        ? { state: r.state, occupation: r.occupation, onboardingComplete: r.onboarding_complete ?? false }
        : null,
      latestScore: r.total_score != null
        ? { totalScore: Number(r.total_score), tier: scoreTier(Number(r.total_score)), computedAt: r.score_computed_at! }
        : null,
      counts: {
        income:       Number(r.income_count),
        bills:        Number(r.bill_count),
        transactions: Number(r.txn_count),
        documents:    Number(r.doc_count),
      },
    }));

    return { data, total, page, limit };
  }

  async getUserDetail(userId: string) {
    // Double-check in service (guard already verified admin role)
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    const [profile, scores, incomeCounts, billCounts, txnCounts, docs] = await Promise.all([
      this.dataSource.query('SELECT * FROM user_profiles WHERE user_id = $1', [userId]),
      this.dataSource.query(
        'SELECT * FROM credit_scores WHERE user_id = $1 ORDER BY computed_at DESC LIMIT 3',
        [userId],
      ),
      this.dataSource.query(
        'SELECT COUNT(*)::int as total FROM income_records WHERE user_id = $1',
        [userId],
      ),
      this.dataSource.query(
        'SELECT COUNT(*)::int as total FROM bill_payments WHERE user_id = $1',
        [userId],
      ),
      this.dataSource.query(
        'SELECT COUNT(*)::int as total FROM transactions WHERE user_id = $1',
        [userId],
      ),
      this.documentRepo.find({
        where: { userId },
        order: { uploadedAt: 'DESC' },
        select: ['id', 'docType', 'displayName', 'fileSize', 'mimeType', 'isVerified', 'uploadedAt'],
      }),
    ]);

    return {
      user: {
        id:              user.id,
        email:           user.email,
        firstName:       user.firstName,
        lastName:        user.lastName,
        role:            user.role,
        isEmailVerified: user.isEmailVerified,
        createdAt:       user.createdAt,
        updatedAt:       user.updatedAt,
      },
      profile: profile[0] ?? null,
      scores:  scores.map((s: Record<string, unknown>) => ({
        totalScore:     Number(s.total_score),
        tier:           scoreTier(Number(s.total_score)),
        incomeScore:    Number(s.income_score),
        billScore:      Number(s.bill_score),
        cashFlowScore:  Number(s.cash_flow_score),
        profileScore:   Number(s.profile_score),
        dataScore:      Number(s.data_score),
        computedAt:     s.computed_at,
      })),
      counts: {
        income:       Number(incomeCounts[0]!.total),
        bills:        Number(billCounts[0]!.total),
        transactions: Number(txnCounts[0]!.total),
        documents:    docs.length,
      },
      documents: docs,
    };
  }

  async verifyDocument(userId: string, documentId: string): Promise<void> {
    const doc = await this.documentRepo.findOne({ where: { id: documentId, userId } });
    if (!doc) throw new BadRequestException('Document not found for this user');

    doc.isVerified = true;
    await this.documentRepo.save(doc);

    try {
      await this.notificationsService.create(
        userId,
        NotificationType.DOC_VERIFIED,
        'Your document has been verified ✓',
        `"${doc.displayName}" has been verified by CreditMap. Verified documents boost your profile score.`,
        '/documents',
      );
    } catch {
      // Notification failure must not affect document verification
    }
  }
}
