import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../ui/Modal';
import { api } from '../../lib/api';
import { formatDateInput, formatINR } from '../../lib/format';
import { useToastStore } from '../../lib/store';

const optionalInt = z.preprocess(
  (v) => (v === '' || v == null || (typeof v === 'number' && Number.isNaN(v)) ? undefined : v),
  z.number().int().optional()
);
const optionalFloat = z.preprocess(
  (v) => (v === '' || v == null || (typeof v === 'number' && Number.isNaN(v)) ? undefined : v),
  z.number().optional()
);

const schema = z.object({
  date: z.string().min(1, 'Date is required'),
  party_id: z.coerce.number().int().positive('Party is required'),
  brand_id: z.coerce.number().int().positive('Brand is required'),
  cement_type: z.string().optional(),
  bags: z.coerce.number().int().positive('Bags must be at least 1'),
  sale_rate: z.coerce.number().positive('Rate must be positive'),
  destination: z.string().optional(),
  godown_id: z.number().int().positive().optional(),
  truck_number: z.string().optional(),
  invoice_number: z.string().optional(),
  billed_party: z.string().optional(),
  billed_quantity: optionalInt,
  billed_rate: optionalFloat,
  billed_amount: optionalFloat,
  remarks: z.string().optional(),
});

export type SaleFormValues = z.infer<typeof schema>;

export interface SaleEditData extends SaleFormValues {
  id: number;
  cost_rate?: number;
}

export interface SaleFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: SaleEditData | null;
  /** When creating a sale from a party ledger, pre-select this party. */
  defaultPartyId?: number;
}

type Brand = { id: number; name: string; type?: string; stock: number };
type Party = { id: number; name: string };
type Godown = { id: number; name: string };

export function SaleForm({ isOpen, onClose, onSuccess, editData, defaultPartyId }: SaleFormProps) {
  const addToast = useToastStore((s) => s.addToast);
  const [parties, setParties] = useState<Party[]>([]);
  const [allBrands, setAllBrands] = useState<Brand[]>([]);
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [partyQuery, setPartyQuery] = useState('');
  const [partyMenuOpen, setPartyMenuOpen] = useState(false);
  const partyWrapRef = useRef<HTMLDivElement>(null);
  const [stockByBrand, setStockByBrand] = useState<Record<number, number>>({});
  const [stocksForGodownLoading, setStocksForGodownLoading] = useState(false);
  const [liveStock, setLiveStock] = useState<number | null>(null);
  const [loadingStock, setLoadingStock] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [purchaseRates, setPurchaseRates] = useState<{ landed_rate: number; purchase_rate: number; freight_rate: number; purchased_bags: number; last_date: string }[]>([]);
  const [rateStock, setRateStock] = useState<number>(0);
  const [selectedCostRate, setSelectedCostRate] = useState<number>(0);

  const defaultValues = useMemo(
    () => ({
      date: formatDateInput(),
      party_id: 0,
      brand_id: 0,
      cement_type: '',
      bags: 1,
      sale_rate: 0,
      destination: '',
      godown_id: undefined as number | undefined,
      truck_number: '',
      invoice_number: '',
      billed_party: '',
      billed_quantity: undefined as number | undefined,
      billed_rate: undefined as number | undefined,
      billed_amount: undefined as number | undefined,
      remarks: '',
    }),
    []
  );

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<SaleFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const brandId = watch('brand_id');
  const godownId = watch('godown_id');
  const bags = watch('bags');
  const saleRate = watch('sale_rate');
  const partyId = watch('party_id');
  const cementType = watch('cement_type');
  const invoiceNumber = watch('invoice_number');

  const saleAmount = useMemo(() => {
    const b = Number(bags) || 0;
    const r = Number(saleRate) || 0;
    return b * r;
  }, [bags, saleRate]);

  // Entered amount IS the total (GST-inclusive). Back-calculate base.
  const gstRate = cementType === 'DAMAGE' ? 5 : 18;
  const base = saleAmount / (1 + gstRate / 100);
  const cgst = base * (gstRate / 2) / 100;
  const sgst = cgst;

  const sameContextAsEdit =
    !!editData &&
    Number(editData.brand_id) === Number(brandId) &&
    Number(editData.godown_id ?? 0) === Number(godownId ?? 0);
  const editReleaseBags = editData && sameContextAsEdit ? editData.bags : 0;

  const effectiveMaxStock = useMemo(() => {
    if (!brandId || brandId === 0) return 0;
    const base = liveStock ?? 0;
    return base + editReleaseBags;
  }, [brandId, liveStock, editReleaseBags]);

  const selectedBrandName = useMemo(
    () => allBrands.find((b) => b.id === Number(brandId))?.name ?? 'this brand',
    [allBrands, brandId]
  );

  const refreshStock = useCallback(
    async (bId: number, gId?: number) => {
      if (!bId) {
        setLiveStock(null);
        return;
      }
      setLoadingStock(true);
      try {
        const { stock } = await api.sales.stock(bId, gId);
        setLiveStock(stock);
      } catch {
        setLiveStock(null);
        addToast('Could not load stock', 'error');
      } finally {
        setLoadingStock(false);
      }
    },
    [addToast]
  );

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    Promise.all([api.parties.list(), api.brands.list(), api.godowns.list()])
      .then(([pt, br, gd]) => {
        if (!cancelled) {
          setParties(pt as Party[]);
          setAllBrands(br as Brand[]);
          setGodowns(gd as Godown[]);
        }
      })
      .catch(() => {
        if (!cancelled) addToast('Failed to load form data', 'error');
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, addToast]);

  useEffect(() => {
    if (!isOpen || !godownId) {
      setStockByBrand({});
      setStocksForGodownLoading(false);
      return;
    }
    let cancelled = false;
    setStocksForGodownLoading(true);
    const brandsToCheck = allBrands.filter((b) => b.stock > 0);
    Promise.all(
      brandsToCheck.map(async (b) => {
        try {
          const { stock } = await api.sales.stock(b.id, godownId);
          return [b.id, stock] as const;
        } catch {
          return [b.id, 0] as const;
        }
      })
    ).then((entries) => {
      if (!cancelled) {
        setStockByBrand(Object.fromEntries(entries));
        setStocksForGodownLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, godownId, allBrands]);

  useEffect(() => {
    if (!isOpen) return;
    refreshStock(Number(brandId), godownId);
  }, [isOpen, brandId, godownId, refreshStock]);

  // Load available purchase rates when brand changes
  useEffect(() => {
    if (!isOpen || !brandId || brandId === 0) {
      setPurchaseRates([]);
      setSelectedCostRate(0);
      return;
    }
    api.purchases.rates(Number(brandId)).then((res: any) => {
      const { rates, totalStock } = res;
      setPurchaseRates(rates);
      setRateStock(totalStock);
      // Auto-select if only one rate exists
      if (rates.length === 1) setSelectedCostRate(Number(rates[0].landed_rate));
    }).catch(() => { setPurchaseRates([]); setRateStock(0); });
  }, [isOpen, brandId]);

  useEffect(() => {
    if (!isOpen) return;
    if (editData) {
      reset({
        date: formatDateInput(editData.date),
        party_id: editData.party_id,
        brand_id: editData.brand_id,
        cement_type: editData.cement_type ?? '',
        bags: editData.bags,
        sale_rate: editData.sale_rate,
        destination: editData.destination ?? '',
        godown_id: editData.godown_id ?? undefined,
        truck_number: editData.truck_number ?? '',
        invoice_number: editData.invoice_number ?? '',
        billed_party: editData.billed_party ?? '',
        billed_quantity: editData.billed_quantity ?? undefined,
        billed_rate: editData.billed_rate ?? undefined,
        billed_amount: editData.billed_amount ?? undefined,
        remarks: editData.remarks ?? '',
      });
      const p = parties.find((x) => x.id === editData.party_id);
      setPartyQuery(p?.name ?? '');
      setSelectedCostRate((editData as any).cost_rate ?? 0);
    } else {
      const pid =
        defaultPartyId != null && defaultPartyId > 0 ? defaultPartyId : 0;
      reset({ ...defaultValues, date: formatDateInput(), party_id: pid });
      const p = parties.find((x) => x.id === pid);
      setPartyQuery(p?.name ?? '');
    }
  }, [isOpen, editData, reset, defaultValues, parties, defaultPartyId]);

  useEffect(() => {
    if (!brandId || brandId === 0) return;
    const b = allBrands.find((x) => x.id === Number(brandId));
    if (b?.type) setValue('cement_type', b.type);
  }, [brandId, allBrands, setValue]);

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

  const brandOptions = useMemo(() => {
    if (!godownId) {
      return allBrands.filter((b) => b.stock > 0);
    }
    if (stocksForGodownLoading) return [];
    return allBrands.filter((b) => (stockByBrand[b.id] ?? 0) > 0);
  }, [allBrands, godownId, stockByBrand, stocksForGodownLoading]);

  const stockZeroMessage =
    brandId && !loadingStock && !stocksForGodownLoading && effectiveMaxStock <= 0
      ? `No stock available for ${selectedBrandName}. Please record a purchase first.`
      : null;

  const filteredParties = useMemo(() => {
    const q = partyQuery.trim().toLowerCase();
    if (!q) return parties.slice(0, 50);
    return parties.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 50);
  }, [parties, partyQuery]);

  const onSubmit = async (values: SaleFormValues) => {
    if (effectiveMaxStock <= 0 && values.brand_id) {
      addToast(stockZeroMessage ?? 'No stock available', 'error');
      return;
    }
    if (values.bags > effectiveMaxStock) {
      addToast(`Only ${effectiveMaxStock} bags available`, 'error');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        date: values.date,
        party_id: values.party_id,
        brand_id: values.brand_id,
        cement_type: values.cement_type?.trim() || null,
        bags: values.bags,
        sale_rate: values.sale_rate,
        cost_rate: selectedCostRate,
        destination: values.destination?.trim() || null,
        godown_id: values.godown_id ?? null,
        truck_number: values.truck_number?.trim() || null,
        invoice_number: values.invoice_number?.trim() || null,
        billed_party: values.billed_party?.trim() || null,
        billed_quantity: values.billed_quantity ?? null,
        billed_rate: values.billed_rate ?? null,
        billed_amount: values.billed_amount ?? null,
        remarks: values.remarks?.trim() || null,
      };
      if (editData?.id) {
        await api.sales.update(editData.id, payload);
        addToast('Sale updated', 'success');
      } else {
        await api.sales.create(payload);
        addToast('Sale recorded', 'success');
      }
      onSuccess();
      onClose();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const bagsInvalid = brandId > 0 && effectiveMaxStock > 0 && Number(bags) > effectiveMaxStock;
  const disableSubmit =
    submitting ||
    !brandId ||
    effectiveMaxStock <= 0 ||
    bagsInvalid ||
    loadingStock ||
    stocksForGodownLoading ||
    !partyId;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editData ? 'Edit sale' : 'New sale'} size="xl">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-heading">Date *</label>
            <input type="date" className="input-field w-full" {...register('date')} />
            {errors.date && <p className="mt-1 text-xs text-red-600">{errors.date.message}</p>}
          </div>

          <div className="relative sm:col-span-2" ref={partyWrapRef}>
            <label className="mb-1 block text-sm font-medium text-heading">Party *</label>
            <input
              type="text"
              className="input-field w-full"
              value={partyQuery}
              onChange={(e) => {
                setPartyQuery(e.target.value);
                setPartyMenuOpen(true);
                setValue('party_id', 0, { shouldValidate: true });
              }}
              onFocus={() => setPartyMenuOpen(true)}
              placeholder="Search party…"
            />
            <input type="hidden" {...register('party_id', { valueAsNumber: true })} />
            {partyMenuOpen && filteredParties.length > 0 && (
              <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border border-card-border bg-white py-1 shadow-lg">
                {filteredParties.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-brand-50"
                      onClick={() => {
                        setValue('party_id', p.id, { shouldValidate: true });
                        setPartyQuery(p.name);
                        setPartyMenuOpen(false);
                      }}
                    >
                      {p.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {errors.party_id && <p className="mt-1 text-xs text-red-600">{errors.party_id.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-heading">Brand *</label>
            <select className="input-field w-full" {...register('brand_id')} disabled={stocksForGodownLoading}>
              <option value={0}>
                {stocksForGodownLoading ? 'Loading brands…' : 'Select brand'}
              </option>
              {brandOptions.map((b) => {
                const qty = godownId ? stockByBrand[b.id] ?? 0 : b.stock;
                return (
                  <option key={b.id} value={b.id}>
                    {b.name} ({qty} bags)
                  </option>
                );
              })}
            </select>
            {errors.brand_id && <p className="mt-1 text-xs text-red-600">{errors.brand_id.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-heading">Cement type</label>
            <input type="text" className="input-field w-full" {...register('cement_type')} />
          </div>

          <div>
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <label className="text-sm font-medium text-heading">Bags *</label>
              {brandId > 0 && (
                <span className="text-sm text-gray-600">
                  {loadingStock || stocksForGodownLoading ? (
                    'Loading stock…'
                  ) : (
                    <>
                      Available:{' '}
                      <span className="font-semibold text-brand-800">
                        {rateStock > 0 ? rateStock : effectiveMaxStock}
                      </span> bags
                    </>
                  )}
                </span>
              )}
            </div>
            <input
              type="number"
              min={1}
              max={effectiveMaxStock > 0 ? effectiveMaxStock : undefined}
              step={1}
              className="input-field w-full"
              {...register('bags', { valueAsNumber: true })}
            />
            {stockZeroMessage && <p className="mt-1 text-sm text-red-600">{stockZeroMessage}</p>}
            {errors.bags && <p className="mt-1 text-xs text-red-600">{errors.bags.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-heading">Purchase cost (₹ / bag) *</label>
            {purchaseRates.length > 0 ? (
              <select
                className="input-field w-full"
                value={selectedCostRate}
                onChange={(e) => setSelectedCostRate(Number(e.target.value))}
              >
                <option value={0}>Select purchase rate</option>
                {purchaseRates.map((r, i) => (
                  <option key={i} value={Number(r.landed_rate)}>
                    ₹{Number(r.landed_rate).toFixed(0)}/bag
                    {Number(r.freight_rate) > 0 ? ` (₹${Number(r.purchase_rate)} + ₹${Number(r.freight_rate)} freight)` : ''}
                    {' — '}{r.purchased_bags} bags purchased
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="number"
                min={0}
                step={0.01}
                className="input-field w-full"
                placeholder="No purchases found"
                value={selectedCostRate || ''}
                onChange={(e) => setSelectedCostRate(Number(e.target.value))}
              />
            )}
            {selectedCostRate > 0 && (
              <p className="mt-1 text-xs text-gray-500">
                Cost: {formatINR(selectedCostRate)}/bag — Total stock available: <span className="font-semibold">{rateStock} bags</span>
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-heading">Sale rate (₹ / bag) *</label>
            <input
              type="number"
              min={0}
              step={0.01}
              className="input-field w-full"
              {...register('sale_rate', { valueAsNumber: true })}
            />
            {errors.sale_rate && (
              <p className="mt-1 text-xs text-red-600">{errors.sale_rate.message}</p>
            )}
            {selectedCostRate > 0 && Number(saleRate) > 0 && (
              <p className={`mt-1 text-xs font-medium ${Number(saleRate) > selectedCostRate ? 'text-green-600' : 'text-red-600'}`}>
                Margin: {formatINR(Number(saleRate) - selectedCostRate)}/bag
              </p>
            )}
          </div>

          {/* GST Breakdown */}
          <div className="sm:col-span-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Amount Breakdown (GST {gstRate}% — {gstRate / 2}% CGST + {gstRate / 2}% SGST)
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
              <div>
                <p className="text-xs text-gray-500">Base amount</p>
                <p className="font-semibold text-gray-800">{formatINR(base)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">CGST ({gstRate / 2}%)</p>
                <p className="font-semibold text-gray-800">{formatINR(cgst)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">SGST ({gstRate / 2}%)</p>
                <p className="font-semibold text-gray-800">{formatINR(sgst)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total (entered)</p>
                <p className="text-xl font-bold text-emerald-900">{formatINR(saleAmount)}</p>
              </div>
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-heading">Destination</label>
            <input type="text" className="input-field w-full" {...register('destination')} />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-heading">Godown</label>
            <Controller
              name="godown_id"
              control={control}
              render={({ field }) => (
                <select
                  className="input-field w-full"
                  value={field.value ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    field.onChange(v === '' ? undefined : Number(v));
                  }}
                >
                  <option value="">— Not set (all locations) —</option>
                  {godowns.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              )}
            />
            <p className="mt-1 text-xs text-gray-500">When set, brand list and stock use this godown only.</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-heading">Truck number</label>
            <input type="text" className="input-field w-full" {...register('truck_number')} />
          </div>
          {/* Invoice / Billing section — turns green when invoice number is filled */}
          <div className={`sm:col-span-2 rounded-lg border p-3 transition-colors ${invoiceNumber?.trim() ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-gray-50'}`}>
            <p className={`mb-3 text-xs font-semibold uppercase tracking-wide ${invoiceNumber?.trim() ? 'text-emerald-700' : 'text-gray-500'}`}>
              {invoiceNumber?.trim() ? '✓ Billed — Invoice details' : 'Invoice & Billing (fill to mark as billed)'}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-heading">Invoice number</label>
                <input type="text" className="input-field w-full" placeholder="e.g. APL/2026-27/001" {...register('invoice_number')} />
                <p className="mt-1 text-xs text-emerald-700">Row turns green once invoice number is entered — confirms sale is billed.</p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-heading">Billed party</label>
                <input type="text" className="input-field w-full" {...register('billed_party')} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-heading">Billed quantity</label>
                <input type="number" min={0} step={1} className="input-field w-full" {...register('billed_quantity', { valueAsNumber: true })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-heading">Billed rate</label>
                <input type="number" min={0} step={0.01} className="input-field w-full" {...register('billed_rate', { valueAsNumber: true })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-heading">Billed amount</label>
                <input
                  type="number"
                  min={0}
              step={0.01}
              className="input-field w-full"
              {...register('billed_amount', { valueAsNumber: true })}
            />
              </div>
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-heading">Remarks</label>
            <textarea rows={3} className="input-field w-full resize-y" {...register('remarks')} />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-card-border pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={disableSubmit}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting ? 'Saving…' : editData ? 'Update' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default SaleForm;
