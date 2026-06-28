export type NotificationType =
  | 'score_updated'
  | 'score_improved'
  | 'score_dropped'
  | 'loan_offer'
  | 'document_verified'
  | 'tip';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  actionUrl: string | null;
  createdAt: string;
}

export interface NotificationsResponse {
  data: AppNotification[];
  total: number;
  page: number;
  limit: number;
}
