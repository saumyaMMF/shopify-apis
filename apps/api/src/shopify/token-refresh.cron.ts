import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ShopService } from './shop.service';

@Injectable()
export class TokenRefreshCron {
  private log = new Logger('TokenRefreshCron');
  constructor(private prisma: PrismaService, private shops: ShopService) {}

  // Every 5 minutes, check shops near expiry and refresh
  @Cron(CronExpression.EVERY_5_MINUTES)
  async tick() {
    const soon = new Date(Date.now() + 10 * 60 * 1000); // 10 min ahead
    const due = await this.prisma.shop.findMany({
      where: {
        isActive: true,
        uninstalledAt: null,
        refreshToken: { not: null },
        expiresAt: { not: null, lte: soon },
      },
    });
    if (!due.length) return;
    this.log.log(`Refreshing ${due.length} shop token(s)`);
    for (const s of due) {
      try {
        await this.shops.refreshAccessToken(s.domain, s.refreshToken!);
      } catch (e: any) {
        this.log.error(`Refresh ${s.domain}: ${e.message}`);
      }
    }
  }
}
