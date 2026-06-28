import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Category, Gender, Occupation } from '../entities/user-profile.entity';

export class UpsertProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  district?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/, { message: 'pinCode must be exactly 6 digits' })
  pinCode?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsEnum(Category)
  category?: Category;

  @IsOptional()
  @IsEnum(Occupation)
  occupation?: Occupation;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  monthlyIncomeStated?: number;

  @IsOptional()
  @IsBoolean()
  hasBankAccount?: boolean;

  @IsOptional()
  @IsBoolean()
  hasJanDhan?: boolean;

  @IsOptional()
  @IsBoolean()
  hasUpi?: boolean;
}
