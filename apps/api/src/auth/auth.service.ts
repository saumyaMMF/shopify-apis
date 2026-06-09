import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

interface LoginMeta { ip?: string; userAgent?: string }

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async login(email: string, password: string, meta: LoginMeta = {}) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { role: { include: { permissions: true } } },
    });
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');
    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    return this.issueTokens(user, meta);
  }

  async refresh(rawRefresh: string, meta: LoginMeta = {}) {
    const tokens = await this.prisma.refreshToken.findMany({
      where: { revokedAt: null, expiresAt: { gt: new Date() } },
      include: { user: { include: { role: { include: { permissions: true } } } } },
    });
    let match: typeof tokens[number] | null = null;
    for (const t of tokens) {
      if (await argon2.verify(t.tokenHash, rawRefresh)) { match = t; break; }
    }
    if (!match) throw new UnauthorizedException('Invalid refresh');
    await this.prisma.refreshToken.update({ where: { id: match.id }, data: { revokedAt: new Date() } });
    return this.issueTokens(match.user, meta);
  }

  async logout(rawRefresh: string) {
    const tokens = await this.prisma.refreshToken.findMany({ where: { revokedAt: null } });
    for (const t of tokens) {
      if (await argon2.verify(t.tokenHash, rawRefresh)) {
        await this.prisma.refreshToken.update({ where: { id: t.id }, data: { revokedAt: new Date() } });
        return;
      }
    }
  }

  private async issueTokens(user: any, meta: LoginMeta) {
    const perms: string[] = user.role.permissions.map((p: any) => p.key);
    const accessToken = await this.jwt.signAsync({
      sub: user.id, email: user.email, roleId: user.roleId, perms,
    });
    const refreshRaw = crypto.randomBytes(48).toString('hex');
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: await argon2.hash(refreshRaw),
        expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
        ip: meta.ip, userAgent: meta.userAgent,
      },
    });
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return {
      accessToken,
      refreshToken: refreshRaw,
      user: {
        id: user.id, email: user.email,
        firstName: user.firstName, lastName: user.lastName,
        role: user.role.name, permissions: perms,
      },
    };
  }
}
