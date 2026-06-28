import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum TransactionType {
  CREDIT = 'credit',
  DEBIT = 'debit',
}

export enum TransactionCategory {
  RENT = 'rent',
  FOOD = 'food',
  UTILITIES = 'utilities',
  EMI = 'emi',
  SALARY = 'salary',
  FREELANCE = 'freelance',
  BUSINESS = 'business',
  TRANSFER = 'transfer',
  MEDICAL = 'medical',
  OTHER = 'other',
}

export enum TransactionChannel {
  UPI = 'upi',
  CASH = 'cash',
  BANK_TRANSFER = 'bank_transfer',
  NEFT = 'neft',
  IMPS = 'imps',
  OTHER = 'other',
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({ type: 'date', name: 'txn_date' })
  txnDate!: string;

  @Column({ type: 'enum', enum: TransactionType, enumName: 'txn_type_enum' })
  type!: TransactionType;

  // TypeORM returns decimal columns as strings to preserve precision
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: string;

  @Column({ type: 'enum', enum: TransactionCategory, enumName: 'txn_category_enum' })
  category!: TransactionCategory;

  @Column({ type: 'varchar', length: 200, nullable: true })
  description!: string | null;

  @Column({ type: 'enum', enum: TransactionChannel, enumName: 'txn_channel_enum', nullable: true })
  channel!: TransactionChannel | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
