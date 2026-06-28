'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { loansApi } from '@/lib/loans-api';
import type { LoanProduct, LoanProductType } from '@/types/loans';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// ── Helpers ───────────────────────────────────────────────────────────────────

const inr = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);

const TIER_BG: Record<string, string> = {
  Poor:        'bg-red-100 text-red-700',
  Fair:        'bg-amber-100 text-amber-700',
  Good:        'bg-yellow-100 text-yellow-700',
  'Very Good': 'bg-blue-100 text-blue-700',
  Excellent:   'bg-green-100 text-green-700',
};

const TYPE_LABEL: Record<LoanProductType, string> = {
  personal:     'Personal',
  microfinance: 'Microfinance',
  business:     'Business',
  secured:      'Secured',
};

const TYPE_BADGE: Record<LoanProductType, string> = {
  personal:     'bg-blue-100 text-blue-700',
  microfinance: 'bg-green-100 text-green-700',
  business:     'bg-purple-100 text-purple-700',
  secured:      'bg-amber-100 text-amber-700',
};

const SEGMENT_LABEL: Record<string, string> = {
  salaried:     'Salaried',
  self_employed:'Self-employed',
  gig:          'Gig worker',
  daily_wage:   'Daily wage',
  farm:         'Farmer',
  student:      'Student',
  other:        'Other',
};

const FILTER_TYPES: Array<{ value: LoanProductType | 'all'; label: string }> = [
  { value: 'all',          label: 'All Types' },
  { value: 'personal',     label: 'Personal' },
  { value: 'microfinance', label: 'Microfinance' },
  { value: 'business',     label: 'Business' },
  { value: 'secured',      label: 'Secured' },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function CardSkeleton() {
  return <div className="h-64 animate-pulse rounded-xl bg-muted" />;
}

function LoanProductCard({ product }: { product: LoanProduct }) {
  const rate = parseFloat(product.interestRatePA).toFixed(2);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base font-bold leading-tight">
              {product.lenderName}
            </CardTitle>
            <p className="mt-0.5 text-sm text-muted-foreground">{product.productName}</p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${TYPE_BADGE[product.productType]}`}
          >
            {TYPE_LABEL[product.productType]}
          </span>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        {/* Key metrics grid */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Interest rate</p>
            <p className="text-lg font-bold text-green-600">{rate}% p.a.</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Loan amount</p>
            <p className="text-sm font-semibold">
              {inr(product.loanAmountMin)} – {inr(product.loanAmountMax)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tenure</p>
            <p className="text-sm font-medium">
              {product.tenureMonthsMin}–{product.tenureMonthsMax} months
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Processing fee</p>
            <p className="text-sm font-medium">
              {product.processingFeePercent
                ? `${product.processingFeePercent}% of loan`
                : 'Nil'}
            </p>
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {product.description}
          </p>
        )}

        {/* Target segments */}
        {product.targetSegments && product.targetSegments.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {product.targetSegments.map((seg) => (
              <span
                key={seg}
                className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
              >
                {SEGMENT_LABEL[seg] ?? seg}
              </span>
            ))}
          </div>
        )}

        {/* Apply button — pushed to bottom */}
        <div className="mt-auto pt-2">
          {product.applyUrl ? (
            <a href={product.applyUrl} target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="w-full">Apply Now →</Button>
            </a>
          ) : (
            <Button size="sm" variant="outline" className="w-full" disabled>
              Contact lender
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LoansPage() {
  const [data,      setData]      = useState<{ hasScore: boolean; score?: number; tier?: string; offers: LoanProduct[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [activeType, setActiveType] = useState<LoanProductType | 'all'>('all');

  const fetchOffers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await loansApi.getMyOffers();
      setData(res);
    } catch {
      setError('Could not load loan offers.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void fetchOffers(); }, [fetchOffers]);

  const filteredOffers =
    data?.offers.filter(
      (o) => activeType === 'all' || o.productType === activeType,
    ) ?? [];

  return (
    <div className="container mx-auto max-w-5xl p-6 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Loan Offers</h1>
        <p className="text-sm text-muted-foreground">
          Products matched to your CreditMap score
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center justify-between rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => void fetchOffers()}>Retry</Button>
        </div>
      )}

      {/* Loading skeletons */}
      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3, 4, 5].map((i) => <CardSkeleton key={i} />)}
        </div>
      )}

      {/* No score yet */}
      {!isLoading && data && !data.hasScore && (
        <Card>
          <CardContent className="py-16 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <svg className="h-7 w-7 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-semibold">Calculate your score first</p>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
                Add income records, bill payments, and transactions to generate your
                CreditMap score. Then we&apos;ll show you loan offers that match.
              </p>
            </div>
            <Link href="/score">
              <Button>Go to Score →</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Score exists but no offers match */}
      {!isLoading && data?.hasScore && data.offers.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <svg className="h-7 w-7 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803M10.5 7.5v6m3-3h-6" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-semibold">No matching offers right now</p>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
                Your current score of{' '}
                <span className="font-semibold">{data.score}</span>{' '}
                ({data.tier}) doesn&apos;t match any products yet. Keep improving your
                score by adding more data.
              </p>
            </div>
            <Link href="/score">
              <Button variant="outline">View Score Tips →</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Offers */}
      {!isLoading && data?.hasScore && data.offers.length > 0 && (
        <>
          {/* Score context bar */}
          <Card>
            <CardContent className="py-3">
              <div className="flex items-center gap-3">
                <p className="text-sm text-muted-foreground">
                  Showing{' '}
                  <span className="font-semibold text-foreground">
                    {filteredOffers.length}
                  </span>{' '}
                  {activeType !== 'all' && `${TYPE_LABEL[activeType].toLowerCase()} `}
                  offer{filteredOffers.length !== 1 ? 's' : ''} matched to your score:
                </p>
                <span className="text-sm font-bold">{data.score}</span>
                {data.tier && (
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TIER_BG[data.tier] ?? ''}`}>
                    {data.tier}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Type filter */}
          <div className="flex flex-wrap gap-2">
            {FILTER_TYPES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setActiveType(value)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeType === value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Offers grid */}
          {filteredOffers.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredOffers.map((product) => (
                <LoanProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No {TYPE_LABEL[activeType as LoanProductType]?.toLowerCase()} offers match your profile.
            </p>
          )}
        </>
      )}
    </div>
  );
}
