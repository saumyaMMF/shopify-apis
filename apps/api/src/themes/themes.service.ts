import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ShopService } from '../shopify/shop.service';
import { AdminGraphQLService } from '../shopify/admin-graphql.service';

const THEMES_QUERY = `
  query Themes {
    themes(first: 50) {
      edges {
        node {
          id
          name
          role
          processing
          createdAt
          updatedAt
        }
      }
    }
  }
`;

@Injectable()
export class ThemesService {
  constructor(
    private cfg: ConfigService,
    private shops: ShopService,
    private gql: AdminGraphQLService,
  ) {}

  async list() {
    // GraphQL Admin themes (works on 2025-01+)
    try {
      const data: any = await this.gql.request(THEMES_QUERY);
      return data.themes.edges.map((e: any) => e.node);
    } catch {
      // Fallback to REST if GQL field missing
      return this.listViaRest();
    }
  }

  async listViaRest() {
    const shop = await this.shops.getActive();
    const ver = this.cfg.get<string>('SHOPIFY_API_VERSION') ?? '2025-01';
    const res = await fetch(`https://${shop.domain}/admin/api/${ver}/themes.json`, {
      headers: { 'X-Shopify-Access-Token': shop.accessToken },
    });
    const json: any = await res.json();
    return json.themes ?? [];
  }

  // List asset keys (templates, sections, snippets, config) for a theme
  async listAssets(themeId: string | number) {
    const shop = await this.shops.getActive();
    const ver = this.cfg.get<string>('SHOPIFY_API_VERSION') ?? '2025-01';
    const id = String(themeId).replace(/\D/g, ''); // strip gid prefix if any
    const res = await fetch(`https://${shop.domain}/admin/api/${ver}/themes/${id}/assets.json`, {
      headers: { 'X-Shopify-Access-Token': shop.accessToken },
    });
    const json: any = await res.json();
    return json.assets ?? [];
  }

  // Fetch a single asset (e.g. config/settings_data.json)
  async getAsset(themeId: string | number, key: string) {
    const shop = await this.shops.getActive();
    const ver = this.cfg.get<string>('SHOPIFY_API_VERSION') ?? '2025-01';
    const id = String(themeId).replace(/\D/g, '');
    const res = await fetch(
      `https://${shop.domain}/admin/api/${ver}/themes/${id}/assets.json?asset[key]=${encodeURIComponent(key)}`,
      { headers: { 'X-Shopify-Access-Token': shop.accessToken } },
    );
    const json: any = await res.json();
    return json.asset ?? null;
  }

  // Returns the published theme id (role=MAIN/main)
  async getPublished() {
    const themes = await this.list();
    return themes.find((t: any) => (t.role ?? '').toLowerCase() === 'main') ?? themes[0];
  }
}
