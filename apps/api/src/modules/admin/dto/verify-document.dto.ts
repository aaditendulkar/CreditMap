import { IsUUID } from 'class-validator';

export class VerifyDocumentDto {
  @IsUUID()
  documentId!: string;
}
