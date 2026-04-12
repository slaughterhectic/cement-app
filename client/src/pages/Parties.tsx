import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { formatINR, formatDate } from '../lib/format';
import { DataTable, type ColumnDef } from '../components/tables/DataTable';
import Modal from '../components/ui/Modal';
import { useToastStore } from '../lib/store';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Users, Pencil } from 'lucide-react';

const PARTY_TYPES = [
  'dealer',
  'contractor',
  'builder',
  'institution',
  'damage_buyer',
  'supplier',
  'other',
] as const;

type PartyType = (typeof PARTY_TYPES)[number];

export type PartyRow = {
  id: number;
  name: string;
  phone: string | null;
  location: string | null;
  district: string | null;
  type: PartyType | string | null;
  opening_balance: number;
  total_sales: number;
  total_purchases: number;
  total_paid: number;
  outstanding: number;
  last_transaction: string | null;
};

const partySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z
    .string()
    .optional()
    .refine((v) => !v?.trim() || /^\d{10}$/.test(v.trim()), {
      message: 'Phone must be exactly 10 digits',
    }),
  location: z.string().optional(),
  district: z.string().optional(),
  type: z.enum(PARTY_TYPES),
  opening_balance: z.coerce.number().min(0),
});

type PartyFormValues = z.infer<typeof partySchema>;

function typeBadgeClass(type: string | null | undefined): string {
  switch (type) {
    case 'dealer':
      return 'bg-blue-100 text-blue-800';
    case 'contractor':
      return 'bg-emerald-100 text-emerald-800';
    case 'builder':
      return 'bg-amber-100 text-amber-800';
    case 'institution':
      return 'bg-purple-100 text-purple-800';
    case 'damage_buyer':
      return 'bg-orange-100 text-orange-800';
    case 'supplier':
      return 'bg-indigo-100 text-indigo-800';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function formatTypeLabel(type: string | null | undefined): string {
  if (!type) return '—';
  return type.replace(/_/g, ' ');
}

export default function Parties() {
  const navigate = useNavigate();
  const addToast = useToastStore((s) => s.addToast);
  const [rows, setRows] = useState<PartyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<PartyRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = (await api.parties.list()) as PartyRow[];
      setRows((data ?? []).filter((r) => r.type !== 'dealer'));
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to load parties', 'error');
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
  } = useForm<PartyFormValues>({
    resolver: zodResolver(partySchema),
    defaultValues: {
      name: '',
      phone: '',
      location: '',
      district: '',
      type: 'dealer',
      opening_balance: 0,
    },
  });

  const openCreate = () => {
    reset({
      name: '',
      phone: '',
      location: '',
      district: '',
      type: 'dealer',
      opening_balance: 0,
    });
    setCreateOpen(true);
  };

  const openEdit = (row: PartyRow) => {
    setEditing(row);
    reset({
      name: row.name,
      phone: row.phone ?? '',
      location: row.location ?? '',
      district: row.district ?? '',
      type: (PARTY_TYPES.includes(row.type as PartyType) ? row.type : 'other') as PartyType,
      opening_balance: row.opening_balance ?? 0,
    });
    setEditOpen(true);
  };

  const onCreateSubmit = async (values: PartyFormValues) => {
    try {
      await api.parties.create({
        name: values.name.trim(),
        phone: values.phone?.trim() || null,
        location: values.location?.trim() || null,
        district: values.district?.trim() || null,
        type: values.type,
        opening_balance: values.opening_balance,
      });
      addToast('Party created');
      setCreateOpen(false);
      await load();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Could not create party', 'error');
    }
  };

  const onEditSubmit = async (values: PartyFormValues) => {
    if (!editing) return;
    try {
      await api.parties.update(editing.id, {
        name: values.name.trim(),
        phone: values.phone?.trim() || null,
        location: values.location?.trim() || null,
        district: values.district?.trim() || null,
        type: values.type,
        opening_balance: values.opening_balance,
      });
      addToast('Party updated');
      setEditOpen(false);
      setEditing(null);
      await load();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Could not update party', 'error');
    }
  };

  const columns = useMemo<ColumnDef<PartyRow, any>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => navigate(`/parties/${row.original.id}`)}
            className="font-medium text-brand-500 hover:underline text-left"
          >
            {row.original.name}
          </button>
        ),
      },
      { accessorKey: 'location', header: 'Location', cell: ({ getValue }) => getValue() || '—' },
      { accessorKey: 'district', header: 'District', cell: ({ getValue }) => getValue() || '—' },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ row }) => (
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${typeBadgeClass(
              row.original.type
            )}`}
          >
            {formatTypeLabel(row.original.type)}
          </span>
        ),
      },
      {
        accessorKey: 'total_sales',
        header: 'Total Sales',
        cell: ({ row }) => {
          const n = Number(row.original.total_sales) || 0;
          if (n === 0) return <span className="text-gray-400">—</span>;
          return <span className="text-emerald-700 font-medium">{formatINR(n)}</span>;
        },
      },
      {
        accessorKey: 'total_purchases',
        header: 'Total Purchases',
        cell: ({ row }) => {
          const n = Number(row.original.total_purchases) || 0;
          if (n === 0) return <span className="text-gray-400">—</span>;
          return <span className="text-indigo-700 font-medium">{formatINR(n)}</span>;
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
        cell: ({ row }) => {
          const n = Number(row.original.outstanding) || 0;
          const isSupplier = row.original.type === 'supplier';
          if (n === 0) return <span className="text-profit font-medium">Settled</span>;
          if (isSupplier) {
            return (
              <div>
                <span className="font-semibold text-orange-600">{formatINR(n)}</span>
                <p className="text-xs text-orange-500">We owe them</p>
              </div>
            );
          }
          return (
            <div>
              <span className="font-semibold text-outstanding">{formatINR(n)}</span>
              <p className="text-xs text-outstanding/70">They owe us</p>
            </div>
          );
        },
      },
      {
        accessorKey: 'last_transaction',
        header: 'Last Transaction',
        cell: ({ getValue }) => {
          const d = getValue() as string | null;
          return d ? formatDate(d) : '—';
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => openEdit(row.original)}
            className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
            aria-label={`Edit ${row.original.name}`}
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
        ),
      },
    ],
    [navigate]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
            <Users className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold text-heading">Parties</h1>
        </div>
        <button type="button" onClick={openCreate} className="btn-primary">
          <Plus className="h-4 w-4" />
          New Party
        </button>
      </div>

      <DataTable<PartyRow>
        data={rows}
        columns={columns}
        isLoading={loading}
        emptyMessage="No parties yet. Add your first party."
        emptyAction={{ label: 'New Party', onClick: openCreate }}
        exportFileName="parties"
      />

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="New Party" size="lg">
        <form
          className="space-y-4"
          onSubmit={handleSubmit(onCreateSubmit)}
          noValidate
        >
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
            <label className="mb-1 block text-sm font-medium text-heading">Type</label>
            <select className="input-field" {...register('type')}>
              {PARTY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {formatTypeLabel(t)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-heading">Opening balance</label>
            <input className="input-field" type="number" min={0} step="1" {...register('opening_balance')} />
            {errors.opening_balance && (
              <p className="mt-1 text-xs text-red-600">{errors.opening_balance.message}</p>
            )}
          </div>
          <div className="flex justify-end gap-2 border-t border-card-border pt-4">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button type="submit" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
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
        title="Edit Party"
        size="lg"
      >
        <form className="space-y-4" onSubmit={handleSubmit(onEditSubmit)} noValidate>
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
            <label className="mb-1 block text-sm font-medium text-heading">Type</label>
            <select className="input-field" {...register('type')}>
              {PARTY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {formatTypeLabel(t)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-heading">Opening balance</label>
            <input className="input-field" type="number" min={0} step="1" {...register('opening_balance')} />
            {errors.opening_balance && (
              <p className="mt-1 text-xs text-red-600">{errors.opening_balance.message}</p>
            )}
          </div>
          <div className="flex justify-end gap-2 border-t border-card-border pt-4">
            <button
              type="button"
              onClick={() => {
                setEditOpen(false);
                setEditing(null);
              }}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button type="submit" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
              Update
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
