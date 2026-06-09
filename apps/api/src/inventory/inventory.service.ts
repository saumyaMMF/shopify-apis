import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminGraphQLService } from '../shopify/admin-graphql.service';

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

  levels(locationId?: string) {
    return this.prisma.inventoryLevel.findMany({
      where: locationId ? { locationId } : undefined,
      include: { location: true },
      orderBy: { updatedAt: 'desc' }, take: 500,
    });
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
