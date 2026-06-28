import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ScoresModule } from '../modules/scores/scores.module';
import { NotificationsModule } from '../modules/notifications/notifications.module';
import { ScoreRecomputeProcessor } from './score-recompute.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'score-recompute' }),
    ScoresModule,
    NotificationsModule,
  ],
  providers: [ScoreRecomputeProcessor],
  exports: [BullModule],
})
export class JobsModule {}
