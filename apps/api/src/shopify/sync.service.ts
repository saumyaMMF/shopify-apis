import { Injectable, Logger } from '@nestjs/common';
import { AdminGraphQLService } from './admin-graphql.service';
import { PrismaService } from '../prisma/prisma.service';

const PRODUCTS_QUERY = `
  query Products($cursor: String) {
    products(first: 100, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          id legacyResourceId title handle status productType vendor tags
          createdAt updatedAt publishedAt
          variants(first: 50) {
            edges { node {
              id legacyResourceId sku barcode title price compareAtPrice position
              inventoryItem { id legacyResourceId }
              inventoryQuantity
            } }
          }
          images(first: 20) {
            edges { node { id url altText width height } }
          }
        }
      }
    }
  }
`;

@Injectable()
export class SyncService {
  private log = new Logger('Sync');
  constructor(private gql: AdminGraphQLService, private prisma: PrismaService) {}

  async fullProductSync() {
    const job = await this.prisma.syncJob.create({
      data: { type: 'products.full', status: 'RUNNING', startedAt: new Date() },
    });
    let cursor: string | null = null, total = 0;
    try {
      do {
        const data: any = await this.gql.request(PRODUCTS_QUERY, { cursor });
        for (const edge of data.products.edges) {
          await this.upsertProduct(edge.node);
          total++;
        }
        cursor = data.products.pageInfo.hasNextPage ? data.products.pageInfo.endCursor : null;
        await this.prisma.syncJob.update({ where: { id: job.id }, data: { cursor, doneCount: total } });
      } while (cursor);
      await this.prisma.syncJob.update({
        where: { id: job.id },
        data: { status: 'DONE', finishedAt: new Date(), totalCount: total, doneCount: total },
      });
    } catch (err: any) {
      await this.prisma.syncJob.update({
        where: { id: job.id }, data: { status: 'FAILED', error: err.message, finishedAt: new Date() },
      });
      throw err;
    }
  }

  private async upsertProduct(p: any) {
    const product = await this.prisma.product.upsert({
      where: { shopifyGid: p.id },
      update: { title: p.title, status: p.status, syncedAt: new Date() },
      create: {
        shopifyGid: p.id, shopifyId: BigInt(p.legacyResourceId),
        title: p.title, handle: p.handle, status: p.status,
        productType: p.productType, vendor: p.vendor, tags: p.tags ?? [],
        publishedAt: p.publishedAt ? new Date(p.publishedAt) : null,
        shopifyCreatedAt: new Date(p.createdAt),
        shopifyUpdatedAt: new Date(p.updatedAt),
      },
    });
    for (const ve of p.variants.edges) {
      const v = ve.node;
      await this.prisma.variant.upsert({
        where: { shopifyGid: v.id },
        update: { price: v.price, inventoryQty: v.inventoryQuantity ?? 0 },
        create: {
          shopifyGid: v.id, shopifyId: BigInt(v.legacyResourceId),
          productId: product.id,
          sku: v.sku, barcode: v.barcode, title: v.title,
          price: v.price, compareAtPrice: v.compareAtPrice,
          inventoryItemId: BigInt(v.inventoryItem.legacyResourceId),
          inventoryQty: v.inventoryQuantity ?? 0,
          position: v.position,
        },
      });
    }
  }
}
