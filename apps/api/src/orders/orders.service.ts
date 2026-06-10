import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminGraphQLService } from '../shopify/admin-graphql.service';

const ORDERS_LIST = `
  query Orders($first: Int!, $after: String, $query: String) {
    orders(first: $first, after: $after, query: $query, sortKey: CREATED_AT, reverse: true) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          id legacyResourceId name email phone
          displayFinancialStatus displayFulfillmentStatus
          totalPriceSet { shopMoney { amount currencyCode } }
          createdAt updatedAt processedAt
          customer { id firstName lastName email }
          lineItems(first: 5) {
            edges { node { id title quantity sku } }
          }
        }
      }
    }
  }
`;

const ORDER_GET = `
  query Order($id: ID!) {
    order(id: $id) {
      id legacyResourceId name email phone tags note
      displayFinancialStatus displayFulfillmentStatus
      totalPriceSet { shopMoney { amount currencyCode } }
      subtotalPriceSet { shopMoney { amount currencyCode } }
      totalTaxSet { shopMoney { amount currencyCode } }
      totalShippingPriceSet { shopMoney { amount currencyCode } }
      totalDiscountsSet { shopMoney { amount currencyCode } }
      createdAt updatedAt processedAt cancelledAt
      shippingAddress { address1 address2 city province country zip phone }
      billingAddress { address1 address2 city province country zip phone }
      customer { id firstName lastName email phone }
      lineItems(first: 50) {
        edges { node { id title quantity sku variant { id title price } } }
      }
      fulfillments {
        id status trackingInfo { number url company } createdAt
      }
      refunds { id totalRefundedSet { shopMoney { amount currencyCode } } note createdAt }
    }
  }
`;

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

  async list(opts: { take?: number; cursor?: string; status?: string; q?: string } = {}) {
    const filters: string[] = [];
    if (opts.q) filters.push(opts.q);
    if (opts.status) filters.push(`financial_status:${opts.status.toLowerCase()}`);
    const query = filters.join(' ').trim() || undefined;
    const data: any = await this.gql.request(ORDERS_LIST, {
      first: Math.min(opts.take ?? 25, 100),
      after: opts.cursor ?? null,
      query,
    });
    return {
      items: data.orders.edges.map((e: any) => e.node),
      pageInfo: data.orders.pageInfo,
    };
  }

  async findById(idOrGid: string) {
    const gid = idOrGid.startsWith('gid://') ? idOrGid : `gid://shopify/Order/${idOrGid}`;
    const data: any = await this.gql.request(ORDER_GET, { id: gid });
    if (!data.order) throw new NotFoundException();
    return data.order;
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
