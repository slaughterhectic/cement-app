import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../ui/Modal';
import { api } from '../../lib/api';
import { formatDateInput } from '../../lib/format';
import { useToastStore } from '../../lib/store';

const amountField = z.preprocess(
  (v) => {
    if (v === '' || v == null || (typeof v === 'number' && Number.isNaN(v))) return undefined;
    return typeof v === 'number' ? v : Number(v);
  },
  z.number({ required_error: 'Amount is required' }).positive('Amount must be greater than 0')
);

const schema = z
  .object({
    date: z.string().min(1, 'Date is required'),
    description: z.string().min(1, 'Description is required'),
    amount: amountField,
    category: z.string().min(1, 'Category is required'),
    mode: z.enum(['bank', 'cash']),
    bank_name: z.string().optional(),
    cash_handler: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mode === 'bank' && !data.bank_name) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Select a bank', path: ['bank_name'] });
    }
    if (data.mode === 'cash' && !data.cash_handler?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Select a cash handler', path: ['cash_handler'] });
    }
  });

export type ExpenseFormValues = z.infer<typeof schema>;

export interface ExpenseFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ExpenseForm({ isOpen, onClose, onSuccess }: ExpenseFormProps) {
  const addToast = useToastStore((s) => s.addToast);
  const [submitting, setSubmitting] = useState(false);
  const [cashHandlers, setCashHandlers] = useState<string[]>([]);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [banks, setBanks] = useState<{ bank_name: string }[]>([]);

  const defaultValues = useMemo(
    () => ({
      date: formatDateInput(),
      description: '',
      amount: undefined as unknown as number,
      category: '',
      mode: 'bank' as const,
      bank_name: '' as string,
      cash_handler: '' as string,
    }),
    []
  );

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const mode = watch('mode');

  useEffect(() => {
    if (!isOpen) return;
    reset({
      ...defaultValues,
      date: formatDateInput(),
    });
    clearErrors();
    api.imprest.handlers().then((rows: any[]) => {
      setCashHandlers(rows.map((r: any) => r.handler_name));
    }).catch(() => {});
    api.expenseCategories.list().then((rows) => {
      setCategories(rows);
      if (rows.length > 0) setValue('category', rows[0].name);
    }).catch(() => {});
    api.capital.banks().then((rows: any[]) => {
      setBanks(rows);
    }).catch(() => {});
  }, [isOpen, reset, defaultValues, clearErrors, setValue]);

  useEffect(() => {
    setValue('bank_name', '');
    setValue('cash_handler', '');
    clearErrors('bank_name');
    clearErrors('cash_handler');
  }, [mode, setValue, clearErrors]);

  const onSubmit = async (values: ExpenseFormValues) => {
    setSubmitting(true);
    try {
      const result = await api.expenses.create({
        date: values.date,
        description: values.description.trim(),
        amount: values.amount,
        category: values.category,
        mode: values.mode,
        bank_name: values.mode === 'bank' ? (values.bank_name || null) : null,
        cash_handler: values.mode === 'cash' ? (values.cash_handler || null) : null,
      });
      if ((result as any).pending) {
        addToast('Entry sent for admin approval', 'info');
      } else {
        addToast('Expense recorded', 'success');
      }
      onSuccess();
      onClose();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to save expense', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Expense" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-heading">Date *</label>
          <input type="date" className="input-field w-full" {...register('date')} />
          {errors.date && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.date.message}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-heading">Description *</label>
          <input type="text" className="input-field w-full" {...register('description')} />
          {errors.description && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.description.message}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-heading">Amount *</label>
          <input type="number" step="0.01" min={0} className="input-field w-full" {...register('amount')} />
          {errors.amount && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.amount.message}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-heading">Category *</label>
          <select className="input-field w-full" {...register('category')}>
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
          {errors.category && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.category.message}</p>}
        </div>

        <div>
          <span className="mb-1 block text-sm font-medium text-heading">Mode *</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setValue('mode', 'bank', { shouldValidate: true })}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                mode === 'bank'
                  ? 'border-brand-500 bg-brand-500 text-white'
                  : 'border-card-border bg-card text-heading/80 hover:bg-surface'
              }`}
            >
              Bank
            </button>
            <button
              type="button"
              onClick={() => setValue('mode', 'cash', { shouldValidate: true })}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                mode === 'cash'
                  ? 'border-brand-500 bg-brand-500 text-white'
                  : 'border-card-border bg-card text-heading/80 hover:bg-surface'
              }`}
            >
              Cash
            </button>
          </div>
          <input type="hidden" {...register('mode')} />
        </div>

        {mode === 'bank' && (
          <div>
            <label className="mb-1 block text-sm font-medium text-heading">Bank *</label>
            <select className="input-field w-full" {...register('bank_name')}>
              <option value="">Select bank</option>
              {banks.map((b) => (
                <option key={b.bank_name} value={b.bank_name}>
                  {b.bank_name}
                </option>
              ))}
            </select>
            {banks.length === 0 && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">No banks configured. Add banks in Settings → Banks.</p>
            )}
            {errors.bank_name && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.bank_name.message}</p>}
          </div>
        )}

        {mode === 'cash' && (
          <div>
            <label className="mb-1 block text-sm font-medium text-heading">Cash Handler *</label>
            <select className="input-field w-full" {...register('cash_handler')}>
              <option value="">Select handler</option>
              {cashHandlers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
            {errors.cash_handler && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.cash_handler.message}</p>}
            {cashHandlers.length === 0 && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">No cash handlers configured — add one in Capital → Add Cash Handler.</p>
            )}
            <p className="mt-1 text-xs text-heading/60">This cash expense will be deducted from the handler's cash book automatically.</p>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-card-border pt-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Save expense'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
