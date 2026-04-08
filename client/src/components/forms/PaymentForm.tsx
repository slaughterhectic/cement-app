import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../ui/Modal';
import { api } from '../../lib/api';
import { formatDateInput, formatINR } from '../../lib/format';
import { useToastStore } from '../../lib/store';

const BANKS = ['ARMTECH', 'KOTAK', 'HDFC', 'BOB', 'AXIS', 'Other'] as const;

const amountField = z.preprocess(
  (v) => {
    if (v === '' || v == null || (typeof v === 'number' && Number.isNaN(v))) return undefined;
    return typeof v === 'number' ? v : Number(v);
  },
  z.number({ required_error: 'Amount is required' }).positive('Amount must be greater than 0')
);

const baseSchema = z
  .object({
    date: z.string().min(1, 'Date is required'),
    party_id: z.coerce.number().int().positive('Party is required'),
    amount: amountField,
    mode: z.enum(['bank', 'cash']),
    bank_name: z.string().optional(),
    remarks: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mode === 'bank') {
      if (!data.bank_name || !BANKS.includes(data.bank_name as (typeof BANKS)[number])) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Select a bank', path: ['bank_name'] });
      }
    }
  });

export type PaymentFormValues = z.infer<typeof baseSchema>;

export interface PaymentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** Pre-select party when opened from party ledger */
  partyId?: number;
}

type PartyWithDue = { id: number; name: string; outstanding: number };

export default function PaymentForm({ isOpen, onClose, onSuccess, partyId: preselectPartyId }: PaymentFormProps) {
  const addToast = useToastStore((s) => s.addToast);
  const [parties, setParties] = useState<PartyWithDue[]>([]);
  const [loadingParties, setLoadingParties] = useState(false);
  const [partyQuery, setPartyQuery] = useState('');
  const [partyMenuOpen, setPartyMenuOpen] = useState(false);
  const partyWrapRef = useRef<HTMLDivElement>(null);
  const [submitting, setSubmitting] = useState(false);

  const defaultValues = useMemo(
    () => ({
      date: formatDateInput(),
      party_id: 0,
      amount: undefined as unknown as number,
      mode: 'bank' as const,
      bank_name: '' as string,
      remarks: '',
    }),
    []
  );

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(baseSchema),
    defaultValues,
  });

  const partyId = watch('party_id');
  const amountVal = watch('amount');
  const mode = watch('mode');

  const selectedParty = useMemo(
    () => parties.find((p) => p.id === Number(partyId)),
    [parties, partyId]
  );
  const outstanding = selectedParty?.outstanding ?? 0;
  const amountNum = typeof amountVal === 'number' && !Number.isNaN(amountVal) ? amountVal : NaN;
  const exceedsOutstanding =
    selectedParty != null && !Number.isNaN(amountNum) && amountNum > outstanding;

  const loadParties = useCallback(async () => {
    setLoadingParties(true);
    try {
      const rows = (await api.payments.partiesWithDues()) as PartyWithDue[];
      setParties(Array.isArray(rows) ? rows : []);
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to load parties', 'error');
      setParties([]);
    } finally {
      setLoadingParties(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (!isOpen) return;
    loadParties();
  }, [isOpen, loadParties]);

  useEffect(() => {
    if (!isOpen) return;
    const pid =
      preselectPartyId != null && preselectPartyId > 0
        ? preselectPartyId
        : 0;
    const inList = pid > 0 && parties.some((p) => p.id === pid);
    reset({
      ...defaultValues,
      date: formatDateInput(),
      party_id: inList ? pid : 0,
      amount: undefined as unknown as number,
      mode: 'bank',
      bank_name: '',
      remarks: '',
    });
    const p = parties.find((x) => x.id === pid);
    setPartyQuery(inList && p ? p.name : '');
    setPartyMenuOpen(false);
    clearErrors();
  }, [isOpen, preselectPartyId, parties, reset, defaultValues, clearErrors]);

  useEffect(() => {
    const p = parties.find((x) => x.id === partyId);
    if (p) setPartyQuery(p.name);
  }, [partyId, parties]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (partyWrapRef.current && !partyWrapRef.current.contains(e.target as Node)) {
        setPartyMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    if (mode === 'cash') {
      setValue('bank_name', '');
      clearErrors('bank_name');
    }
  }, [mode, setValue, clearErrors]);

  const filteredParties = useMemo(() => {
    const q = partyQuery.trim().toLowerCase();
    if (!q) return parties.slice(0, 80);
    return parties.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 80);
  }, [parties, partyQuery]);

  const onSubmit = async (values: PaymentFormValues) => {
    const party = parties.find((p) => p.id === values.party_id);
    const out = party?.outstanding ?? 0;
    if (values.amount > out) {
      setError('amount', {
        type: 'manual',
        message: `Outstanding balance is ${formatINR(out)}. You cannot record more than this.`,
      });
      return;
    }

    setSubmitting(true);
    try {
      await api.payments.create({
        date: values.date,
        party_id: values.party_id,
        amount: values.amount,
        mode: values.mode,
        bank_name: values.mode === 'bank' ? values.bank_name : null,
        remarks: values.remarks?.trim() || null,
      });
      addToast('Payment recorded', 'success');
      onSuccess();
      onClose();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to save payment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const amountErrorMsg = errors.amount?.message;
  const exceedCopy = `Outstanding balance is ${formatINR(outstanding)}. You cannot record more than this.`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Payment" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-heading">Date *</label>
          <input type="date" className="input-field w-full" {...register('date')} />
          {errors.date && <p className="mt-1 text-xs text-red-600">{errors.date.message}</p>}
        </div>

        <div className="relative" ref={partyWrapRef}>
          <label className="mb-1 block text-sm font-medium text-heading">Party *</label>
          <input
            type="text"
            className="input-field w-full"
            value={partyQuery}
            onChange={(e) => {
              setPartyQuery(e.target.value);
              setPartyMenuOpen(true);
              if (partyId) {
                setValue('party_id', 0, { shouldValidate: true });
              }
            }}
            onFocus={() => setPartyMenuOpen(true)}
            placeholder={loadingParties ? 'Loading parties…' : 'Search party with dues…'}
            autoComplete="off"
          />
          {errors.party_id && <p className="mt-1 text-xs text-red-600">{errors.party_id.message}</p>}
          {partyMenuOpen && filteredParties.length > 0 && (
            <ul className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-md border border-card-border bg-white py-1 shadow-lg">
              {filteredParties.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-brand-50"
                    onClick={() => {
                      setValue('party_id', p.id, { shouldValidate: true });
                      setPartyQuery(p.name);
                      setPartyMenuOpen(false);
                      clearErrors('party_id');
                      clearErrors('amount');
                    }}
                  >
                    {p.name} — {formatINR(p.outstanding)} due
                  </button>
                </li>
              ))}
            </ul>
          )}
          <input type="hidden" {...register('party_id', { valueAsNumber: true })} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-heading">Amount *</label>
          {selectedParty != null && (
            <p className="mb-1 text-sm text-gray-600">Outstanding: {formatINR(outstanding)}</p>
          )}
          <input
            type="number"
            step="0.01"
            min={0}
            max={selectedParty != null ? outstanding : undefined}
            className="input-field w-full"
            {...register('amount')}
          />
          {exceedsOutstanding ? (
            <p className="mt-1 text-xs text-red-600">{exceedCopy}</p>
          ) : (
            amountErrorMsg && <p className="mt-1 text-xs text-red-600">{amountErrorMsg}</p>
          )}
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

        <div>
          <label className="mb-1 block text-sm font-medium text-heading">Remarks</label>
          <textarea className="input-field min-h-[88px] w-full resize-y" rows={3} {...register('remarks')} />
        </div>

        <div className="flex justify-end gap-2 border-t border-card-border pt-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || exceedsOutstanding || parties.length === 0}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Save payment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
