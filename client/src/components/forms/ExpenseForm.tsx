import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../ui/Modal';
import { api } from '../../lib/api';
import { formatDateInput } from '../../lib/format';
import { useToastStore } from '../../lib/store';

const BANKS = ['ARMTECH', 'KOTAK', 'HDFC', 'BOB', 'AXIS', 'Other'] as const;

const EXPENSE_CATEGORIES = ['Office', 'Bank charges', 'Freight', 'Salary', 'Misc'] as const;

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
    category: z.enum(EXPENSE_CATEGORIES),
    mode: z.enum(['bank', 'cash']),
    bank_name: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mode === 'bank') {
      if (!data.bank_name || !BANKS.includes(data.bank_name as (typeof BANKS)[number])) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Select a bank', path: ['bank_name'] });
      }
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

  const defaultValues = useMemo(
    () => ({
      date: formatDateInput(),
      description: '',
      amount: undefined as unknown as number,
      category: 'Office' as (typeof EXPENSE_CATEGORIES)[number],
      mode: 'bank' as const,
      bank_name: '' as string,
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
  }, [isOpen, reset, defaultValues, clearErrors]);

  useEffect(() => {
    if (mode === 'cash') {
      setValue('bank_name', '');
      clearErrors('bank_name');
    }
  }, [mode, setValue, clearErrors]);

  const onSubmit = async (values: ExpenseFormValues) => {
    setSubmitting(true);
    try {
      await api.expenses.create({
        date: values.date,
        description: values.description.trim(),
        amount: values.amount,
        category: values.category,
        mode: values.mode,
        bank_name: values.mode === 'bank' ? values.bank_name : null,
      });
      addToast('Expense recorded', 'success');
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
          {errors.date && <p className="mt-1 text-xs text-red-600">{errors.date.message}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-heading">Description *</label>
          <input type="text" className="input-field w-full" {...register('description')} />
          {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-heading">Amount *</label>
          <input type="number" step="0.01" min={0} className="input-field w-full" {...register('amount')} />
          {errors.amount && <p className="mt-1 text-xs text-red-600">{errors.amount.message}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-heading">Category *</label>
          <select className="input-field w-full" {...register('category')}>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {errors.category && <p className="mt-1 text-xs text-red-600">{errors.category.message}</p>}
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
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
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
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
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
              {BANKS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            {errors.bank_name && <p className="mt-1 text-xs text-red-600">{errors.bank_name.message}</p>}
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
