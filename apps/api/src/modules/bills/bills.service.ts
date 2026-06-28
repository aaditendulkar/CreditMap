import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { BillPayment, BillType } from './entities/bill-payment.entity';
import type { CreateBillDto } from './dto/bill.dto';
import type { UpdateBillDto } from './dto/bill.dto';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

interface ByTypeEntry {
  type: BillType;
  count: number;
  onTimePct: number;
}

export interface BillSummary {
  totalBills: number;
  onTimePct: number;   // 0–1: paid-on-time bills / all bills
  lateCount: number;
  avgDaysLate: number; // avg (paidDate - dueDate) in days for late bills only
  byType: ByTypeEntry[];
}

@Injectable()
export class BillsService {
  constructor(
    @InjectRepository(BillPayment)
    private readonly billRepo: Repository<BillPayment>,
    @InjectQueue('score-recompute')
    private readonly scoreQueue: Queue,
  ) {}

  async create(userId: string, dto: CreateBillDto): Promise<BillPayment> {
    const bill = this.billRepo.create({
      userId,
      billType: dto.billType,
      provider: dto.provider ?? null,
      billMonth: dto.billMonth,
      amount: String(dto.amount),
      dueDate: dto.dueDate,
      paidDate: dto.paidDate ?? null,
      isPaid: dto.isPaid ?? false,
    });
    const saved = await this.billRepo.save(bill);
    await this.queueScoreRecompute(userId);
    return saved;
  }

  async findAll(
    userId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<BillPayment>> {
    const [data, total] = await this.billRepo.findAndCount({
      where: { userId },
      order: { billMonth: 'DESC', createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });
    return { data, total, page, limit };
  }

  async getSummary(userId: string): Promise<BillSummary> {
    const bills = await this.billRepo.find({ where: { userId } });
    const totalBills = bills.length;

    let onTimeCount = 0;
    let lateCount = 0;
    let totalDaysLate = 0;
    const typeMap = new Map<BillType, { count: number; onTimeCount: number }>();

    for (const b of bills) {
      const entry = typeMap.get(b.billType) ?? { count: 0, onTimeCount: 0 };
      entry.count++;

      if (b.isPaid && b.paidDate) {
        if (b.paidDate <= b.dueDate) {
          onTimeCount++;
          entry.onTimeCount++;
        } else {
          lateCount++;
          const paid = new Date(b.paidDate);
          const due = new Date(b.dueDate);
          totalDaysLate += Math.round(
            (paid.getTime() - due.getTime()) / (1000 * 60 * 60 * 24),
          );
        }
      }
      typeMap.set(b.billType, entry);
    }

    const onTimePct = totalBills > 0 ? onTimeCount / totalBills : 0;
    const avgDaysLate = lateCount > 0 ? totalDaysLate / lateCount : 0;
    const byType: ByTypeEntry[] = Array.from(typeMap.entries()).map(
      ([type, { count, onTimeCount: otc }]) => ({
        type,
        count,
        onTimePct: count > 0 ? otc / count : 0,
      }),
    );

    return { totalBills, onTimePct, lateCount, avgDaysLate, byType };
  }

  async update(userId: string, id: string, dto: UpdateBillDto): Promise<BillPayment> {
    const bill = await this.findOwned(userId, id);

    const updates = Object.fromEntries(
      Object.entries(dto).filter(([, v]) => v !== undefined),
    );
    if (updates['amount'] !== undefined) {
      updates['amount'] = String(updates['amount']);
    }
    Object.assign(bill, updates);

    const saved = await this.billRepo.save(bill);
    await this.queueScoreRecompute(userId);
    return saved;
  }

  async markPaid(userId: string, id: string): Promise<BillPayment> {
    const bill = await this.findOwned(userId, id);
    bill.isPaid = true;
    if (!bill.paidDate) {
      bill.paidDate = new Date().toISOString().substring(0, 10);
    }
    const saved = await this.billRepo.save(bill);
    await this.queueScoreRecompute(userId);
    return saved;
  }

  async remove(userId: string, id: string): Promise<void> {
    const bill = await this.findOwned(userId, id);
    await this.billRepo.remove(bill);
    await this.queueScoreRecompute(userId);
  }

  async findOwned(userId: string, id: string): Promise<BillPayment> {
    const bill = await this.billRepo.findOne({ where: { id } });
    if (!bill) throw new NotFoundException('Bill not found');
    if (bill.userId !== userId) throw new ForbiddenException();
    return bill;
  }

  private async queueScoreRecompute(userId: string): Promise<void> {
    await this.scoreQueue.add({ userId }, { jobId: `score-${userId}`, removeOnComplete: true });
  }
}
