import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import pRetry from 'p-retry';

@Injectable()
export class AdminGraphQLService {
  private log = new Logger('AdminGQL');
  constructor(private cfg: ConfigService) {}

  async request<T = any>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const url = `https://${this.cfg.get('SHOP_DOMAIN')}/admin/api/${this.cfg.get('SHOPIFY_API_VERSION') ?? '2025-01'}/graphql.json`;
    const run = async () => {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': this.cfg.get('SHOP_TOKEN')!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, variables }),
      });
      if (res.status === 429) throw new Error('THROTTLED');
      const json = await res.json();
      if (json.errors) {
        const throttled = json.errors.find((e: any) => e?.extensions?.code === 'THROTTLED');
        if (throttled) throw new Error('THROTTLED');
        throw new Error(JSON.stringify(json.errors));
      }
      return json.data as T;
    };
    return pRetry(run, {
      retries: 5, factor: 2, minTimeout: 500,
      onFailedAttempt: (e) => this.log.warn(`retry ${e.attemptNumber}: ${e.message}`),
    });
  }
}
