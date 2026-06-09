import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('reports')
export class ReportsController {
  constructor(private reports: ReportsService) {}

  @Get('sales') @RequirePermissions('reports.view')
  sales(@Query('since') since = '-30d', @Query('until') until = 'today') {
    return this.reports.sales(since, until);
  }

  @Get('inventory') @RequirePermissions('reports.view')
  inventory() { return this.reports.inventoryByLocation(); }

  @Get('vendors') @RequirePermissions('reports.view')
  vendors() { return this.reports.vendorSpend(); }
}
