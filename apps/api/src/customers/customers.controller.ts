import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions';

@ApiTags('customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('customers')
export class CustomersController {
  constructor(private svc: CustomersService) {}

  @Get() @RequirePermissions('customer.read')
  list(@Query() q: any) {
    return this.svc.list({ take: q.take ? Number(q.take) : 25, cursor: q.cursor, q: q.q });
  }

  @Get(':id') @RequirePermissions('customer.read')
  get(@Param('id') id: string) { return this.svc.findById(id); }

  @Patch(':id/tags') @RequirePermissions('customer.update')
  setTags(@Param('id') id: string, @Body() body: { tags: string[] }) {
    return this.svc.setTags(id, body.tags);
  }

  @Get('/segments/list') @RequirePermissions('segment.manage')
  segments() { return this.svc.segments(); }

  @Post('/segments') @RequirePermissions('segment.manage')
  createSegment(@Body() body: { name: string; rules: any }) {
    return this.svc.createSegment(body.name, body.rules);
  }
}
