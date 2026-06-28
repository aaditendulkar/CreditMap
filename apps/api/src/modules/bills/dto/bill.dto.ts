import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { BillType } from '../entities/bill-payment.entity';

export class CreateBillDto {
  @IsEnum(BillType)
  billType!: BillType;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  provider?: string;

  @IsDateString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])-01$/, {
    message: 'billMonth must be the first day of a month in YYYY-MM-01 format',
  })
  billMonth!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(10_000_000)
  amount!: number;

  @IsDateString()
  dueDate!: string;

  @IsOptional()
  @IsDateString()
  paidDate?: string;

  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;
}

export class UpdateBillDto extends PartialType(CreateBillDto) {}
