import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { LoanProduct } from './entities/loan-product.entity';
import { CreditScore } from '../scores/entities/credit-score.entity';
import { UserProfile } from '../profile/entities/user-profile.entity';
import { scoreTier } from '../scores/scores.service';

@Injectable()
export class LoansService {
  constructor(
    @InjectRepository(LoanProduct)
    private readonly loanProductRepo: Repository<LoanProduct>,
    @InjectRepository(CreditScore)
    private readonly scoreRepo: Repository<CreditScore>,
    @InjectRepository(UserProfile)
    private readonly profileRepo: Repository<UserProfile>,
  ) {}

  async getOffersForUser(userId: string) {
    const [latestScore, profile] = await Promise.all([
      this.scoreRepo.findOne({
        where: { userId },
        order: { computedAt: 'DESC' },
      }),
      this.profileRepo.findOne({ where: { userId } }),
    ]);

    if (!latestScore) {
      return { hasScore: false as const, offers: [] };
    }

    const allActive = await this.loanProductRepo.find({
      where: { isActive: true },
    });

    const userScore  = latestScore.totalScore;
    const userIncome = profile?.monthlyIncomeStated ?? null;

    const matched = allActive
      .filter(
        (p) =>
          p.minScore <= userScore &&
          userScore <= p.maxScore &&
          (p.minMonthlyIncome === null ||
            (userIncome !== null && userIncome >= p.minMonthlyIncome)),
      )
      .sort((a, b) => parseFloat(a.interestRatePA) - parseFloat(b.interestRatePA));

    return {
      hasScore: true as const,
      score: userScore,
      tier:  scoreTier(userScore),
      offers: matched,
    };
  }

  async getAllProducts(): Promise<LoanProduct[]> {
    return this.loanProductRepo.find({
      where: { isActive: true },
      order: { interestRatePA: 'ASC' },
    });
  }
}
