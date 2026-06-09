import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { VendorsService, VendorDto } from './vendors.service';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions';

@ApiTags('purchase-orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('vendors')
export class VendorsController {
  constructor(private vendors: VendorsService) {}

  @Get() @RequirePermissions('vendor.manage')
  list() { return this.vendors.list(); }

  @Get(':id') @RequirePermissions('vendor.manage')
  get(@Param('id') id: string) { return this.vendors.findById(id); }

  @Post() @RequirePermissions('vendor.manage')
  create(@Body() dto: VendorDto) { return this.vendors.create(dto); }

  @Patch(':id') @RequirePermissions('vendor.manage')
  update(@Param('id') id: string, @Body() dto: Partial<VendorDto>) {
    return this.vendors.update(id, dto);
  }

  @Delete(':id') @RequirePermissions('vendor.manage')
  deactivate(@Param('id') id: string) { return this.vendors.deactivate(id); }
}
