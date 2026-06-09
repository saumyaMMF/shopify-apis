import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
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
}
