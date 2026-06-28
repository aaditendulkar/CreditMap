import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum DocType {
  PAN             = 'pan',
  AADHAAR         = 'aadhaar',
  RENT_RECEIPT    = 'rent_receipt',
  SALARY_SLIP     = 'salary_slip',
  BANK_STATEMENT  = 'bank_statement',
  UTILITY_BILL    = 'utility_bill',
  OTHER           = 'other',
}

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({
    type: 'enum',
    enum: DocType,
    enumName: 'doc_type_enum',
    name: 'doc_type',
  })
  docType!: DocType;

  @Column({ type: 'varchar', length: 200, name: 'display_name' })
  displayName!: string;

  // Never returned in API responses — internal storage path only
  @Column({ type: 'text', name: 's3_key' })
  s3Key!: string;

  @Column({ type: 'integer', name: 'file_size', nullable: true })
  fileSize!: number | null;

  @Column({ type: 'varchar', length: 100, name: 'mime_type', nullable: true })
  mimeType!: string | null;

  @Column({ name: 'is_verified', default: false })
  isVerified!: boolean;

  @CreateDateColumn({ name: 'uploaded_at' })
  uploadedAt!: Date;
}
