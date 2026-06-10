import { BadRequestException, Body, Controller, Get, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions';
import { CurrentUser } from '../common/decorators/current-user';

@ApiTags('media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('media')
export class MediaController {
  constructor(private media: MediaService) {}

  @Get() @RequirePermissions('media.upload')
  list(@Query('folder') folder?: string) { return this.media.list(folder); }

  @Post('staged-upload') @RequirePermissions('media.upload')
  staged(@Body() body: { filename: string; mimeType: string }) {
    return this.media.createStagedUpload(body.filename, body.mimeType);
  }

  @Post('register') @RequirePermissions('media.upload')
  register(@Body() body: any, @CurrentUser('sub') userId: string) {
    return this.media.registerFile({ ...body, userId });
  }

  // Full upload: send multipart/form-data with field "file"
  @Post('upload')
  @RequirePermissions('media.upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        folder: { type: 'string', nullable: true },
      },
    },
  })
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder: string,
    @CurrentUser('sub') userId: string,
  ) {
    if (!file) throw new BadRequestException('field "file" required (multipart/form-data)');
    return this.media.uploadImage({
      filename: file.originalname,
      mimeType: file.mimetype,
      buffer: file.buffer,
      folder,
      userId,
    });
  }
}
