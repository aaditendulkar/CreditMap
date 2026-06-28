'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { adminApi } from '@/lib/admin-api';
import type { AdminUserDetail, AdminUserDocument } from '@/types/admin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// ── Helpers ───────────────────────────────────────────────────────────────────

const TIER_COLOR: Record<string, string> = {
  Poor:        'text-red-600',
  Fair:        'text-amber-500',
  Good:        'text-yellow-600',
  'Very Good': 'text-blue-600',
  Excellent:   'text-green-600',
};

const TIER_BG: Record<string, string> = {
  Poor:        'bg-red-100 text-red-700',
  Fair:        'bg-amber-100 text-amber-700',
  Good:        'bg-yellow-100 text-yellow-700',
  'Very Good': 'bg-blue-100 text-blue-700',
  Excellent:   'bg-green-100 text-green-700',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function formatSize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Sub-component ─────────────────────────────────────────────────────────────

function DocumentRow({
  doc,
  userId,
  onVerified,
}: {
  doc: AdminUserDocument;
  userId: string;
  onVerified: (id: string) => void;
}) {
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      await adminApi.verifyDocument(userId, doc.id);
      onVerified(doc.id);
    } catch {
      // Silently fail — user can retry
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
      <div className="min-w-0">
        <p className="truncate font-medium text-sm">{doc.displayName}</p>
        <p className="text-xs text-muted-foreground capitalize">
          {doc.docType.replace(/_/g, ' ')} · {formatSize(doc.fileSize)} · {formatDate(doc.uploadedAt)}
        </p>
      </div>
      {doc.isVerified ? (
        <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
          Verified
        </span>
      ) : (
        <Button
          size="sm"
          variant="outline"
          disabled={isVerifying}
          onClick={() => void handleVerify()}
        >
          {isVerifying ? 'Verifying…' : 'Mark Verified'}
        </Button>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const userId = params.id;

  const [detail,    setDetail]    = useState<AdminUserDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminApi.getUserDetail(userId);
      setDetail(res);
    } catch {
      setError('Failed to load user detail.');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => { void fetchDetail(); }, [fetchDetail]);

  const handleDocVerified = (docId: string) => {
    setDetail((prev) =>
      prev
        ? {
            ...prev,
            documents: prev.documents.map((d) =>
              d.id === docId ? { ...d, isVerified: true } : d,
            ),
          }
        : prev,
    );
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        {[0, 1, 2].map((i) => <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />)}
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-sm text-destructive">{error ?? 'User not found'}</p>
        <Button variant="outline" size="sm" onClick={() => void fetchDetail()}>Retry</Button>
      </div>
    );
  }

  const { user, profile, scores, counts, documents } = detail;

  return (
    <div className="p-8 space-y-6 max-w-3xl">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{user.firstName} {user.lastName}</h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-muted text-muted-foreground'
          }`}>
            {user.role}
          </span>
          {user.isEmailVerified && (
            <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
              Email verified
            </span>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Member since {formatDate(user.createdAt)}</p>

      {/* Profile */}
      {profile && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Profile</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-3">
              {Object.entries(profile as Record<string, unknown>)
                .filter(([k]) => !['id', 'user_id', 'created_at', 'updated_at'].includes(k))
                .map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs text-muted-foreground capitalize">{k.replace(/_/g, ' ')}</dt>
                    <dd className="font-medium">{v !== null && v !== undefined ? String(v) : '—'}</dd>
                  </div>
                ))}
            </dl>
          </CardContent>
        </Card>
      )}

      {/* Data counts */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Income',       value: counts.income },
          { label: 'Bills',        value: counts.bills },
          { label: 'Transactions', value: counts.transactions },
          { label: 'Documents',    value: counts.documents },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Score history */}
      {scores.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Score History (last 3)</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground">
                  <th className="pb-2 text-left font-medium">Date</th>
                  <th className="pb-2 text-left font-medium">Score</th>
                  <th className="pb-2 text-left font-medium">Income</th>
                  <th className="pb-2 text-left font-medium">Bills</th>
                  <th className="pb-2 text-left font-medium">Cash Flow</th>
                  <th className="pb-2 text-left font-medium">Profile</th>
                  <th className="pb-2 text-left font-medium">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {scores.map((s, i) => (
                  <tr key={i}>
                    <td className="py-2 text-muted-foreground">{formatDate(s.computedAt)}</td>
                    <td className="py-2">
                      <span className={`font-bold ${TIER_COLOR[s.tier] ?? ''}`}>{s.totalScore}</span>
                      <span className={`ml-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${TIER_BG[s.tier] ?? ''}`}>
                        {s.tier}
                      </span>
                    </td>
                    <td className="py-2">{s.incomeScore}</td>
                    <td className="py-2">{s.billScore}</td>
                    <td className="py-2">{s.cashFlowScore}</td>
                    <td className="py-2">{s.profileScore}</td>
                    <td className="py-2">{s.dataScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Documents */}
      {documents.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Documents</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {documents.map((doc) => (
              <DocumentRow
                key={doc.id}
                doc={doc}
                userId={user.id}
                onVerified={handleDocVerified}
              />
            ))}
          </CardContent>
        </Card>
      )}

    </div>
  );
}
