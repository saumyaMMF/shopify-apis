import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BannersService } from './banners.service';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions';

@ApiTags('themes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('banners')
export class BannersController {
  constructor(private banners: BannersService) {}

  // All banner blocks parsed from published theme's settings_data.json
  @Get('from-theme') @RequirePermissions('cms.read')
  fromTheme(@Query('template') template?: string) {
    return this.banners.fromTheme(template ?? 'index');
  }

  // Banners stored as Shopify Metaobjects
  @Get('from-metaobjects') @RequirePermissions('cms.read')
  fromMetaobjects(@Query('type') type?: string) {
    return this.banners.fromMetaobjects(type ?? 'banner');
  }
}
