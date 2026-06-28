import { Controller, Get, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ScoresService, scoreTier } from './scores.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('scores')
@ApiBearerAuth()
@Controller('scores')
export class ScoresController {
  constructor(private readonly scoresService: ScoresService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current credit score with full breakdown' })
  async getMyScore(@CurrentUser() user: JwtPayload) {
    const score = await this.scoresService.getLatest(user.sub);
    if (!score) return { score: null };

    return {
      score: {
        id:             score.id,
        totalScore:     score.totalScore,
        tier:           scoreTier(score.totalScore),
        incomeScore:    score.incomeScore,
        billScore:      score.billScore,
        cashFlowScore:  score.cashFlowScore,
        profileScore:   score.profileScore,
        dataScore:      score.dataScore,
        scoreVersion:   score.scoreVersion,
        computedAt:     score.computedAt,
      },
    };
  }

  @Get('me/history')
  @ApiOperation({ summary: 'Get last 12 score computations for trend chart' })
  async getMyHistory(@CurrentUser() user: JwtPayload) {
    const history = await this.scoresService.getHistory(user.sub);
    return {
      history: history.map((s) => ({
        id:         s.id,
        totalScore: s.totalScore,
        tier:       scoreTier(s.totalScore),
        computedAt: s.computedAt,
      })),
    };
  }

  @Post('me/recompute')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Manually trigger a score recomputation' })
  async recompute(@CurrentUser() user: JwtPayload) {
    await this.scoresService.queueRecompute(user.sub);
    return { queued: true };
  }
}
