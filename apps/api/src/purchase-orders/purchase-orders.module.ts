import { Module } from '@nestjs/common';
import { POController } from './po.controller';
import { POService } from './po.service';
import { VendorsController } from './vendors.controller';
import { VendorsService } from './vendors.service';
import { GoodsReceiptsController } from './goods-receipts.controller';
import { GoodsReceiptsService } from './goods-receipts.service';
import { ShopifyModule } from '../shopify/shopify.module';

@Module({
  imports: [ShopifyModule],
  controllers: [POController, VendorsController, GoodsReceiptsController],
  providers: [POService, VendorsService, GoodsReceiptsService],
})
export class PurchaseOrdersModule {}
