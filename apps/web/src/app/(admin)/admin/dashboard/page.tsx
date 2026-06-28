'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/admin-api';
import type { AdminStats } from '@/types/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type {
  BarChart as BarChartType,
  Bar as BarType,
  XAxis as XAxisType,
  YAxis as YAxisType,
  Tooltip as TooltipType,
  ResponsiveContainer as ResponsiveContainerType,
} from 'recharts';

// SSR guard — Recharts uses browser APIs; loaded dynamically after mount
let BarChart: typeof BarChartType;
let Bar: typeof BarType;
let XAxis: typeof XAxisType;
let YAxis: typeof YAxisType;
let Tooltip: typeof TooltipType;
let ResponsiveContainer: typeof ResponsiveContainerType;

// ── Helpers ───────────────────────────────────────────────────────────────────

const inr = (n: number) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);

const TIER_COLOR: Record<string, string> = {
  Poor:        '#ef4444',
  Fair:        '#f59e0b',
  Good:        '#ca8a04',
  'Very Good': '#3b82f6',
  Excellent:   '#22c55e',
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const [stats,   setStats]   = useState<AdminStats | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Lazy-load Recharts after mount
    void import('recharts').then((rc) => {
      BarChart          = rc.BarChart;
      Bar               = rc.Bar;
      XAxis             = rc.XAxis;
      YAxis             = rc.YAxis;
      Tooltip           = rc.Tooltip;
      ResponsiveContainer = rc.ResponsiveContainer;
    });
    adminApi.getStats()
      .then(setStats)
      .catch(() => setError('Failed to load stats.'));
  }, []);

  if (error) {
    return (
      <div className="p-8 text-center text-sm text-destructive">{error}</div>
    );
  }

  if (!stats) {
    return (
      <div className="p-8 space-y-4">
        {[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />)}
      </div>
    );
  }

  const distData = [
    { name: 'Poor',      count: stats.scoreDistribution.poor,      fill: TIER_COLOR['Poor'] },
    { name: 'Fair',      count: stats.scoreDistribution.fair,      fill: TIER_COLOR['Fair'] },
    { name: 'Good',      count: stats.scoreDistribution.good,      fill: TIER_COLOR['Good'] },
    { name: 'Very Good', count: stats.scoreDistribution.veryGood,  fill: TIER_COLOR['Very Good'] },
    { name: 'Excellent', count: stats.scoreDistribution.excellent, fill: TIER_COLOR['Excellent'] },
  ];

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold">Platform Overview</h1>

      {/* User stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: 'Total Users',     value: inr(stats.totalUsers) },
          { label: 'Users with Score',value: inr(stats.usersWithScore) },
          { label: 'Avg Score',       value: stats.avgScore > 0 ? String(stats.avgScore) : '—' },
          { label: 'New This Week',   value: inr(stats.newUsersThisWeek) },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Score distribution chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Score Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {mounted && BarChart ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={distData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="Users" fill="#6366f1" radius={[4, 4, 0, 0]}>
                  {distData.map((entry) => (
                    // Individual bar colours via `fill` prop on Cell
                    // Using a plain rect workaround since Cell needs recharts import
                    <rect key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] animate-pulse rounded-lg bg-muted" />
          )}
        </CardContent>
      </Card>

      {/* Data volume */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Data Volume
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: 'Income Records',  value: inr(stats.totalIncomeRecords) },
            { label: 'Bill Records',    value: inr(stats.totalBillRecords) },
            { label: 'Transactions',    value: inr(stats.totalTransactions) },
            { label: 'Documents',       value: inr(stats.totalDocuments) },
          ].map(({ label, value }) => (
            <Card key={label}>
              <CardContent className="pt-5">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-bold">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
