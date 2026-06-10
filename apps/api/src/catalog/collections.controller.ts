import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CollectionsService, CollectionDto } from './collections.service';
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

  @Post() @RequirePermissions('collection.manage')
  create(@Body() dto: CollectionDto) { return this.svc.create(dto); }

  @Patch(':gid') @RequirePermissions('collection.manage')
  update(@Param('gid') gid: string, @Body() dto: Partial<CollectionDto>) {
    return this.svc.update(gid, dto);
  }

  @Delete(':gid') @RequirePermissions('collection.manage')
  remove(@Param('gid') gid: string) { return this.svc.delete(gid); }
}
