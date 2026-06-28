'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { incomeApi } from '@/lib/income-api';
import type { IncomeSource, CreateIncomeRequest } from '@/types/income';
import { INCOME_SOURCE_LABELS } from '@/types/income';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

// ── Helpers ───────────────────────────────────────────────────────────────────

const SELECT_CLASS =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ' +
  'ring-offset-background focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

function getLast24Months(): { value: string; label: string }[] {
  const now = new Date();
  return Array.from({ length: 24 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    const label = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    return { value, label };
  });
}

const MONTHS = getLast24Months();
const SOURCES = Object.keys(INCOME_SOURCE_LABELS) as IncomeSource[];

// ── Schema ────────────────────────────────────────────────────────────────────

const addIncomeSchema = z.object({
  recordMonth: z.string().min(1, 'Please select a month'),
  source: z.enum([
    'salary', 'daily_wage', 'business', 'freelance', 'farm', 'rent', 'other',
  ] as const, { message: 'Please select a source' }),
  amount: z
    .number({ message: 'Enter a valid amount' })
    .min(100, 'Minimum amount is ₹100')
    .max(5_000_000, 'Maximum amount is ₹50,00,000'),
  isRegular: z.boolean(),
  notes: z.string().max(500).optional(),
});

type AddIncomeValues = z.infer<typeof addIncomeSchema>;

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AddIncomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');
  const isEdit = !!editId;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isLoadingRecord, setIsLoadingRecord] = useState(isEdit);

  const form = useForm<AddIncomeValues>({
    resolver: zodResolver(addIncomeSchema),
    defaultValues: {
      recordMonth: MONTHS[0]?.value ?? '',
      isRegular: true,
    },
  });

  // Pre-fill form when editing
  useEffect(() => {
    if (!editId) return;
    incomeApi
      .getById(editId)
      .then((record) => {
        form.reset({
          recordMonth: record.recordMonth,
          source: record.source,
          amount: parseFloat(record.amount),
          isRegular: record.isRegular,
          notes: record.notes ?? undefined,
        });
      })
      .catch(() => setSubmitError('Could not load record. It may have been deleted.'))
      .finally(() => setIsLoadingRecord(false));
  }, [editId, form]);

  const onSubmit = useCallback(
    async (values: AddIncomeValues) => {
      setIsSubmitting(true);
      setSubmitError(null);
      try {
        // Build payload explicitly to satisfy exactOptionalPropertyTypes
        const payload: CreateIncomeRequest = {
          recordMonth: values.recordMonth,
          source: values.source,
          amount: values.amount,
          isRegular: values.isRegular,
        };
        if (values.notes) payload.notes = values.notes;

        if (isEdit && editId) {
          await incomeApi.update(editId, payload);
        } else {
          await incomeApi.create(payload);
        }
        router.push('/income');
      } catch (err: unknown) {
        const e = err as { response?: { data?: { message?: unknown } } };
        const msg = e.response?.data?.message;
        if (typeof msg === 'string') {
          setSubmitError(msg);
        } else if (Array.isArray(msg)) {
          setSubmitError((msg as string[]).join(', '));
        } else {
          setSubmitError('Something went wrong. Please try again.');
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [editId, isEdit, router],
  );

  if (isLoadingRecord) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-lg p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{isEdit ? 'Edit income record' : 'Add income'}</h1>
        <p className="text-sm text-muted-foreground">
          {isEdit ? 'Update the details below.' : 'Record a monthly income entry.'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Income details</CardTitle>
          <CardDescription>All fields except notes are required.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={(e) => { void form.handleSubmit(onSubmit)(e); }} className="space-y-4">
              {/* Month */}
              <FormField
                control={form.control}
                name="recordMonth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Month</FormLabel>
                    <FormControl>
                      <select className={SELECT_CLASS} {...field}>
                        <option value="">Select month…</option>
                        {MONTHS.map(({ value, label }) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Source */}
              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source</FormLabel>
                    <FormControl>
                      <select className={SELECT_CLASS} {...field} value={field.value ?? ''}>
                        <option value="">Select source…</option>
                        {SOURCES.map((s) => (
                          <option key={s} value={s}>{INCOME_SOURCE_LABELS[s]}</option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Amount */}
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
                          ₹
                        </span>
                        <Input
                          type="number"
                          min={100}
                          max={5_000_000}
                          placeholder="0"
                          className="pl-7"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(e.target.value === '' ? undefined : Number(e.target.value))
                          }
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Is Regular toggle */}
              <FormField
                control={form.control}
                name="isRegular"
                render={() => (
                  <FormItem>
                    <label className="flex cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-input accent-primary"
                        checked={form.watch('isRegular')}
                        onChange={(e) => form.setValue('isRegular', e.target.checked)}
                      />
                      <span className="text-sm font-medium leading-none">
                        This is a regular / recurring income
                      </span>
                    </label>
                  </FormItem>
                )}
              />

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                    <FormControl>
                      <textarea
                        rows={3}
                        placeholder="Any additional details…"
                        className={SELECT_CLASS + ' h-auto resize-none py-2'}
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {submitError && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {submitError}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => router.back()}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving…' : isEdit ? 'Update' : 'Save income'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
