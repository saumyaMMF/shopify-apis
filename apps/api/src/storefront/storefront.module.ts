import { Module } from '@nestjs/common';
import { ShopifyModule } from '../shopify/shopify.module';
import { StorefrontController } from './storefront.controller';
import { StorefrontApiService } from './storefront.service';

@Module({
  imports: [ShopifyModule],
  controllers: [StorefrontController],
  providers: [StorefrontApiService],
  exports: [StorefrontApiService],
})
export class StorefrontModule {}
