import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

export enum IncomeSource {
  SALARY = 'salary',
  DAILY_WAGE = 'daily_wage',
  BUSINESS = 'business',
  FREELANCE = 'freelance',
  FARM = 'farm',
  RENT = 'rent',
  OTHER = 'other',
}

@Entity('income_records')
@Unique('UQ_income_records_user_source_month', ['userId', 'source', 'recordMonth'])
export class IncomeRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({ type: 'date', name: 'record_month' })
  recordMonth!: string;

  @Column({ type: 'enum', enum: IncomeSource, enumName: 'income_source_enum' })
  source!: IncomeSource;

  // TypeORM returns decimal columns as strings to preserve precision
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: string;

  @Column({ name: 'is_regular', default: true })
  isRegular!: boolean;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
