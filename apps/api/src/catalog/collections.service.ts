import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminGraphQLService } from '../shopify/admin-graphql.service';

const COLLECTIONS_QUERY = `
  query Collections($cursor: String) {
    collections(first: 50, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          id
          legacyResourceId
          title
          handle
          updatedAt
          productsCount { count }
          ruleSet { rules { column relation condition } appliedDisjunctively }
          image { url altText }
        }
      }
    }
  }
`;

const COLLECTION_QUERY = `
  query Collection($id: ID!) {
    collection(id: $id) {
      id legacyResourceId title handle description descriptionHtml
      updatedAt productsCount { count }
      image { url altText }
      ruleSet { rules { column relation condition } appliedDisjunctively }
      products(first: 50) {
        edges { node { id title handle status } }
      }
    }
  }
`;

const COLLECTION_CREATE = `
  mutation collectionCreate($input: CollectionInput!) {
    collectionCreate(input: $input) {
      collection { id title handle }
      userErrors { field message }
    }
  }
`;

const COLLECTION_UPDATE = `
  mutation collectionUpdate($input: CollectionInput!) {
    collectionUpdate(input: $input) {
      collection { id title handle }
      userErrors { field message }
    }
  }
`;

const COLLECTION_DELETE = `
  mutation collectionDelete($input: CollectionDeleteInput!) {
    collectionDelete(input: $input) {
      deletedCollectionId
      userErrors { field message }
    }
  }
`;

export interface CollectionDto {
  title: string;
  handle?: string;
  descriptionHtml?: string;
  ruleSet?: {
    rules: Array<{ column: string; relation: string; condition: string }>;
    appliedDisjunctively?: boolean;
  };
  productsToAdd?: string[]; // gid array for custom collections
}

@Injectable()
export class CollectionsService {
  constructor(private prisma: PrismaService, private gql: AdminGraphQLService) {}

  async list() {
    const all: any[] = [];
    let cursor: string | null = null;
    do {
      const data: any = await this.gql.request(COLLECTIONS_QUERY, { cursor });
      for (const edge of data.collections.edges) all.push(edge.node);
      cursor = data.collections.pageInfo.hasNextPage ? data.collections.pageInfo.endCursor : null;
    } while (cursor);
    return all;
  }

  async findById(idOrGid: string) {
    const gid = idOrGid.startsWith('gid://') ? idOrGid : `gid://shopify/Collection/${idOrGid}`;
    const data: any = await this.gql.request(COLLECTION_QUERY, { id: gid });
    return data.collection;
  }

  async create(dto: CollectionDto) {
    const data: any = await this.gql.request(COLLECTION_CREATE, { input: dto });
    const ue = data.collectionCreate.userErrors;
    if (ue?.length) throw new Error(JSON.stringify(ue));
    return data.collectionCreate.collection;
  }

  async update(shopifyGid: string, dto: Partial<CollectionDto>) {
    const data: any = await this.gql.request(COLLECTION_UPDATE, {
      input: { id: shopifyGid, ...dto },
    });
    const ue = data.collectionUpdate.userErrors;
    if (ue?.length) throw new Error(JSON.stringify(ue));
    return data.collectionUpdate.collection;
  }

  async delete(shopifyGid: string) {
    const data: any = await this.gql.request(COLLECTION_DELETE, { input: { id: shopifyGid } });
    const ue = data.collectionDelete.userErrors;
    if (ue?.length) throw new Error(JSON.stringify(ue));
    return { deletedId: data.collectionDelete.deletedCollectionId };
  }
}
