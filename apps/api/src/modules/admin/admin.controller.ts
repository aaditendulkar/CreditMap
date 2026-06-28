import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminOnly } from '../auth/decorators/admin-only.decorator';
import { GetAdminUsersDto } from './dto/get-admin-users.dto';
import { VerifyDocumentDto } from './dto/verify-document.dto';

@ApiTags('admin')
@AdminOnly()
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Platform-wide statistics (admin only)' })
  getStats() {
    return this.adminService.getStats();
  }

  @Get('users')
  @ApiOperation({ summary: 'Paginated user list with search and filters (admin only)' })
  getUsers(@Query() query: GetAdminUsersDto) {
    return this.adminService.getUsers(query);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Full user detail view (admin only)' })
  getUserDetail(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getUserDetail(id);
  }

  @Patch('users/:id/verify-document')
  @ApiOperation({ summary: 'Mark a document as verified (admin only)' })
  verifyDocument(
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() body: VerifyDocumentDto,
  ) {
    return this.adminService.verifyDocument(userId, body.documentId);
  }
}
