import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PoliciesService } from './policies.service';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions';

@ApiTags('pages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('policies')
export class PoliciesController {
  constructor(private policies: PoliciesService) {}

  @Get() @RequirePermissions('cms.read')
  list() { return this.policies.list(); }

  @Put(':type') @RequirePermissions('cms.publish')
  update(@Param('type') type: string, @Body() body: { body: string }) {
    return this.policies.update(type.toUpperCase(), body.body);
  }
}
