import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { MonthPicker } from '../components/MonthPicker';
import type { ColumnDef } from '../components/tables/DataTable';
import { DataTable } from '../components/tables/DataTable';
import { SaleForm, type SaleEditData } from '../components/forms/SaleForm';
import { api } from '../lib/api';
import { formatDate, formatINR } from '../lib/format';
import { useAuthStore, useToastStore } from '../lib/store';

export type SaleRow = {
  id: number;
  date: string;
  party_id: number;
  party_name: string;
  brand_id: number;
  brand_name: string;
  cement_type: string | null;
  bags: number;
  sale_rate: number;
  sale_amount: number;
  purchase_cost: number | null;
  cost_rate: number;
  destination: string | null;
  invoice_number: string | null;
  godown_id: number | null;
  godown_name: string | null;
  truck_number: string | null;
  source_truck_number: string | null;
  billed_party: string | null;
  billed_quantity: number | null;
  billed_rate: number | null;
  billed_amount: number | null;
  remarks: string | null;
  received: boolean;
};

function marginClass(marginPerBag: number) {
  if (marginPerBag > 20) return 'font-medium text-green-600 dark:text-green-400';
  if (marginPerBag >= 10) return 'font-medium text-amber-600 dark:text-amber-400';
  return 'font-medium text-red-600 dark:text-red-400';
}

export default function Sales() {
  const addToast = useToastStore((s) => s.addToast);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const isAdmin = useAuthStore((s) => s.isAdmin)();
  const [rows, setRows] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<SaleEditData | null>(null);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [partyFilter, setPartyFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [applied, setApplied] = useState({
    startDate: '',
    endDate: '',
    partyFilter: '',
    brandFilter: '',
    monthFilter: '',
  });
  const [parties, setParties] = useState<{ id: number; name: string }[]>([]);
  const [brands, setBrands] = useState<{ id: number; name: string; type: string }[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      // If month is set, use it exclusively (don't mix with date range)
      if (applied.monthFilter) {
        params.month = applied.monthFilter;
      } else {
        if (applied.startDate) params.start_date = applied.startDate;
        if (applied.endDate) params.end_date = applied.endDate;
      }
      if (applied.partyFilter) params.party_id = applied.partyFilter;
      if (applied.brandFilter) params.brand_id = applied.brandFilter;
      const res = (await api.sales.list(params)) as { data: SaleRow[] };
      setRows(res.data ?? []);
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to load sales', 'error');
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
      partyFilter,
      brandFilter,
      monthFilter,
    });
  }, [startDate, endDate, partyFilter, brandFilter, monthFilter]);

  const clearFilters = useCallback(() => {
    setStartDate('');
    setEndDate('');
    setPartyFilter('');
    setBrandFilter('');
    setMonthFilter('');
    setApplied({ startDate: '', endDate: '', partyFilter: '', brandFilter: '', monthFilter: '' });
  }, []);

  const hasActiveFilters = applied.startDate || applied.endDate || applied.partyFilter || applied.brandFilter || applied.monthFilter;

  useEffect(() => {
    Promise.all([api.parties.list(), api.brands.list()])
      .then(([p, b]) => {
        setParties(p as { id: number; name: string }[]);
        setBrands(b as { id: number; name: string; type: string }[]);
      })
      .catch(() => {});
  }, []);

  const totals = useMemo(() => {
    const totalBags = rows.reduce((s, r) => s + (r.bags || 0), 0);
    const totalAmount = rows.reduce((s, r) => s + (r.sale_amount || 0), 0);
    const weightedMargin =
      totalBags > 0
        ? rows.reduce(
            (s, r) =>
              s +
              (Number(r.sale_rate) - Number(r.purchase_cost ?? 0)) * (r.bags || 0),
            0
          ) / totalBags
        : 0;
    return { totalBags, totalAmount, avgMargin: weightedMargin };
  }, [rows]);

  const openCreate = useCallback(() => {
    setEditData(null);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((row: SaleRow) => {
    setEditData({
      id: row.id,
      date: row.date,
      party_id: row.party_id,
      brand_id: row.brand_id,
      cement_type: row.cement_type ?? '',
      bags: row.bags,
      sale_rate: row.sale_rate,
      cost_rate: row.cost_rate ?? 0,
      destination: row.destination ?? '',
      godown_id: row.godown_id ?? undefined,
      truck_number: row.truck_number ?? '',
      source_truck_number: row.source_truck_number ?? '',
      invoice_number: row.invoice_number ?? '',
      billed_party: row.billed_party ?? '',
      billed_quantity: row.billed_quantity ?? undefined,
      billed_rate: row.billed_rate ?? undefined,
      billed_amount: row.billed_amount ?? undefined,
      remarks: row.remarks ?? '',
    });
    setModalOpen(true);
  }, []);

  const handleDelete = useCallback(
    (row: SaleRow) => {
      if (!window.confirm(`Delete sale #${row.id} (${formatDate(row.date)}, ${row.party_name})?`)) return;
      api.sales
        .delete(row.id)
        .then(() => {
          addToast('Sale deleted', 'success');
          load();
        })
        .catch((e) => addToast(e instanceof Error ? e.message : 'Delete failed', 'error'));
    },
    [addToast, load]
  );

  const handleToggleReceived = useCallback(
    (row: SaleRow) => {
      const next = !row.received;
      // Optimistic update
      setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, received: next } : r));
      api.sales
        .setReceived(row.id, next)
        .catch((e) => {
          // Revert on failure
          setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, received: !next } : r));
          addToast(e instanceof Error ? e.message : 'Failed to update', 'error');
        });
    },
    [addToast]
  );

  const columns = useMemo<ColumnDef<SaleRow>[]>(
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
      { accessorKey: 'party_name', header: 'Party' },
      { accessorKey: 'brand_name', header: 'Brand' },
      {
        accessorKey: 'cement_type',
        header: 'Type',
        cell: ({ getValue }) => getValue() ?? '—',
      },
      { accessorKey: 'bags', header: 'Bags' },
      ...(isAdmin ? [{
        accessorKey: 'purchase_cost',
        header: 'Purchase Rate',
        cell: ({ getValue }: any) => formatINR(Number(getValue() ?? 0)),
      }] : []),
      {
        accessorKey: 'sale_rate',
        header: 'Sale Rate',
        cell: ({ getValue }) => formatINR(Number(getValue())),
      },
      ...(isAdmin ? [{
        id: 'margin',
        header: 'Margin/bag',
        cell: ({ row }: any) => {
          const pr = Number(row.original.purchase_cost ?? 0);
          const sr = Number(row.original.sale_rate);
          const m = sr - pr;
          return <span className={marginClass(m)}>{formatINR(m)}</span>;
        },
      }] : []),
      {
        accessorKey: 'sale_amount',
        header: 'Sale Amount',
        cell: ({ getValue }) => formatINR(Number(getValue())),
      },
      {
        id: 'base_amount',
        header: 'Base (₹)',
        accessorFn: (row: any) => {
          const rate = row.cement_type === 'DAMAGE' ? 5 : 18;
          return Number(row.sale_amount) / (1 + rate / 100);
        },
        cell: ({ getValue }) => formatINR(Number(getValue())),
      },
      {
        id: 'cgst',
        header: 'CGST (₹)',
        accessorFn: (row: any) => {
          const rate = row.cement_type === 'DAMAGE' ? 5 : 18;
          const base = Number(row.sale_amount) / (1 + rate / 100);
          return base * (rate / 2) / 100;
        },
        cell: ({ getValue }) => formatINR(Number(getValue())),
      },
      {
        id: 'sgst',
        header: 'SGST (₹)',
        accessorFn: (row: any) => {
          const rate = row.cement_type === 'DAMAGE' ? 5 : 18;
          const base = Number(row.sale_amount) / (1 + rate / 100);
          return base * (rate / 2) / 100;
        },
        cell: ({ getValue }) => formatINR(Number(getValue())),
      },
      {
        accessorKey: 'destination',
        header: 'Destination',
        cell: ({ getValue }) => getValue() ?? '—',
      },
      {
        accessorKey: 'truck_number',
        header: 'Truck No.',
        cell: ({ getValue }) => getValue() ?? '—',
      },
      {
        accessorKey: 'invoice_number',
        header: 'Invoice No.',
        cell: ({ getValue }) => {
          const v = getValue() as string | null;
          return v ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
              ✓ {v}
            </span>
          ) : <span className="text-heading/50 text-xs">Not billed</span>;
        },
      },
      {
        id: 'received',
        header: 'Received',
        enableSorting: true,
        accessorFn: (row) => row.received,
        cell: ({ row }) => {
          const isReceived = row.original.received;
          return (
            <button
              type="button"
              onClick={() => handleToggleReceived(row.original)}
              aria-label={isReceived ? 'Mark as not received' : 'Mark as received'}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                isReceived ? 'bg-emerald-500' : 'bg-card-border/60'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-card shadow-sm ring-0 transition-transform duration-200 ${
                  isReceived ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          );
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
            {hasPermission('delete_sales') && (
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
    [handleDelete, openEdit, isAdmin, handleToggleReceived]
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading">Sales</h1>
          <div className="mt-2 flex flex-wrap gap-6 text-sm text-heading/70">
            <span>
              Total bags:{' '}
              <span className="font-semibold text-heading">{totals.totalBags.toLocaleString('en-IN')}</span>
            </span>
            <span>
              Total amount:{' '}
              <span className="font-semibold text-heading">{formatINR(totals.totalAmount)}</span>
            </span>
            {isAdmin && (
              <span>
                Avg margin / bag:{' '}
                <span className={marginClass(totals.avgMargin)}>{formatINR(totals.avgMargin)}</span>
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" />
          New Sale
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
          <label className="mb-1 block text-xs font-medium text-heading/70">Party</label>
          <select
            className="input-field min-w-[180px]"
            value={partyFilter}
            onChange={(e) => setPartyFilter(e.target.value)}
          >
            <option value="">All parties</option>
            {parties.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.name}
              </option>
            ))}
          </select>
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
          <label className="mb-1 block text-xs font-medium text-heading/70">Month</label>
          <MonthPicker value={monthFilter} onChange={(v) => { setMonthFilter(v); if (v) { setStartDate(''); setEndDate(''); } }} />
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

      <DataTable<SaleRow>
        data={rows}
        columns={columns}
        isLoading={loading}
        emptyMessage="No sales match your filters."
        emptyAction={{ label: 'New Sale', onClick: openCreate }}
        enableSelection
        onDeleteSelected={async (ids) => {
          if (!window.confirm(`Delete ${ids.length} sale(s)?`)) return;
          try {
            await Promise.all(ids.map((id) => api.sales.delete(id)));
            addToast(`${ids.length} sale(s) deleted`);
            load();
          } catch (e) { addToast(e instanceof Error ? e.message : 'Delete failed', 'error'); }
        }}
        exportFileName="sales"
        getRowClassName={(row) =>
          row.invoice_number ? 'bg-emerald-50 dark:bg-emerald-900/30' : undefined
        }
        canDelete={hasPermission('delete_sales')}
        canDownload={hasPermission('download')}
        initialColumnVisibility={{ base_amount: false, cgst: false, sgst: false }}
      />

      <SaleForm
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
