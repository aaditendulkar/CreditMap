'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { billApi } from '@/lib/bill-api';
import type { BillType, CreateBillRequest } from '@/types/bill';
import { BILL_TYPE_LABELS } from '@/types/bill';
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
const BILL_TYPES = Object.keys(BILL_TYPE_LABELS) as BillType[];

// ── Schema ────────────────────────────────────────────────────────────────────

const addBillSchema = z.object({
  billType: z.enum([
    'electricity', 'water', 'gas', 'mobile', 'broadband', 'rent', 'insurance', 'other',
  ] as const, { message: 'Please select a bill type' }),
  provider: z.string().max(100).optional(),
  billMonth: z.string().min(1, 'Please select a month'),
  amount: z
    .number({ message: 'Enter a valid amount' })
    .min(1, 'Amount must be at least ₹1')
    .max(10_000_000),
  dueDate: z.string().min(1, 'Please enter a due date'),
  paidDate: z.string().optional(),
  isPaid: z.boolean(),
});

type AddBillValues = z.infer<typeof addBillSchema>;

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AddBillPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');
  const isEdit = !!editId;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isLoadingRecord, setIsLoadingRecord] = useState(isEdit);

  const form = useForm<AddBillValues>({
    resolver: zodResolver(addBillSchema),
    defaultValues: {
      billMonth: MONTHS[0]?.value ?? '',
      isPaid: false,
    },
  });

  const isPaid = form.watch('isPaid');

  // Pre-fill form when editing
  useEffect(() => {
    if (!editId) return;
    billApi
      .getById(editId)
      .then((bill) => {
        form.reset({
          billType: bill.billType,
          provider: bill.provider ?? undefined,
          billMonth: bill.billMonth,
          amount: parseFloat(bill.amount),
          dueDate: bill.dueDate,
          paidDate: bill.paidDate ?? undefined,
          isPaid: bill.isPaid,
        });
      })
      .catch(() => setSubmitError('Could not load record. It may have been deleted.'))
      .finally(() => setIsLoadingRecord(false));
  }, [editId, form]);

  const onSubmit = useCallback(
    async (values: AddBillValues) => {
      if (values.isPaid && !values.paidDate) {
        form.setError('paidDate', { message: 'Paid date is required when marking as paid' });
        return;
      }
      setIsSubmitting(true);
      setSubmitError(null);
      try {
        // Build payload explicitly to satisfy exactOptionalPropertyTypes
        const payload: CreateBillRequest = {
          billType: values.billType,
          billMonth: values.billMonth,
          amount: values.amount,
          dueDate: values.dueDate,
          isPaid: values.isPaid,
        };
        if (values.provider) payload.provider = values.provider;
        if (values.isPaid) {
          payload.paidDate = values.paidDate || new Date().toISOString().substring(0, 10);
        }

        if (isEdit && editId) {
          await billApi.update(editId, payload);
        } else {
          await billApi.create(payload);
        }
        router.push('/bills');
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
    [editId, form, isEdit, router],
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
        <h1 className="text-2xl font-bold">{isEdit ? 'Edit bill' : 'Add bill'}</h1>
        <p className="text-sm text-muted-foreground">
          {isEdit ? 'Update the bill details below.' : 'Record a bill payment entry.'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bill details</CardTitle>
          <CardDescription>Bill type, amount, and due date are required.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={(e) => { void form.handleSubmit(onSubmit)(e); }} className="space-y-4">
              {/* Bill type */}
              <FormField
                control={form.control}
                name="billType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bill type</FormLabel>
                    <FormControl>
                      <select className={SELECT_CLASS} {...field} value={field.value ?? ''}>
                        <option value="">Select type…</option>
                        {BILL_TYPES.map((t) => (
                          <option key={t} value={t}>{BILL_TYPE_LABELS[t]}</option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Provider */}
              <FormField
                control={form.control}
                name="provider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provider <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. MSEB, Jio, LIC" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Bill month */}
              <FormField
                control={form.control}
                name="billMonth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bill month</FormLabel>
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
                          min={1}
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

              {/* Due date */}
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Is Paid toggle */}
              <FormField
                control={form.control}
                name="isPaid"
                render={() => (
                  <FormItem>
                    <label className="flex cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-input accent-primary"
                        checked={form.watch('isPaid')}
                        onChange={(e) => form.setValue('isPaid', e.target.checked)}
                      />
                      <span className="text-sm font-medium leading-none">Mark as paid</span>
                    </label>
                  </FormItem>
                )}
              />

              {/* Paid date — shown only when isPaid is true */}
              {isPaid && (
                <FormField
                  control={form.control}
                  name="paidDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Paid date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

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
                  {isSubmitting ? 'Saving…' : isEdit ? 'Update' : 'Save bill'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
