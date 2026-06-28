import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Document } from '../documents/entities/document.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { ScoresModule } from '../scores/scores.module';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Document]),
    NotificationsModule,
    ScoresModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
