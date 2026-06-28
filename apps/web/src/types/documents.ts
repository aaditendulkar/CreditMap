export type DocumentType =
  | 'pan'
  | 'aadhaar'
  | 'rent_receipt'
  | 'salary_slip'
  | 'bank_statement'
  | 'utility_bill'
  | 'other';

// Named UserDocument to avoid conflict with the global DOM Document type
export interface UserDocument {
  id: string;
  userId: string;
  docType: DocumentType;
  displayName: string;
  fileSize: number | null;
  mimeType: string | null;
  isVerified: boolean;
  uploadedAt: string;
}

export interface DownloadUrlResponse {
  url: string;
  expiresInSeconds: number;
}
