'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { notificationsApi } from '@/lib/notifications-api';
import type { AppNotification } from '@/types/notifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function typeIcon(type: AppNotification['type']): string {
  if (type === 'score_improved')    return '📈';
  if (type === 'score_dropped')     return '📉';
  if (type === 'document_verified') return '✅';
  if (type === 'loan_offer')        return '💰';
  return '🔔';
}

const PAGE_SIZE = 20;

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const router = useRouter();
  const [items,     setItems]     = useState<AppNotification[]>([]);
  const [total,     setTotal]     = useState(0);
  const [page,      setPage]      = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  const fetchPage = useCallback(async (p: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await notificationsApi.getAll(p, PAGE_SIZE);
      setItems(res.data);
      setTotal(res.total);
      setPage(res.page);
    } catch {
      setError('Failed to load notifications.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void fetchPage(1); }, [fetchPage]);

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      // Silently ignore
    }
  };

  const handleItemClick = async (n: AppNotification) => {
    try {
      if (!n.isRead) {
        await notificationsApi.markRead(n.id);
        setItems((prev) =>
          prev.map((item) => (item.id === n.id ? { ...item, isRead: true } : item)),
        );
      }
    } catch {
      // Silently ignore
    } finally {
      if (n.actionUrl) (router.push as (href: string) => void)(n.actionUrl);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasUnread = items.some((n) => !n.isRead);

  return (
    <div className="container mx-auto max-w-2xl p-6 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          {total > 0 && (
            <p className="text-sm text-muted-foreground">{total} total</p>
          )}
        </div>
        {hasUnread && (
          <Button variant="outline" size="sm" onClick={() => void handleMarkAllRead()}>
            Mark all read
          </Button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center justify-between rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => void fetchPage(page)}>Retry</Button>
        </div>
      )}

      {/* Loading skeletons */}
      {isLoading && (
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && items.length === 0 && !error && (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-4xl">🔔</p>
            <p className="mt-3 font-semibold">No notifications yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              We&apos;ll notify you when your score changes or documents are verified.
            </p>
          </CardContent>
        </Card>
      )}

      {/* List */}
      {!isLoading && items.length > 0 && (
        <div className="space-y-2">
          {items.map((n) => (
            <button
              key={n.id}
              onClick={() => void handleItemClick(n)}
              className={`flex w-full gap-4 rounded-xl border px-4 py-4 text-left transition-colors hover:bg-accent ${
                !n.isRead ? 'border-primary/30 bg-primary/5' : 'bg-background'
              }`}
            >
              <span className="mt-0.5 shrink-0 text-2xl">{typeIcon(n.type)}</span>
              <div className="min-w-0 flex-1">
                <p className={`text-sm leading-tight ${!n.isRead ? 'font-semibold' : 'font-medium'}`}>
                  {n.title}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
                <p className="mt-1.5 text-xs text-muted-foreground">{timeAgo(n.createdAt)}</p>
              </div>
              {!n.isRead && (
                <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => void fetchPage(page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => void fetchPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
