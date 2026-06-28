'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { adminApi } from '@/lib/admin-api';
import type { AdminUserRow } from '@/types/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ── Helpers ───────────────────────────────────────────────────────────────────

const TIER_COLOR: Record<string, string> = {
  Poor:        'text-red-600',
  Fair:        'text-amber-500',
  Good:        'text-yellow-600',
  'Very Good': 'text-blue-600',
  Excellent:   'text-green-600',
};

const SCORE_BANDS = [
  { value: '',          label: 'All Scores' },
  { value: 'poor',      label: 'Poor (<550)' },
  { value: 'fair',      label: 'Fair (550-649)' },
  { value: 'good',      label: 'Good (650-699)' },
  { value: 'veryGood',  label: 'Very Good (700-749)' },
  { value: 'excellent', label: 'Excellent (750+)' },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const [rows,      setRows]      = useState<AdminUserRow[]>([]);
  const [total,     setTotal]     = useState(0);
  const [page,      setPage]      = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  const [search,    setSearch]    = useState('');
  const [state,     setState]     = useState('');
  const [scoreBand, setScoreBand] = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPage = useCallback(async (p: number, s: string, st: string, sb: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminApi.getUsers({
        page: p,
        ...(s  ? { search:    s  } : {}),
        ...(st ? { state:     st } : {}),
        ...(sb ? { scoreBand: sb } : {}),
      });
      setRows(res.data);
      setTotal(res.total);
      setPage(res.page);
    } catch {
      setError('Failed to load users.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => { void fetchPage(1, '', '', ''); }, [fetchPage]);

  // Debounce search
  const handleSearch = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void fetchPage(1, value, state, scoreBand), 300);
  };

  const handleFilter = (newState: string, newBand: string) => {
    setState(newState);
    setScoreBand(newBand);
    void fetchPage(1, search, newState, newBand);
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-sm text-muted-foreground">{total} total</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-64"
        />
        <Input
          placeholder="Filter by state…"
          value={state}
          onChange={(e) => handleFilter(e.target.value, scoreBand)}
          className="w-40"
        />
        <select
          value={scoreBand}
          onChange={(e) => handleFilter(state, e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {SCORE_BANDS.map((b) => (
            <option key={b.value} value={b.value}>{b.label}</option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center justify-between rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => void fetchPage(page, search, state, scoreBand)}>
            Retry
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-auto rounded-xl border">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted/50">
            <tr>
              {['Name', 'Email', 'State', 'Occupation', 'Score', 'Onboarding', 'Joined'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-background">
            {isLoading && (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 animate-pulse rounded bg-muted" />
                    </td>
                  ))}
                </tr>
              ))
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No users found
                </td>
              </tr>
            )}
            {!isLoading && rows.map((row) => (
              <tr
                key={row.id}
                className="cursor-pointer hover:bg-accent transition-colors"
              >
                <td className="px-4 py-3 font-medium">
                  <a href={`/admin/users/${row.id}`} className="block hover:underline">
                    {row.firstName} {row.lastName}
                  </a>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{row.email}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.profile?.state ?? '—'}</td>
                <td className="px-4 py-3 text-muted-foreground capitalize">
                  {row.profile?.occupation?.replace(/_/g, ' ') ?? '—'}
                </td>
                <td className="px-4 py-3">
                  {row.latestScore ? (
                    <span className={`font-semibold ${TIER_COLOR[row.latestScore.tier] ?? ''}`}>
                      {row.latestScore.totalScore}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        ({row.latestScore.tier})
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {row.profile?.onboardingComplete ? (
                    <span className="text-green-600 font-semibold">✓</span>
                  ) : (
                    <span className="text-muted-foreground">✗</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatDate(row.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline" size="sm"
            disabled={page <= 1}
            onClick={() => void fetchPage(page - 1, search, state, scoreBand)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button
            variant="outline" size="sm"
            disabled={page >= totalPages}
            onClick={() => void fetchPage(page + 1, search, state, scoreBand)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
