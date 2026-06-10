import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminGraphQLService } from '../shopify/admin-graphql.service';

const LOCATIONS_LIST = `
  query Locations {
    locations(first: 50) {
      edges { node { id legacyResourceId name isActive address { city province country } } }
    }
  }
`;

const INVENTORY_LEVELS = `
  query InventoryItems($first: Int!, $after: String) {
    inventoryItems(first: $first, after: $after) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          id legacyResourceId sku
          variant { id title product { id title } }
          inventoryLevels(first: 10) {
            edges { node {
              id
              location { id name }
              quantities(names: ["available", "committed", "incoming", "on_hand"]) { name quantity }
            } }
          }
        }
      }
    }
  }
`;

const INVENTORY_SET = `
  mutation inventorySetQuantities($input: InventorySetQuantitiesInput!) {
    inventorySetQuantities(input: $input) {
      inventoryAdjustmentGroup { id reason }
      userErrors { field message }
    }
  }
`;

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService, private gql: AdminGraphQLService) {}

  async locations() {
    const data: any = await this.gql.request(LOCATIONS_LIST);
    return data.locations.edges.map((e: any) => e.node);
  }

  async levels(opts: { take?: number; cursor?: string } = {}) {
    const data: any = await this.gql.request(INVENTORY_LEVELS, {
      first: Math.min(opts.take ?? 50, 100),
      after: opts.cursor ?? null,
    });
    return {
      items: data.inventoryItems.edges.map((e: any) => e.node),
      pageInfo: data.inventoryItems.pageInfo,
    };
  }

  async adjust(input: { inventoryItemId: string; locationId: string; delta: number; reason: string; reference?: string; userId: string }) {
    await this.prisma.inventoryAdjustment.create({
      data: {
        inventoryItemId: BigInt(input.inventoryItemId),
        locationId: input.locationId, delta: input.delta,
        reason: input.reason, reference: input.reference, notedBy: input.userId,
      },
    });
    return this.gql.request(INVENTORY_SET, {
      input: {
        reason: input.reason, name: 'available',
        quantities: [{
          inventoryItemId: `gid://shopify/InventoryItem/${input.inventoryItemId}`,
          locationId: `gid://shopify/Location/${input.locationId}`,
          quantity: input.delta,
        }],
      },
    });
  }

  alerts() { return this.prisma.stockAlert.findMany({ where: { active: true } }); }
}
