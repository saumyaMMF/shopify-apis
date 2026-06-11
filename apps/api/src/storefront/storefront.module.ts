import { Module } from '@nestjs/common';
import { ShopifyModule } from '../shopify/shopify.module';
import { ThemesModule } from '../themes/themes.module';
import { StorefrontController } from './storefront.controller';
import { StorefrontApiService } from './storefront.service';

@Module({
  imports: [ShopifyModule, ThemesModule],
  controllers: [StorefrontController],
  providers: [StorefrontApiService],
  exports: [StorefrontApiService],
})
export class StorefrontModule {}
