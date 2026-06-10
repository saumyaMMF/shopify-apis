import { BadRequestException, Body, Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { ShopService } from './shop.service';

@Controller('shopify')
export class OAuthController {
  constructor(private cfg: ConfigService, private shops: ShopService) {}

  // Step 1: redirect merchant to Shopify authorize page
  @Get('install')
  install(@Query('shop') shop: string, @Res() res: Response) {
    if (!shop || !/^[a-z0-9-]+\.myshopify\.com$/.test(shop)) {
      throw new BadRequestException('Pass ?shop=<name>.myshopify.com');
    }
    const clientId = this.cfg.get<string>('SHOPIFY_CLIENT_ID');
    const scopes = this.cfg.get<string>('SHOPIFY_SCOPES') ?? 'read_products,write_products,read_orders,write_orders,read_customers,write_customers,read_inventory,write_inventory,read_metaobjects,write_metaobjects,read_files,write_files';
    const redirectUri = `${this.cfg.get<string>('API_URL') ?? 'http://localhost:4000'}/api/shopify/callback`;
    const nonce = crypto.randomBytes(16).toString('hex');
    const url = `https://${shop}/admin/oauth/authorize?client_id=${clientId}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${nonce}`;
    res.cookie('oauth_state', nonce, { httpOnly: true, maxAge: 5 * 60 * 1000 });
    return res.redirect(url);
  }

  // Step 2: Shopify redirects here with ?code=...&shop=...&hmac=...&state=...
  @Get('callback')
  async callback(
    @Req() req: Request,
    @Res() res: Response,
    @Query('code') code: string,
    @Query('shop') shop: string,
    @Query('hmac') hmac: string,
    @Query('state') state: string,
  ) {
    if (!code || !shop || !hmac) throw new BadRequestException('Missing OAuth params');
    if (state !== req.cookies?.oauth_state) throw new BadRequestException('State mismatch');

    // HMAC verification
    const secret = this.cfg.get<string>('SHOPIFY_API_SECRET')!;
    const params = { ...req.query };
    delete params.hmac;
    const sorted = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join('&');
    const computed = crypto.createHmac('sha256', secret).update(sorted).digest('hex');
    if (computed !== hmac) throw new BadRequestException('HMAC verification failed');

    // Exchange code for access token
    const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.cfg.get<string>('SHOPIFY_CLIENT_ID'),
        client_secret: secret,
        code,
      }),
    });
    const tokenJson: any = await tokenRes.json();
    if (!tokenRes.ok || !tokenJson.access_token) {
      throw new BadRequestException(`Token exchange failed: ${JSON.stringify(tokenJson)}`);
    }

    await this.shops.upsertFromOAuth({
      domain: shop,
      accessToken: tokenJson.access_token,
      refreshToken: tokenJson.refresh_token,
      scope: tokenJson.scope,
      expiresIn: tokenJson.expires_in,
      refreshExpiresIn: tokenJson.refresh_token_expires_in,
    });

    res.clearCookie('oauth_state');
    return res.redirect(`${this.cfg.get<string>('WEB_URL') ?? 'http://localhost:3000'}/dashboard?installed=${shop}`);
  }

  // Manual: insert/update shop token (dev convenience)
  @Get('shops')
  list() { return this.shops.list(); }

  // Manual upsert — paste token from CLI dev session
  @Post('shops/manual')
  async setManual(@Body() body: { domain: string; accessToken: string; refreshToken?: string }) {
    return this.shops.upsertFromOAuth({
      domain: body.domain,
      accessToken: body.accessToken,
      refreshToken: body.refreshToken,
    });
  }

  // Force refresh all shops (admin trigger; cron also runs every 5 min)
  @Post('shops/refresh')
  refresh() { return this.shops.forceRefreshAll(); }
}
