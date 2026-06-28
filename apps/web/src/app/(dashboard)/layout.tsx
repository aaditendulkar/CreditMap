'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { notificationsApi } from '@/lib/notifications-api';
import type { AppNotification } from '@/types/notifications';

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function typeIcon(type: AppNotification['type']): string {
  if (type === 'score_improved') return '📈';
  if (type === 'score_dropped')  return '📉';
  if (type === 'document_verified') return '✅';
  if (type === 'loan_offer')     return '💰';
  return '🔔';
}

// ── Bell dropdown ─────────────────────────────────────────────────────────────

function NotificationBell() {
  const router = useRouter();
  const [unread,   setUnread]   = useState(0);
  const [open,     setOpen]     = useState(false);
  const [items,    setItems]    = useState<AppNotification[]>([]);
  const [loading,  setLoading]  = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchCount = useCallback(async () => {
    try {
      const count = await notificationsApi.getUnreadCount();
      setUnread(count);
    } catch {
      // Silently ignore — bell is non-critical
    }
  }, []);

  // Poll every 60 seconds
  useEffect(() => {
    void fetchCount();
    const id = setInterval(() => void fetchCount(), 60_000);
    return () => clearInterval(id);
  }, [fetchCount]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const openPanel = async () => {
    setOpen((o) => !o);
    if (!open) {
      setLoading(true);
      try {
        const res = await notificationsApi.getAll(1, 10);
        setItems(res.data);
      } catch {
        // Panel shows empty state
      } finally {
        setLoading(false);
      }
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setUnread(0);
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      // Silently ignore
    }
  };

  const handleItemClick = async (n: AppNotification) => {
    try {
      if (!n.isRead) {
        await notificationsApi.markRead(n.id);
        setUnread((c) => Math.max(0, c - 1));
        setItems((prev) =>
          prev.map((item) => (item.id === n.id ? { ...item, isRead: true } : item)),
        );
      }
    } catch {
      // Silently ignore
    } finally {
      setOpen(false);
      // actionUrl is always a known internal path — cast router.push for dynamic routing
      if (n.actionUrl) (router.push as (href: string) => void)(n.actionUrl);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => void openPanel()}
        className="relative rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 rounded-xl border bg-background shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <p className="text-sm font-semibold">Notifications</p>
            {unread > 0 && (
              <button
                onClick={() => void handleMarkAllRead()}
                className="text-xs text-primary hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {loading && (
              <div className="space-y-2 p-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            )}
            {!loading && items.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No notifications yet
              </p>
            )}
            {!loading && items.map((n) => (
              <button
                key={n.id}
                onClick={() => void handleItemClick(n)}
                className={`flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-accent ${
                  !n.isRead ? 'bg-primary/5' : ''
                }`}
              >
                <span className="mt-0.5 shrink-0 text-base">{typeIcon(n.type)}</span>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm leading-tight ${!n.isRead ? 'font-semibold' : 'font-medium'}`}>
                    {n.title}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {n.body.length > 60 ? n.body.slice(0, 60) + '…' : n.body}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{timeAgo(n.createdAt)}</p>
                </div>
                {!n.isRead && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="border-t px-4 py-2">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block text-center text-xs text-primary hover:underline"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Persistent top bar with bell — visible on all dashboard pages */}
      <div className="fixed right-4 top-3 z-40">
        <NotificationBell />
      </div>
      {children}
    </div>
  );
}
