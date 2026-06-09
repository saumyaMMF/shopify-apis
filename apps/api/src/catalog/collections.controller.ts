import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CollectionsService } from './collections.service';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions';

@ApiTags('catalog')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('collections')
export class CollectionsController {
  constructor(private svc: CollectionsService) {}

  @Get() @RequirePermissions('product.read')
  list() { return this.svc.list(); }

  @Get(':id') @RequirePermissions('product.read')
  get(@Param('id') id: string) { return this.svc.findById(id); }
}
