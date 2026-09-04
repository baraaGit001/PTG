import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsIn, IsInt, Min } from 'class-validator';
import { UPLOAD } from '@ptg/config';
import { hasAnyPermission } from '@ptg/types';
import { ApiException } from '../../common/errors/api.exception.js';
import { CurrentUser } from '../../common/decorators/auth.decorators.js';
import type { RequestUser } from '../../common/types/request-user.js';
import { UploadsService} from './uploads.service.js';
import { type PresignedUpload } from './uploads.service.js';

const SELF_SERVICE_FOLDERS = new Set(['avatars', 'community']);

class PresignUploadDto {
  @IsIn(['products', 'categories', 'articles', 'community', 'avatars', 'promotions'])
  folder!: 'products' | 'categories' | 'articles' | 'community' | 'avatars' | 'promotions';

  @IsIn(UPLOAD.allowedImageMimeTypes)
  contentType!: (typeof UPLOAD.allowedImageMimeTypes)[number];

  @IsInt()
  @Min(1)
  sizeBytes!: number;
}

@ApiTags('uploads')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  /**
   * Every authenticated user may upload their own avatar and community post
   * images; catalog/content assets require `content.write` (checked here
   * rather than via `@RequirePermissions` because the rule is folder-specific).
   */
  @Post('presign')
  async presign(@CurrentUser() user: RequestUser, @Body() dto: PresignUploadDto): Promise<PresignedUpload> {
    if (!SELF_SERVICE_FOLDERS.has(dto.folder) && !hasAnyPermission(user.permissions, ['content.write', 'products.write'])) {
      throw new ApiException('FORBIDDEN', 'You do not have permission to upload to this folder.');
    }
    return this.uploads.createPresignedUpload(dto.folder, dto.contentType, dto.sizeBytes);
  }
}
