import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminGraphQLService } from '../shopify/admin-graphql.service';

@Injectable()
export class CollectionsService {
  constructor(private prisma: PrismaService, private gql: AdminGraphQLService) {}

  list() {
    return this.prisma.collection.findMany({ orderBy: { title: 'asc' } });
  }

  findById(id: string) {
    return this.prisma.collection.findUnique({ where: { id }, include: { products: true } });
  }
  // create/update/delete via Shopify GraphQL — collectionCreate, collectionUpdate, collectionDelete
}
