import { Controller, Get, Put, Post, Body } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { UpsertProfileDto } from './dto/upsert-profile.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('me')
  getMyProfile(@CurrentUser() user: JwtPayload) {
    return this.profileService.findOrCreate(user.sub);
  }

  @Put('me')
  updateMyProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpsertProfileDto,
  ) {
    return this.profileService.upsert(user.sub, dto);
  }

  @Post('me/complete')
  completeOnboarding(@CurrentUser() user: JwtPayload) {
    return this.profileService.completeOnboarding(user.sub);
  }
}
