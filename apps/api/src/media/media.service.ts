import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminGraphQLService } from '../shopify/admin-graphql.service';

const STAGED_UPLOAD = `
  mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
    stagedUploadsCreate(input: $input) {
      stagedTargets { url resourceUrl parameters { name value } }
      userErrors { field message }
    }
  }
`;
const FILE_CREATE = `
  mutation fileCreate($files: [FileCreateInput!]!) {
    fileCreate(files: $files) {
      files { id fileStatus alt }
      userErrors { field message }
    }
  }
`;

@Injectable()
export class MediaService {
  constructor(private prisma: PrismaService, private gql: AdminGraphQLService) {}

  list(folder?: string) {
    return this.prisma.mediaAsset.findMany({
      where: folder ? { folder } : undefined,
      orderBy: { createdAt: 'desc' }, take: 200,
    });
  }

  async createStagedUpload(filename: string, mimeType: string) {
    return this.gql.request(STAGED_UPLOAD, {
      input: [{ filename, mimeType, httpMethod: 'POST', resource: 'IMAGE' }],
    });
  }

  async registerFile(input: { url: string; cdnKey: string; mimeType: string; sizeBytes: number; userId: string; folder?: string }) {
    const data: any = await this.gql.request(FILE_CREATE, {
      files: [{ originalSource: input.url, contentType: 'IMAGE' }],
    });
    const ue = data.fileCreate.userErrors;
    if (ue?.length) throw new Error(JSON.stringify(ue));
    return this.prisma.mediaAsset.create({
      data: {
        url: input.url, cdnKey: input.cdnKey, mimeType: input.mimeType,
        sizeBytes: input.sizeBytes, folder: input.folder,
        shopifyFileId: data.fileCreate.files?.[0]?.id,
        uploadedBy: input.userId,
      },
    });
  }
}
