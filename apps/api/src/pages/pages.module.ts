import { Module } from '@nestjs/common';
import { PagesController } from './pages.controller';
import { PagesService } from './pages.service';
import { PoliciesController } from './policies.controller';
import { PoliciesService } from './policies.service';
import { ShopifyModule } from '../shopify/shopify.module';

@Module({
  imports: [ShopifyModule],
  controllers: [PagesController, PoliciesController],
  providers: [PagesService, PoliciesService],
})
export class PagesModule {}
