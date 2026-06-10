import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import pRetry from 'p-retry';
import { ShopService } from './shop.service';

@Injectable()
export class AdminGraphQLService {
  private log = new Logger('AdminGQL');
  constructor(private cfg: ConfigService, private shops: ShopService) {}

  async request<T = any>(query: string, variables?: Record<string, unknown>): Promise<T> {
    let shop = await this.shops.getActive();
    const url = () => `https://${shop.domain}/admin/api/${this.cfg.get('SHOPIFY_API_VERSION') ?? '2025-01'}/graphql.json`;
    let refreshedOnce = false;
    const run = async () => {
      const res = await fetch(url(), {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': shop.accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, variables }),
      });
      if (res.status === 401 && !refreshedOnce && shop.refreshToken) {
        refreshedOnce = true;
        this.log.warn(`401 from Shopify — refreshing token for ${shop.domain}`);
        await this.shops.refreshAccessToken(shop.domain, shop.refreshToken);
        shop = await this.shops.getActive();
        throw new Error('TOKEN_REFRESHED_RETRY');
      }
      if (res.status === 429) throw new Error('THROTTLED');
      const json: any = await res.json();
      if (!res.ok) {
        throw new Error(`Shopify HTTP ${res.status}: ${JSON.stringify(json).slice(0, 500)}`);
      }
      if (json.errors) {
        const errs = Array.isArray(json.errors) ? json.errors : [json.errors];
        const throttled = errs.find((e: any) => e?.extensions?.code === 'THROTTLED');
        if (throttled) throw new Error('THROTTLED');
        throw new Error(JSON.stringify(errs));
      }
      return json.data as T;
    };
    return pRetry(run, {
      retries: 5, factor: 2, minTimeout: 500,
      onFailedAttempt: (e) => this.log.warn(`retry ${e.attemptNumber}: ${e.message}`),
    });
  }
}
