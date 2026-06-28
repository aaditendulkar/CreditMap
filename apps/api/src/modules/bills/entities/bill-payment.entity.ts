import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum BillType {
  ELECTRICITY = 'electricity',
  WATER = 'water',
  GAS = 'gas',
  MOBILE = 'mobile',
  BROADBAND = 'broadband',
  RENT = 'rent',
  INSURANCE = 'insurance',
  OTHER = 'other',
}

@Entity('bill_payments')
export class BillPayment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({ type: 'enum', enum: BillType, enumName: 'bill_type_enum', name: 'bill_type' })
  billType!: BillType;

  @Column({ type: 'varchar', length: 100, nullable: true })
  provider!: string | null;

  @Column({ type: 'date', name: 'bill_month' })
  billMonth!: string;

  // TypeORM returns decimal columns as strings to preserve precision
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: string;

  @Column({ type: 'date', name: 'due_date' })
  dueDate!: string;

  @Column({ type: 'date', name: 'paid_date', nullable: true })
  paidDate!: string | null;

  @Column({ name: 'is_paid', default: false })
  isPaid!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
