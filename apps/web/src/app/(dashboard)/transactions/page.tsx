'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ResponsiveContainer,
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  Legend,
} from 'recharts';
import { transactionApi } from '@/lib/transaction-api';
import type { Transaction, TransactionSummary } from '@/types/transaction';
import { TXN_CATEGORY_LABELS, TXN_CHANNEL_LABELS } from '@/types/transaction';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// ── Helpers ───────────────────────────────────────────────────────────────────

const inr = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);

function formatDate(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  return new Date(y!, m! - 1, d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function abbrevMonth(yyyyMm: string): string {
  const [y, m] = yyyyMm.split('-').map(Number);
  return new Date(y!, m! - 1, 1).toLocaleDateString('en-IN', { month: 'short' });
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TransactionsPage() {
  const [summary, setSummary]   = useState<TransactionSummary | null>(null);
  const [txns, setTxns]         = useState<Transaction[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [mounted, setMounted]   = useState(false);

  const LIMIT = 20;

  useEffect(() => { setMounted(true); }, []);

  const fetchData = useCallback(async (p: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const [summaryRes, listRes] = await Promise.all([
        transactionApi.getSummary(),
        transactionApi.getAll(p, LIMIT),
      ]);
      setSummary(summaryRes);
      setTxns(listRes.data);
      setTotal(listRes.total);
    } catch {
      setError('Failed to load transactions.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void fetchData(page); }, [fetchData, page]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Delete this transaction?')) return;
    try {
      await transactionApi.delete(id);
      void fetchData(page);
    } catch {
      alert('Failed to delete. Please try again.');
    }
  }, [fetchData, page]);

  const totalPages = Math.ceil(total / LIMIT);
  const netPositive = (summary?.netFlow ?? 0) >= 0;

  return (
    <div className="container mx-auto max-w-5xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-sm text-muted-foreground">Credits and debits across all channels</p>
        </div>
        <Link href="/transactions/add">
          <Button>+ Add Transaction</Button>
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => void fetchData(page)}>Retry</Button>
        </div>
      )}

      {/* Summary skeletons */}
      {isLoading && !summary && (
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />)}
        </div>
      )}

      {/* Summary cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Credits</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{inr(summary.totalCredits)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Debits</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">{inr(summary.totalDebits)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">Net Flow</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${netPositive ? 'text-green-600' : 'text-red-600'}`}>
                {netPositive ? '+' : ''}{inr(summary.netFlow)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Monthly trend chart */}
      {summary && mounted && summary.monthlyTrend.some((m) => m.credits > 0 || m.debits > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Monthly Cash Flow (last 12 months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={summary.monthlyTrend} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                <XAxis
                  dataKey="month"
                  tickFormatter={(v) => abbrevMonth(String(v))}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  tickFormatter={(v) =>
                    typeof v === 'number' && v >= 1000 ? `₹${(v / 1000).toFixed(0)}K` : `₹${v}`
                  }
                  width={52}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(value, name) => [
                    typeof value === 'number' ? inr(value) : '',
                    name === 'credits' ? 'Credits' : 'Debits',
                  ]}
                  labelFormatter={(label) =>
                    typeof label === 'string' ? abbrevMonth(label) : String(label ?? '')
                  }
                />
                <Legend formatter={(v) => v === 'credits' ? 'Credits' : 'Debits'} />
                <Bar dataKey="credits" fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="debits"  fill="#dc2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Transactions table */}
      {isLoading && txns.length === 0 ? (
        <div className="space-y-2">
          {[0, 1, 2, 4].map((i) => <div key={i} className="h-14 animate-pulse rounded-md bg-muted" />)}
        </div>
      ) : txns.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No transactions recorded yet.{' '}
            <Link href="/transactions/add" className="text-primary underline-offset-4 hover:underline">
              Add your first transaction →
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Channel</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {txns.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {formatDate(t.txnDate)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          t.type === 'credit'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {t.type === 'credit' ? '↑ Credit' : '↓ Debit'}
                      </span>
                    </td>
                    <td className="px-4 py-3">{TXN_CATEGORY_LABELS[t.category]}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {t.channel ? TXN_CHANNEL_LABELS[t.channel] : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[180px] truncate">
                      {t.description ?? '—'}
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold ${
                      t.type === 'credit' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {t.type === 'credit' ? '+' : '-'}{inr(parseFloat(t.amount))}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                        onClick={() => void handleDelete(t.id)}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
