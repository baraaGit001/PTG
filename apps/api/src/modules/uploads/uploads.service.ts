import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import { UPLOAD } from '@ptg/config';
import { ApiException } from '../../common/errors/api.exception.js';
import type { AppConfig } from '../../config/configuration.js';

export interface PresignedUpload {
  uploadUrl: string;
  publicUrl: string;
  objectKey: string;
  expiresIn: number;
}

/**
 * Every upload is validated server-side (MIME allowlist + size cap) before a
 * short-lived presigned PUT URL is issued - the browser never gets standing
 * write access to the bucket, and files never pass through the API process.
 */
@Injectable()
export class UploadsService {
  private readonly client: S3Client;

  constructor(private readonly config: ConfigService<AppConfig, true>) {
    const s3 = this.config.get('s3', { infer: true });
    this.client = new S3Client({
      region: s3.region,
      endpoint: s3.endpoint,
      forcePathStyle: s3.forcePathStyle,
      credentials: s3.accessKey && s3.secretKey ? { accessKeyId: s3.accessKey, secretAccessKey: s3.secretKey } : undefined,
    });
  }

  async createPresignedUpload(folder: string, contentType: string, sizeBytes: number): Promise<PresignedUpload> {
    if (!UPLOAD.allowedImageMimeTypes.includes(contentType as never)) {
      throw new ApiException('FILE_TYPE_NOT_ALLOWED', `Content type ${contentType} is not allowed.`);
    }
    if (sizeBytes > UPLOAD.maxFileSizeBytes) {
      throw new ApiException('FILE_TOO_LARGE', `File exceeds the ${UPLOAD.maxFileSizeBytes} byte limit.`);
    }

    const s3 = this.config.get('s3', { infer: true });
    const extension = contentType.split('/')[1] ?? 'bin';
    const objectKey = `${folder}/${randomUUID()}.${extension}`;

    const command = new PutObjectCommand({ Bucket: s3.bucket, Key: objectKey, ContentType: contentType });
    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn: 300 });
    const publicUrl = s3.publicUrl ? `${s3.publicUrl}/${objectKey}` : `${s3.endpoint}/${s3.bucket}/${objectKey}`;

    return { uploadUrl, publicUrl, objectKey, expiresIn: 300 };
  }
}
