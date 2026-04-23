import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { ColumnDef } from '../components/tables/DataTable';
import { DataTable } from '../components/tables/DataTable';
import { PurchaseForm, type PurchaseEditData } from '../components/forms/PurchaseForm';
import { api } from '../lib/api';
import { formatDate, formatINR } from '../lib/format';
import { useAuthStore, useToastStore } from '../lib/store';

export type PurchaseRow = {
  id: number;
  date: string;
  supplier_name: string;
  supplier_id: number | null;
  brand_id: number;
  brand_name: string;
  cement_type: string | null;
  bags: number;
  purchase_rate: number;
  purchase_amount: number;
  freight_rate: number;
  godown_id: number | null;
  godown_name: string | null;
  truck_number: string | null;
  source_location: string | null;
  invoice_number: string | null;
  remarks: string | null;
};

export default function Purchases() {
  const addToast = useToastStore((s) => s.addToast);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [rows, setRows] = useState<PurchaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<PurchaseEditData | null>(null);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [applied, setApplied] = useState({
    startDate: '',
    endDate: '',
    brandFilter: '',
    supplierFilter: '',
  });
  const [brands, setBrands] = useState<{ id: number; name: string; type: string }[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (applied.startDate) params.start_date = applied.startDate;
      if (applied.endDate) params.end_date = applied.endDate;
      if (applied.brandFilter) params.brand_id = applied.brandFilter;
      if (applied.supplierFilter.trim()) params.supplier = applied.supplierFilter.trim();
      const res = (await api.purchases.list(params)) as { data: PurchaseRow[] };
      setRows(res.data ?? []);
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to load purchases', 'error');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [applied, addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const applyFilters = useCallback(() => {
    setApplied({
      startDate,
      endDate,
      brandFilter,
      supplierFilter,
    });
  }, [startDate, endDate, brandFilter, supplierFilter]);

  const clearFilters = useCallback(() => {
    setStartDate('');
    setEndDate('');
    setBrandFilter('');
    setSupplierFilter('');
    setApplied({ startDate: '', endDate: '', brandFilter: '', supplierFilter: '' });
  }, []);

  const hasActiveFilters = applied.startDate || applied.endDate || applied.brandFilter || applied.supplierFilter;

  useEffect(() => {
    api.brands.list().then((b) => setBrands(b as { id: number; name: string; type: string }[])).catch(() => {});
  }, []);

  const totals = useMemo(() => {
    const totalBags = rows.reduce((s, r) => s + (r.bags || 0), 0);
    const totalAmount = rows.reduce((s, r) => s + (r.purchase_amount || 0), 0);
    return { totalBags, totalAmount };
  }, [rows]);

  const openCreate = useCallback(() => {
    setEditData(null);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((row: PurchaseRow) => {
    setEditData({
      id: row.id,
      date: row.date,
      supplier_id: row.supplier_id ?? 0,
      brand_id: row.brand_id,
      cement_type: row.cement_type ?? '',
      bags: row.bags,
      purchase_rate: row.purchase_rate,
      freight_rate: row.freight_rate ?? 0,
      godown_id: row.godown_id ?? undefined,
      truck_number: row.truck_number ?? '',
      source_location: row.source_location ?? '',
      invoice_number: row.invoice_number ?? '',
      remarks: row.remarks ?? '',
    } as any);
    setModalOpen(true);
  }, []);

  const handleDelete = useCallback(
    (row: PurchaseRow) => {
      if (!window.confirm(`Delete purchase #${row.id} (${formatDate(row.date)}, ${row.supplier_name})?`)) return;
      api.purchases
        .delete(row.id)
        .then(() => {
          addToast('Purchase deleted', 'success');
          load();
        })
        .catch((e) => addToast(e instanceof Error ? e.message : 'Delete failed', 'error'));
    },
    [addToast, load]
  );

  const columns = useMemo<ColumnDef<PurchaseRow>[]>(
    () => [
      {
        id: 'sno',
        header: 'S.No',
        enableSorting: false,
        cell: ({ row, table }) => {
          const { pageIndex, pageSize } = table.getState().pagination;
          return pageIndex * pageSize + row.index + 1;
        },
      },
      {
        accessorKey: 'date',
        header: 'Date',
        cell: ({ getValue }) => formatDate(String(getValue())),
      },
      { accessorKey: 'supplier_name', header: 'Supplier' },
      { accessorKey: 'brand_name', header: 'Brand' },
      {
        accessorKey: 'cement_type',
        header: 'Type',
        cell: ({ getValue }) => getValue() ?? '—',
      },
      { accessorKey: 'bags', header: 'Bags' },
      {
        accessorKey: 'purchase_rate',
        header: 'Rate (₹)',
        cell: ({ getValue }) => formatINR(Number(getValue())),
      },
      {
        accessorKey: 'purchase_amount',
        header: 'Amount (₹)',
        cell: ({ getValue }) => formatINR(Number(getValue())),
      },
      {
        id: 'base_amount',
        header: 'Base (₹)',
        accessorFn: (row: any) => {
          const rate = row.cement_type === 'DAMAGE' ? 5 : 18;
          return Number(row.purchase_amount) / (1 + rate / 100);
        },
        cell: ({ getValue }) => formatINR(Number(getValue())),
      },
      {
        id: 'cgst',
        header: 'CGST (₹)',
        accessorFn: (row: any) => {
          const rate = row.cement_type === 'DAMAGE' ? 5 : 18;
          const base = Number(row.purchase_amount) / (1 + rate / 100);
          return base * (rate / 2) / 100;
        },
        cell: ({ getValue }) => formatINR(Number(getValue())),
      },
      {
        id: 'sgst',
        header: 'SGST (₹)',
        accessorFn: (row: any) => {
          const rate = row.cement_type === 'DAMAGE' ? 5 : 18;
          const base = Number(row.purchase_amount) / (1 + rate / 100);
          return base * (rate / 2) / 100;
        },
        cell: ({ getValue }) => formatINR(Number(getValue())),
      },
      {
        accessorKey: 'freight_rate',
        header: 'Freight (₹/bag)',
        cell: ({ getValue }) => {
          const v = Number(getValue());
          return v > 0 ? formatINR(v) : '—';
        },
      },
      {
        id: 'freight_amount',
        header: 'Freight Total (₹)',
        accessorFn: (row: any) => (Number(row.freight_rate) || 0) * (Number(row.bags) || 0),
        cell: ({ getValue }) => {
          const v = Number(getValue());
          return v > 0 ? formatINR(v) : '—';
        },
      },
      {
        id: 'landed_cost',
        header: 'Landed Cost (₹)',
        accessorFn: (row: any) => Number(row.purchase_amount) + (Number(row.freight_rate) || 0) * (Number(row.bags) || 0),
        cell: ({ getValue }) => formatINR(Number(getValue())),
      },
      {
        accessorKey: 'godown_name',
        header: 'Godown',
        cell: ({ getValue }) => getValue() ?? '—',
      },
      {
        accessorKey: 'truck_number',
        header: 'Truck No.',
        cell: ({ getValue }) => getValue() ?? '—',
      },
      {
        accessorKey: 'invoice_number',
        header: 'GRN / Invoice',
        cell: ({ getValue }) => {
          const v = getValue() as string | null;
          return v
            ? <span className="text-sm text-gray-800">{v}</span>
            : <span className="text-heading/50 text-xs">—</span>;
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded p-1.5 text-brand-700 hover:bg-brand-50"
              aria-label="Edit"
              onClick={() => openEdit(row.original)}
            >
              <Pencil className="h-4 w-4" />
            </button>
            {hasPermission('delete_purchases') && (
              <button
                type="button"
                className="rounded p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                aria-label="Delete"
                onClick={() => handleDelete(row.original)}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ),
      },
    ],
    [handleDelete, openEdit]
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading">Purchases</h1>
          <div className="mt-2 flex flex-wrap gap-6 text-sm text-heading/70">
            <span>
              Total bags:{' '}
              <span className="font-semibold text-heading">{totals.totalBags.toLocaleString('en-IN')}</span>
            </span>
            <span>
              Total amount:{' '}
              <span className="font-semibold text-heading">{formatINR(totals.totalAmount)}</span>
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" />
          New Purchase
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-card-border bg-card p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-heading/70">From</label>
          <input
            type="date"
            className="input-field"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-heading/70">To</label>
          <input
            type="date"
            className="input-field"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-heading/70">Brand</label>
          <select
            className="input-field min-w-[160px]"
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
          >
            <option value="">All brands</option>
            {brands.map((b) => (
              <option key={b.id} value={String(b.id)}>
                {b.name} ({b.type})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-heading/70">Supplier</label>
          <input
            type="text"
            className="input-field min-w-[180px]"
            placeholder="Search supplier"
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={applyFilters}
          className="rounded-lg border border-card-border bg-card px-4 py-2 text-sm font-medium text-heading/80 hover:bg-surface"
        >
          Apply
        </button>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-lg px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
          >
            Clear
          </button>
        )}
      </div>

      <DataTable<PurchaseRow>
        data={rows}
        columns={columns}
        isLoading={loading}
        emptyMessage="No purchases match your filters."
        emptyAction={{ label: 'New Purchase', onClick: openCreate }}
        enableSelection
        onDeleteSelected={async (ids) => {
          if (!window.confirm(`Delete ${ids.length} purchase(s)?`)) return;
          try {
            await Promise.all(ids.map((id) => api.purchases.delete(id)));
            addToast(`${ids.length} purchase(s) deleted`);
            load();
          } catch (e) { addToast(e instanceof Error ? e.message : 'Delete failed', 'error'); }
        }}
        exportFileName="purchases"
        getRowClassName={(row) =>
          row.invoice_number ? 'bg-emerald-50 dark:bg-emerald-900/30' : undefined
        }
        canDelete={hasPermission('delete_purchases')}
        canDownload={hasPermission('download')}
        initialColumnVisibility={{ base_amount: false, cgst: false, sgst: false, freight_amount: false, landed_cost: false }}
      />

      <PurchaseForm
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditData(null);
        }}
        onSuccess={load}
        editData={editData}
      />
    </div>
  );
}
