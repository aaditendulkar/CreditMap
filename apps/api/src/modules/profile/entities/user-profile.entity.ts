import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum Gender {
  M = 'M',
  F = 'F',
  O = 'O',
}

export enum Category {
  SC = 'SC',
  ST = 'ST',
  OBC = 'OBC',
  GENERAL = 'General',
}

export enum Occupation {
  SALARIED = 'salaried',
  SELF_EMPLOYED = 'self_employed',
  DAILY_WAGE = 'daily_wage',
  GIG = 'gig',
  STUDENT = 'student',
  FARM = 'farm',
  OTHER = 'other',
}

@Entity('user_profiles')
export class UserProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id', unique: true })
  userId!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  state!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  district!: string | null;

  @Column({ type: 'varchar', length: 6, name: 'pin_code', nullable: true })
  pinCode!: string | null;

  @Column({ type: 'date', name: 'date_of_birth', nullable: true })
  dateOfBirth!: string | null;

  @Column({ type: 'enum', enum: Gender, enumName: 'gender_enum', nullable: true })
  gender!: Gender | null;

  @Column({ type: 'enum', enum: Category, enumName: 'category_enum', nullable: true })
  category!: Category | null;

  @Column({ type: 'enum', enum: Occupation, enumName: 'occupation_enum', nullable: true })
  occupation!: Occupation | null;

  @Column({ type: 'integer', name: 'monthly_income_stated', nullable: true })
  monthlyIncomeStated!: number | null;

  @Column({ name: 'has_bank_account', default: false })
  hasBankAccount!: boolean;

  @Column({ name: 'has_jan_dhan', default: false })
  hasJanDhan!: boolean;

  @Column({ name: 'has_upi', default: false })
  hasUpi!: boolean;

  @Column({ name: 'onboarding_complete', default: false })
  onboardingComplete!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
