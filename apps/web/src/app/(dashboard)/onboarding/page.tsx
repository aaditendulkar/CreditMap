'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { profileApi } from '@/lib/profile-api';
import type { UpsertProfileRequest } from '@/types/profile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

// ── Schema ────────────────────────────────────────────────────────────────────

const wizardSchema = z.object({
  state: z.string().max(50).optional(),
  district: z.string().max(50).optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['M', 'F', 'O']).optional(),
  category: z.enum(['SC', 'ST', 'OBC', 'General']).optional(),
  occupation: z
    .enum(['salaried', 'self_employed', 'daily_wage', 'gig', 'student', 'farm', 'other'])
    .optional(),
  monthlyIncomeStated: z.number().int().min(0).max(10_000_000).optional(),
  hasBankAccount: z.boolean(),
  hasJanDhan: z.boolean(),
  hasUpi: z.boolean(),
});

type WizardValues = z.infer<typeof wizardSchema>;

// ── Helpers ───────────────────────────────────────────────────────────────────

const SELECT_CLASS =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ' +
  'ring-offset-background focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

const STEP_1_KEYS: (keyof WizardValues)[] = [
  'state', 'district', 'dateOfBirth', 'gender', 'category',
];
const STEP_2_KEYS: (keyof WizardValues)[] = [
  'occupation', 'monthlyIncomeStated', 'hasBankAccount', 'hasJanDhan', 'hasUpi',
];

function toPayload(values: WizardValues, keys: (keyof WizardValues)[]): UpsertProfileRequest {
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    const v = values[k];
    if (v !== undefined && v !== '') out[k] = v;
  }
  return out as UpsertProfileRequest;
}

function labelFor(occupation: string): string {
  return { salaried: 'Salaried', self_employed: 'Self-employed', daily_wage: 'Daily wage',
    gig: 'Gig / freelance platform', student: 'Student', farm: 'Farming / agriculture',
    other: 'Other' }[occupation] ?? occupation;
}

// ── Step components ───────────────────────────────────────────────────────────

function Step1({ form }: { form: ReturnType<typeof useForm<WizardValues>> }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="state"
          render={({ field }) => (
            <FormItem>
              <FormLabel>State</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Maharashtra" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="district"
          render={({ field }) => (
            <FormItem>
              <FormLabel>District</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Pune" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="dateOfBirth"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Date of birth</FormLabel>
            <FormControl>
              <Input type="date" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gender</FormLabel>
              <FormControl>
                <select className={SELECT_CLASS} {...field} value={field.value ?? ''}>
                  <option value="">Select…</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="O">Other</option>
                </select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <FormControl>
                <select className={SELECT_CLASS} {...field} value={field.value ?? ''}>
                  <option value="">Select…</option>
                  <option value="General">General</option>
                  <option value="OBC">OBC</option>
                  <option value="SC">SC</option>
                  <option value="ST">ST</option>
                </select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}

function Step2({ form }: { form: ReturnType<typeof useForm<WizardValues>> }) {
  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="occupation"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Occupation <span className="text-destructive">*</span></FormLabel>
            <FormControl>
              <select className={SELECT_CLASS} {...field} value={field.value ?? ''}>
                <option value="">Select…</option>
                {['salaried', 'self_employed', 'daily_wage', 'gig', 'student', 'farm', 'other'].map(
                  (o) => <option key={o} value={o}>{labelFor(o)}</option>,
                )}
              </select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="monthlyIncomeStated"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Monthly income (₹) <span className="text-destructive">*</span></FormLabel>
            <FormControl>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
                  ₹
                </span>
                <Input
                  type="number"
                  min={0}
                  max={10_000_000}
                  placeholder="0"
                  className="pl-7"
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                />
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="space-y-3 rounded-md border p-4">
        <p className="text-sm font-medium text-muted-foreground">Banking access</p>
        {(
          [
            { name: 'hasBankAccount', label: 'I have a bank account' },
            { name: 'hasJanDhan', label: 'I have a Jan Dhan account' },
            { name: 'hasUpi', label: 'I use UPI (GPay, PhonePe, etc.)' },
          ] as const
        ).map(({ name, label }) => (
          <label key={name} className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input accent-primary"
              checked={form.watch(name)}
              onChange={(e) => form.setValue(name, e.target.checked)}
            />
            <span className="text-sm">{label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function Step3Confirm({
  values,
  error,
}: {
  values: WizardValues;
  error: string | null;
}) {
  const inr = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  const rows: { label: string; value: string | undefined }[] = [
    { label: 'State', value: values.state },
    { label: 'District', value: values.district },
    { label: 'Date of birth', value: values.dateOfBirth },
    { label: 'Gender', value: values.gender },
    { label: 'Category', value: values.category },
    { label: 'Occupation', value: values.occupation ? labelFor(values.occupation) : undefined },
    { label: 'Monthly income', value: values.monthlyIncomeStated !== null && values.monthlyIncomeStated !== undefined ? inr(values.monthlyIncomeStated) : undefined },
    { label: 'Bank account', value: values.hasBankAccount ? 'Yes' : 'No' },
    { label: 'Jan Dhan', value: values.hasJanDhan ? 'Yes' : 'No' },
    { label: 'UPI', value: values.hasUpi ? 'Yes' : 'No' },
  ];

  const required = [
    !values.state && 'State',
    !values.occupation && 'Occupation',
    (values.monthlyIncomeStated === null || values.monthlyIncomeStated === undefined) && 'Monthly income',
  ].filter(Boolean);

  return (
    <div className="space-y-4">
      <dl className="divide-y rounded-md border text-sm">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex justify-between px-4 py-2">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium">{value ?? <span className="text-muted-foreground">—</span>}</dd>
          </div>
        ))}
      </dl>

      {required.length > 0 && (
        <p className="rounded-md bg-amber-50 px-4 py-2 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-300">
          Required to complete: <strong>{(required as string[]).join(', ')}</strong>. Go back to fill them in.
        </p>
      )}

      {error && (
        <p className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [completeError, setCompleteError] = useState<string | null>(null);

  const form = useForm<WizardValues>({
    resolver: zodResolver(wizardSchema),
    defaultValues: { hasBankAccount: false, hasJanDhan: false, hasUpi: false },
  });

  useEffect(() => {
    profileApi
      .getMyProfile()
      .then((profile) => {
        if (profile.onboardingComplete) {
          router.replace('/dashboard');
          return;
        }
        form.reset({
          state: profile.state ?? undefined,
          district: profile.district ?? undefined,
          dateOfBirth: profile.dateOfBirth ?? undefined,
          gender: profile.gender ?? undefined,
          category: profile.category ?? undefined,
          occupation: profile.occupation ?? undefined,
          monthlyIncomeStated: profile.monthlyIncomeStated ?? undefined,
          hasBankAccount: profile.hasBankAccount,
          hasJanDhan: profile.hasJanDhan,
          hasUpi: profile.hasUpi,
        });
      })
      .catch(() => {})
      .finally(() => setIsBootstrapping(false));
  }, [form, router]);

  const handleNext = useCallback(async () => {
    const keys = step === 1 ? STEP_1_KEYS : STEP_2_KEYS;
    const valid = await form.trigger(keys);
    if (!valid) return;

    setIsSaving(true);
    setSaveError(null);
    try {
      await profileApi.updateMyProfile(toPayload(form.getValues(), keys));
      setStep((s) => s + 1);
    } catch {
      setSaveError('Failed to save. Check your connection and try again.');
    } finally {
      setIsSaving(false);
    }
  }, [form, step]);

  const handleComplete = useCallback(async () => {
    setIsSaving(true);
    setCompleteError(null);
    try {
      await profileApi.completeOnboarding();
      router.push('/dashboard');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: unknown } } };
      const msg = e.response?.data?.message;
      if (typeof msg === 'string') {
        setCompleteError(msg);
      } else if (Array.isArray(msg)) {
        setCompleteError((msg as string[]).join(', '));
      } else {
        setCompleteError('Please fill in all required fields and try again.');
      }
    } finally {
      setIsSaving(false);
    }
  }, [router]);

  if (isBootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const stepTitles = [
    { title: 'Basic information', desc: 'Tell us a bit about yourself' },
    { title: 'Financial profile', desc: 'Help us understand your financial situation' },
    { title: 'Review & complete', desc: 'Check your details and finish setup' },
  ];
  const { title, desc } = stepTitles[step - 1]!;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        {/* Progress bar */}
        <div className="mb-6">
          <div className="mb-2 flex justify-between text-sm text-muted-foreground">
            <span>Profile setup</span>
            <span>Step {step} of 3</span>
          </div>
          <div className="flex gap-1.5">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                  s <= step ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{desc}</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                {step === 1 && <Step1 form={form} />}
                {step === 2 && <Step2 form={form} />}
                {step === 3 && (
                  <Step3Confirm values={form.getValues()} error={completeError} />
                )}

                {saveError && (
                  <p className="text-sm text-destructive">{saveError}</p>
                )}

                <div className="flex gap-2 pt-2">
                  {step > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => { setStep((s) => s - 1); setSaveError(null); setCompleteError(null); }}
                      disabled={isSaving}
                    >
                      Back
                    </Button>
                  )}

                  {step < 3 ? (
                    <Button
                      type="button"
                      className="flex-1"
                      onClick={() => void handleNext()}
                      disabled={isSaving}
                    >
                      {isSaving ? 'Saving…' : 'Next →'}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      className="flex-1"
                      onClick={() => void handleComplete()}
                      disabled={isSaving}
                    >
                      {isSaving ? 'Completing…' : 'Complete setup'}
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
