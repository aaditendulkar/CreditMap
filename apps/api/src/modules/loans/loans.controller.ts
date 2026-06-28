import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { LoansService } from './loans.service';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('loans')
@Controller('loans')
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Get('offers')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get loan offers matched to the current user score' })
  async getMyOffers(@CurrentUser() user: JwtPayload) {
    return this.loansService.getOffersForUser(user.sub);
  }

  @Get('products')
  @Public()
  @ApiOperation({ summary: 'Browse all active loan products — no auth required' })
  async getAllProducts() {
    return this.loansService.getAllProducts();
  }
}
