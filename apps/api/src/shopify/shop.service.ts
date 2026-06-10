import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

const REFRESH_BEFORE_MS = 5 * 60 * 1000; // refresh if expiring within 5 min

@Injectable()
export class ShopService {
  private log = new Logger('ShopService');
  constructor(private prisma: PrismaService, private cfg: ConfigService) {}

  // Get the active shop. Refreshes token if near expiry. Falls back to .env if no DB row.
  async getActive(): Promise<{ domain: string; accessToken: string; refreshToken?: string | null }> {
    const shop = await this.prisma.shop.findFirst({
      where: { isActive: true, uninstalledAt: null },
      orderBy: { updatedAt: 'desc' },
    });
    if (!shop) {
      return {
        domain: this.cfg.get<string>('SHOP_DOMAIN')!,
        accessToken: this.cfg.get<string>('SHOP_TOKEN')!,
      };
    }

    // Auto-refresh if expiring soon
    if (shop.expiresAt && shop.refreshToken && shop.expiresAt.getTime() - Date.now() < REFRESH_BEFORE_MS) {
      this.log.log(`Token for ${shop.domain} expiring soon — refreshing`);
      try {
        const refreshed = await this.refreshAccessToken(shop.domain, shop.refreshToken);
        return { domain: refreshed.domain, accessToken: refreshed.accessToken, refreshToken: refreshed.refreshToken };
      } catch (e: any) {
        this.log.error(`Refresh failed for ${shop.domain}: ${e.message}`);
        // Fall through with current (about-to-expire) token
      }
    }
    return { domain: shop.domain, accessToken: shop.accessToken, refreshToken: shop.refreshToken };
  }

  async refreshAccessToken(domain: string, refreshToken: string) {
    const clientId = this.cfg.get<string>('SHOPIFY_CLIENT_ID');
    const clientSecret = this.cfg.get<string>('SHOPIFY_API_SECRET');
    if (!clientId || !clientSecret) {
      throw new Error('SHOPIFY_CLIENT_ID and SHOPIFY_API_SECRET required for refresh');
    }
    const res = await fetch(`https://${domain}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });
    const json: any = await res.json();
    if (!res.ok || !json.access_token) {
      throw new Error(`Refresh HTTP ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
    }
    const expiresAt = json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : null;
    const refreshExpiresAt = json.refresh_token_expires_in
      ? new Date(Date.now() + json.refresh_token_expires_in * 1000)
      : null;
    const updated = await this.prisma.shop.update({
      where: { domain },
      data: {
        accessToken: json.access_token,
        refreshToken: json.refresh_token ?? refreshToken,
        scope: json.scope,
        expiresAt,
        refreshExpiresAt,
      },
    });
    this.log.log(`Refreshed token for ${domain} — new expiresAt=${expiresAt?.toISOString()}`);
    return { domain: updated.domain, accessToken: updated.accessToken, refreshToken: updated.refreshToken };
  }

  async forceRefreshAll() {
    const shops = await this.prisma.shop.findMany({
      where: { isActive: true, uninstalledAt: null, refreshToken: { not: null } },
    });
    const results: Array<{ domain: string; ok: boolean; error?: string }> = [];
    for (const s of shops) {
      try {
        await this.refreshAccessToken(s.domain, s.refreshToken!);
        results.push({ domain: s.domain, ok: true });
      } catch (e: any) {
        results.push({ domain: s.domain, ok: false, error: e.message });
      }
    }
    return results;
  }

  async upsertFromOAuth(input: {
    domain: string;
    name?: string;
    accessToken: string;
    refreshToken?: string;
    scope?: string;
    expiresIn?: number;
    refreshExpiresIn?: number;
  }) {
    const expiresAt = input.expiresIn ? new Date(Date.now() + input.expiresIn * 1000) : null;
    const refreshExpiresAt = input.refreshExpiresIn ? new Date(Date.now() + input.refreshExpiresIn * 1000) : null;
    return this.prisma.shop.upsert({
      where: { domain: input.domain },
      update: {
        accessToken: input.accessToken,
        refreshToken: input.refreshToken,
        scope: input.scope,
        expiresAt,
        refreshExpiresAt,
        isActive: true,
        uninstalledAt: null,
      },
      create: {
        domain: input.domain,
        name: input.name,
        accessToken: input.accessToken,
        refreshToken: input.refreshToken,
        scope: input.scope,
        expiresAt,
        refreshExpiresAt,
      },
    });
  }

  async markUninstalled(domain: string) {
    await this.prisma.shop.update({
      where: { domain },
      data: { isActive: false, uninstalledAt: new Date() },
    });
  }

  list() { return this.prisma.shop.findMany({ orderBy: { updatedAt: 'desc' } }); }
}
