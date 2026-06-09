import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminGraphQLService } from '../shopify/admin-graphql.service';

const REFUND_CREATE = `
  mutation refundCreate($input: RefundInput!) {
    refundCreate(input: $input) {
      refund { id totalRefundedSet { shopMoney { amount currencyCode } } }
      userErrors { field message }
    }
  }
`;

const FULFILLMENT_CREATE = `
  mutation fulfillmentCreate($fulfillment: FulfillmentInput!) {
    fulfillmentCreate(fulfillment: $fulfillment) {
      fulfillment { id status trackingInfo { number url company } }
      userErrors { field message }
    }
  }
`;

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService, private gql: AdminGraphQLService) {}

  list(opts: { skip?: number; take?: number; status?: string } = {}) {
    const where: any = {};
    if (opts.status) where.financialStatus = opts.status;
    return this.prisma.order.findMany({
      where, skip: opts.skip ?? 0, take: Math.min(opts.take ?? 25, 100),
      orderBy: { shopifyCreatedAt: 'desc' },
      include: { customer: true, lineItems: true },
    });
  }

  findById(id: string) {
    return this.prisma.order.findUnique({
      where: { id },
      include: { customer: true, lineItems: true, fulfillments: true, refunds: true },
    });
  }

  async createFulfillment(input: { orderShopifyGid: string; lineItems: { id: string; quantity: number }[]; tracking?: { number?: string; url?: string; company?: string } }) {
    return this.gql.request(FULFILLMENT_CREATE, {
      fulfillment: {
        lineItemsByFulfillmentOrder: [{ fulfillmentOrderId: input.orderShopifyGid, fulfillmentOrderLineItems: input.lineItems }],
        trackingInfo: input.tracking,
      },
    });
  }

  async refund(input: { orderShopifyGid: string; note?: string; amount?: number; currencyCode?: string; userId: string }) {
    const data: any = await this.gql.request(REFUND_CREATE, {
      input: {
        orderId: input.orderShopifyGid,
        note: input.note,
        transactions: input.amount ? [{ amount: input.amount, kind: 'REFUND' }] : [],
      },
    });
    const refund = data.refundCreate.refund;
    if (refund) {
      await this.prisma.refund.create({
        data: {
          shopifyGid: refund.id,
          orderId: (await this.prisma.order.findFirstOrThrow({ where: { shopifyGid: input.orderShopifyGid } })).id,
          amount: refund.totalRefundedSet?.shopMoney?.amount ?? input.amount ?? 0,
          reason: input.note, createdBy: input.userId,
        },
      });
    }
    return data.refundCreate;
  }
}
