import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, type Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { IncomeRecord, IncomeSource } from './entities/income-record.entity';
import type { CreateIncomeDto } from './dto/income.dto';
import type { UpdateIncomeDto } from './dto/income.dto';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

interface MonthlyTrendEntry {
  month: string;
  amount: number;
}

interface SourceBreakdownEntry {
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

@Injectable()
export class IncomeService {
  constructor(
    @InjectRepository(IncomeRecord)
    private readonly incomeRepo: Repository<IncomeRecord>,
    @InjectQueue('score-recompute')
    private readonly scoreQueue: Queue,
  ) {}

  async create(userId: string, dto: CreateIncomeDto): Promise<IncomeRecord> {
    try {
      const record = this.incomeRepo.create({
        userId,
        recordMonth: dto.recordMonth,
        source: dto.source,
        amount: String(dto.amount),
        isRegular: dto.isRegular ?? true,
        notes: dto.notes ?? null,
      });
      const saved = await this.incomeRepo.save(record);
      await this.queueScoreRecompute(userId);
      return saved;
    } catch (err: unknown) {
      if (err instanceof QueryFailedError && (err as unknown as { code: string }).code === '23505') {
        throw new ConflictException(
          'An income record for this month and source already exists',
        );
      }
      throw err;
    }
  }

  async findAll(
    userId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<IncomeRecord>> {
    const [data, total] = await this.incomeRepo.findAndCount({
      where: { userId },
      order: { recordMonth: 'DESC', createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });
    return { data, total, page, limit };
  }

  async getSummary(userId: string): Promise<IncomeSummary> {
    const records = await this.incomeRepo.find({ where: { userId } });

    const monthAmounts = new Map<string, number>();
    const sourceMap = new Map<IncomeSource, { total: number; count: number }>();
    let totalIncome = 0;

    for (const r of records) {
      const amt = parseFloat(r.amount);
      totalIncome += amt;

      const month = r.recordMonth.substring(0, 7); // "YYYY-MM"
      monthAmounts.set(month, (monthAmounts.get(month) ?? 0) + amt);

      const entry = sourceMap.get(r.source) ?? { total: 0, count: 0 };
      entry.total += amt;
      entry.count++;
      sourceMap.set(r.source, entry);
    }

    const monthsOfData = monthAmounts.size;
    const avgMonthly = monthsOfData > 0 ? totalIncome / monthsOfData : 0;

    // Last 12 months with 0 fill for missing months
    const now = new Date();
    const monthlyTrend: MonthlyTrendEntry[] = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return { month: key, amount: monthAmounts.get(key) ?? 0 };
    });

    const sourceBreakdown: SourceBreakdownEntry[] = Array.from(sourceMap.entries()).map(
      ([source, { total, count }]) => ({ source, total, count }),
    );

    return {
      avgMonthly,
      totalIncome,
      recordCount: records.length,
      monthsOfData,
      monthlyTrend,
      sourceBreakdown,
    };
  }

  async update(userId: string, id: string, dto: UpdateIncomeDto): Promise<IncomeRecord> {
    const record = await this.findOwned(userId, id);

    const updates = Object.fromEntries(
      Object.entries(dto).filter(([, v]) => v !== undefined),
    );
    if (updates['amount'] !== undefined) {
      updates['amount'] = String(updates['amount']);
    }

    Object.assign(record, updates);
    const saved = await this.incomeRepo.save(record);
    await this.queueScoreRecompute(userId);
    return saved;
  }

  async remove(userId: string, id: string): Promise<void> {
    const record = await this.findOwned(userId, id);
    await this.incomeRepo.remove(record);
    await this.queueScoreRecompute(userId);
  }

  async findOwned(userId: string, id: string): Promise<IncomeRecord> {
    const record = await this.incomeRepo.findOne({ where: { id } });
    if (!record) throw new NotFoundException('Income record not found');
    if (record.userId !== userId) throw new ForbiddenException();
    return record;
  }

  private async queueScoreRecompute(userId: string): Promise<void> {
    // jobId deduplication: replaces any pending job for the same user
    await this.scoreQueue.add({ userId }, { jobId: `score-${userId}`, removeOnComplete: true });
  }
}
