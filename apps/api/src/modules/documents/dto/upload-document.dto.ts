import { IsEnum, IsString, MaxLength } from 'class-validator';
import { DocType } from '../entities/document.entity';

export class UploadDocumentDto {
  @IsEnum(DocType)
  docType!: DocType;

  @IsString()
  @MaxLength(200)
  displayName!: string;
}
