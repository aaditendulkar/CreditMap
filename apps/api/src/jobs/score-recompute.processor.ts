import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { ScoringEngineService } from '../modules/scores/scoring-engine.service';
import { ScoresService, scoreTier } from '../modules/scores/scores.service';
import { NotificationsService } from '../modules/notifications/notifications.service';
import { NotificationType } from '../modules/notifications/entities/notification.entity';

@Processor('score-recompute')
export class ScoreRecomputeProcessor {
  private readonly logger = new Logger(ScoreRecomputeProcessor.name);

  constructor(
    private readonly scoringEngine: ScoringEngineService,
    private readonly scoresService: ScoresService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Process()
  async handle(job: Job<{ userId: string }>): Promise<void> {
    const { userId } = job.data;
    this.logger.log(`Computing score for user ${userId}`);

    // Fetch previous score before computing the new one
    const previousScore = await this.scoresService.getLatest(userId);

    const score = await this.scoringEngine.computeAndSave(userId);
    this.logger.log(
      `Score saved for ${userId}: ${score.totalScore} pts ` +
      `(income=${score.incomeScore} bills=${score.billScore} ` +
      `cashFlow=${score.cashFlowScore} profile=${score.profileScore} ` +
      `data=${score.dataScore})`,
    );

    // Create notification — wrapped in try/catch so a failure never breaks the pipeline
    try {
      const tier = scoreTier(score.totalScore);

      if (!previousScore) {
        await this.notificationsService.create(
          userId,
          NotificationType.SCORE_UPDATED,
          'Your first CreditMap score is ready!',
          `Your score is ${score.totalScore} (${tier}). Tap to see the full breakdown.`,
          '/score',
        );
      } else {
        const diff = score.totalScore - previousScore.totalScore;

        if (diff > 0) {
          await this.notificationsService.create(
            userId,
            NotificationType.SCORE_IMPROVED,
            'Your score improved! 🎉',
            `Score went from ${previousScore.totalScore} to ${score.totalScore} (+${diff} points). Keep it up!`,
            '/score',
          );
        } else if (diff < 0) {
          await this.notificationsService.create(
            userId,
            NotificationType.SCORE_DROPPED,
            'Your score changed',
            `Score went from ${previousScore.totalScore} to ${score.totalScore} (${diff} points). Tap to see improvement tips.`,
            '/score',
          );
        } else {
          await this.notificationsService.create(
            userId,
            NotificationType.SCORE_UPDATED,
            'Score recalculated',
            `Your score is ${score.totalScore} (${tier}). Add more data to improve it.`,
            '/score',
          );
        }
      }
    } catch (err: unknown) {
      this.logger.error(`Failed to create score notification for ${userId}`, err);
    }
  }
}
