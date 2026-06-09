import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions';
import { CurrentUser } from '../common/decorators/current-user';

@ApiTags('settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('settings')
export class SettingsController {
  constructor(private svc: SettingsService) {}

  @Get() @RequirePermissions('settings.update')
  all() { return this.svc.all(); }

  @Get(':key') @RequirePermissions('settings.update')
  get(@Param('key') key: string) { return this.svc.get(key); }

  @Put(':key') @RequirePermissions('settings.update')
  set(@Param('key') key: string, @Body() body: { value: any }, @CurrentUser('sub') userId: string) {
    return this.svc.set(key, body.value, userId);
  }
}
