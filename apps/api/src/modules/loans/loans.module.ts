import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoanProduct } from './entities/loan-product.entity';
import { CreditScore } from '../scores/entities/credit-score.entity';
import { UserProfile } from '../profile/entities/user-profile.entity';
import { LoansService } from './loans.service';
import { LoansController } from './loans.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LoanProduct, CreditScore, UserProfile])],
  providers: [LoansService],
  controllers: [LoansController],
})
export class LoansModule {}
