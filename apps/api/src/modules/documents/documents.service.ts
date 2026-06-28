import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { Document as DocumentEntity, DocType } from './entities/document.entity';
import { S3Service } from '../../shared/s3.service';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
const MAX_FILE_SIZE      = 5 * 1024 * 1024; // 5 MB

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg':    'jpg',
  'image/jpg':     'jpg',
  'image/png':     'png',
  'application/pdf': 'pdf',
};

// s3Key is internal — never included in API responses
type SafeDocument = Omit<DocumentEntity, 's3Key'>;

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(DocumentEntity)
    private readonly docRepo: Repository<DocumentEntity>,
    private readonly s3: S3Service,
  ) {}

  async upload(
    userId: string,
    file: Express.Multer.File,
    docType: DocType,
    displayName: string,
  ): Promise<SafeDocument> {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Allowed: JPEG, PNG, PDF.',
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('File too large. Maximum size is 5 MB.');
    }

    const ext = MIME_TO_EXT[file.mimetype] ?? 'bin';
    const key = `documents/${userId}/${randomUUID()}.${ext}`;

    await this.s3.uploadFile(file.buffer, key, file.mimetype);

    const saved = await this.docRepo.save(
      this.docRepo.create({
        userId,
        docType,
        displayName,
        s3Key:    key,
        fileSize: file.size,
        mimeType: file.mimetype,
      }),
    );

    return this.toSafe(saved);
  }

  async findAll(userId: string): Promise<SafeDocument[]> {
    const docs = await this.docRepo.find({
      where: { userId },
      order: { uploadedAt: 'DESC' },
    });
    return docs.map((d) => this.toSafe(d));
  }

  async getDownloadUrl(
    id: string,
    userId: string,
  ): Promise<{ url: string; expiresInSeconds: number }> {
    const doc = await this.docRepo.findOne({ where: { id, userId } });
    if (!doc) throw new ForbiddenException('Document not found');

    const url = await this.s3.getPresignedDownloadUrl(doc.s3Key);
    return { url, expiresInSeconds: 900 };
  }

  async delete(id: string, userId: string): Promise<void> {
    const doc = await this.docRepo.findOne({ where: { id, userId } });
    if (!doc) throw new ForbiddenException('Document not found');

    await this.s3.deleteFile(doc.s3Key);
    await this.docRepo.remove(doc);
  }

  private toSafe(doc: DocumentEntity): SafeDocument {
    return {
      id:          doc.id,
      userId:      doc.userId,
      docType:     doc.docType,
      displayName: doc.displayName,
      fileSize:    doc.fileSize,
      mimeType:    doc.mimeType,
      isVerified:  doc.isVerified,
      uploadedAt:  doc.uploadedAt,
    };
  }
}
