import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { formatINR } from '../lib/format';
import { DataTable, type ColumnDef } from '../components/tables/DataTable';
import Modal from '../components/ui/Modal';
import { useToastStore, useAuthStore } from '../lib/store';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Truck, Pencil, Trash2 } from 'lucide-react';

export type FreightPartyRow = {
  id: number;
  name: string;
  phone: string | null;
  is_active: number;
  opening_balance: number;
  purchase_count: number;
  total_freight: number;
  total_paid: number;
  total_received: number;
  outstanding: number;
};

const freightPartySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z
    .string()
    .optional()
    .refine((v) => !v?.trim() || /^\d{10}$/.test(v.trim()), {
      message: 'Phone must be exactly 10 digits',
    }),
  opening_balance: z.coerce.number().min(0),
});

type FreightPartyFormValues = z.infer<typeof freightPartySchema>;

export default function FreightParties() {
  const navigate = useNavigate();
  const addToast = useToastStore((s) => s.addToast);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const [rows, setRows] = useState<FreightPartyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<FreightPartyRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = (await api.freightParties.list()) as FreightPartyRow[];
      setRows(data ?? []);
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to load freight parties', 'error');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FreightPartyFormValues>({
    resolver: zodResolver(freightPartySchema),
    defaultValues: { name: '', phone: '', opening_balance: 0 },
  });

  const openCreate = () => {
    reset({ name: '', phone: '', opening_balance: 0 });
    setCreateOpen(true);
  };

  const openEdit = (row: FreightPartyRow) => {
    setEditing(row);
    reset({
      name: row.name,
      phone: row.phone ?? '',
      opening_balance: Number(row.opening_balance) || 0,
    });
    setEditOpen(true);
  };

  const onCreateSubmit = async (values: FreightPartyFormValues) => {
    try {
      await api.freightParties.create({
        name: values.name.trim(),
        phone: values.phone?.trim() || undefined,
        opening_balance: values.opening_balance,
      });
      addToast('Freight party created');
      setCreateOpen(false);
      await load();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Could not create freight party', 'error');
    }
  };

  const onEditSubmit = async (values: FreightPartyFormValues) => {
    if (!editing) return;
    try {
      await api.freightParties.update(editing.id, {
        name: values.name.trim(),
        phone: values.phone?.trim() || null,
        opening_balance: values.opening_balance,
        is_active: editing.is_active,
      });
      addToast('Freight party updated');
      setEditOpen(false);
      setEditing(null);
      await load();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Could not update freight party', 'error');
    }
  };

  const handleDelete = async (row: FreightPartyRow) => {
    if (!window.confirm(`Delete freight party "${row.name}"? This cannot be undone.`)) return;
    try {
      await api.freightParties.delete(row.id);
      addToast('Freight party deleted');
      await load();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Could not delete freight party', 'error');
    }
  };

  const columns = useMemo<ColumnDef<FreightPartyRow, any>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => navigate(`/freight-parties/${row.original.id}`)}
            className="font-medium text-brand-500 hover:underline text-left"
          >
            {row.original.name}
          </button>
        ),
      },
      { accessorKey: 'phone', header: 'Phone', cell: ({ getValue }) => getValue() || '—' },
      {
        accessorKey: 'purchase_count',
        header: 'Purchases',
        cell: ({ getValue }) => {
          const n = Number(getValue()) || 0;
          return n === 0 ? <span className="text-heading/50">—</span> : <span>{n}</span>;
        },
      },
      {
        accessorKey: 'total_freight',
        header: 'Total Freight',
        cell: ({ getValue }) => {
          const n = Number(getValue()) || 0;
          if (n === 0) return <span className="text-heading/50">—</span>;
          return <span className="text-blue-700 dark:text-blue-300 font-medium">{formatINR(n)}</span>;
        },
      },
      {
        accessorKey: 'total_paid',
        header: 'Total Paid',
        cell: ({ getValue }) => {
          const n = Number(getValue()) || 0;
          if (n === 0) return <span className="text-heading/50">—</span>;
          return <span className="text-emerald-700 dark:text-emerald-300 font-medium">{formatINR(n)}</span>;
        },
      },
      {
        accessorKey: 'total_received',
        header: 'Received',
        cell: ({ getValue }) => {
          const n = Number(getValue()) || 0;
          if (n === 0) return <span className="text-heading/50">—</span>;
          return <span>{formatINR(n)}</span>;
        },
      },
      {
        accessorKey: 'outstanding',
        header: 'Outstanding',
        cell: ({ getValue }) => {
          const n = Number(getValue()) || 0;
          if (n === 0) return <span className="text-profit font-medium">Settled</span>;
          if (n > 0) {
            return (
              <div>
                <span className="font-semibold text-orange-600 dark:text-orange-400">{formatINR(n)}</span>
                <p className="text-xs text-orange-500">We owe them</p>
              </div>
            );
          }
          return (
            <div>
              <span className="font-semibold text-profit">{formatINR(Math.abs(n))}</span>
              <p className="text-xs text-profit/70">They owe us</p>
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => openEdit(row.original)}
              className="inline-flex items-center gap-1 rounded-md border border-card-border bg-card px-2 py-1 text-xs font-medium text-heading/80 hover:bg-surface"
              aria-label={`Edit ${row.original.name}`}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
            {isAdmin() && (
              <button
                type="button"
                onClick={() => handleDelete(row.original)}
                className="inline-flex items-center gap-1 rounded-md border border-red-200 dark:border-red-800 bg-card px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                aria-label={`Delete ${row.original.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigate, isAdmin]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
            <Truck className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold text-heading">Freight Parties</h1>
        </div>
        <button type="button" onClick={openCreate} className="btn-primary">
          <Plus className="h-4 w-4" />
          New Freight Party
        </button>
      </div>

      <DataTable<FreightPartyRow>
        data={rows}
        columns={columns}
        isLoading={loading}
        emptyMessage="No freight parties yet. Add your first freight party."
        emptyAction={{ label: 'New Freight Party', onClick: openCreate }}
        exportFileName="freight_parties"
      />

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="New Freight Party" size="lg">
        <form className="space-y-4" onSubmit={handleSubmit(onCreateSubmit)} noValidate>
          <div>
            <label className="mb-1 block text-sm font-medium text-heading">Name *</label>
            <input className="input-field" {...register('name')} />
            {errors.name && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.name.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-heading">Phone</label>
            <input className="input-field" maxLength={10} placeholder="10 digits" {...register('phone')} />
            {errors.phone && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.phone.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-heading">Opening balance</label>
            <input
              className="input-field"
              type="number"
              min={0}
              step="0.01"
              {...register('opening_balance')}
            />
            <p className="mt-1 text-xs text-heading/60">Amount we owe them at start (Dr)</p>
            {errors.opening_balance && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.opening_balance.message}</p>
            )}
          </div>
          <div className="flex justify-end gap-2 border-t border-card-border pt-4">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-heading/80 hover:bg-surface"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Save
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={editOpen}
        onClose={() => {
          setEditOpen(false);
          setEditing(null);
        }}
        title="Edit Freight Party"
        size="lg"
      >
        <form className="space-y-4" onSubmit={handleSubmit(onEditSubmit)} noValidate>
          <div>
            <label className="mb-1 block text-sm font-medium text-heading">Name *</label>
            <input className="input-field" {...register('name')} />
            {errors.name && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.name.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-heading">Phone</label>
            <input className="input-field" maxLength={10} placeholder="10 digits" {...register('phone')} />
            {errors.phone && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.phone.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-heading">Opening balance</label>
            <input
              className="input-field"
              type="number"
              min={0}
              step="0.01"
              {...register('opening_balance')}
            />
            <p className="mt-1 text-xs text-heading/60">Amount we owe them at start (Dr)</p>
            {errors.opening_balance && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.opening_balance.message}</p>
            )}
          </div>
          <div className="flex justify-end gap-2 border-t border-card-border pt-4">
            <button
              type="button"
              onClick={() => {
                setEditOpen(false);
                setEditing(null);
              }}
              className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-heading/80 hover:bg-surface"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Update
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
