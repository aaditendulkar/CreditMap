'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { incomeApi } from '@/lib/income-api';
import type { IncomeRecord, IncomeSummary } from '@/types/income';
import { INCOME_SOURCE_LABELS } from '@/types/income';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// ── Helpers ───────────────────────────────────────────────────────────────────

const inr = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);

function formatMonth(yyyyMmDd: string): string {
  const [year, month] = yyyyMmDd.split('-').map(Number);
  return new Date(year!, month! - 1, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
}

function formatChartMonth(yyyyMm: string): string {
  const [year, month] = yyyyMm.split('-').map(Number);
  return new Date(year!, month! - 1, 1).toLocaleDateString('en-IN', { month: 'short' });
}

const SOURCE_COLORS: Record<string, string> = {
  salary: 'bg-blue-100 text-blue-700',
  daily_wage: 'bg-orange-100 text-orange-700',
  business: 'bg-purple-100 text-purple-700',
  freelance: 'bg-pink-100 text-pink-700',
  farm: 'bg-green-100 text-green-700',
  rent: 'bg-amber-100 text-amber-700',
  other: 'bg-gray-100 text-gray-700',
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function IncomePage() {
  const [summary, setSummary] = useState<IncomeSummary | null>(null);
  const [records, setRecords] = useState<IncomeRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const fetchData = useCallback(async (p: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const [summaryRes, listRes] = await Promise.all([
        incomeApi.getSummary(),
        incomeApi.getAll(p, 12),
      ]);
      setSummary(summaryRes);
      setRecords(listRes.data);
      setTotal(listRes.total);
    } catch {
      setError('Failed to load income data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData(page);
  }, [fetchData, page]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Delete this income record?')) return;
    try {
      await incomeApi.delete(id);
      void fetchData(page);
    } catch {
      alert('Failed to delete. Please try again.');
    }
  }, [fetchData, page]);

  return (
    <div className="container mx-auto max-w-4xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Income</h1>
          <p className="text-sm text-muted-foreground">Track your monthly income sources</p>
        </div>
        <Link href="/income/add">
          <Button>+ Add Income</Button>
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => void fetchData(page)}>
            Retry
          </Button>
        </div>
      )}

      {/* Summary cards skeleton */}
      {isLoading && !summary && (
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      )}

      {/* Summary cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg monthly income
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{inr(summary.avgMonthly)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total income recorded
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{inr(summary.totalIncome)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Months of data
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {summary.monthsOfData}
                <span className="text-sm font-normal text-muted-foreground ml-1">months</span>
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chart */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly income — last 12 months</CardTitle>
          </CardHeader>
          <CardContent>
            {mounted ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={summary.monthlyTrend} margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                    tickFormatter={formatChartMonth}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: number) =>
                      v >= 1000 ? `₹${(v / 1000).toFixed(0)}K` : `₹${v}`
                    }
                    width={52}
                  />
                  <Tooltip
                    formatter={(value) => [typeof value === 'number' ? inr(value) : '', 'Income']}
                    labelFormatter={(label) => typeof label === 'string' ? formatMonth(label + '-01') : String(label ?? '')}
                  />
                  <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] animate-pulse rounded-md bg-muted" />
            )}
          </CardContent>
        </Card>
      )}

      {/* Records table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Records
            {total > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({total} total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && records.length === 0 ? (
            <div className="space-y-px">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-14 animate-pulse bg-muted mx-6 mb-2 rounded-md" />
              ))}
            </div>
          ) : records.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No income records yet.{' '}
              <Link href="/income/add" className="text-primary underline-offset-4 hover:underline">
                Add your first one →
              </Link>
            </p>
          ) : (
            <div className="divide-y">
              {records.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-6 py-3">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm font-medium">{formatMonth(r.recordMonth)}</p>
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${SOURCE_COLORS[r.source] ?? 'bg-gray-100 text-gray-700'}`}
                      >
                        {INCOME_SOURCE_LABELS[r.source] ?? r.source}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-sm font-semibold">{inr(parseFloat(r.amount))}</p>
                    <div className="flex gap-1">
                      <Link href={`/income/add?id=${r.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                          Edit
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                        onClick={() => void handleDelete(r.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {total > 12 && (
            <div className="flex items-center justify-between border-t px-6 py-3">
              <p className="text-xs text-muted-foreground">
                Page {page} of {Math.ceil(total / 12)}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page * 12 >= total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
