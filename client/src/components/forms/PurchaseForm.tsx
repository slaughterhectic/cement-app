import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../ui/Modal';
import { api } from '../../lib/api';
import { formatDateInput, formatINR } from '../../lib/format';
import { useToastStore, useAuthStore } from '../../lib/store';

const schema = z.object({
  date: z.string().min(1, 'Date is required'),
  supplier_id: z.coerce.number().int().positive('Supplier is required'),
  brand_id: z.coerce.number().int().positive('Brand is required'),
  cement_type: z.string().optional(),
  bags: z.coerce.number().int().positive('Bags must be at least 1'),
  purchase_rate: z.coerce.number().positive('Rate must be positive'),
  freight_rate: z.coerce.number().min(0).optional(),
  godown_id: z.coerce.number().int().positive('Godown is required'),
  truck_number: z.string().min(1, 'Truck number is required'),
  source_location: z.string().optional(),
  invoice_number: z.string().optional(),
  remarks: z.string().optional(),
});

export type PurchaseFormValues = z.infer<typeof schema>;

export interface PurchaseEditData extends Omit<PurchaseFormValues, 'supplier_id'> {
  id: number;
  supplier_id: number;
}

export interface PurchaseFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: PurchaseEditData | null;
}

type Brand = { id: number; name: string; type?: string };
type Godown = { id: number; name: string };
type Party = { id: number; name: string; type?: string };

export function PurchaseForm({ isOpen, onClose, onSuccess, editData }: PurchaseFormProps) {
  const addToast = useToastStore((s) => s.addToast);
  const isAdmin = useAuthStore((s) => s.isAdmin());
  // Non-admin users can only edit invoice_number when editing a record
  const lockFields = !!editData && !isAdmin;
  const [parties, setParties] = useState<Party[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [supplierQuery, setSupplierQuery] = useState('');
  const [supplierMenuOpen, setSupplierMenuOpen] = useState(false);
  const supplierWrapRef = useRef<HTMLDivElement>(null);
  const [submitting, setSubmitting] = useState(false);

  const defaultValues = useMemo(
    () => ({
      date: formatDateInput(),
      supplier_id: 0,
      brand_id: 0,
      cement_type: '',
      bags: 1,
      purchase_rate: 0,
      freight_rate: 0,
      godown_id: 0,
      truck_number: '',
      source_location: '',
      invoice_number: '',
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
  } = useForm<PurchaseFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const bags = watch('bags');
  const purchaseRate = watch('purchase_rate');
  const freightRate = watch('freight_rate');
  const brandId = watch('brand_id');
  const cementType = watch('cement_type');

  const bagsNum = Number(bags) || 0;
  const purchaseAmount = useMemo(() => {
    const r = Number(purchaseRate) || 0;
    return bagsNum * r;
  }, [bagsNum, purchaseRate]);

  const freightAmount = useMemo(() => {
    const fr = Number(freightRate) || 0;
    return bagsNum * fr;
  }, [bagsNum, freightRate]);

  const totalLandedCost = purchaseAmount + freightAmount;

  // Entered amount IS the total (GST-inclusive). Back-calculate base.
  const gstRate = cementType === 'DAMAGE' ? 5 : 18;
  const base = purchaseAmount / (1 + gstRate / 100);
  const cgst = base * (gstRate / 2) / 100;
  const sgst = cgst;

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    Promise.all([api.parties.list(), api.brands.list(), api.godowns.list()])
      .then(([pt, br, gd]) => {
        if (!cancelled) {
          setParties(pt as Party[]);
          setBrands(br as Brand[]);
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
    if (!isOpen) return;
    if (editData) {
      reset({
        date: formatDateInput(editData.date),
        supplier_id: editData.supplier_id ?? 0,
        brand_id: editData.brand_id,
        cement_type: editData.cement_type ?? '',
        bags: editData.bags,
        purchase_rate: editData.purchase_rate,
        freight_rate: (editData as any).freight_rate ?? 0,
        godown_id: editData.godown_id ?? 0,
        truck_number: editData.truck_number ?? '',
        source_location: editData.source_location ?? '',
        invoice_number: (editData as any).invoice_number ?? '',
        remarks: editData.remarks ?? '',
      });
      const p = parties.find((x) => x.id === editData.supplier_id);
      setSupplierQuery(p?.name ?? (editData as any).supplier_name ?? '');
    } else {
      reset({ ...defaultValues, date: formatDateInput() });
      setSupplierQuery('');
    }
  }, [isOpen, editData, reset, defaultValues, parties]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (supplierWrapRef.current && !supplierWrapRef.current.contains(e.target as Node)) {
        setSupplierMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    if (!brandId || brandId === 0) return;
    const b = brands.find((x) => x.id === Number(brandId));
    if (b?.type) setValue('cement_type', b.type);
  }, [brandId, brands, setValue]);

  const filteredSuppliers = useMemo(() => {
    const q = supplierQuery.trim().toLowerCase();
    if (!q) return parties.slice(0, 50);
    return parties.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 50);
  }, [parties, supplierQuery]);

  const onSubmit = async (values: PurchaseFormValues) => {
    setSubmitting(true);
    try {
      const payload = {
        date: values.date,
        supplier_id: values.supplier_id,
        brand_id: values.brand_id,
        cement_type: values.cement_type?.trim() || null,
        bags: values.bags,
        purchase_rate: values.purchase_rate,
        freight_rate: values.freight_rate || 0,
        godown_id: values.godown_id,
        truck_number: values.truck_number?.trim() || null,
        source_location: values.source_location?.trim() || null,
        invoice_number: values.invoice_number?.trim() || null,
        remarks: values.remarks?.trim() || null,
      };
      if (editData?.id) {
        await api.purchases.update(editData.id, payload);
        addToast('Purchase updated', 'success');
      } else {
        const result = await api.purchases.create(payload);
        if ((result as any).pending) {
          addToast('Entry sent for admin approval', 'info');
        } else {
          addToast('Purchase recorded', 'success');
        }
      }
      onSuccess();
      onClose();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editData ? 'Edit purchase' : 'New purchase'}
      size="xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {lockFields && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
            Only the <strong>invoice number</strong> can be edited. Contact an admin to change other fields.
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-heading">Date *</label>
            <input type="date" className="input-field w-full" disabled={lockFields} {...register('date')} />
            {errors.date && <p className="mt-1 text-xs text-red-600">{errors.date.message}</p>}
          </div>
          <div className="relative" ref={supplierWrapRef}>
            <label className="mb-1 block text-sm font-medium text-heading">Supplier *</label>
            <input
              type="text"
              className="input-field w-full"
              value={supplierQuery}
              disabled={lockFields}
              onChange={(e) => {
                setSupplierQuery(e.target.value);
                setSupplierMenuOpen(true);
                setValue('supplier_id', 0, { shouldValidate: true });
              }}
              onFocus={() => !lockFields && setSupplierMenuOpen(true)}
              placeholder="Search supplier…"
            />
            <input type="hidden" {...register('supplier_id', { valueAsNumber: true })} />
            {supplierMenuOpen && filteredSuppliers.length > 0 && (
              <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border border-card-border bg-white py-1 shadow-lg">
                {filteredSuppliers.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-brand-50"
                      onClick={() => {
                        setValue('supplier_id', p.id, { shouldValidate: true });
                        setSupplierQuery(p.name);
                        setSupplierMenuOpen(false);
                      }}
                    >
                      <span>{p.name}</span>
                      {p.type && (
                        <span className="ml-2 rounded px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-500 capitalize">
                          {p.type.replace(/_/g, ' ')}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {errors.supplier_id && (
              <p className="mt-1 text-xs text-red-600">{errors.supplier_id.message}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-heading">Brand *</label>
            <select className="input-field w-full" disabled={lockFields} {...register('brand_id')}>
              <option value={0}>Select brand</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            {errors.brand_id && (
              <p className="mt-1 text-xs text-red-600">{errors.brand_id.message}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-heading">Cement type</label>
            <input type="text" className="input-field w-full" disabled={lockFields} {...register('cement_type')} />
            <p className="mt-1 text-xs text-gray-500">Prefilled from brand; you can edit (OPC / PPC / DAMAGE).</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-heading">Bags *</label>
            <input type="number" min={1} step={1} className="input-field w-full" disabled={lockFields} {...register('bags')} />
            {errors.bags && <p className="mt-1 text-xs text-red-600">{errors.bags.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-heading">Purchase rate (₹ / bag) *</label>
            <input
              type="number"
              min={0}
              step={0.01}
              className="input-field w-full"
              disabled={lockFields}
              {...register('purchase_rate')}
            />
            {errors.purchase_rate && (
              <p className="mt-1 text-xs text-red-600">{errors.purchase_rate.message}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-heading">Freight rate (₹ / bag)</label>
            <input
              type="number"
              min={0}
              step={0.01}
              className="input-field w-full"
              placeholder="0"
              disabled={lockFields}
              {...register('freight_rate')}
            />
            <p className="mt-1 text-xs text-gray-500">Optional. Transport cost per bag.</p>
          </div>
          {/* Amount Breakdown */}
          <div className="sm:col-span-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-700">
              Amount Breakdown (GST {gstRate}% — {gstRate / 2}% CGST + {gstRate / 2}% SGST)
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs text-gray-500">Purchase amount</p>
                <p className="font-semibold text-gray-800">{formatINR(purchaseAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Base (excl GST)</p>
                <p className="font-semibold text-gray-800">{formatINR(base)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">CGST + SGST</p>
                <p className="font-semibold text-gray-800">{formatINR(cgst + sgst)}</p>
              </div>
              {freightAmount > 0 && (
                <div>
                  <p className="text-xs text-gray-500">Freight ({formatINR(Number(freightRate) || 0)}/bag × {bagsNum})</p>
                  <p className="font-semibold text-amber-700">{formatINR(freightAmount)}</p>
                </div>
              )}
              <div className={freightAmount > 0 ? 'sm:col-span-2' : 'sm:col-span-3'}>
                <p className="text-xs text-gray-500">Total landed cost{freightAmount > 0 ? ' (purchase + freight)' : ''}</p>
                <p className="text-xl font-bold text-brand-900">{formatINR(totalLandedCost)}</p>
              </div>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-heading">Godown *</label>
            <Controller
              name="godown_id"
              control={control}
              render={({ field }) => (
                <select
                  className="input-field w-full"
                  disabled={lockFields}
                  value={field.value || ''}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                >
                  <option value={0}>Select godown</option>
                  {godowns.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              )}
            />
            {errors.godown_id && <p className="mt-1 text-xs text-red-600">{errors.godown_id.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-heading">Truck number *</label>
            <input type="text" className="input-field w-full" placeholder="e.g. UP14AT7777" disabled={lockFields} {...register('truck_number')} />
            {errors.truck_number && <p className="mt-1 text-xs text-red-600">{errors.truck_number.message}</p>}
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-heading">Source location</label>
            <input type="text" className="input-field w-full" disabled={lockFields} {...register('source_location')} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-heading">Invoice number</label>
            <input type="text" className="input-field w-full" placeholder="Supplier invoice / GRN number" {...register('invoice_number')} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-heading">Remarks</label>
            <textarea rows={3} className="input-field w-full resize-y" disabled={lockFields} {...register('remarks')} />
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
            disabled={submitting}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting ? 'Saving…' : editData ? 'Update' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default PurchaseForm;
