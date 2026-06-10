import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions';
import { CurrentUser } from '../common/decorators/current-user';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('orders')
export class OrdersController {
  constructor(private orders: OrdersService) {}

  @Get() @RequirePermissions('order.read')
  list(@Query() q: any) {
    return this.orders.list({ take: q.take ? Number(q.take) : 25, cursor: q.cursor, status: q.status, q: q.q });
  }

  @Get(':id') @RequirePermissions('order.read')
  get(@Param('id') id: string) { return this.orders.findById(id); }

  @Post(':id/fulfill') @RequirePermissions('order.fulfill')
  fulfill(@Param('id') gid: string, @Body() body: any) {
    return this.orders.createFulfillment({ orderShopifyGid: gid, ...body });
  }

  @Post(':id/refund') @RequirePermissions('order.refund')
  refund(@Param('id') gid: string, @Body() body: any, @CurrentUser('sub') userId: string) {
    return this.orders.refund({ orderShopifyGid: gid, userId, ...body });
  }
}
