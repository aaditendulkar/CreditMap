import { UseGuards, applyDecorators } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { RolesGuard } from '../guards/roles.guard';

export const AdminOnly = () => applyDecorators(
  ApiBearerAuth(),
  UseGuards(RolesGuard),
);
