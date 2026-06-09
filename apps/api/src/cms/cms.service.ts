import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminGraphQLService } from '../shopify/admin-graphql.service';

const METAOBJECT_UPSERT = `
  mutation metaobjectUpsert($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
    metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
      metaobject { id handle }
      userErrors { field message }
    }
  }
`;

const TYPE_BY_BLOCK: Record<string, string> = {
  HEADER_MENU: 'header_menu',
  FOOTER_MENU: 'footer_menu',
  HERO_BANNER: 'hero_banner',
  HOMEPAGE_SECTION: 'homepage_section',
  PAGE: 'page',
  FAQ: 'faq',
  BLOG_POST: 'blog_post',
};

@Injectable()
export class CmsService {
  constructor(private prisma: PrismaService, private gql: AdminGraphQLService) {}

  list(type?: string) {
    return this.prisma.cmsBlock.findMany({
      where: type ? { type: type as any } : undefined,
      orderBy: { updatedAt: 'desc' },
    });
  }

  findById(id: string) { return this.prisma.cmsBlock.findUnique({ where: { id } }); }

  upsert(input: { id?: string; type: string; handle: string; data: any; userId: string }) {
    return this.prisma.cmsBlock.upsert({
      where: { handle: input.handle },
      update: { data: input.data, type: input.type as any, status: 'draft' },
      create: {
        type: input.type as any, handle: input.handle, data: input.data,
        status: 'draft', createdBy: input.userId,
      },
    });
  }

  async publish(id: string) {
    const block = await this.prisma.cmsBlock.findUniqueOrThrow({ where: { id } });
    const shopType = TYPE_BY_BLOCK[block.type] ?? block.type.toLowerCase();
    const fields = Object.entries(block.data ?? {}).map(([key, value]) => ({
      key, value: typeof value === 'string' ? value : JSON.stringify(value),
    }));
    const data: any = await this.gql.request(METAOBJECT_UPSERT, {
      handle: { type: `$app:${shopType}`, handle: block.handle },
      metaobject: { fields },
    });
    const ue = data.metaobjectUpsert.userErrors;
    if (ue?.length) throw new Error(JSON.stringify(ue));
    return this.prisma.cmsBlock.update({
      where: { id },
      data: {
        shopifyMetaobjectId: data.metaobjectUpsert.metaobject.id,
        status: 'published', publishedAt: new Date(),
      },
    });
  }
}
