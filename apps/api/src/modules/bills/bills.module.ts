import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillsController } from './bills.controller';
import { BillsService } from './bills.service';
import { BillPayment } from './entities/bill-payment.entity';
import { JobsModule } from '../../jobs/jobs.module';

@Module({
  imports: [TypeOrmModule.forFeature([BillPayment]), JobsModule],
  controllers: [BillsController],
  providers: [BillsService],
})
export class BillsModule {}
