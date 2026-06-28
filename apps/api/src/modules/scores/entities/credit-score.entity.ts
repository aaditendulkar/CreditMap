import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * One row per score computation. Never updated — history is preserved so
 * users can see how their score changes over time.
 *
 * totalScore: 300–850 (CIBIL-like range)
 * sub-scores: 0–100, each representing one domain
 */
@Entity('credit_scores')
@Index('IDX_credit_scores_user_computed', ['userId', 'computedAt'])
export class CreditScore {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  @Index('IDX_credit_scores_user_id')
  userId!: string;

  // 300–850 mapped from weighted sub-scores
  @Column({ type: 'smallint', name: 'total_score' })
  totalScore!: number;

  // Income consistency, regularity, level (weight: 25%)
  @Column({ type: 'smallint', name: 'income_score' })
  incomeScore!: number;

  // Bill on-time rate, payment rate, variety (weight: 30%)
  @Column({ type: 'smallint', name: 'bill_score' })
  billScore!: number;

  // Net flow, digital payment preference, channel diversity (weight: 20%)
  @Column({ type: 'smallint', name: 'cash_flow_score' })
  cashFlowScore!: number;

  // Bank account, UPI, Jan Dhan, occupation, profile completeness (weight: 15%)
  @Column({ type: 'smallint', name: 'profile_score' })
  profileScore!: number;

  // How many months of income/bills/transactions exist (weight: 10%)
  @Column({ type: 'smallint', name: 'data_score' })
  dataScore!: number;

  // Tracks which version of the algorithm produced this score
  @Column({ type: 'varchar', length: 10, name: 'score_version', default: '1.0.0' })
  scoreVersion!: string;

  @CreateDateColumn({ name: 'computed_at' })
  computedAt!: Date;
}
