'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { transactionApi } from '@/lib/transaction-api';
import type { TransactionCategory, TransactionChannel, TransactionType, CreateTransactionRequest } from '@/types/transaction';
import { TXN_CATEGORY_LABELS, TXN_CHANNEL_LABELS, TXN_TYPE_LABELS } from '@/types/transaction';
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

function todayIso(): string {
  return new Date().toISOString().substring(0, 10);
}

const TXN_TYPES   = Object.keys(TXN_TYPE_LABELS)    as TransactionType[];
const TXN_CATS    = Object.keys(TXN_CATEGORY_LABELS) as TransactionCategory[];
const TXN_CHANNELS = Object.keys(TXN_CHANNEL_LABELS) as TransactionChannel[];

// ── Schema ────────────────────────────────────────────────────────────────────

const addTxnSchema = z.object({
  txnDate: z.string().min(1, 'Please select a date'),
  type: z.enum(['credit', 'debit'] as const, { message: 'Please select a type' }),
  amount: z
    .number({ message: 'Enter a valid amount' })
    .min(0.01, 'Amount must be at least ₹0.01')
    .max(10_000_000),
  category: z.enum([
    'rent', 'food', 'utilities', 'emi', 'salary',
    'freelance', 'business', 'transfer', 'medical', 'other',
  ] as const, { message: 'Please select a category' }),
  description: z.string().max(200).optional(),
  channel: z.enum(['upi', 'cash', 'bank_transfer', 'neft', 'imps', 'other'] as const).optional(),
});

type AddTxnValues = z.infer<typeof addTxnSchema>;

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AddTransactionPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<AddTxnValues>({
    resolver: zodResolver(addTxnSchema),
    defaultValues: {
      txnDate: todayIso(),
      type: 'debit',
    },
  });

  const onSubmit = useCallback(
    async (values: AddTxnValues) => {
      setIsSubmitting(true);
      setSubmitError(null);
      try {
        const payload: CreateTransactionRequest = {
          txnDate: values.txnDate,
          type: values.type,
          amount: values.amount,
          category: values.category,
        };
        if (values.description) payload.description = values.description;
        if (values.channel) payload.channel = values.channel;

        await transactionApi.create(payload);
        router.push('/transactions');
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
    [router],
  );

  return (
    <div className="container mx-auto max-w-lg p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Add transaction</h1>
        <p className="text-sm text-muted-foreground">Record a credit or debit transaction.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transaction details</CardTitle>
          <CardDescription>Date, type, amount, and category are required.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={(e) => { void form.handleSubmit(onSubmit)(e); }} className="space-y-4">
              {/* Date */}
              <FormField
                control={form.control}
                name="txnDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Type */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <FormControl>
                      <select className={SELECT_CLASS} {...field} value={field.value ?? ''}>
                        <option value="">Select type…</option>
                        {TXN_TYPES.map((t) => (
                          <option key={t} value={t}>{TXN_TYPE_LABELS[t]}</option>
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
                          min={0.01}
                          step={0.01}
                          placeholder="0.00"
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

              {/* Category */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <select className={SELECT_CLASS} {...field} value={field.value ?? ''}>
                        <option value="">Select category…</option>
                        {TXN_CATS.map((c) => (
                          <option key={c} value={c}>{TXN_CATEGORY_LABELS[c]}</option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Channel (optional) */}
              <FormField
                control={form.control}
                name="channel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Channel <span className="text-muted-foreground font-normal">(optional)</span>
                    </FormLabel>
                    <FormControl>
                      <select className={SELECT_CLASS} {...field} value={field.value ?? ''}>
                        <option value="">Select channel…</option>
                        {TXN_CHANNELS.map((ch) => (
                          <option key={ch} value={ch}>{TXN_CHANNEL_LABELS[ch]}</option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description (optional) */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Description <span className="text-muted-foreground font-normal">(optional)</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Rent for June"
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
                  {isSubmitting ? 'Saving…' : 'Save transaction'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
