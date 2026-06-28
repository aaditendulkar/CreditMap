'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FileText, ImageIcon, Download, Trash2 } from 'lucide-react';
import { documentsApi } from '@/lib/documents-api';
import type { UserDocument, DocumentType } from '@/types/documents';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// ── Helpers ───────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  pan:            'PAN Card',
  aadhaar:        'Aadhaar Card',
  rent_receipt:   'Rent Receipt',
  salary_slip:    'Salary Slip',
  bank_statement: 'Bank Statement',
  utility_bill:   'Utility Bill',
  other:          'Other',
};

const DOC_TYPE_OPTIONS: Array<{ value: DocumentType; label: string }> = [
  { value: 'pan',            label: 'PAN Card' },
  { value: 'aadhaar',        label: 'Aadhaar Card' },
  { value: 'rent_receipt',   label: 'Rent Receipt' },
  { value: 'salary_slip',    label: 'Salary Slip' },
  { value: 'bank_statement', label: 'Bank Statement' },
  { value: 'utility_bill',   label: 'Utility Bill' },
  { value: 'other',          label: 'Other' },
];

function formatSize(bytes: number | null): string {
  if (!bytes) return 'Unknown size';
  if (bytes < 1024)              return `${bytes} B`;
  if (bytes < 1024 * 1024)      return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function DocIcon({ mimeType }: { mimeType: string | null }) {
  if (mimeType === 'application/pdf') {
    return <FileText className="h-8 w-8 text-red-500" />;
  }
  return <ImageIcon className="h-8 w-8 text-blue-500" />;
}

// ── Upload form schema ────────────────────────────────────────────────────────

const DOC_TYPE_VALUES = [
  'pan', 'aadhaar', 'rent_receipt', 'salary_slip',
  'bank_statement', 'utility_bill', 'other',
] as const;

const uploadSchema = z.object({
  displayName: z
    .string()
    .min(1, 'Label is required')
    .max(200, 'Max 200 characters'),
  docType: z.enum(DOC_TYPE_VALUES, { message: 'Select a document type' }),
});

type UploadForm = z.infer<typeof uploadSchema>;

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const [docs,          setDocs]          = useState<UserDocument[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [listError,     setListError]     = useState<string | null>(null);

  const [selectedFile,  setSelectedFile]  = useState<File | null>(null);
  const [fileError,     setFileError]     = useState<string | null>(null);
  const [isUploading,   setIsUploading]   = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError,   setUploadError]   = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId,    setDeletingId]    = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UploadForm>({ resolver: zodResolver(uploadSchema) });

  const fetchDocs = useCallback(async () => {
    setIsLoadingList(true);
    setListError(null);
    try {
      const list = await documentsApi.getMyDocuments();
      setDocs(list);
    } catch {
      setListError('Failed to load documents.');
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  useEffect(() => { void fetchDocs(); }, [fetchDocs]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setFileError(null);
    if (file && file.size > MAX_FILE_SIZE) {
      setFileError('File too large. Max 5MB allowed.');
    }
  };

  const onSubmit = async (data: UploadForm) => {
    if (!selectedFile) {
      setFileError('Please select a file.');
      return;
    }
    if (selectedFile.size > MAX_FILE_SIZE) {
      setFileError('File too large. Max 5MB allowed.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      await documentsApi.uploadDocument(selectedFile, data.docType, data.displayName);
      reset();
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
      await fetchDocs();
    } catch {
      setUploadError('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (doc: UserDocument) => {
    setDownloadingId(doc.id);
    try {
      const { url } = await documentsApi.getDownloadUrl(doc.id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      // Silently fail — the button returns to normal
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await documentsApi.deleteDocument(id);
      setDocs((prev) => prev.filter((d) => d.id !== id));
    } catch {
      // Silently fail — user can retry
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl p-6 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Document Vault</h1>
        <p className="text-sm text-muted-foreground">
          Store your identity and financial documents securely
        </p>
      </div>

      {/* Upload section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Upload a document</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4">

            {/* File picker */}
            <div className="space-y-1">
              <Label htmlFor="file">File <span className="text-xs text-muted-foreground">(Max 5 MB · JPEG, PNG, PDF)</span></Label>
              <input
                id="file"
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                onChange={onFileChange}
                className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium file:cursor-pointer"
              />
              {selectedFile && !fileError && (
                <p className="text-xs text-muted-foreground">
                  Selected: {selectedFile.name} ({formatSize(selectedFile.size)})
                </p>
              )}
              {fileError && <p className="text-xs text-destructive">{fileError}</p>}
            </div>

            {/* Display name */}
            <div className="space-y-1">
              <Label htmlFor="displayName">Label this document</Label>
              <Input
                id="displayName"
                placeholder='e.g. "January Salary Slip"'
                {...register('displayName')}
              />
              {errors.displayName && (
                <p className="text-xs text-destructive">{errors.displayName.message}</p>
              )}
            </div>

            {/* Document type */}
            <div className="space-y-1">
              <Label htmlFor="docType">Document type</Label>
              <select
                id="docType"
                {...register('docType')}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select type…</option>
                {DOC_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {errors.docType && (
                <p className="text-xs text-destructive">{errors.docType.message}</p>
              )}
            </div>

            {/* Feedback messages */}
            {uploadError && (
              <p className="text-sm text-destructive">{uploadError}</p>
            )}
            {uploadSuccess && (
              <p className="text-sm text-green-600">Document uploaded successfully.</p>
            )}

            <Button type="submit" disabled={isUploading || !!fileError}>
              {isUploading ? 'Uploading…' : 'Upload document'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Documents list */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Your documents
        </h2>

        {/* List error */}
        {listError && (
          <div className="flex items-center justify-between rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <span>{listError}</span>
            <Button variant="outline" size="sm" onClick={() => void fetchDocs()}>Retry</Button>
          </div>
        )}

        {/* Loading skeletons */}
        {isLoadingList && (
          <div className="grid gap-4 md:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-44 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoadingList && docs.length === 0 && !listError && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No documents uploaded yet. Upload your first document above.
          </p>
        )}

        {/* Grid */}
        {!isLoadingList && docs.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            {docs.map((doc) => (
              <Card key={doc.id} className="flex flex-col">
                <CardContent className="flex flex-1 flex-col gap-3 pt-5">

                  {/* Top row: icon + info */}
                  <div className="flex items-start gap-3">
                    <div className="shrink-0">
                      <DocIcon mimeType={doc.mimeType} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{doc.displayName}</p>
                      <p className="text-xs text-muted-foreground">
                        {DOC_TYPE_LABELS[doc.docType]}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatSize(doc.fileSize)} · {timeAgo(doc.uploadedAt)}
                      </p>
                    </div>
                    {/* Verified badge */}
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        doc.isVerified
                          ? 'bg-green-100 text-green-700'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {doc.isVerified ? 'Verified' : 'Unverified'}
                    </span>
                  </div>

                  {/* Actions */}
                  {confirmDeleteId === doc.id ? (
                    // Inline delete confirmation
                    <div className="rounded-md bg-destructive/10 p-3 space-y-2">
                      <p className="text-sm font-medium text-destructive">
                        Delete this document? This cannot be undone.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setConfirmDeleteId(null)}
                          disabled={deletingId === doc.id}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => void handleDelete(doc.id)}
                          disabled={deletingId === doc.id}
                        >
                          {deletingId === doc.id ? 'Deleting…' : 'Delete'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-auto flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        disabled={downloadingId === doc.id}
                        onClick={() => void handleDownload(doc)}
                      >
                        <Download className="mr-1.5 h-3.5 w-3.5" />
                        {downloadingId === doc.id ? 'Downloading…' : 'Download'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setConfirmDeleteId(doc.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
