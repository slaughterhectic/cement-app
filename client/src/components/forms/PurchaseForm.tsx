import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../ui/Modal';
import { api } from '../../lib/api';
import { formatDateInput, formatINR } from '../../lib/format';
import { useToastStore } from '../../lib/store';

const schema = z.object({
  date: z.string().min(1, 'Date is required'),
  supplier_name: z.string().min(1, 'Supplier is required'),
  brand_id: z.coerce.number().int().positive('Brand is required'),
  cement_type: z.string().optional(),
  bags: z.coerce.number().int().positive('Bags must be at least 1'),
  purchase_rate: z.coerce.number().positive('Rate must be positive'),
  godown_id: z.coerce.number().int().positive('Godown is required'),
  truck_number: z.string().min(1, 'Truck number is required'),
  source_location: z.string().optional(),
  invoice_number: z.string().optional(),
  remarks: z.string().optional(),
});

export type PurchaseFormValues = z.infer<typeof schema>;

export interface PurchaseEditData extends PurchaseFormValues {
  id: number;
}

export interface PurchaseFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: PurchaseEditData | null;
}

type Brand = { id: number; name: string; type?: string };
type Godown = { id: number; name: string };

export function PurchaseForm({ isOpen, onClose, onSuccess, editData }: PurchaseFormProps) {
  const addToast = useToastStore((s) => s.addToast);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const defaultValues = useMemo(
    () => ({
      date: formatDateInput(),
      supplier_name: '',
      brand_id: 0,
      cement_type: '',
      bags: 1,
      purchase_rate: 0,
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
  const brandId = watch('brand_id');
  const cementType = watch('cement_type');

  const purchaseAmount = useMemo(() => {
    const b = Number(bags) || 0;
    const r = Number(purchaseRate) || 0;
    return b * r;
  }, [bags, purchaseRate]);

  // Entered amount IS the total (GST-inclusive). Back-calculate base.
  const gstRate = cementType === 'DAMAGE' ? 5 : 18;
  const base = purchaseAmount / (1 + gstRate / 100);
  const cgst = base * (gstRate / 2) / 100;
  const sgst = cgst;

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    Promise.all([api.purchases.suppliers(), api.brands.list(), api.godowns.list()])
      .then(([sup, br, gd]) => {
        if (!cancelled) {
          setSuppliers(sup as string[]);
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
        supplier_name: editData.supplier_name,
        brand_id: editData.brand_id,
        cement_type: editData.cement_type ?? '',
        bags: editData.bags,
        purchase_rate: editData.purchase_rate,
        godown_id: editData.godown_id ?? 0,
        truck_number: editData.truck_number ?? '',
        source_location: editData.source_location ?? '',
        invoice_number: (editData as any).invoice_number ?? '',
        remarks: editData.remarks ?? '',
      });
    } else {
      reset({
        ...defaultValues,
        date: formatDateInput(),
      });
    }
  }, [isOpen, editData, reset, defaultValues]);

  useEffect(() => {
    if (!brandId || brandId === 0) return;
    const b = brands.find((x) => x.id === Number(brandId));
    if (b?.type) setValue('cement_type', b.type);
  }, [brandId, brands, setValue]);

  const onSubmit = async (values: PurchaseFormValues) => {
    setSubmitting(true);
    try {
      const payload = {
        date: values.date,
        supplier_name: values.supplier_name.trim(),
        brand_id: values.brand_id,
        cement_type: values.cement_type?.trim() || null,
        bags: values.bags,
        purchase_rate: values.purchase_rate,
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
        await api.purchases.create(payload);
        addToast('Purchase recorded', 'success');
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
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-heading">Date *</label>
            <input type="date" className="input-field w-full" {...register('date')} />
            {errors.date && <p className="mt-1 text-xs text-red-600">{errors.date.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-heading">Supplier *</label>
            <input
              type="text"
              list="purchase-suppliers-datalist"
              className="input-field w-full"
              placeholder="Supplier name"
              {...register('supplier_name')}
            />
            <datalist id="purchase-suppliers-datalist">
              {suppliers.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            {errors.supplier_name && (
              <p className="mt-1 text-xs text-red-600">{errors.supplier_name.message}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-heading">Brand *</label>
            <select className="input-field w-full" {...register('brand_id')}>
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
            <input type="text" className="input-field w-full" {...register('cement_type')} />
            <p className="mt-1 text-xs text-gray-500">Prefilled from brand; you can edit (OPC / PPC / DAMAGE).</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-heading">Bags *</label>
            <input type="number" min={1} step={1} className="input-field w-full" {...register('bags')} />
            {errors.bags && <p className="mt-1 text-xs text-red-600">{errors.bags.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-heading">Purchase rate (₹ / bag) *</label>
            <input
              type="number"
              min={0}
              step={0.01}
              className="input-field w-full"
              {...register('purchase_rate')}
            />
            {errors.purchase_rate && (
              <p className="mt-1 text-xs text-red-600">{errors.purchase_rate.message}</p>
            )}
          </div>
          {/* GST Breakdown */}
          <div className="sm:col-span-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-700">
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
                <p className="text-xl font-bold text-brand-900">{formatINR(purchaseAmount)}</p>
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
            <input type="text" className="input-field w-full" placeholder="e.g. UP14AT7777" {...register('truck_number')} />
            {errors.truck_number && <p className="mt-1 text-xs text-red-600">{errors.truck_number.message}</p>}
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-heading">Source location</label>
            <input type="text" className="input-field w-full" {...register('source_location')} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-heading">Invoice number</label>
            <input type="text" className="input-field w-full" placeholder="Supplier invoice / GRN number" {...register('invoice_number')} />
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
