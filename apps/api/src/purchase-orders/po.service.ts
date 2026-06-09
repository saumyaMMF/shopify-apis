import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminGraphQLService } from '../shopify/admin-graphql.service';

const INVENTORY_ADJUST = `
  mutation inventoryAdjustQuantities($input: InventoryAdjustQuantitiesInput!) {
    inventoryAdjustQuantities(input: $input) {
      inventoryAdjustmentGroup { id reason }
      userErrors { field message }
    }
  }
`;

export interface CreatePODto {
  vendorId: string;
  locationId: string;
  expectedAt?: string;
  notes?: string;
  tax?: number;
  shipping?: number;
  items: { variantId: string; sku: string; title: string; qty: number; unitCost: number }[];
}

export interface ReceiveDto {
  notes?: string;
  items: { poItemId: string; quantity: number; condition?: string }[];
}

@Injectable()
export class POService {
  constructor(private prisma: PrismaService, private gql: AdminGraphQLService) {}

  list(opts: { skip?: number; take?: number; status?: string } = {}) {
    const where: any = {};
    if (opts.status) where.status = opts.status;
    return this.prisma.purchaseOrder.findMany({
      where, skip: opts.skip ?? 0, take: Math.min(opts.take ?? 25, 100),
      orderBy: { createdAt: 'desc' },
      include: { vendor: true, items: true, receipts: true },
    });
  }

  async findById(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { vendor: true, items: true, receipts: { include: { items: true } } },
    });
    if (!po) throw new NotFoundException();
    return po;
  }

  async create(userId: string, dto: CreatePODto) {
    if (!dto.items?.length) throw new BadRequestException('PO needs at least one item');
    const poNumber = await this.nextPONumber();
    const subtotal = dto.items.reduce((s, i) => s + i.qty * i.unitCost, 0);
    const tax = dto.tax ?? 0, shipping = dto.shipping ?? 0;
    return this.prisma.purchaseOrder.create({
      data: {
        poNumber, vendorId: dto.vendorId, locationId: dto.locationId,
        status: 'DRAFT', subtotal, tax, shipping, total: subtotal + tax + shipping,
        expectedAt: dto.expectedAt ? new Date(dto.expectedAt) : null,
        notes: dto.notes, createdBy: userId,
        items: {
          create: dto.items.map(i => ({
            variantId: i.variantId, sku: i.sku, title: i.title,
            orderedQty: i.qty, unitCost: i.unitCost, lineTotal: i.qty * i.unitCost,
          })),
        },
      },
      include: { items: true, vendor: true },
    });
  }

  async submit(id: string) {
    const po = await this.prisma.purchaseOrder.findUniqueOrThrow({ where: { id } });
    if (po.status !== 'DRAFT') throw new BadRequestException('Only DRAFT can submit');
    return this.prisma.purchaseOrder.update({
      where: { id }, data: { status: 'PENDING_APPROVAL' },
    });
  }

  async approve(id: string, approverId: string) {
    const po = await this.prisma.purchaseOrder.findUniqueOrThrow({ where: { id } });
    if (po.status !== 'PENDING_APPROVAL') throw new BadRequestException('Not pending');
    if (po.createdBy === approverId) throw new ForbiddenException('Cannot self-approve');
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'APPROVED', approvedBy: approverId, approvedAt: new Date() },
    });
  }

  async cancel(id: string) {
    return this.prisma.purchaseOrder.update({ where: { id }, data: { status: 'CANCELLED' } });
  }

  async receive(poId: string, userId: string, dto: ReceiveDto) {
    return this.prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findUniqueOrThrow({
        where: { id: poId }, include: { items: true },
      });
      if (!['APPROVED', 'PARTIALLY_RECEIVED'].includes(po.status))
        throw new BadRequestException(`Cannot receive in status ${po.status}`);

      const grNumber = await this.nextGRNumber();
      const receipt = await tx.goodsReceipt.create({
        data: {
          poId, grNumber, receivedBy: userId, notes: dto.notes,
          items: {
            create: dto.items.map(i => ({
              poItemId: i.poItemId, quantity: i.quantity, condition: i.condition ?? 'good',
            })),
          },
        },
        include: { items: true },
      });

      for (const ri of receipt.items) {
        const poItem = po.items.find(p => p.id === ri.poItemId);
        if (!poItem) throw new BadRequestException(`Unknown PO item ${ri.poItemId}`);
        const remaining = poItem.orderedQty - poItem.receivedQty;
        if (ri.quantity > remaining)
          throw new BadRequestException(`Over-receive on ${poItem.sku}: ${ri.quantity} > ${remaining}`);

        await tx.purchaseOrderItem.update({
          where: { id: poItem.id },
          data: { receivedQty: { increment: ri.quantity } },
        });

        await tx.inventoryAdjustment.create({
          data: {
            inventoryItemId: BigInt(poItem.variantId), // resolve to InventoryItem in real impl
            locationId: po.locationId, delta: ri.quantity,
            reason: 'po_received', reference: grNumber, notedBy: userId,
          },
        });

        // Push to Shopify (best effort, do not block tx)
        // NOTE: production: queue this rather than inline
      }

      const refreshed = await tx.purchaseOrder.findUniqueOrThrow({
        where: { id: poId }, include: { items: true },
      });
      const allReceived = refreshed.items.every(i => i.receivedQty >= i.orderedQty);
      const someReceived = refreshed.items.some(i => i.receivedQty > 0);
      const nextStatus = allReceived ? 'RECEIVED' : someReceived ? 'PARTIALLY_RECEIVED' : po.status;
      await tx.purchaseOrder.update({ where: { id: poId }, data: { status: nextStatus } });

      return receipt;
    });
  }

  private async nextPONumber() {
    const year = new Date().getFullYear();
    const last = await this.prisma.purchaseOrder.findFirst({
      where: { poNumber: { startsWith: `PO-${year}-` } },
      orderBy: { createdAt: 'desc' },
    });
    const seq = last ? Number(last.poNumber.split('-')[2]) + 1 : 1;
    return `PO-${year}-${String(seq).padStart(5, '0')}`;
  }

  private async nextGRNumber() {
    const year = new Date().getFullYear();
    const last = await this.prisma.goodsReceipt.findFirst({
      where: { grNumber: { startsWith: `GR-${year}-` } },
      orderBy: { receivedAt: 'desc' },
    });
    const seq = last ? Number(last.grNumber.split('-')[2]) + 1 : 1;
    return `GR-${year}-${String(seq).padStart(5, '0')}`;
  }
}
