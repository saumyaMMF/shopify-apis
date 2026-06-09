import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ProductsService, CreateProductDto } from './products.service';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions';

@ApiTags('catalog')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('products')
export class ProductsController {
  constructor(private products: ProductsService) {}

  @Get()
  @RequirePermissions('product.read')
  list(@Query() q: any) {
    return this.products.list({
      skip: Number(q.skip ?? 0), take: Number(q.take ?? 25),
      q: q.q, status: q.status,
    });
  }

  @Get(':id')
  @RequirePermissions('product.read')
  get(@Param('id') id: string) { return this.products.findById(id); }

  @Post()
  @RequirePermissions('product.create')
  create(@Body() dto: CreateProductDto) { return this.products.create(dto); }

  @Patch(':shopifyGid')
  @RequirePermissions('product.update')
  update(@Param('shopifyGid') gid: string, @Body() dto: Partial<CreateProductDto>) {
    return this.products.update(gid, dto);
  }

  @Delete(':shopifyGid')
  @RequirePermissions('product.delete')
  remove(@Param('shopifyGid') gid: string) { return this.products.delete(gid); }
}
