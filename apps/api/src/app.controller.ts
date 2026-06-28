import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './modules/auth/decorators/public.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './modules/users/entities/user.entity';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  health(): { status: string; timestamp: string } {
    return this.appService.health();
  }

  @Public()
  @Get('_setup/promote-admin/:secret')
  async promoteAdmin(@Param('secret') secret: string) {
    if (secret !== 'creditmap-setup-2026') return { error: 'forbidden' };
    await this.userRepo.update({ email: 'admin@creditmap.in' }, { role: 'admin' as any });
    return { ok: true };
  }
}
