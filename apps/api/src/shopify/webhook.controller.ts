import { BadRequestException, Controller, Headers, HttpCode, Param, Post, Req } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Controller('webhooks/shopify')
export class WebhookController {
  constructor(
    @InjectQueue('webhook') private q: Queue,
    private cfg: ConfigService,
  ) {}

  // Shopify topic delimited by slash → route param uses dash, mapped back
  @Post(':topic')
  @HttpCode(200)
  async handle(
    @Param('topic') topicSlug: string,
    @Headers('x-shopify-hmac-sha256') hmac: string,
    @Headers('x-shopify-shop-domain') shop: string,
    @Req() req: any,
  ) {
    const raw: Buffer = req.rawBody;
    const secret = this.cfg.get<string>('SHOPIFY_API_SECRET')!;
    const computed = crypto.createHmac('sha256', secret).update(raw).digest('base64');
    if (computed !== hmac) throw new BadRequestException('Invalid HMAC');

    const topic = topicSlug.replace('-', '/');
    await this.q.add(topic, { topic, shop, body: JSON.parse(raw.toString()) }, {
      attempts: 8,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
    return { ok: true };
  }
}
