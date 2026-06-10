import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ShopService } from '../shopify/shop.service';

export interface PageDto {
  title: string;
  body_html?: string;
  handle?: string;
  template_suffix?: string;
  author?: string;
  published?: boolean;
  metafields?: any[];
}

@Injectable()
export class PagesService {
  constructor(private cfg: ConfigService, private shops: ShopService) {}

  private async restCall(method: string, path: string, body?: any) {
    const shop = await this.shops.getActive();
    const ver = this.cfg.get<string>('SHOPIFY_API_VERSION') ?? '2025-01';
    const url = `https://${shop.domain}/admin/api/${ver}/${path}`;
    const res = await fetch(url, {
      method,
      headers: {
        'X-Shopify-Access-Token': shop.accessToken,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch {}
    if (!res.ok) throw new Error(`Shopify ${method} ${path} HTTP ${res.status}: ${text.slice(0, 300)}`);
    return json;
  }

  async list(opts: { limit?: number; published_status?: string } = {}) {
    const params = new URLSearchParams();
    params.set('limit', String(opts.limit ?? 50));
    if (opts.published_status) params.set('published_status', opts.published_status);
    const data = await this.restCall('GET', `pages.json?${params.toString()}`);
    return data.pages ?? [];
  }

  async get(id: string | number) {
    const data = await this.restCall('GET', `pages/${id}.json`);
    return data.page;
  }

  async create(dto: PageDto) {
    const data = await this.restCall('POST', 'pages.json', { page: dto });
    return data.page;
  }

  async update(id: string | number, dto: Partial<PageDto>) {
    const data = await this.restCall('PUT', `pages/${id}.json`, { page: { id: Number(id), ...dto } });
    return data.page;
  }

  async delete(id: string | number) {
    await this.restCall('DELETE', `pages/${id}.json`);
    return { deleted: id };
  }
}
