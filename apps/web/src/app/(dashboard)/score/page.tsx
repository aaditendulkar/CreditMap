'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { scoreApi } from '@/lib/score-api';
import type { ScoreBreakdown, ScoreHistoryItem, ScoreTier } from '@/types/score';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// ── Helpers ───────────────────────────────────────────────────────────────────

const TIER_COLOR: Record<ScoreTier, string> = {
  Poor:       'text-red-600',
  Fair:       'text-amber-500',
  Good:       'text-yellow-600',
  'Very Good':'text-blue-600',
  Excellent:  'text-green-600',
};

const TIER_BG: Record<ScoreTier, string> = {
  Poor:       'bg-red-100 text-red-700',
  Fair:       'bg-amber-100 text-amber-700',
  Good:       'bg-yellow-100 text-yellow-700',
  'Very Good':'bg-blue-100 text-blue-700',
  Excellent:  'bg-green-100 text-green-700',
};

function barColor(sub: number): string {
  if (sub >= 80) return 'bg-green-500';
  if (sub >= 60) return 'bg-blue-500';
  if (sub >= 40) return 'bg-amber-400';
  return 'bg-red-400';
}

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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// Maps 300–850 to 0–100 for the hero progress ring
function totalPct(score: number): number {
  return Math.round(((score - 300) / 550) * 100);
}

function getTips(s: ScoreBreakdown): string[] {
  const tips: string[] = [];
  if (s.incomeScore < 60)
    tips.push(
      s.incomeScore === 0
        ? 'Add at least one month of income — even a single record starts your income score.'
        : 'Record income for more months. Aim for 6+ consecutive months to reach full consistency.',
    );
  if (s.billScore < 60)
    tips.push(
      s.billScore === 0
        ? 'Start logging your bills (electricity, mobile, rent). Each bill type you add diversifies your history.'
        : 'Pay bills on or before the due date. On-time rate is the largest driver of your bill score.',
    );
  if (s.cashFlowScore < 60)
    tips.push(
      s.cashFlowScore === 0
        ? 'Log your UPI or bank transactions. Digital payments are traceable and boost your cash flow score.'
        : 'Prefer UPI, NEFT, or bank transfer over cash. Every digital payment strengthens your financial trail.',
    );
  if (s.profileScore < 60)
    tips.push('Complete your profile: add your bank account, UPI, and fill in state, district, and date of birth.');
  if (s.dataScore < 60)
    tips.push('More data = a more trustworthy score. Keep adding records each month to build a longer history.');
  return tips.slice(0, 3);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SubScoreRow({
  label,
  weight,
  value,
}: {
  label: string;
  weight: string;
  value: number;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{weight}</span>
          <span className="w-10 text-right font-semibold tabular-nums">{value}</span>
          <span className="text-xs text-muted-foreground">/100</span>
        </div>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor(value)}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ScorePage() {
  const [score,      setScore]      = useState<ScoreBreakdown | null>(null);
  const [history,    setHistory]    = useState<ScoreHistoryItem[]>([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [computing,  setComputing]  = useState(false);
  const [mounted,    setMounted]    = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [scoreRes, histRes] = await Promise.all([
        scoreApi.getMyScore(),
        scoreApi.getMyHistory(),
      ]);
      setScore(scoreRes.score);
      setHistory(histRes.history);
    } catch {
      setError('Failed to load your credit score.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  const handleRecompute = useCallback(async () => {
    setComputing(true);
    try {
      await scoreApi.recompute();
      // Give the job ~3 s to process, then refresh
      await new Promise((r) => setTimeout(r, 3000));
      await fetchAll();
    } catch {
      setError('Failed to trigger recomputation. Please try again.');
    } finally {
      setComputing(false);
    }
  }, [fetchAll]);

  // History displayed oldest-first for the left→right chart
  const chartData = [...history].reverse();
  const tips      = score ? getTips(score) : [];

  return (
    <div className="container mx-auto max-w-3xl p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Credit Score</h1>
          <p className="text-sm text-muted-foreground">
            Based on your income, bills, and transaction history
          </p>
        </div>
        <Button
          onClick={() => void handleRecompute()}
          disabled={computing || isLoading}
          variant="outline"
          size="sm"
        >
          {computing ? 'Recalculating…' : 'Recalculate'}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center justify-between rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => void fetchAll()}>Retry</Button>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-4">
          <div className="h-44 animate-pulse rounded-xl bg-muted" />
          <div className="h-48 animate-pulse rounded-xl bg-muted" />
        </div>
      )}

      {/* No score yet */}
      {!isLoading && !score && !error && (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <p className="text-4xl font-bold text-muted-foreground">—</p>
            <p className="font-medium">No score yet</p>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Add some income records, bill payments, or transactions, then click
              <span className="font-medium"> Recalculate</span> to compute your first score.
            </p>
            <Button onClick={() => void handleRecompute()} disabled={computing}>
              {computing ? 'Calculating…' : 'Calculate now'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Score hero */}
      {!isLoading && score && (
        <>
          <Card>
            <CardContent className="py-8">
              <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center sm:gap-8">

                {/* Score ring — simple CSS arc using conic-gradient */}
                <div className="relative flex h-36 w-36 shrink-0 items-center justify-center">
                  <svg className="absolute inset-0 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.9"
                      fill="none" stroke="currentColor"
                      strokeWidth="2.5" className="text-muted" />
                    <circle cx="18" cy="18" r="15.9"
                      fill="none" stroke="currentColor"
                      strokeWidth="2.5"
                      strokeDasharray={`${totalPct(score.totalScore)} 100`}
                      strokeLinecap="round"
                      className={TIER_COLOR[score.tier]}
                    />
                  </svg>
                  <div className="text-center">
                    <p className={`text-3xl font-bold tabular-nums ${TIER_COLOR[score.tier]}`}>
                      {score.totalScore}
                    </p>
                    <p className="text-xs text-muted-foreground">/ 850</p>
                  </div>
                </div>

                {/* Right side details */}
                <div className="flex-1 space-y-3 text-center sm:text-left">
                  <div className="flex items-center justify-center gap-2 sm:justify-start">
                    <span className={`rounded-full px-3 py-1 text-sm font-semibold ${TIER_BG[score.tier]}`}>
                      {score.tier}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Score range: 300 (no data) → 850 (perfect)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Last computed: {timeAgo(score.computedAt)} · v{score.scoreVersion}
                  </p>
                  <div className="flex flex-wrap justify-center gap-4 sm:justify-start">
                    {(
                      [
                        { label: 'Poor',      range: '300–549', active: score.totalScore < 550 },
                        { label: 'Fair',      range: '550–649', active: score.totalScore >= 550 && score.totalScore < 650 },
                        { label: 'Good',      range: '650–699', active: score.totalScore >= 650 && score.totalScore < 700 },
                        { label: 'Very Good', range: '700–749', active: score.totalScore >= 700 && score.totalScore < 750 },
                        { label: 'Excellent', range: '750+',    active: score.totalScore >= 750 },
                      ] as const
                    ).map((t) => (
                      <div key={t.label} className={`text-center ${t.active ? 'opacity-100' : 'opacity-30'}`}>
                        <p className="text-xs font-semibold">{t.label}</p>
                        <p className="text-[10px] text-muted-foreground">{t.range}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sub-score breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Score Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <SubScoreRow label="Income"     weight="25% of total" value={score.incomeScore} />
              <SubScoreRow label="Bills"      weight="30% of total" value={score.billScore} />
              <SubScoreRow label="Cash Flow"  weight="20% of total" value={score.cashFlowScore} />
              <SubScoreRow label="Profile"    weight="15% of total" value={score.profileScore} />
              <SubScoreRow label="Data depth" weight="10% of total" value={score.dataScore} />
            </CardContent>
          </Card>

          {/* Score history chart */}
          {mounted && chartData.length >= 2 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Score History</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="computedAt"
                      tickFormatter={(v) => formatDate(String(v))}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      domain={[300, 850]}
                      tick={{ fontSize: 11 }}
                      width={40}
                    />
                    <Tooltip
                      formatter={(value) => [
                        typeof value === 'number' ? value : '',
                        'Score',
                      ]}
                      labelFormatter={(label) => formatDate(String(label))}
                    />
                    <Line
                      type="monotone"
                      dataKey="totalScore"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Tips */}
          {tips.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">How to improve your score</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {tips.map((tip, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {i + 1}
                      </span>
                      <span className="text-muted-foreground">{tip}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
