import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GoodsReceiptsService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.goodsReceipt.findMany({
      orderBy: { receivedAt: 'desc' }, take: 100,
      include: { purchaseOrder: { include: { vendor: true } }, items: true },
    });
  }

  findById(id: string) {
    return this.prisma.goodsReceipt.findUnique({
      where: { id },
      include: { purchaseOrder: { include: { vendor: true, items: true } }, items: true },
    });
  }
}
