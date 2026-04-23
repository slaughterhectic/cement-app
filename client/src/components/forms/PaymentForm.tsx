import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../ui/Modal';
import { api } from '../../lib/api';
import { formatDateInput, formatINR } from '../../lib/format';
import { useToastStore } from '../../lib/store';

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
    cash_handler: z.string().optional(),
    remarks: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mode === 'bank') {
      if (!data.bank_name?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Select a bank', path: ['bank_name'] });
      }
    }
    if (data.mode === 'cash') {
      if (!data.cash_handler?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Select a cash handler', path: ['cash_handler'] });
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
  /** Force direction when opened from party ledger */
  direction?: 'pay' | 'receive';
}

type PartyWithDue = { id: number; name: string; type: string; outstanding: number };

export default function PaymentForm({ isOpen, onClose, onSuccess, partyId: preselectPartyId, direction: forceDirection }: PaymentFormProps) {
  const addToast = useToastStore((s) => s.addToast);
  const [allParties, setAllParties] = useState<PartyWithDue[]>([]);
  const [loadingParties, setLoadingParties] = useState(false);
  const [partyQuery, setPartyQuery] = useState('');
  const [partyMenuOpen, setPartyMenuOpen] = useState(false);
  // 'pay' = we pay someone (supplier payable), 'receive' = we receive from someone (customer receivable)
  const [direction, setDirection] = useState<'pay' | 'receive'>('receive');
  const partyWrapRef = useRef<HTMLDivElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cashHandlers, setCashHandlers] = useState<string[]>([]);
  const [bankOptions, setBankOptions] = useState<string[]>([]);

  const defaultValues = useMemo(
    () => ({
      date: formatDateInput(),
      party_id: 0,
      amount: undefined as unknown as number,
      mode: 'bank' as const,
      bank_name: '' as string,
      cash_handler: '' as string,
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
  const mode = watch('mode');

  // All parties shown regardless of direction
  const parties = allParties;

  const selectedParty = useMemo(
    () => allParties.find((p) => p.id === Number(partyId)),
    [allParties, partyId]
  );
  const outstanding = selectedParty?.outstanding ?? 0;

  const loadParties = useCallback(async () => {
    setLoadingParties(true);
    try {
      const rows = (await api.parties.list()) as PartyWithDue[];
      setAllParties(Array.isArray(rows) ? rows : []);
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to load parties', 'error');
      setAllParties([]);
    } finally {
      setLoadingParties(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (!isOpen) return;
    loadParties();
    api.imprest.handlers().then((rows: any[]) => {
      setCashHandlers(rows.map((r: any) => r.handler_name));
    }).catch(() => {});
    api.capital.banks().then((rows: any[]) => {
      setBankOptions(rows.map((r: any) => r.bank_name));
    }).catch(() => {});
  }, [isOpen, loadParties]);

  // When form opens, set direction from forceDirection or from pre-selected party type
  useEffect(() => {
    if (!isOpen) return;
    if (forceDirection) {
      setDirection(forceDirection);
    } else if (preselectPartyId) {
      // will be updated after parties load
    } else {
      setDirection('receive');
    }
  }, [isOpen, forceDirection, preselectPartyId]);

  useEffect(() => {
    if (!isOpen || allParties.length === 0) return;
    const pid = preselectPartyId != null && preselectPartyId > 0 ? preselectPartyId : 0;
    const found = pid > 0 ? allParties.find((p) => p.id === pid) : undefined;

    // Auto-set direction from party type if not forced
    if (!forceDirection && found) {
      setDirection(found.type === 'supplier' ? 'pay' : 'receive');
    }

    reset({
      ...defaultValues,
      date: formatDateInput(),
      party_id: found ? pid : 0,
      amount: undefined as unknown as number,
      mode: 'bank',
      bank_name: '',
      cash_handler: '',
      remarks: '',
    });
    setPartyQuery(found ? found.name : '');
    setPartyMenuOpen(false);
    clearErrors();
  }, [isOpen, preselectPartyId, allParties, reset, defaultValues, clearErrors, forceDirection]);

  useEffect(() => {
    const p = allParties.find((x) => x.id === partyId);
    if (p) setPartyQuery(p.name);
  }, [partyId, allParties]);

  // Direction change no longer clears party — any party is valid for either direction

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
    setValue('bank_name', '');
    setValue('cash_handler', '');
    clearErrors('bank_name');
    clearErrors('cash_handler');
  }, [mode, setValue, clearErrors]);

  const filteredParties = useMemo(() => {
    const q = partyQuery.trim().toLowerCase();
    if (!q) return parties.slice(0, 80);
    return parties.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 80);
  }, [parties, partyQuery]);

  const onSubmit = async (values: PaymentFormValues) => {
    setSubmitting(true);
    try {
      const result = await api.payments.create({
        date: values.date,
        party_id: values.party_id,
        amount: values.amount,
        mode: values.mode,
        bank_name: values.mode === 'bank' ? (values.bank_name || null) : null,
        cash_handler: values.mode === 'cash' ? (values.cash_handler || null) : null,
        remarks: values.remarks?.trim() || null,
        direction,
      });
      if ((result as any).pending) {
        addToast('Entry sent for admin approval', 'info');
      } else {
        addToast(direction === 'pay' ? 'Payment to supplier recorded' : 'Payment received recorded', 'success');
      }
      onSuccess();
      onClose();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to save payment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const amountErrorMsg = errors.amount?.message;
  const isPay = direction === 'pay';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Payment" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">

        {/* Direction Toggle */}
        <div>
          <p className="mb-1.5 text-sm font-medium text-heading">Payment type *</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDirection('receive')}
              className={`rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition-colors text-left ${
                !isPay
                  ? 'border-outstanding bg-red-50 text-outstanding'
                  : 'border-card-border bg-card text-heading/60 hover:bg-surface'
              }`}
            >
              <p className="font-semibold">Receive</p>
              <p className="text-xs mt-0.5 opacity-80">
                {selectedParty?.type === 'supplier' ? 'Supplier refunded / sent money' : 'Money came in from party'}
              </p>
            </button>
            <button
              type="button"
              onClick={() => setDirection('pay')}
              className={`rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition-colors text-left ${
                isPay
                  ? 'border-orange-500 bg-orange-50 text-orange-700'
                  : 'border-card-border bg-card text-heading/60 hover:bg-surface'
              }`}
            >
              <p className="font-semibold">Pay</p>
              <p className="text-xs mt-0.5 opacity-80">
                {selectedParty?.type === 'supplier' ? 'We paid the supplier' : 'We paid / gave advance to party'}
              </p>
            </button>
          </div>
        </div>

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
              if (partyId) setValue('party_id', 0, { shouldValidate: true });
            }}
            onFocus={() => setPartyMenuOpen(true)}
            placeholder={loadingParties ? 'Loading…' : 'Search party…'}
            autoComplete="off"
          />
          {errors.party_id && <p className="mt-1 text-xs text-red-600">{errors.party_id.message}</p>}
          {partyMenuOpen && filteredParties.length > 0 && (
            <ul className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-md border border-card-border bg-card py-1 shadow-lg">
              {filteredParties.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-brand-50"
                    onClick={() => {
                      setValue('party_id', p.id, { shouldValidate: true });
                      setPartyQuery(p.name);
                      setPartyMenuOpen(false);
                      clearErrors('party_id');
                      clearErrors('amount');
                      // Auto-set direction based on party type (unless forced from parent)
                      if (!forceDirection) {
                        setDirection(p.type === 'supplier' ? 'pay' : 'receive');
                      }
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium truncate">{p.name}</span>
                      <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium capitalize ${
                        p.type === 'supplier' ? 'bg-indigo-100 text-indigo-700' : 'bg-surface text-heading/70'
                      }`}>{p.type ?? 'other'}</span>
                    </div>
                    {p.outstanding > 0 && (
                      <span className={`shrink-0 text-xs font-semibold ${p.type === 'supplier' ? 'text-orange-600' : 'text-outstanding'}`}>
                        {p.type === 'supplier' ? 'We owe: ' : 'Due: '}{formatINR(p.outstanding)}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {partyMenuOpen && !loadingParties && filteredParties.length === 0 && (
            <div className="absolute z-20 mt-1 w-full rounded-md border border-card-border bg-card py-3 px-3 text-sm text-heading/60 shadow-lg">
              No parties found.
            </div>
          )}
          <input type="hidden" {...register('party_id', { valueAsNumber: true })} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-heading">Amount *</label>
          {selectedParty != null && outstanding > 0 && (
            <p className={`mb-1 text-sm font-medium ${selectedParty.type === 'supplier' ? 'text-orange-600' : 'text-outstanding'}`}>
              {selectedParty.type === 'supplier' ? 'We owe them' : 'They owe us'}: {formatINR(outstanding)}
            </p>
          )}
          <input
            type="number"
            step="0.01"
            min={0}
            className="input-field w-full"
            {...register('amount')}
          />
          {amountErrorMsg && <p className="mt-1 text-xs text-red-600">{amountErrorMsg}</p>}
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
              {bankOptions.length > 0
                ? bankOptions.map((b) => <option key={b} value={b}>{b}</option>)
                : <option disabled value="">No banks configured — add in Settings → Banks</option>
              }
            </select>
            {errors.bank_name && <p className="mt-1 text-xs text-red-600">{errors.bank_name.message}</p>}
          </div>
        )}

        {mode === 'cash' && (
          <div>
            <label className="mb-1 block text-sm font-medium text-heading">Cash Handler *</label>
            <select className="input-field w-full" {...register('cash_handler')}>
              <option value="">Select handler</option>
              {cashHandlers.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
            {errors.cash_handler && <p className="mt-1 text-xs text-red-600">{errors.cash_handler.message}</p>}
            {cashHandlers.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">No cash handlers configured — add one in Capital → Add Cash Handler.</p>
            )}
            <p className="mt-1 text-xs text-heading/60">This cash movement will be recorded against the handler's cash book automatically.</p>
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-heading">Remarks</label>
          <textarea className="input-field min-h-[88px] w-full resize-y" rows={3} {...register('remarks')} />
        </div>

        <div className="flex justify-end gap-2 border-t border-card-border pt-4">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            type="submit"
            disabled={submitting}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
              isPay ? 'bg-orange-600 hover:bg-orange-700' : 'bg-brand-600 hover:bg-brand-700'
            }`}
          >
            {submitting ? 'Saving…' : isPay ? 'Save Payment (Pay Out)' : 'Save Payment (Received)'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
