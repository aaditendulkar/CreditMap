import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User } from './modules/users/entities/user.entity';
import { RedisModule } from './modules/redis/redis.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProfileModule } from './modules/profile/profile.module';
import { IncomeModule } from './modules/income/income.module';
import { BillsModule } from './modules/bills/bills.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { ScoresModule } from './modules/scores/scores.module';
import { LoansModule } from './modules/loans/loans.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { SharedModule } from './shared/shared.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AdminModule } from './modules/admin/admin.module';
import { JobsModule } from './jobs/jobs.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProd = config.get('NODE_ENV') === 'production';
        const databaseUrl = config.get<string>('DATABASE_URL');
        // Production uses DATABASE_URL (Supabase pooled connection string).
        // Local dev falls back to individual POSTGRES_* vars from Docker Compose.
        const base = databaseUrl
          ? { url: databaseUrl }
          : {
              host:     config.get<string>('POSTGRES_HOST') ?? 'localhost',
              port:     config.get<number>('POSTGRES_PORT') ?? 5432,
              username: config.get<string>('POSTGRES_USER') ?? 'creditmap',
              password: config.getOrThrow<string>('POSTGRES_PASSWORD'),
              database: config.get<string>('POSTGRES_DB') ?? 'creditmap_dev',
            };
        return {
          type: 'postgres' as const,
          ...base,
          entities:    [__dirname + '/**/*.entity{.ts,.js}'],
          migrations:  [__dirname + '/migrations/*{.ts,.js}'],
          synchronize: true,
          logging:     !isProd,
          ssl: isProd ? { rejectUnauthorized: false } : false,
        };
      },
    }),

    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const tls = config.get<string>('REDIS_TLS') === 'true';
        return {
          redis: {
            host:     config.get<string>('REDIS_HOST') ?? 'localhost',
            port:     config.get<number>('REDIS_PORT') ?? 6379,
            password: config.get<string>('REDIS_PASSWORD'),
            tls:      tls ? {} : undefined,
          },
        };
      },
    }),

    RedisModule,
    UsersModule,
    AuthModule,
    ProfileModule,
    JobsModule,
    IncomeModule,
    BillsModule,
    TransactionsModule,
    ScoresModule,
    SharedModule,
    NotificationsModule,
    AdminModule,
    LoansModule,
    DocumentsModule,
  ],
  imports: [
    TypeOrmModule.forFeature([User]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
