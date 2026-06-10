import { Module } from '@nestjs/common';
import { ThemesController } from './themes.controller';
import { ThemesService } from './themes.service';
import { BannersController } from './banners.controller';
import { BannersService } from './banners.service';
import { ShopifyModule } from '../shopify/shopify.module';

@Module({
  imports: [ShopifyModule],
  controllers: [ThemesController, BannersController],
  providers: [ThemesService, BannersService],
})
export class ThemesModule {}
