import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminGraphQLService } from '../shopify/admin-graphql.service';

const PRODUCTS_LIST = `
  query Products($first: Int!, $after: String, $query: String) {
    products(first: $first, after: $after, query: $query) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          id legacyResourceId title handle status productType vendor tags
          createdAt updatedAt publishedAt totalInventory
          featuredImage { url altText }
          priceRangeV2 {
            minVariantPrice { amount currencyCode }
            maxVariantPrice { amount currencyCode }
          }
          variants(first: 5) {
            edges { node { id legacyResourceId sku title price inventoryQuantity } }
          }
        }
      }
    }
  }
`;

const PRODUCT_GET = `
  query Product($id: ID!) {
    product(id: $id) {
      id legacyResourceId title handle status descriptionHtml productType vendor tags
      createdAt updatedAt publishedAt totalInventory
      featuredImage { url altText }
      images(first: 20) { edges { node { id url altText width height } } }
      variants(first: 50) {
        edges { node {
          id legacyResourceId sku barcode title price compareAtPrice
          inventoryQuantity inventoryItem { id legacyResourceId }
          selectedOptions { name value }
        } }
      }
      options { id name values }
      priceRangeV2 {
        minVariantPrice { amount currencyCode }
        maxVariantPrice { amount currencyCode }
      }
    }
  }
`;

const PRODUCT_CREATE = `
  mutation productCreate($input: ProductInput!) {
    productCreate(input: $input) {
      product { id legacyResourceId title handle status }
      userErrors { field message }
    }
  }
`;

const PRODUCT_UPDATE = `
  mutation productUpdate($input: ProductInput!) {
    productUpdate(input: $input) {
      product { id legacyResourceId title handle status }
      userErrors { field message }
    }
  }
`;

const PRODUCT_DELETE = `
  mutation productDelete($input: ProductDeleteInput!) {
    productDelete(input: $input) {
      deletedProductId
      userErrors { field message }
    }
  }
`;

export interface CreateProductDto {
  title: string;
  description?: string;
  productType?: string;
  vendor?: string;
  tags?: string[];
  status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
}

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService, private gql: AdminGraphQLService) {}

  // Live Shopify list — cursor pagination
  async list(opts: { take?: number; cursor?: string; q?: string; status?: string } = {}) {
    const filters: string[] = [];
    if (opts.q) filters.push(opts.q);
    if (opts.status) filters.push(`status:${opts.status.toLowerCase()}`);
    const query = filters.join(' ').trim() || undefined;
    const data: any = await this.gql.request(PRODUCTS_LIST, {
      first: Math.min(opts.take ?? 25, 100),
      after: opts.cursor ?? null,
      query,
    });
    return {
      items: data.products.edges.map((e: any) => e.node),
      pageInfo: data.products.pageInfo,
    };
  }

  async findById(idOrGid: string) {
    const gid = idOrGid.startsWith('gid://') ? idOrGid : `gid://shopify/Product/${idOrGid}`;
    const data: any = await this.gql.request(PRODUCT_GET, { id: gid });
    if (!data.product) throw new NotFoundException();
    return data.product;
  }

  async create(dto: CreateProductDto) {
    const data: any = await this.gql.request(PRODUCT_CREATE, {
      input: {
        title: dto.title,
        descriptionHtml: dto.description,
        productType: dto.productType,
        vendor: dto.vendor,
        tags: dto.tags,
        status: dto.status ?? 'DRAFT',
      },
    });
    const ue = data.productCreate.userErrors;
    if (ue?.length) throw new Error(JSON.stringify(ue));
    return data.productCreate.product;
  }

  async update(shopifyGid: string, dto: Partial<CreateProductDto>) {
    const data: any = await this.gql.request(PRODUCT_UPDATE, {
      input: {
        id: shopifyGid,
        title: dto.title,
        descriptionHtml: dto.description,
        productType: dto.productType,
        vendor: dto.vendor,
        tags: dto.tags,
        status: dto.status,
      },
    });
    const ue = data.productUpdate.userErrors;
    if (ue?.length) throw new Error(JSON.stringify(ue));
    return data.productUpdate.product;
  }

  async delete(shopifyGid: string) {
    const data: any = await this.gql.request(PRODUCT_DELETE, { input: { id: shopifyGid } });
    const ue = data.productDelete.userErrors;
    if (ue?.length) throw new Error(JSON.stringify(ue));
    return { deletedId: data.productDelete.deletedProductId };
  }
}
