import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CustomerAccountClient {
  constructor(private cfg: ConfigService) {}

  /**
   * Run a GraphQL op against Customer Account API.
   * Token = customer access token from OAuth (passed by caller via X-Customer-Token header or session).
   */
  async request<T = any>(token: string, query: string, variables?: Record<string, unknown>): Promise<T> {
    if (!token) throw new UnauthorizedException('Missing customer access token');
    const shopId = this.cfg.get<string>('SHOPIFY_SHOP_ID') ?? this.shopIdFromToken(token);
    if (!shopId) throw new BadRequestException('Cannot resolve shop id (set SHOPIFY_SHOP_ID env or use a valid customer token)');
    const version = this.cfg.get<string>('CUSTOMER_ACCOUNT_API_VERSION') ?? 'unstable';
    const url = `https://shopify.com/${shopId}/account/customer/api/${version}/graphql`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        // Customer Account API expects raw token (no Bearer prefix)
        Authorization: token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });
    const json: any = await res.json();
    if (json.errors) throw new BadRequestException(JSON.stringify(json.errors));
    return json.data as T;
  }

  private shopIdFromToken(token: string): string | null {
    try {
      const payload = token.split('.')[1];
      if (!payload) return null;
      const json = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
      return json.shopId ? String(json.shopId) : null;
    } catch {
      return null;
    }
  }
}
