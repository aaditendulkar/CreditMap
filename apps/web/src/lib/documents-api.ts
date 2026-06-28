import { apiClient } from './api-client';
import type { UserDocument, DownloadUrlResponse } from '@/types/documents';

export const documentsApi = {
  uploadDocument: async (
    file: File,
    docType: string,
    displayName: string,
  ): Promise<UserDocument> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('docType', docType);
    formData.append('displayName', displayName);
    // Do NOT set Content-Type — Axios sets multipart/form-data with boundary automatically
    const res = await apiClient.post<UserDocument>('/documents/upload', formData);
    return res.data;
  },

  getMyDocuments: async (): Promise<UserDocument[]> => {
    const res = await apiClient.get<UserDocument[]>('/documents');
    return res.data;
  },

  getDownloadUrl: async (id: string): Promise<DownloadUrlResponse> => {
    const res = await apiClient.get<DownloadUrlResponse>(`/documents/${id}/download`);
    return res.data;
  },

  deleteDocument: async (id: string): Promise<void> => {
    await apiClient.delete(`/documents/${id}`);
  },
};
