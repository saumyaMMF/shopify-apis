import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { CollectionsController } from './collections.controller';
import { CollectionsService } from './collections.service';
import { ShopifyModule } from '../shopify/shopify.module';

@Module({
  imports: [ShopifyModule],
  controllers: [ProductsController, CollectionsController],
  providers: [ProductsService, CollectionsService],
})
export class CatalogModule {}
