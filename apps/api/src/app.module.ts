import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ShopifyModule } from './shopify/shopify.module';
import { CatalogModule } from './catalog/catalog.module';
import { InventoryModule } from './inventory/inventory.module';
import { OrdersModule } from './orders/orders.module';
import { CustomersModule } from './customers/customers.module';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';
import { CmsModule } from './cms/cms.module';
import { MediaModule } from './media/media.module';
import { ReportsModule } from './reports/reports.module';
import { SettingsModule } from './settings/settings.module';
import { AuditModule } from './audit/audit.module';
import { ThemesModule } from './themes/themes.module';
import { PagesModule } from './pages/pages.module';
import { StorefrontModule } from './storefront/storefront.module';
import { CustomerAccountModule } from './customer-account/customer-account.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    BullModule.forRoot({
      connection: { url: process.env.REDIS_URL ?? 'redis://localhost:6379' },
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ShopifyModule,
    CatalogModule,
    InventoryModule,
    OrdersModule,
    CustomersModule,
    PurchaseOrdersModule,
    CmsModule,
    MediaModule,
    ReportsModule,
    SettingsModule,
    AuditModule,
    ThemesModule,
    PagesModule,
    StorefrontModule,
    CustomerAccountModule,
  ],
})
export class AppModule {}
