import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bull';
import type { Repository } from 'typeorm';
import type { Queue } from 'bull';
import { CreditScore } from './entities/credit-score.entity';

export type ScoreTier = 'Poor' | 'Fair' | 'Good' | 'Very Good' | 'Excellent';

export function scoreTier(total: number): ScoreTier {
  if (total >= 750) return 'Excellent';
  if (total >= 700) return 'Very Good';
  if (total >= 650) return 'Good';
  if (total >= 550) return 'Fair';
  return 'Poor';
}

@Injectable()
export class ScoresService {
  constructor(
    @InjectRepository(CreditScore)
    private readonly scoreRepo: Repository<CreditScore>,
    @InjectQueue('score-recompute')
    private readonly queue: Queue<{ userId: string }>,
  ) {}

  async getLatest(userId: string): Promise<CreditScore | null> {
    return this.scoreRepo.findOne({
      where: { userId },
      order: { computedAt: 'DESC' },
    });
  }

  async getHistory(userId: string): Promise<CreditScore[]> {
    return this.scoreRepo.find({
      where: { userId },
      order: { computedAt: 'DESC' },
      take: 12,
    });
  }

  async queueRecompute(userId: string): Promise<void> {
    const jobId = `score-${userId}`;
    // Remove completed/failed jobs so re-runs always execute.
    // Dedup still works for waiting/active jobs (same jobId won't be added twice).
    const existing = await this.queue.getJob(jobId);
    if (existing) {
      const state = await existing.getState();
      if (state === 'completed' || state === 'failed') {
        await existing.remove();
      }
    }
    await this.queue.add({ userId }, { jobId });
  }
}
