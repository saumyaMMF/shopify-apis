import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PagesService, PageDto } from './pages.service';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions';

@ApiTags('pages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('pages')
export class PagesController {
  constructor(private pages: PagesService) {}

  @Get() @RequirePermissions('cms.read')
  list(@Query() q: any) {
    return this.pages.list({
      limit: q.limit ? Number(q.limit) : undefined,
      published_status: q.published_status,
    });
  }

  @Get(':id') @RequirePermissions('cms.read')
  get(@Param('id') id: string) { return this.pages.get(id); }

  @Post() @RequirePermissions('cms.publish')
  create(@Body() dto: PageDto) { return this.pages.create(dto); }

  @Put(':id') @RequirePermissions('cms.publish')
  update(@Param('id') id: string, @Body() dto: Partial<PageDto>) {
    return this.pages.update(id, dto);
  }

  @Delete(':id') @RequirePermissions('cms.publish')
  remove(@Param('id') id: string) { return this.pages.delete(id); }
}
