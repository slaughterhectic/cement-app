import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { formatINR } from '../lib/format';
import { DataTable, type ColumnDef } from '../components/tables/DataTable';
import Modal from '../components/ui/Modal';
import { useToastStore } from '../lib/store';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Store, Pencil, Trash2 } from 'lucide-react';

type DealerRow = {
  id: number;
  name: string;
  phone: string | null;
  location: string | null;
  district: string | null;
  type: string;
  opening_balance: number;
  total_sales: number;
  total_paid: number;
  outstanding: number;
  sub_party_count: number;
};

const dealerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z
    .string()
    .optional()
    .refine((v) => !v?.trim() || /^\d{10}$/.test(v.trim()), {
      message: 'Phone must be exactly 10 digits',
    }),
  location: z.string().optional(),
  district: z.string().optional(),
  opening_balance: z.coerce.number().min(0),
});

type DealerFormValues = z.infer<typeof dealerSchema>;

export default function Dealers() {
  const navigate = useNavigate();
  const addToast = useToastStore((s) => s.addToast);
  const [rows, setRows] = useState<DealerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<DealerRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.dealers.list();
      setRows((data as DealerRow[]) ?? []);
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to load dealers', 'error');
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
  } = useForm<DealerFormValues>({
    resolver: zodResolver(dealerSchema),
    defaultValues: { name: '', phone: '', location: '', district: '', opening_balance: 0 },
  });

  const openCreate = () => {
    reset({ name: '', phone: '', location: '', district: '', opening_balance: 0 });
    setCreateOpen(true);
  };

  const openEdit = (row: DealerRow) => {
    setEditing(row);
    reset({
      name: row.name,
      phone: row.phone ?? '',
      location: row.location ?? '',
      district: row.district ?? '',
      opening_balance: row.opening_balance ?? 0,
    });
    setEditOpen(true);
  };

  const onCreateSubmit = async (values: DealerFormValues) => {
    try {
      await api.dealers.create({
        name: values.name.trim(),
        phone: values.phone?.trim() || null,
        location: values.location?.trim() || null,
        district: values.district?.trim() || null,
        opening_balance: values.opening_balance,
      });
      addToast('Dealer created');
      setCreateOpen(false);
      await load();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Could not create dealer', 'error');
    }
  };

  const handleDelete = async (row: DealerRow) => {
    if (!window.confirm(`Delete dealer "${row.name}"? This cannot be undone.`)) return;
    try {
      await api.dealers.delete(row.id);
      addToast('Dealer deleted');
      await load();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Could not delete dealer', 'error');
    }
  };

  const onEditSubmit = async (values: DealerFormValues) => {
    if (!editing) return;
    try {
      await api.dealers.update(editing.id, {
        name: values.name.trim(),
        phone: values.phone?.trim() || null,
        location: values.location?.trim() || null,
        district: values.district?.trim() || null,
        opening_balance: values.opening_balance,
      });
      addToast('Dealer updated');
      setEditOpen(false);
      setEditing(null);
      await load();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Could not update dealer', 'error');
    }
  };

  const columns = useMemo<ColumnDef<DealerRow, any>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => navigate(`/dealers/${row.original.id}`)}
            className="font-medium text-blue-600 hover:underline text-left"
          >
            {row.original.name}
          </button>
        ),
      },
      { accessorKey: 'location', header: 'Location', cell: ({ getValue }) => getValue() || '—' },
      { accessorKey: 'district', header: 'District', cell: ({ getValue }) => getValue() || '—' },
      {
        accessorKey: 'sub_party_count',
        header: 'Sub-parties',
        cell: ({ getValue }) => {
          const n = Number(getValue()) || 0;
          return (
            <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
              {n}
            </span>
          );
        },
      },
      {
        accessorKey: 'total_sales',
        header: 'Total Sales',
        cell: ({ getValue }) => {
          const n = Number(getValue()) || 0;
          if (n === 0) return <span className="text-gray-400">—</span>;
          return <span className="text-emerald-700 font-medium">{formatINR(n)}</span>;
        },
      },
      {
        accessorKey: 'total_paid',
        header: 'Total Paid',
        cell: ({ getValue }) => {
          const n = Number(getValue()) || 0;
          if (n === 0) return <span className="text-gray-400">—</span>;
          return <span>{formatINR(n)}</span>;
        },
      },
      {
        accessorKey: 'outstanding',
        header: 'Outstanding',
        cell: ({ getValue }) => {
          const n = Number(getValue()) || 0;
          if (n === 0) return <span className="font-medium text-emerald-600">Settled</span>;
          return <span className="font-semibold text-red-600">{formatINR(n)}</span>;
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
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
              aria-label={`Edit ${row.original.name}`}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
            <button
              type="button"
              onClick={() => handleDelete(row.original)}
              className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
              aria-label={`Delete ${row.original.name}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ),
      },
    ],
    [navigate]
  );

  const DealerForm = (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-heading">Name *</label>
        <input className="input-field" {...register('name')} />
        {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-heading">Phone</label>
        <input className="input-field" maxLength={10} placeholder="10 digits" {...register('phone')} />
        {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-heading">Location</label>
        <input className="input-field" {...register('location')} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-heading">District</label>
        <input className="input-field" {...register('district')} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-heading">Opening balance</label>
        <input className="input-field" type="number" min={0} step="1" {...register('opening_balance')} />
        {errors.opening_balance && (
          <p className="mt-1 text-xs text-red-600">{errors.opening_balance.message}</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
            <Store className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold text-heading">Dealers</h1>
        </div>
        <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          New Dealer
        </button>
      </div>

      <DataTable<DealerRow>
        data={rows}
        columns={columns}
        isLoading={loading}
        emptyMessage="No dealers yet. Add your first dealer."
        emptyAction={{ label: 'New Dealer', onClick: openCreate }}
        exportFileName="dealers"
      />

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="New Dealer" size="lg">
        <form className="space-y-4" onSubmit={handleSubmit(onCreateSubmit)} noValidate>
          {DealerForm}
          <div className="flex justify-end gap-2 border-t border-card-border pt-4">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Save
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={editOpen}
        onClose={() => { setEditOpen(false); setEditing(null); }}
        title="Edit Dealer"
        size="lg"
      >
        <form className="space-y-4" onSubmit={handleSubmit(onEditSubmit)} noValidate>
          {DealerForm}
          <div className="flex justify-end gap-2 border-t border-card-border pt-4">
            <button
              type="button"
              onClick={() => { setEditOpen(false); setEditing(null); }}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Update
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
