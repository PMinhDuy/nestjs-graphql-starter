import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private config: ConfigService) {
    this.client = new S3Client({ region: this.config.get<string>('aws.region') });
    this.bucket = this.config.getOrThrow<string>('aws.s3BucketName');
  }

  async getUploadUrl(key: string, contentType: string, expiresIn = 300): Promise<string> {
    const cmd = new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType });
    return getSignedUrl(this.client, cmd, { expiresIn });
  }

  async getDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, cmd, { expiresIn });
  }
}
