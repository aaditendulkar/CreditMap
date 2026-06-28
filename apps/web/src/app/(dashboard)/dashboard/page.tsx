'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { incomeApi } from '@/lib/income-api';
import { billApi } from '@/lib/bill-api';
import { transactionApi } from '@/lib/transaction-api';
import { profileApi } from '@/lib/profile-api';
import { scoreApi } from '@/lib/score-api';
import { loansApi } from '@/lib/loans-api';
import { documentsApi } from '@/lib/documents-api';
import type { IncomeSummary } from '@/types/income';
import { INCOME_SOURCE_LABELS } from '@/types/income';
import type { BillSummary } from '@/types/bill';
import type { TransactionSummary } from '@/types/transaction';
import type { ScoreBreakdown, ScoreTier } from '@/types/score';
import { CreditCard, FolderOpen, BarChart2, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// ── Helpers ───────────────────────────────────────────────────────────────────

const inr = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function onTimePctColor(pct: number): string {
  if (pct >= 0.8) return 'text-green-600';
  if (pct >= 0.6) return 'text-amber-600';
  return 'text-red-600';
}

const TIER_COLOR: Record<ScoreTier, string> = {
  Poor:        'text-red-600',
  Fair:        'text-amber-500',
  Good:        'text-yellow-600',
  'Very Good': 'text-blue-600',
  Excellent:   'text-green-600',
};

const TIER_BG: Record<ScoreTier, string> = {
  Poor:        'bg-red-100 text-red-700',
  Fair:        'bg-amber-100 text-amber-700',
  Good:        'bg-yellow-100 text-yellow-700',
  'Very Good': 'bg-blue-100 text-blue-700',
  Excellent:   'bg-green-100 text-green-700',
};

function scorePct(total: number): number {
  return Math.round(((total - 300) / 550) * 100);
}

function subScoreColor(v: number): string {
  if (v >= 80) return 'text-green-600';
  if (v >= 60) return 'text-blue-600';
  if (v >= 40) return 'text-amber-500';
  return 'text-red-500';
}

function subBarColor(v: number): string {
  if (v >= 80) return 'bg-green-500';
  if (v >= 60) return 'bg-blue-500';
  if (v >= 40) return 'bg-amber-400';
  return 'bg-red-400';
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs} hr${hrs === 1 ? '' : 's'} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatSkeleton() {
  return <div className="h-28 animate-pulse rounded-lg bg-muted" />;
}

const NAV_CLASS =
  'rounded-md px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground';

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === 'admin';

  const [score, setScore]         = useState<ScoreBreakdown | null>(null);
  const [income, setIncome]       = useState<IncomeSummary | null>(null);
  const [bills, setBills]         = useState<BillSummary | null>(null);
  const [txns, setTxns]           = useState<TransactionSummary | null>(null);
  const [docCount, setDocCount]   = useState(0);
  const [offerCount, setOfferCount]     = useState(0);
  const [hasLoanScore, setHasLoanScore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState<string | null>(null);

  // Admin users don't belong on the user dashboard
  useEffect(() => {
    if (user?.role === 'admin') {
      (router.replace as (href: string) => void)('/admin/dashboard');
    }
  }, [user, router]);

  const fetchAll = useCallback(async () => {
    if (user?.role === 'admin') return; // skip fetch — redirect is already firing
    setIsLoading(true);
    setError(null);
    try {
      // Guard: redirect to onboarding if profile is incomplete
      const profile = await profileApi.getMyProfile().catch(() => null);
      if (profile && !profile.onboardingComplete) {
        router.replace('/onboarding');
        return;
      }

      const [incomeRes, billsRes, txnsRes, scoreRes, docsRes, offersRes] = await Promise.all([
        incomeApi.getSummary(),
        billApi.getSummary(),
        transactionApi.getSummary(),
        scoreApi.getMyScore().catch(() => ({ score: null as null })),
        documentsApi.getMyDocuments().catch(() => []),
        loansApi.getMyOffers().catch(() => ({ hasScore: false as const, offers: [] })),
      ]);
      setIncome(incomeRes);
      setBills(billsRes);
      setTxns(txnsRes);
      setScore(scoreRes.score);
      setDocCount(docsRes.length);
      setOfferCount(offersRes.offers.length);
      setHasLoanScore(offersRes.hasScore);
    } catch {
      setError('Failed to load dashboard data.');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  const hasIncomeData = (income?.recordCount ?? 0) > 0;
  const hasBillsData  = (bills?.totalBills ?? 0) > 0;
  const hasTxnData    = ((txns?.totalCredits ?? 0) + (txns?.totalDebits ?? 0)) > 0;
  const netPositive   = (txns?.netFlow ?? 0) >= 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <span className="font-bold tracking-tight">CreditMap</span>
            <nav className="hidden items-center gap-1 md:flex">
              <Link href="/score"        className={NAV_CLASS}>Score</Link>
              <Link href="/loans"        className={NAV_CLASS}>Loans</Link>
              <Link href="/documents"    className={NAV_CLASS}>Documents</Link>
              <Link href="/income"       className={NAV_CLASS}>Income</Link>
              <Link href="/bills"        className={NAV_CLASS}>Bills</Link>
              <Link href="/transactions" className={NAV_CLASS}>Transactions</Link>
              {isAdmin && (
                <a href="/admin/dashboard" className={NAV_CLASS + ' text-purple-600 font-semibold'}>
                  Admin
                </a>
              )}
            </nav>
          </div>
          <Button variant="ghost" size="sm" onClick={() => void logout()}>
            Sign out
          </Button>
        </div>
      </header>

      <main className="container mx-auto max-w-5xl p-6 space-y-6">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold">
            {getGreeting()}, {user?.firstName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Here&apos;s a snapshot of your financial activity.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center justify-between rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={() => void fetchAll()}>
              Retry
            </Button>
          </div>
        )}

        {/* Score card */}
        {!isLoading && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Credit Score</CardTitle>
                <Link href="/score" className="text-xs font-medium text-primary hover:underline">
                  Full report →
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {score ? (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  {/* Ring + number */}
                  <div className="flex items-center gap-4">
                    <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
                      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15.9"
                          fill="none" stroke="currentColor"
                          strokeWidth="3" className="text-muted" />
                        <circle cx="18" cy="18" r="15.9"
                          fill="none" stroke="currentColor"
                          strokeWidth="3"
                          strokeDasharray={`${scorePct(score.totalScore)} 100`}
                          strokeLinecap="round"
                          className={TIER_COLOR[score.tier]}
                        />
                      </svg>
                      <p className={`text-base font-bold tabular-nums ${TIER_COLOR[score.tier]}`}>
                        {score.totalScore}
                      </p>
                    </div>
                    <div>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TIER_BG[score.tier]}`}>
                        {score.tier}
                      </span>
                      <p className="mt-1 text-xs text-muted-foreground">out of 850</p>
                      <p className="text-xs text-muted-foreground">{timeAgo(score.computedAt)}</p>
                    </div>
                  </div>

                  {/* Mini sub-score bars */}
                  <div className="flex flex-1 gap-3">
                    {(
                      [
                        { label: 'Income',     value: score.incomeScore },
                        { label: 'Bills',      value: score.billScore },
                        { label: 'Cash Flow',  value: score.cashFlowScore },
                        { label: 'Profile',    value: score.profileScore },
                        { label: 'Data',       value: score.dataScore },
                      ] as const
                    ).map(({ label, value }) => (
                      <div key={label} className="flex-1 text-center">
                        <p className="text-[10px] text-muted-foreground">{label}</p>
                        <p className={`text-sm font-bold tabular-nums ${subScoreColor(value)}`}>{value}</p>
                        <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full ${subBarColor(value)}`}
                            style={{ width: `${value}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    No score yet. Add income, bills, or transactions.
                  </p>
                  <Link href="/score">
                    <Button size="sm" variant="outline">Calculate →</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* KPI row */}
        <div className="grid gap-4 md:grid-cols-3">
          {isLoading ? (
            [0, 1, 2].map((i) => <StatSkeleton key={i} />)
          ) : (
            <>
              {/* Avg monthly income */}
              <Card>
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Avg Monthly Income
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {hasIncomeData ? (
                    <>
                      <p className="text-3xl font-bold text-green-600">
                        {inr(income!.avgMonthly)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {income!.recordCount} entries · {income!.monthsOfData} month
                        {income!.monthsOfData !== 1 ? 's' : ''} of data
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">No income recorded yet</p>
                  )}
                </CardContent>
              </Card>

              {/* On-time bill rate */}
              <Card>
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    On-Time Bill Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {hasBillsData ? (
                    <>
                      <p className={`text-3xl font-bold ${onTimePctColor(bills!.onTimePct)}`}>
                        {Math.round(bills!.onTimePct * 100)}%
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {bills!.totalBills} bills · {bills!.lateCount} paid late
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">No bills tracked yet</p>
                  )}
                </CardContent>
              </Card>

              {/* Net cash flow */}
              <Card>
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Net Cash Flow
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {hasTxnData ? (
                    <>
                      <p className={`text-3xl font-bold ${netPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {netPositive ? '+' : ''}{inr(txns!.netFlow)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        ↑ {inr(txns!.totalCredits)} · ↓ {inr(txns!.totalDebits)}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">No transactions yet</p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Quick links */}
        {!isLoading && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">

            {/* Loan Offers */}
            <Link href="/loans" className="group">
              <Card className="h-full transition-colors group-hover:bg-accent">
                <CardContent className="flex flex-col gap-2 py-5">
                  <CreditCard className="h-5 w-5 text-blue-500" />
                  <p className="font-semibold text-sm">Loan Offers</p>
                  <p className="text-xs text-muted-foreground">
                    {hasLoanScore
                      ? `${offerCount} offer${offerCount !== 1 ? 's' : ''} available`
                      : 'Calculate score first'}
                  </p>
                </CardContent>
              </Card>
            </Link>

            {/* Documents */}
            <Link href="/documents" className="group">
              <Card className="h-full transition-colors group-hover:bg-accent">
                <CardContent className="flex flex-col gap-2 py-5">
                  <FolderOpen className="h-5 w-5 text-amber-500" />
                  <p className="font-semibold text-sm">Documents</p>
                  <p className="text-xs text-muted-foreground">
                    {docCount} document{docCount !== 1 ? 's' : ''} stored
                  </p>
                </CardContent>
              </Card>
            </Link>

            {/* Score Report */}
            <Link href="/score" className="group">
              <Card className="h-full transition-colors group-hover:bg-accent">
                <CardContent className="flex flex-col gap-2 py-5">
                  <BarChart2 className="h-5 w-5 text-green-500" />
                  <p className="font-semibold text-sm">Score Report</p>
                  <p className="text-xs text-muted-foreground">
                    {score
                      ? `Score: ${score.totalScore} (${score.tier})`
                      : 'Not calculated yet'}
                  </p>
                </CardContent>
              </Card>
            </Link>

            {/* Add Data */}
            <Link href="/income" className="group">
              <Card className="h-full transition-colors group-hover:bg-accent">
                <CardContent className="flex flex-col gap-2 py-5">
                  <PlusCircle className="h-5 w-5 text-purple-500" />
                  <p className="font-semibold text-sm">Add Data</p>
                  <p className="text-xs text-muted-foreground">
                    Income · Bills · Transactions
                  </p>
                </CardContent>
              </Card>
            </Link>

          </div>
        )}

        {/* Module cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {isLoading ? (
            [0, 1, 2].map((i) => (
              <div key={i} className="h-44 animate-pulse rounded-lg bg-muted" />
            ))
          ) : (
            <>
              {/* Income module card */}
              <Card className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">Income</CardTitle>
                    <Link href="/income/add">
                      <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                        + Add
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-2">
                  {hasIncomeData ? (
                    <>
                      <p className="text-xs text-muted-foreground">Top sources</p>
                      <ul className="space-y-1">
                        {income!.sourceBreakdown
                          .sort((a, b) => b.total - a.total)
                          .slice(0, 3)
                          .map((s) => (
                            <li key={s.source} className="flex items-center justify-between text-xs">
                              <span>{INCOME_SOURCE_LABELS[s.source]}</span>
                              <span className="font-medium">{inr(s.total)}</span>
                            </li>
                          ))}
                      </ul>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Start tracking your income to build a credit history.
                    </p>
                  )}
                </CardContent>
                <div className="border-t px-6 py-3">
                  <Link href="/income" className="text-xs font-medium text-primary hover:underline">
                    View all income →
                  </Link>
                </div>
              </Card>

              {/* Bills module card */}
              <Card className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">Bills</CardTitle>
                    <Link href="/bills/add">
                      <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                        + Add
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-2">
                  {hasBillsData ? (
                    <>
                      <p className="text-xs text-muted-foreground">By bill type</p>
                      <ul className="space-y-1">
                        {bills!.byType
                          .sort((a, b) => b.count - a.count)
                          .slice(0, 3)
                          .map((b) => (
                            <li key={b.type} className="flex items-center justify-between text-xs">
                              <span className="capitalize">{b.type}</span>
                              <span
                                className={`font-medium ${
                                  b.onTimePct >= 0.8
                                    ? 'text-green-600'
                                    : b.onTimePct >= 0.6
                                    ? 'text-amber-600'
                                    : 'text-red-600'
                                }`}
                              >
                                {Math.round(b.onTimePct * 100)}% on time
                              </span>
                            </li>
                          ))}
                      </ul>
                      {bills!.avgDaysLate > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Avg {bills!.avgDaysLate.toFixed(1)} days late on late payments
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Track bill payments to demonstrate reliability.
                    </p>
                  )}
                </CardContent>
                <div className="border-t px-6 py-3">
                  <Link href="/bills" className="text-xs font-medium text-primary hover:underline">
                    View all bills →
                  </Link>
                </div>
              </Card>

              {/* Transactions module card */}
              <Card className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">Transactions</CardTitle>
                    <Link href="/transactions/add">
                      <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                        + Add
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-2">
                  {hasTxnData ? (
                    <>
                      <p className="text-xs text-muted-foreground">Top spending categories</p>
                      <ul className="space-y-1">
                        {txns!.byCategory
                          .filter((c) => c.total > 0)
                          .sort((a, b) => b.total - a.total)
                          .slice(0, 3)
                          .map((c) => (
                            <li key={c.category} className="flex items-center justify-between text-xs">
                              <span className="capitalize">{c.category}</span>
                              <span className="font-medium">{inr(c.total)}</span>
                            </li>
                          ))}
                      </ul>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Log transactions to map your cash flow patterns.
                    </p>
                  )}
                </CardContent>
                <div className="border-t px-6 py-3">
                  <Link href="/transactions" className="text-xs font-medium text-primary hover:underline">
                    View all transactions →
                  </Link>
                </div>
              </Card>
            </>
          )}
        </div>

        {/* Mobile nav links */}
        <div className="flex flex-wrap gap-2 md:hidden">
          <Link href="/score"><Button variant="outline" size="sm">Score</Button></Link>
          <Link href="/loans"><Button variant="outline" size="sm">Loans</Button></Link>
          <Link href="/documents"><Button variant="outline" size="sm">Documents</Button></Link>
          <Link href="/income"><Button variant="outline" size="sm">Income</Button></Link>
          <Link href="/bills"><Button variant="outline" size="sm">Bills</Button></Link>
          <Link href="/transactions"><Button variant="outline" size="sm">Transactions</Button></Link>
        </div>
      </main>
    </div>
  );
}
