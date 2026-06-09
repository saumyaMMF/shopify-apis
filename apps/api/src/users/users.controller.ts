import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @Get() @RequirePermissions('user.manage')
  list() { return this.users.list(); }

  @Post() @RequirePermissions('user.manage')
  create(@Body() dto: any) { return this.users.create(dto); }

  @Patch(':id/role') @RequirePermissions('role.manage')
  assignRole(@Param('id') id: string, @Body() body: { roleId: string }) {
    return this.users.assignRole(id, body.roleId);
  }

  @Patch(':id/active') @RequirePermissions('user.manage')
  setActive(@Param('id') id: string, @Body() body: { isActive: boolean }) {
    return this.users.setActive(id, body.isActive);
  }
}
