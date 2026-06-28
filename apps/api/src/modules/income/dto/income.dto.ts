import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  registerDecorator,
} from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { IncomeSource } from '../entities/income-record.entity';

function IsValidRecordMonth() {
  return (obj: object, propertyName: string): void => {
    registerDecorator({
      name: 'isValidRecordMonth',
      target: obj.constructor as Function,
      propertyName,
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== 'string') return false;
          if (!/^\d{4}-(0[1-9]|1[0-2])-01$/.test(value)) return false;
          const date = new Date(value);
          const now = new Date();
          const earliest = new Date(now.getFullYear(), now.getMonth() - 24, 1);
          const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          return date >= earliest && date < nextMonth;
        },
        defaultMessage(): string {
          return 'recordMonth must be the first day of a month (YYYY-MM-01), not in the future, and within the last 24 months';
        },
      },
    });
  };
}

export class CreateIncomeDto {
  @IsValidRecordMonth()
  recordMonth!: string;

  @IsEnum(IncomeSource)
  source!: IncomeSource;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(100)
  @Max(5_000_000)
  amount!: number;

  @IsOptional()
  @IsBoolean()
  isRegular?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UpdateIncomeDto extends PartialType(CreateIncomeDto) {}
