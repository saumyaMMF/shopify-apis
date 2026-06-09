import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CmsService } from './cms.service';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions';
import { CurrentUser } from '../common/decorators/current-user';

@ApiTags('cms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('cms')
export class CmsController {
  constructor(private cms: CmsService) {}

  @Get() @RequirePermissions('cms.read')
  list(@Query('type') type?: string) { return this.cms.list(type); }

  @Get(':id') @RequirePermissions('cms.read')
  get(@Param('id') id: string) { return this.cms.findById(id); }

  @Post() @RequirePermissions('cms.publish')
  upsert(@Body() body: any, @CurrentUser('sub') userId: string) {
    return this.cms.upsert({ ...body, userId });
  }

  @Patch(':id/publish') @RequirePermissions('cms.publish')
  publish(@Param('id') id: string) { return this.cms.publish(id); }
}
