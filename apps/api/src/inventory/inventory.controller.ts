import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions';
import { CurrentUser } from '../common/decorators/current-user';

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private inv: InventoryService) {}

  @Get('levels') @RequirePermissions('inventory.read')
  levels(@Query('locationId') locationId?: string) { return this.inv.levels(locationId); }

  @Post('adjust') @RequirePermissions('inventory.adjust')
  adjust(
    @CurrentUser('sub') userId: string,
    @Body() body: { inventoryItemId: string; locationId: string; delta: number; reason: string; reference?: string },
  ) {
    return this.inv.adjust({ ...body, userId });
  }

  @Get('alerts') @RequirePermissions('inventory.read')
  alerts() { return this.inv.alerts(); }
}
