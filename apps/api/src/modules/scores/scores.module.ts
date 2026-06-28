import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { CreditScore } from './entities/credit-score.entity';
import { IncomeRecord } from '../income/entities/income-record.entity';
import { BillPayment } from '../bills/entities/bill-payment.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { UserProfile } from '../profile/entities/user-profile.entity';
import { ScoringEngineService } from './scoring-engine.service';
import { ScoresService } from './scores.service';
import { ScoresController } from './scores.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([CreditScore, IncomeRecord, BillPayment, Transaction, UserProfile]),
    // Register the queue here so ScoresService can inject it directly,
    // avoiding a circular dependency with JobsModule.
    BullModule.registerQueue({ name: 'score-recompute' }),
  ],
  providers: [ScoringEngineService, ScoresService],
  controllers: [ScoresController],
  exports: [ScoringEngineService, ScoresService],
})
export class ScoresModule {}
