'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { billApi } from '@/lib/bill-api';
import type { BillPayment, BillSummary } from '@/types/bill';
import { BILL_TYPE_LABELS } from '@/types/bill';
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

function formatMonth(yyyyMmDd: string): string {
  const [y, m] = yyyyMmDd.split('-').map(Number);
  return new Date(y!, m! - 1, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
}

function today(): string {
  return new Date().toISOString().substring(0, 10);
}

type BillStatus = 'ontime' | 'late' | 'overdue' | 'pending';

function getBillStatus(bill: BillPayment): BillStatus {
  if (bill.isPaid && bill.paidDate) {
    return bill.paidDate <= bill.dueDate ? 'ontime' : 'late';
  }
  return bill.dueDate < today() ? 'overdue' : 'pending';
}

const STATUS_CONFIG: Record<BillStatus, { label: string; dot: string; badge: string }> = {
  ontime:  { label: 'Paid on time', dot: 'bg-green-500',  badge: 'bg-green-100 text-green-700' },
  late:    { label: 'Paid late',    dot: 'bg-amber-500',  badge: 'bg-amber-100 text-amber-700' },
  overdue: { label: 'Overdue',      dot: 'bg-red-500',    badge: 'bg-red-100 text-red-700' },
  pending: { label: 'Pending',      dot: 'bg-gray-400',   badge: 'bg-gray-100 text-gray-600' },
};

function onTimePctColor(pct: number): string {
  if (pct >= 0.8) return 'text-green-600';
  if (pct >= 0.6) return 'text-amber-600';
  return 'text-red-600';
}

function onTimePctBadge(pct: number): string {
  if (pct >= 0.8) return 'bg-green-100 text-green-700';
  if (pct >= 0.6) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BillsPage() {
  const [summary, setSummary] = useState<BillSummary | null>(null);
  const [bills, setBills] = useState<BillPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [summaryRes, listRes] = await Promise.all([
        billApi.getSummary(),
        billApi.getAll(1, 50),
      ]);
      setSummary(summaryRes);
      setBills(listRes.data);
    } catch {
      setError('Failed to load bills data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const handleMarkPaid = useCallback(async (id: string) => {
    try {
      const updated = await billApi.markPaid(id);
      setBills((prev) => prev.map((b) => (b.id === id ? updated : b)));
      // Refresh summary since on-time % may have changed
      const s = await billApi.getSummary();
      setSummary(s);
    } catch {
      alert('Failed to mark as paid. Please try again.');
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Delete this bill record?')) return;
    try {
      await billApi.delete(id);
      void fetchData();
    } catch {
      alert('Failed to delete. Please try again.');
    }
  }, [fetchData]);

  // Group bills by type for the grouped list view
  const groupedBills = bills.reduce<Record<string, BillPayment[]>>((acc, b) => {
    if (!acc[b.billType]) acc[b.billType] = [];
    acc[b.billType]!.push(b);
    return acc;
  }, {});

  return (
    <div className="container mx-auto max-w-4xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bills</h1>
          <p className="text-sm text-muted-foreground">Track your bill payment history</p>
        </div>
        <Link href="/bills/add">
          <Button>+ Add Bill</Button>
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => void fetchData()}>Retry</Button>
        </div>
      )}

      {/* Summary skeleton */}
      {isLoading && !summary && (
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-lg bg-muted" />)}
        </div>
      )}

      {/* Summary stats */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-3">
          {/* On-time % — large colored number */}
          <Card className="md:col-span-1">
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                On-time payment rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-4xl font-bold ${onTimePctColor(summary.onTimePct)}`}>
                {Math.round(summary.onTimePct * 100)}%
              </p>
              <p className="mt-1 text-xs text-muted-foreground">of all bills paid on time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total bills</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{summary.totalBills}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {summary.lateCount} paid late
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg days late
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {summary.avgDaysLate > 0 ? summary.avgDaysLate.toFixed(1) : '—'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {summary.avgDaysLate > 0 ? 'days (for late bills)' : 'no late payments'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bills list grouped by type */}
      {isLoading && bills.length === 0 ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-md bg-muted" />)}
        </div>
      ) : bills.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No bills recorded yet.{' '}
            <Link href="/bills/add" className="text-primary underline-offset-4 hover:underline">
              Add your first bill →
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {summary?.byType.map(({ type, count, onTimePct: typePct }) => {
            const typeBills = groupedBills[type];
            if (!typeBills || typeBills.length === 0) return null;
            return (
              <Card key={type}>
                {/* Group header */}
                <div className="flex items-center justify-between border-b px-6 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{BILL_TYPE_LABELS[type]}</span>
                    <span className="text-xs text-muted-foreground">({count})</span>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${onTimePctBadge(typePct)}`}
                  >
                    {Math.round(typePct * 100)}% on time
                  </span>
                </div>

                {/* Individual bill rows */}
                <div className="divide-y">
                  {typeBills.map((bill) => {
                    const status = getBillStatus(bill);
                    const cfg = STATUS_CONFIG[status];
                    return (
                      <div key={bill.id} className="flex items-center justify-between px-6 py-3">
                        <div className="flex items-center gap-3">
                          <span className={`h-2 w-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                          <div>
                            <p className="text-sm font-medium">
                              {formatMonth(bill.billMonth)}
                              {bill.provider && (
                                <span className="ml-1 text-muted-foreground">· {bill.provider}</span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Due {formatDate(bill.dueDate)}
                              {bill.paidDate && ` · Paid ${formatDate(bill.paidDate)}`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-sm font-semibold">{inr(parseFloat(bill.amount))}</p>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cfg.badge}`}>
                              {cfg.label}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            {!bill.isPaid && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => void handleMarkPaid(bill.id)}
                              >
                                Mark paid
                              </Button>
                            )}
                            <Link href={`/bills/add?id=${bill.id}`}>
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                                Edit
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                              onClick={() => void handleDelete(bill.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
