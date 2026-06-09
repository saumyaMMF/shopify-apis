import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GoodsReceiptsService } from './goods-receipts.service';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions';

@ApiTags('purchase-orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('goods-receipts')
export class GoodsReceiptsController {
  constructor(private gr: GoodsReceiptsService) {}

  @Get() @RequirePermissions('po.read')
  list() { return this.gr.list(); }

  @Get(':id') @RequirePermissions('po.read')
  get(@Param('id') id: string) { return this.gr.findById(id); }
}
