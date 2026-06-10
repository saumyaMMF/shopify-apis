import { Module } from '@nestjs/common';
import { CustomerAccountClient } from './customer-account.client';
import { CustomerAccountService } from './customer-account.service';
import { CustomerAccountController } from './customer-account.controller';
import { ShopifyModule } from '../shopify/shopify.module';

@Module({
  imports: [ShopifyModule],
  controllers: [CustomerAccountController],
  providers: [CustomerAccountClient, CustomerAccountService],
  exports: [CustomerAccountService],
})
export class CustomerAccountModule {}
