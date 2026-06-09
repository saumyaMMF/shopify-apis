import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminGraphQLService } from '../shopify/admin-graphql.service';

const SHOPIFYQL = `
  query($q: String!) {
    shopifyqlQuery(query: $q) {
      __typename
      ... on TableResponse {
        tableData { columns { name dataType } rowData }
      }
      ... on ParseError { code message }
    }
  }
`;

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService, private gql: AdminGraphQLService) {}

  sales(since: string, until: string) {
    return this.gql.request(SHOPIFYQL, {
      q: `FROM sales SHOW total_sales BY day SINCE ${since} UNTIL ${until}`,
    });
  }

  async inventoryByLocation() {
    return this.prisma.inventoryLevel.groupBy({
      by: ['locationId'],
      _sum: { available: true, committed: true, incoming: true },
    });
  }

  async vendorSpend() {
    return this.prisma.purchaseOrder.groupBy({
      by: ['vendorId'],
      _sum: { total: true, subtotal: true },
      _count: true,
    });
  }
}
