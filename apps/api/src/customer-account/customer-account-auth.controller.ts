import { BadRequestException, Controller, Get, Post, Query, Req, Res, UnauthorizedException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';

const COOKIE_VERIFIER = 'sf_pkce_verifier';
const COOKIE_STATE = 'sf_pkce_state';
const COOKIE_REFRESH = 'sf_customer_refresh';
const COOKIE_OPTS = { httpOnly: true, sameSite: 'lax' as const, secure: false, path: '/' };

function base64url(buf: Buffer) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

@ApiTags('storefront-customer-auth')
@Controller('storefront/customer/auth')
export class CustomerAccountAuthController {
  constructor(private cfg: ConfigService) {}

  private get shopId() {
    return this.cfg.get<string>('SHOPIFY_SHOP_ID') ?? '95517901101';
  }
  private get clientId() {
    return this.cfg.get<string>('CUSTOMER_ACCOUNT_CLIENT_ID') ?? '43e3ceb1-09bf-420b-a73e-27068a8009e2';
  }
  private get redirectUri() {
    return (
      this.cfg.get<string>('CUSTOMER_ACCOUNT_REDIRECT_URI') ??
      'http://localhost:4000/api/storefront/customer/auth/callback'
    );
  }
  private get postLoginRedirect() {
    return (
      this.cfg.get<string>('CUSTOMER_ACCOUNT_POST_LOGIN_REDIRECT') ??
      'http://localhost:3000/shop/account'
    );
  }
  private get postLogoutRedirect() {
    return (
      this.cfg.get<string>('CUSTOMER_ACCOUNT_POST_LOGOUT_REDIRECT') ?? 'http://localhost:3000/shop'
    );
  }
  private get authBase() {
    return `https://shopify.com/authentication/${this.shopId}`;
  }

  // ---------- 1. Start OAuth ----------
  @Get('login')
  login(@Res() res: Response) {
    const verifier = base64url(randomBytes(48));
    const challenge = base64url(createHash('sha256').update(verifier).digest());
    const state = base64url(randomBytes(16));
    const nonce = base64url(randomBytes(16));

    res.cookie(COOKIE_VERIFIER, verifier, { ...COOKIE_OPTS, maxAge: 10 * 60 * 1000 });
    res.cookie(COOKIE_STATE, state, { ...COOKIE_OPTS, maxAge: 10 * 60 * 1000 });

    const url =
      `${this.authBase}/oauth/authorize?` +
      new URLSearchParams({
        scope: 'openid email customer-account-api:full',
        client_id: this.clientId,
        response_type: 'code',
        redirect_uri: this.redirectUri,
        state,
        nonce,
        code_challenge: challenge,
        code_challenge_method: 'S256',
      }).toString();

    return res.redirect(url);
  }

  // ---------- 2. Callback: exchange code → tokens ----------
  @Get('callback')
  async callback(@Req() req: Request, @Res() res: Response, @Query('code') code?: string, @Query('state') state?: string) {
    if (!code) throw new BadRequestException('Missing code');
    const savedState = req.cookies?.[COOKIE_STATE];
    if (!state || state !== savedState) throw new UnauthorizedException('State mismatch');
    const verifier = req.cookies?.[COOKIE_VERIFIER];
    if (!verifier) throw new UnauthorizedException('Missing PKCE verifier');

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      code,
      code_verifier: verifier,
    });

    const tokenRes = await fetch(`${this.authBase}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    const tokens: any = await tokenRes.json();
    if (!tokenRes.ok || !tokens.access_token) {
      return res.status(400).json({ error: 'Token exchange failed', detail: tokens });
    }

    res.clearCookie(COOKIE_VERIFIER);
    res.clearCookie(COOKIE_STATE);
    if (tokens.refresh_token) {
      res.cookie(COOKIE_REFRESH, tokens.refresh_token, { ...COOKIE_OPTS, maxAge: 30 * 24 * 60 * 60 * 1000 });
    }

    // Send access token via redirect fragment (#token=...) so it never hits server logs.
    const url = `${this.postLoginRedirect}#access_token=${encodeURIComponent(tokens.access_token)}&expires_in=${tokens.expires_in ?? 3600}`;
    return res.redirect(url);
  }

  // ---------- 3. Refresh ----------
  @Post('refresh')
  async refresh(@Req() req: Request, @Res() res: Response) {
    const refresh = req.cookies?.[COOKIE_REFRESH];
    if (!refresh) throw new UnauthorizedException('No refresh cookie');

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: this.clientId,
      refresh_token: refresh,
    });
    const r = await fetch(`${this.authBase}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    const tokens: any = await r.json();
    if (!r.ok || !tokens.access_token) {
      res.clearCookie(COOKIE_REFRESH);
      return res.status(401).json({ error: 'Refresh failed', detail: tokens });
    }
    if (tokens.refresh_token) {
      res.cookie(COOKIE_REFRESH, tokens.refresh_token, { ...COOKIE_OPTS, maxAge: 30 * 24 * 60 * 60 * 1000 });
    }
    return res.json({ accessToken: tokens.access_token, expiresIn: tokens.expires_in ?? 3600 });
  }

  // ---------- 4. Logout ----------
  @Post('logout')
  async logout(@Req() req: Request, @Res() res: Response) {
    const refresh = req.cookies?.[COOKIE_REFRESH];
    res.clearCookie(COOKIE_REFRESH);
    if (refresh) {
      // Best-effort revoke
      try {
        await fetch(`${this.authBase}/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ client_id: this.clientId, refresh_token: refresh }).toString(),
        });
      } catch {}
    }
    return res.json({ ok: true });
  }
}
