import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminGraphQLService } from '../shopify/admin-graphql.service';

const CUSTOMERS_LIST = `
  query Customers($first: Int!, $after: String, $query: String) {
    customers(first: $first, after: $after, query: $query, sortKey: CREATED_AT, reverse: true) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          id legacyResourceId firstName lastName email phone
          tags state createdAt updatedAt
          numberOfOrders amountSpent { amount currencyCode }
          defaultAddress { city province country }
        }
      }
    }
  }
`;

const CUSTOMER_GET = `
  query Customer($id: ID!) {
    customer(id: $id) {
      id legacyResourceId firstName lastName email phone
      tags state note createdAt updatedAt
      numberOfOrders amountSpent { amount currencyCode }
      addresses { address1 address2 city province country zip phone }
      defaultAddress { address1 city province country zip }
      orders(first: 20, sortKey: CREATED_AT, reverse: true) {
        edges { node { id name totalPriceSet { shopMoney { amount currencyCode } } createdAt } }
      }
    }
  }
`;

const CUSTOMER_UPDATE = `
  mutation customerUpdate($input: CustomerInput!) {
    customerUpdate(input: $input) {
      customer { id tags }
      userErrors { field message }
    }
  }
`;

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService, private gql: AdminGraphQLService) {}

  async list(opts: { take?: number; cursor?: string; q?: string } = {}) {
    const data: any = await this.gql.request(CUSTOMERS_LIST, {
      first: Math.min(opts.take ?? 25, 100),
      after: opts.cursor ?? null,
      query: opts.q || undefined,
    });
    return {
      items: data.customers.edges.map((e: any) => e.node),
      pageInfo: data.customers.pageInfo,
    };
  }

  async findById(idOrGid: string) {
    const gid = idOrGid.startsWith('gid://') ? idOrGid : `gid://shopify/Customer/${idOrGid}`;
    const data: any = await this.gql.request(CUSTOMER_GET, { id: gid });
    if (!data.customer) throw new NotFoundException();
    return data.customer;
  }

  async setTags(idOrGid: string, tags: string[]) {
    const gid = idOrGid.startsWith('gid://') ? idOrGid : `gid://shopify/Customer/${idOrGid}`;
    const data: any = await this.gql.request(CUSTOMER_UPDATE, { input: { id: gid, tags } });
    const ue = data.customerUpdate.userErrors;
    if (ue?.length) throw new Error(JSON.stringify(ue));
    return data.customerUpdate.customer;
  }

  segments() { return this.prisma.customerSegment.findMany(); }
  createSegment(name: string, rules: any) {
    return this.prisma.customerSegment.create({ data: { name, rules } });
  }
}
