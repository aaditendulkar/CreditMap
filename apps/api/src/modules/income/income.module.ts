import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IncomeController } from './income.controller';
import { IncomeService } from './income.service';
import { IncomeRecord } from './entities/income-record.entity';
import { JobsModule } from '../../jobs/jobs.module';

@Module({
  imports: [TypeOrmModule.forFeature([IncomeRecord]), JobsModule],
  controllers: [IncomeController],
  providers: [IncomeService],
})
export class IncomeModule {}
