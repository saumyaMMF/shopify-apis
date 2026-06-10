import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ShopService {
  private log = new Logger('ShopService');
  constructor(private prisma: PrismaService, private cfg: ConfigService) {}

  // Get the active shop. Falls back to .env SHOP_DOMAIN/SHOP_TOKEN if no DB row.
  async getActive(): Promise<{ domain: string; accessToken: string; refreshToken?: string | null }> {
    const shop = await this.prisma.shop.findFirst({
      where: { isActive: true, uninstalledAt: null },
      orderBy: { updatedAt: 'desc' },
    });
    if (shop) {
      return { domain: shop.domain, accessToken: shop.accessToken, refreshToken: shop.refreshToken };
    }
    // Fallback to env
    return {
      domain: this.cfg.get<string>('SHOP_DOMAIN')!,
      accessToken: this.cfg.get<string>('SHOP_TOKEN')!,
    };
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
