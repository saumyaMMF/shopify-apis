import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StorefrontService {
  constructor(private cfg: ConfigService) {}

  async request<T = any>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const url = `https://${this.cfg.get('SHOP_DOMAIN')}/api/${this.cfg.get('SHOPIFY_API_VERSION') ?? '2025-01'}/graphql.json`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Shopify-Storefront-Access-Token': this.cfg.get('STOREFRONT_TOKEN')!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });
    const json: any = await res.json();
    if (json.errors) throw new Error(JSON.stringify(json.errors));
    return json.data as T;
  }
}
