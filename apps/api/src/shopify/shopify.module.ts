import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AdminGraphQLService } from './admin-graphql.service';
import { StorefrontService } from './storefront.service';
import { WebhookController } from './webhook.controller';
import { WebhookProcessor } from './webhook.processor';
import { SyncService } from './sync.service';
import { ShopService } from './shop.service';
import { OAuthController } from './oauth.controller';
import { TokenRefreshCron } from './token-refresh.cron';

@Module({
  imports: [BullModule.registerQueue({ name: 'webhook' }, { name: 'sync' })],
  controllers: [WebhookController, OAuthController],
  providers: [AdminGraphQLService, StorefrontService, WebhookProcessor, SyncService, ShopService, TokenRefreshCron],
  exports: [AdminGraphQLService, StorefrontService, SyncService, ShopService],
})
export class ShopifyModule {}
