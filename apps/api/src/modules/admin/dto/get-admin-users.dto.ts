import { IsOptional, IsString, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

const SCORE_BANDS = ['poor', 'fair', 'good', 'veryGood', 'excellent'] as const;
export type ScoreBand = typeof SCORE_BANDS[number];

export class GetAdminUsersDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsIn(SCORE_BANDS)
  scoreBand?: ScoreBand;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
