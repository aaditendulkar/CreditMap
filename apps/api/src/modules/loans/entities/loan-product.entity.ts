import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum LoanProductType {
  PERSONAL     = 'personal',
  MICROFINANCE = 'microfinance',
  BUSINESS     = 'business',
  SECURED      = 'secured',
}

@Entity('loan_products')
export class LoanProduct {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100, name: 'lender_name' })
  lenderName!: string;

  @Column({ type: 'varchar', length: 100, name: 'product_name' })
  productName!: string;

  @Column({
    type: 'enum',
    enum: LoanProductType,
    enumName: 'loan_product_type_enum',
    name: 'product_type',
  })
  productType!: LoanProductType;

  @Column({ type: 'smallint', name: 'min_score', default: 300 })
  minScore!: number;

  @Column({ type: 'smallint', name: 'max_score', default: 850 })
  maxScore!: number;

  @Column({ type: 'integer', name: 'min_monthly_income', nullable: true })
  minMonthlyIncome!: number | null;

  @Column({ type: 'integer', name: 'loan_amount_min' })
  loanAmountMin!: number;

  @Column({ type: 'integer', name: 'loan_amount_max' })
  loanAmountMax!: number;

  // TypeORM returns decimal columns as strings to preserve precision
  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'interest_rate_pa' })
  interestRatePA!: string;

  @Column({ type: 'smallint', name: 'tenure_months_min' })
  tenureMonthsMin!: number;

  @Column({ type: 'smallint', name: 'tenure_months_max' })
  tenureMonthsMax!: number;

  @Column({ type: 'decimal', precision: 4, scale: 2, name: 'processing_fee_percent', nullable: true })
  processingFeePercent!: string | null;

  @Column({ type: 'text', array: true, name: 'target_segments', nullable: true })
  targetSegments!: string[] | null;

  @Column({ type: 'text', name: 'apply_url', nullable: true })
  applyUrl!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
