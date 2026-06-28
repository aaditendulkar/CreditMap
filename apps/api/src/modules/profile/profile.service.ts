import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { UserProfile } from './entities/user-profile.entity';
import type { UpsertProfileDto } from './dto/upsert-profile.dto';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(UserProfile)
    private readonly profileRepo: Repository<UserProfile>,
  ) {}

  async findOrCreate(userId: string): Promise<UserProfile> {
    const existing = await this.profileRepo.findOne({ where: { userId } });
    if (existing) return existing;

    const profile = this.profileRepo.create({ userId });
    return this.profileRepo.save(profile);
  }

  async upsert(userId: string, dto: UpsertProfileDto): Promise<UserProfile> {
    const existing = await this.profileRepo.findOne({ where: { userId } });

    if (existing) {
      // Only copy keys that were explicitly provided (skip undefined)
      const updates = Object.fromEntries(
        Object.entries(dto).filter(([, v]) => v !== undefined),
      ) as Partial<UserProfile>;
      Object.assign(existing, updates);
      return this.profileRepo.save(existing);
    }

    const profile = this.profileRepo.create({ userId, ...dto });
    return this.profileRepo.save(profile);
  }

  async completeOnboarding(userId: string): Promise<UserProfile> {
    const profile = await this.profileRepo.findOne({ where: { userId } });
    if (!profile) throw new NotFoundException('Profile not found');

    const missing: string[] = [];
    if (!profile.state) missing.push('state');
    if (!profile.occupation) missing.push('occupation');
    if (profile.monthlyIncomeStated === null) missing.push('monthlyIncomeStated');

    if (missing.length > 0) {
      throw new BadRequestException(
        `Cannot complete onboarding. Missing required fields: ${missing.join(', ')}`,
      );
    }

    profile.onboardingComplete = true;
    return this.profileRepo.save(profile);
  }
}
