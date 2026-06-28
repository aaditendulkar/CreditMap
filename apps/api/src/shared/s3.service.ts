import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly accountId: string;

  constructor(private readonly config: ConfigService) {
    this.accountId = this.config.get<string>('R2_ACCOUNT_ID') ?? 'dev-placeholder';
    this.bucket    = this.config.get<string>('R2_BUCKET_NAME') ?? 'creditmap-documents';

    this.client = new S3Client({
      region:   'auto',
      endpoint: `https://${this.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId:     this.config.get<string>('R2_ACCESS_KEY_ID')     ?? '',
        secretAccessKey: this.config.get<string>('R2_SECRET_ACCESS_KEY') ?? '',
      },
    });
  }

  private get isDev(): boolean {
    return this.accountId === 'dev-placeholder';
  }

  async uploadFile(buffer: Buffer, key: string, mimeType: string): Promise<void> {
    if (this.isDev) {
      this.logger.log(`[DEV MODE] Skipping S3 upload — key: ${key}`);
      return;
    }

    await this.client.send(
      new PutObjectCommand({
        Bucket:      this.bucket,
        Key:         key,
        Body:        buffer,
        ContentType: mimeType,
      }),
    );
  }

  async getPresignedDownloadUrl(key: string, expiresInSeconds = 900): Promise<string> {
    if (this.isDev) {
      const base = this.config.get<string>('R2_PUBLIC_URL') ?? 'http://localhost:3001/dev-documents';
      return `${base}/${key}`;
    }

    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: expiresInSeconds },
    );
  }

  async deleteFile(key: string): Promise<void> {
    if (this.isDev) {
      this.logger.log(`[DEV MODE] Skipping S3 delete — key: ${key}`);
      return;
    }

    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}
