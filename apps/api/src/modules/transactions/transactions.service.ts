import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import {
  Transaction,
  TransactionCategory,
  TransactionType,
} from './entities/transaction.entity';
import type { CreateTransactionDto } from './dto/transaction.dto';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

interface MonthlyCreditDebit {
  month: string;
  credits: number;
  debits: number;
}

interface ByCategoryEntry {
  category: TransactionCategory;
  total: number;
  count: number;
}

export interface TransactionSummary {
  totalCredits: number;
  totalDebits: number;
  netFlow: number;
  byCategory: ByCategoryEntry[];
  monthlyTrend: MonthlyCreditDebit[];
}

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly txnRepo: Repository<Transaction>,
    @InjectQueue('score-recompute')
    private readonly scoreQueue: Queue,
  ) {}

  async create(userId: string, dto: CreateTransactionDto): Promise<Transaction> {
    const txn = this.txnRepo.create({
      userId,
      txnDate: dto.txnDate,
      type: dto.type,
      amount: String(dto.amount),
      category: dto.category,
      description: dto.description ?? null,
      channel: dto.channel ?? null,
    });
    const saved = await this.txnRepo.save(txn);
    await this.queueScoreRecompute(userId);
    return saved;
  }

  async findAll(
    userId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<Transaction>> {
    const [data, total] = await this.txnRepo.findAndCount({
      where: { userId },
      order: { txnDate: 'DESC', createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });
    return { data, total, page, limit };
  }

  async getSummary(userId: string): Promise<TransactionSummary> {
    const txns = await this.txnRepo.find({ where: { userId } });

    let totalCredits = 0;
    let totalDebits = 0;
    const categoryMap = new Map<TransactionCategory, { total: number; count: number }>();
    const monthMap = new Map<string, { credits: number; debits: number }>();

    for (const t of txns) {
      const amt = parseFloat(t.amount);
      const month = t.txnDate.substring(0, 7); // "YYYY-MM"

      if (t.type === TransactionType.CREDIT) {
        totalCredits += amt;
      } else {
        totalDebits += amt;
      }

      const cat = categoryMap.get(t.category) ?? { total: 0, count: 0 };
      cat.total += amt;
      cat.count++;
      categoryMap.set(t.category, cat);

      const m = monthMap.get(month) ?? { credits: 0, debits: 0 };
      if (t.type === TransactionType.CREDIT) {
        m.credits += amt;
      } else {
        m.debits += amt;
      }
      monthMap.set(month, m);
    }

    const now = new Date();
    const monthlyTrend: MonthlyCreditDebit[] = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const entry = monthMap.get(key) ?? { credits: 0, debits: 0 };
      return { month: key, credits: entry.credits, debits: entry.debits };
    });

    const byCategory: ByCategoryEntry[] = Array.from(categoryMap.entries()).map(
      ([category, { total, count }]) => ({ category, total, count }),
    );

    return {
      totalCredits,
      totalDebits,
      netFlow: totalCredits - totalDebits,
      byCategory,
      monthlyTrend,
    };
  }

  async remove(userId: string, id: string): Promise<void> {
    const txn = await this.findOwned(userId, id);
    await this.txnRepo.remove(txn);
    await this.queueScoreRecompute(userId);
  }

  async findOwned(userId: string, id: string): Promise<Transaction> {
    const txn = await this.txnRepo.findOne({ where: { id } });
    if (!txn) throw new NotFoundException('Transaction not found');
    if (txn.userId !== userId) throw new ForbiddenException();
    return txn;
  }

  private async queueScoreRecompute(userId: string): Promise<void> {
    await this.scoreQueue.add({ userId }, { jobId: `score-${userId}`, removeOnComplete: true });
  }
}
