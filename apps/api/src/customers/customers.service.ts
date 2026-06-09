import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  list(opts: { skip?: number; take?: number; q?: string } = {}) {
    const where: any = {};
    if (opts.q) where.OR = [
      { email: { contains: opts.q, mode: 'insensitive' } },
      { firstName: { contains: opts.q, mode: 'insensitive' } },
      { lastName: { contains: opts.q, mode: 'insensitive' } },
    ];
    return this.prisma.customer.findMany({
      where, skip: opts.skip ?? 0, take: Math.min(opts.take ?? 25, 100),
      orderBy: { shopifyCreatedAt: 'desc' },
    });
  }

  findById(id: string) {
    return this.prisma.customer.findUnique({
      where: { id }, include: { orders: { take: 20, orderBy: { shopifyCreatedAt: 'desc' } }, segments: true },
    });
  }

  setTags(id: string, tags: string[]) {
    return this.prisma.customer.update({ where: { id }, data: { tags } });
  }

  segments() { return this.prisma.customerSegment.findMany(); }
  createSegment(name: string, rules: any) {
    return this.prisma.customerSegment.create({ data: { name, rules } });
  }
}
