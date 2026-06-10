import { Injectable, Logger } from '@nestjs/common';
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
  private log = new Logger('MediaService');
  constructor(private prisma: PrismaService, private gql: AdminGraphQLService) {}

  /**
   * Full upload flow:
   * 1. stagedUploadsCreate → get target URL + params
   * 2. POST multipart/form-data to that target URL with the image bytes
   * 3. fileCreate (Shopify ingests resourceUrl)
   * 4. Save MediaAsset row
   */
  async uploadImage(input: {
    filename: string;
    mimeType: string;
    buffer: Buffer;
    folder?: string;
    userId: string;
  }) {
    // Step 1: staged upload
    const isImage = input.mimeType.startsWith('image/') && input.mimeType !== 'image/x-icon';
    const resource = isImage ? 'IMAGE' : 'FILE';
    const stagedResp: any = await this.gql.request(STAGED_UPLOAD, {
      input: [{
        filename: input.filename,
        mimeType: input.mimeType,
        httpMethod: 'POST',
        resource,
        fileSize: String(input.buffer.length),
      }],
    });
    const ue1 = stagedResp.stagedUploadsCreate.userErrors;
    if (ue1?.length) throw new Error('stagedUploadsCreate: ' + JSON.stringify(ue1));
    const target = stagedResp.stagedUploadsCreate.stagedTargets?.[0];
    if (!target) throw new Error('No staged target returned by Shopify: ' + JSON.stringify(stagedResp));

    // Step 2: POST file bytes to staged URL
    const form = new FormData();
    for (const p of target.parameters) form.append(p.name, p.value);
    form.append('file', new Blob([input.buffer], { type: input.mimeType }), input.filename);
    const uploadRes = await fetch(target.url, { method: 'POST', body: form as any });
    if (!uploadRes.ok && uploadRes.status !== 201 && uploadRes.status !== 204) {
      const txt = await uploadRes.text();
      throw new Error(`Staged upload failed ${uploadRes.status}: ${txt.slice(0, 300)}`);
    }

    // Step 3: fileCreate
    const fileResp: any = await this.gql.request(FILE_CREATE, {
      files: [{
        originalSource: target.resourceUrl,
        contentType: isImage ? 'IMAGE' : 'FILE',
        alt: input.filename,
      }],
    });
    const ue = fileResp.fileCreate.userErrors;
    if (ue?.length) throw new Error(JSON.stringify(ue));
    const file = fileResp.fileCreate.files?.[0];

    // Step 4: save row
    return this.prisma.mediaAsset.create({
      data: {
        url: target.resourceUrl,
        cdnKey: `${input.folder ?? 'uploads'}/${Date.now()}-${input.filename}`,
        mimeType: input.mimeType,
        sizeBytes: input.buffer.length,
        folder: input.folder,
        shopifyFileId: file?.id,
        uploadedBy: input.userId,
      },
    });
  }

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
