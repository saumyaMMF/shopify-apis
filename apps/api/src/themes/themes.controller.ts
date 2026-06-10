import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ThemesService } from './themes.service';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions';

@ApiTags('themes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('themes')
export class ThemesController {
  constructor(private themes: ThemesService) {}

  @Get() @RequirePermissions('cms.read')
  list() { return this.themes.list(); }

  @Get('published') @RequirePermissions('cms.read')
  published() { return this.themes.getPublished(); }

  @Get(':id/assets') @RequirePermissions('cms.read')
  assets(@Param('id') id: string) { return this.themes.listAssets(id); }

  @Get(':id/asset') @RequirePermissions('cms.read')
  asset(@Param('id') id: string, @Query('key') key: string) {
    return this.themes.getAsset(id, key);
  }
}
