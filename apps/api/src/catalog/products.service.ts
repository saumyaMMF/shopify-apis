import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminGraphQLService } from '../shopify/admin-graphql.service';

const PRODUCT_CREATE = `
  mutation productCreate($input: ProductInput!) {
    productCreate(input: $input) {
      product { id title handle status }
      userErrors { field message }
    }
  }
`;

const PRODUCT_UPDATE = `
  mutation productUpdate($input: ProductInput!) {
    productUpdate(input: $input) {
      product { id title handle status }
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

  async list(opts: { skip?: number; take?: number; q?: string; status?: string } = {}) {
    const where: any = {};
    if (opts.q) where.OR = [
      { title: { contains: opts.q, mode: 'insensitive' } },
      { handle: { contains: opts.q, mode: 'insensitive' } },
    ];
    if (opts.status) where.status = opts.status;

    const [total, items] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where, skip: opts.skip ?? 0, take: Math.min(opts.take ?? 25, 100),
        orderBy: { shopifyUpdatedAt: 'desc' },
        include: { variants: true, images: true },
      }),
    ]);
    return { total, items };
  }

  async findById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id }, include: { variants: true, images: true, collections: true },
    });
    if (!product) throw new NotFoundException();
    return product;
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
