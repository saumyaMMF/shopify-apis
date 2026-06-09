import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  log(input: {
    userId?: string; action: string; resource: string;
    resourceId?: string; diff?: any; ip?: string; userAgent?: string;
  }) {
    return this.prisma.auditLog.create({ data: input });
  }

  list(opts: { skip?: number; take?: number; resource?: string; userId?: string } = {}) {
    const where: any = {};
    if (opts.resource) where.resource = opts.resource;
    if (opts.userId) where.userId = opts.userId;
    return this.prisma.auditLog.findMany({
      where, skip: opts.skip ?? 0, take: Math.min(opts.take ?? 50, 200),
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { email: true, firstName: true, lastName: true } } },
    });
  }
}
