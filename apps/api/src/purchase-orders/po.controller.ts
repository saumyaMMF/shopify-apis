import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { POService, CreatePODto, ReceiveDto } from './po.service';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions';
import { CurrentUser } from '../common/decorators/current-user';

@ApiTags('purchase-orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('purchase-orders')
export class POController {
  constructor(private po: POService) {}

  @Get() @RequirePermissions('po.read')
  list(@Query() q: any) {
    return this.po.list({ skip: Number(q.skip ?? 0), take: Number(q.take ?? 25), status: q.status });
  }

  @Get(':id') @RequirePermissions('po.read')
  get(@Param('id') id: string) { return this.po.findById(id); }

  @Post() @RequirePermissions('po.create')
  create(@CurrentUser('sub') userId: string, @Body() dto: CreatePODto) {
    return this.po.create(userId, dto);
  }

  @Patch(':id/submit') @RequirePermissions('po.create')
  submit(@Param('id') id: string) { return this.po.submit(id); }

  @Patch(':id/approve') @RequirePermissions('po.approve')
  approve(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.po.approve(id, userId);
  }

  @Patch(':id/cancel') @RequirePermissions('po.approve')
  cancel(@Param('id') id: string) { return this.po.cancel(id); }

  @Post(':id/receive') @RequirePermissions('po.receive')
  receive(@Param('id') id: string, @CurrentUser('sub') userId: string, @Body() dto: ReceiveDto) {
    return this.po.receive(id, userId, dto);
  }
}
