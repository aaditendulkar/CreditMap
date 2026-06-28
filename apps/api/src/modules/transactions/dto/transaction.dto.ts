import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import {
  TransactionType,
  TransactionCategory,
  TransactionChannel,
} from '../entities/transaction.entity';

export class CreateTransactionDto {
  @IsDateString()
  txnDate!: string;

  @IsEnum(TransactionType)
  type!: TransactionType;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(10_000_000)
  amount!: number;

  @IsEnum(TransactionCategory)
  category!: TransactionCategory;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsOptional()
  @IsEnum(TransactionChannel)
  channel?: TransactionChannel;
}

export class UpdateTransactionDto extends PartialType(CreateTransactionDto) {}
