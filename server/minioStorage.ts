// MinIO (S3-compatible) Object Storage Service for VPS
import { Client } from 'minio';
import { randomUUID } from 'crypto';
import { Response } from 'express';

// Initialize MinIO client
let minioClient: Client | null = null;

function getMinioClient(): Client {
  if (minioClient) {
    return minioClient;
  }

  // Support both S3_* and MINIO_* environment variables
  const s3Endpoint = process.env.S3_ENDPOINT || process.env.MINIO_ENDPOINT || 'http://localhost:9000';
  const accessKey = process.env.S3_ACCESS_KEY || process.env.MINIO_ACCESS_KEY;
  const secretKey = process.env.S3_SECRET_KEY || process.env.MINIO_SECRET_KEY;
  const bucketName = process.env.S3_BUCKET || process.env.MINIO_BUCKET_NAME || 'propertymanager';

  if (!accessKey || !secretKey) {
    throw new Error('S3_ACCESS_KEY/S3_SECRET_KEY (or MINIO_ACCESS_KEY/MINIO_SECRET_KEY) must be set');
  }

  // Parse endpoint URL
  let endpoint: string;
  let port: number;
  let useSSL: boolean;

  if (s3Endpoint.startsWith('http://') || s3Endpoint.startsWith('https://')) {
    const url = new URL(s3Endpoint);
    endpoint = url.hostname;
    port = parseInt(url.port || '9000', 10);
    useSSL = url.protocol === 'https:';
  } else {
    endpoint = s3Endpoint;
    port = parseInt(process.env.S3_PORT || process.env.MINIO_PORT || '9000', 10);
    useSSL = process.env.S3_USE_SSL === 'true' || process.env.MINIO_USE_SSL === 'true';
  }

  minioClient = new Client({
    endPoint: endpoint,
    port: port,
    useSSL: useSSL,
    accessKey: accessKey,
    secretKey: secretKey,
  });

  // Ensure bucket exists
  minioClient.bucketExists(bucketName).then((exists) => {
    if (!exists) {
      return minioClient!.makeBucket(bucketName, 'us-east-1');
    }
  }).catch((err) => {
    console.error('[MinIO] Error checking/creating bucket:', err);
  });

  return minioClient;
}

export class MinIOStorageService {
  private client: Client;
  private bucketName: string;

  constructor() {
    this.client = getMinioClient();
    this.bucketName = process.env.S3_BUCKET || process.env.MINIO_BUCKET_NAME || 'propertymanager';
  }

  // Get presigned upload URL
  async getPresignedUploadURL(objectName: string, expirySeconds: number = 900): Promise<string> {
    return await this.client.presignedPutObject(this.bucketName, objectName, expirySeconds);
  }

  // Get presigned download URL
  async getPresignedDownloadURL(objectName: string, expirySeconds: number = 3600): Promise<string> {
    return await this.client.presignedGetObject(this.bucketName, objectName, expirySeconds);
  }

  // Upload file directly
  async uploadFile(objectName: string, fileBuffer: Buffer, contentType: string): Promise<string> {
    await this.client.putObject(this.bucketName, objectName, fileBuffer, fileBuffer.length, {
      'Content-Type': contentType,
    });
    return `/${this.bucketName}/${objectName}`;
  }

  // Download file
  async downloadFile(objectName: string, res: Response): Promise<void> {
    const stream = await this.client.getObject(this.bucketName, objectName);
    
    // Get object stat for content type and size
    const stat = await this.client.statObject(this.bucketName, objectName);
    
    res.setHeader('Content-Type', stat.metaData['content-type'] || 'application/octet-stream');
    res.setHeader('Content-Length', stat.size);
    
    stream.pipe(res);
  }

  // Check if object exists
  async objectExists(objectName: string): Promise<boolean> {
    try {
      await this.client.statObject(this.bucketName, objectName);
      return true;
    } catch (error: any) {
      if (error.code === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  // Delete object
  async deleteObject(objectName: string): Promise<void> {
    await this.client.removeObject(this.bucketName, objectName);
  }

  // Generate unique object name for uploads
  generateObjectName(prefix: string = 'uploads'): string {
    const objectId = randomUUID();
    const timestamp = Date.now();
    return `${prefix}/${timestamp}-${objectId}`;
  }
}

// Check if MinIO/S3 is configured
export function isMinIOConfigured(): boolean {
  return !!(
    (process.env.S3_ACCESS_KEY || process.env.MINIO_ACCESS_KEY) &&
    (process.env.S3_SECRET_KEY || process.env.MINIO_SECRET_KEY) &&
    (process.env.S3_ENDPOINT || process.env.MINIO_ENDPOINT)
  );
}
