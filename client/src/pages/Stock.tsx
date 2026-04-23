import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { formatDate, formatINR } from '../lib/format';
import { DataTable, type ColumnDef } from '../components/tables/DataTable';
import StockCard from '../components/ui/StockCard';
import type { StockType, RateBreakdown } from '../components/ui/StockCard';
import { Package, Plus, Trash2, Pencil } from 'lucide-react';
import { useToastStore } from '../lib/store';
import { Modal } from '../components/ui/Modal';

type StockSummaryRow = {
  id: number;
  name: string;
  type: string;
  manufacturer: string;
  purchased: number;
  sold: number;
  stock: number;
  avg_rate: number;
  last_purchase: string | null;
};

type MovementRow = {
  _tid: number;
  date: string;
  type: 'Purchase' | 'Sale';
  brand_name: string;
  bags_in: number;
  bags_out: number;
  reference: string;
  godown_name: string | null;
  brand_id: number;
  id: number;
};

type GodownStockRow = {
  id: number;
  name: string;
  location: string | null;
  brand_id: number;
  brand_name: string;
  brand_type: string;
  stock: number;
};

type GodownProfitRow = {
  id: number;
  name: string;
  opening_value?: number;
  total_purchase: number;
  total_sale: number;
  profit: number;
};

type OpeningStockRow = {
  id: number;
  godown_id: number;
  brand_id: number;
  bags: number;
  rate: number;
  as_of_date: string | null;
  remarks: string | null;
  godown_name: string;
  brand_name: string;
  brand_type: string | null;
};

type OpeningForm = {
  godown_id: string;
  brand_id: string;
  bags: string;
  rate: string;
  as_of_date: string;
  remarks: string;
};

const emptyOpeningForm: OpeningForm = {
  godown_id: '',
  brand_id: '',
  bags: '',
  rate: '',
  as_of_date: '',
  remarks: '',
};

function toStockType(t: string): StockType {
  if (t === 'PPC' || t === 'DAMAGE') return t;
  return 'OPC';
}

function StockSummarySkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }, (_, i) => (
        <div
          key={i}
          className="rounded-xl border-2 border-card-border bg-card p-5 shadow-sm"
          role="status"
          aria-label="Loading"
        >
          <div className="flex justify-between gap-2">
            <div className="h-6 w-32 animate-pulse rounded-md bg-card-border/60" />
            <div className="h-5 w-12 animate-pulse rounded-md bg-card-border/60" />
          </div>
          <div className="mt-4 h-9 w-20 animate-pulse rounded-md bg-card-border/60" />
          <div className="mt-1 h-4 w-28 animate-pulse rounded bg-card-border/60" />
          <div className="mt-4 space-y-2 border-t border-card-border pt-4">
            <div className="flex justify-between gap-2">
              <div className="h-4 w-12 animate-pulse rounded bg-card-border/60" />
              <div className="h-4 w-24 animate-pulse rounded bg-card-border/60" />
            </div>
            <div className="flex justify-between gap-2">
              <div className="h-4 w-24 animate-pulse rounded bg-card-border/60" />
              <div className="h-4 w-20 animate-pulse rounded bg-card-border/60" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function GodownSectionSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }, (_, i) => (
        <div
          key={i}
          className="rounded-lg border border-card-border bg-card p-4 shadow-sm"
          role="status"
          aria-label="Loading"
        >
          <div className="h-5 w-40 animate-pulse rounded-md bg-card-border/60" />
          <div className="mt-2 h-4 w-56 animate-pulse rounded bg-card-border/60" />
          <div className="mt-4 space-y-2">
            <div className="h-4 w-full animate-pulse rounded bg-card-border/60" />
            <div className="h-4 w-full animate-pulse rounded bg-card-border/60" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-card-border/60" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Stock() {
  const addToast = useToastStore((s) => s.addToast);

  const [stockList, setStockList] = useState<StockSummaryRow[]>([]);
  const [stockListLoading, setStockListLoading] = useState(true);
  const [rateBreakdownByBrandId, setRateBreakdownByBrandId] = useState<Map<number, RateBreakdown[]>>(new Map());

  const [movement, setMovement] = useState<MovementRow[]>([]);
  const [movementLoading, setMovementLoading] = useState(true);
  const [brandFilter, setBrandFilter] = useState('');
  const [godownFilter, setGodownFilter] = useState('');

  const [godownStock, setGodownStock] = useState<GodownStockRow[]>([]);
  const [godownLoading, setGodownLoading] = useState(true);
  const [godownProfit, setGodownProfit] = useState<Map<number, GodownProfitRow>>(new Map());

  const [brands, setBrands] = useState<{ id: number; name: string }[]>([]);
  const [godowns, setGodowns] = useState<{ id: number; name: string; location?: string | null }[]>([]);

  // Opening stock management
  const [openingOpen, setOpeningOpen] = useState(false);
  const [openingRows, setOpeningRows] = useState<OpeningStockRow[]>([]);
  const [openingLoading, setOpeningLoading] = useState(false);
  const [openingForm, setOpeningForm] = useState<OpeningForm>(emptyOpeningForm);
  const [openingSaving, setOpeningSaving] = useState(false);

  const loadOpening = useCallback(async () => {
    setOpeningLoading(true);
    try {
      const rows = (await api.stock.openingList()) as OpeningStockRow[];
      setOpeningRows(Array.isArray(rows) ? rows : []);
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to load opening stock', 'error');
      setOpeningRows([]);
    } finally {
      setOpeningLoading(false);
    }
  }, [addToast]);

  const handleOpenOpeningModal = async () => {
    setOpeningForm(emptyOpeningForm);
    setOpeningOpen(true);
    await loadOpening();
  };

  const handleSaveOpening = async () => {
    const godown_id = Number(openingForm.godown_id);
    const brand_id = Number(openingForm.brand_id);
    const bags = Number(openingForm.bags);
    const rate = Number(openingForm.rate);
    if (!godown_id || !brand_id) { addToast('Pick a godown and a brand', 'error'); return; }
    if (!Number.isFinite(bags) || bags < 0) { addToast('Bags must be a non-negative number', 'error'); return; }
    if (!Number.isFinite(rate) || rate <= 0) { addToast('Rate per bag is required', 'error'); return; }
    setOpeningSaving(true);
    try {
      await api.stock.openingUpsert({
        godown_id,
        brand_id,
        bags,
        rate,
        as_of_date: openingForm.as_of_date || null,
        remarks: openingForm.remarks || null,
      });
      addToast('Opening stock saved');
      setOpeningForm(emptyOpeningForm);
      await Promise.all([loadOpening(), loadStockList(), loadGodownStock(), loadMovement()]);
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to save opening stock', 'error');
    } finally {
      setOpeningSaving(false);
    }
  };

  const handleEditOpening = (row: OpeningStockRow) => {
    setOpeningForm({
      godown_id: String(row.godown_id),
      brand_id: String(row.brand_id),
      bags: String(row.bags ?? 0),
      rate: String(row.rate ?? 0),
      as_of_date: row.as_of_date ?? '',
      remarks: row.remarks ?? '',
    });
  };

  const handleDeleteOpening = async (row: OpeningStockRow) => {
    if (!window.confirm(`Delete opening stock of ${row.bags} bags (${row.brand_name}) in ${row.godown_name}?`)) return;
    try {
      await api.stock.openingDelete(row.id);
      addToast('Opening stock removed');
      await Promise.all([loadOpening(), loadStockList(), loadGodownStock(), loadMovement()]);
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to delete', 'error');
    }
  };

  const loadStockList = useCallback(async () => {
    setStockListLoading(true);
    try {
      const rows = (await api.stock.list()) as StockSummaryRow[];
      const list = Array.isArray(rows) ? rows : [];
      setStockList(list);
      // Fetch rate breakdown for each brand in parallel
      const entries = await Promise.all(
        list.map(async (row) => {
          try {
            const res = await api.purchases.rates(row.id) as any;
            return [row.id, (res.rates ?? []) as RateBreakdown[]] as const;
          } catch {
            return [row.id, [] as RateBreakdown[]] as const;
          }
        })
      );
      setRateBreakdownByBrandId(new Map(entries));
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to load stock summary', 'error');
      setStockList([]);
    } finally {
      setStockListLoading(false);
    }
  }, [addToast]);

  const loadGodownStock = useCallback(async () => {
    setGodownLoading(true);
    try {
      const [rows, profitRows] = await Promise.all([
        api.stock.godown() as Promise<GodownStockRow[]>,
        api.stock.godownProfit() as Promise<GodownProfitRow[]>,
      ]);
      setGodownStock(Array.isArray(rows) ? rows : []);
      const profitMap = new Map<number, GodownProfitRow>();
      for (const r of (Array.isArray(profitRows) ? profitRows : [])) {
        profitMap.set(r.id, r);
      }
      setGodownProfit(profitMap);
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to load godown stock', 'error');
      setGodownStock([]);
    } finally {
      setGodownLoading(false);
    }
  }, [addToast]);

  const loadMovement = useCallback(async () => {
    setMovementLoading(true);
    try {
      const params: Record<string, string> = {};
      if (brandFilter) params.brand_id = brandFilter;
      if (godownFilter) params.godown_id = godownFilter;
      const raw = (await api.stock.movement(params)) as Omit<MovementRow, '_tid'>[];
      const rows = Array.isArray(raw) ? raw : [];
      setMovement(
        rows.map((r, i) => ({
          ...r,
          _tid: i,
          type: r.type === 'Sale' ? 'Sale' : 'Purchase',
        }))
      );
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to load stock movement', 'error');
      setMovement([]);
    } finally {
      setMovementLoading(false);
    }
  }, [addToast, brandFilter, godownFilter]);

  useEffect(() => {
    loadStockList();
    loadGodownStock();
  }, [loadStockList, loadGodownStock]);

  useEffect(() => {
    loadMovement();
  }, [loadMovement]);

  useEffect(() => {
    Promise.all([api.brands.list(), api.godowns.list()])
      .then(([b, g]) => {
        setBrands(b as { id: number; name: string }[]);
        setGodowns(g as { id: number; name: string; location?: string | null }[]);
      })
      .catch(() => {});
  }, []);

  const movementColumns = useMemo<ColumnDef<MovementRow>[]>(
    () => [
      {
        accessorKey: 'date',
        header: 'Date',
        cell: ({ getValue }) => formatDate(String(getValue() ?? '')),
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ getValue }) => {
          const t = String(getValue());
          const isPurchase = t === 'Purchase';
          return (
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                isPurchase ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200' : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200'
              }`}
            >
              {t}
            </span>
          );
        },
      },
      { accessorKey: 'brand_name', header: 'Brand' },
      {
        accessorKey: 'bags_in',
        header: 'Bags In',
        cell: ({ getValue }) => {
          const n = Number(getValue() ?? 0);
          return <span className="font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">{n || '—'}</span>;
        },
      },
      {
        accessorKey: 'bags_out',
        header: 'Bags Out',
        cell: ({ getValue }) => {
          const n = Number(getValue() ?? 0);
          return <span className="font-medium text-red-600 dark:text-red-400 tabular-nums">{n || '—'}</span>;
        },
      },
      {
        accessorKey: 'reference',
        header: 'Reference',
        cell: ({ getValue }) => getValue() ?? '—',
      },
      {
        accessorKey: 'godown_name',
        header: 'Godown',
        cell: ({ getValue }) => getValue() ?? '—',
      },
    ],
    []
  );

  const godownGroups = useMemo(() => {
    const map = new Map<
      number,
      { id: number; name: string; location: string | null; brands: GodownStockRow[] }
    >();
    for (const row of godownStock) {
      if (!map.has(row.id)) {
        map.set(row.id, {
          id: row.id,
          name: row.name,
          location: row.location ?? null,
          brands: [],
        });
      }
      map.get(row.id)!.brands.push(row);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [godownStock]);

  const avgRateByBrandId = useMemo(() => {
    const m = new Map<number, number>();
    for (const s of stockList) {
      m.set(s.id, Number(s.avg_rate));
    }
    return m;
  }, [stockList]);

  function godownEstValue(brands: GodownStockRow[]): number {
    return Math.round(
      brands.reduce((sum, b) => sum + b.stock * (avgRateByBrandId.get(b.brand_id) ?? 0), 0)
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-heading">
            <Package className="h-8 w-8 text-brand-600" aria-hidden />
            Stock
          </h1>
          <p className="mt-1 text-sm text-heading/70">Brand summary, movement log, and godown-wise quantities.</p>
        </div>
        <button
          type="button"
          onClick={handleOpenOpeningModal}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Opening Stock
        </button>
      </div>

      <section aria-labelledby="stock-summary-heading">
        <h2 id="stock-summary-heading" className="sr-only">
          Stock summary
        </h2>
        {stockListLoading ? (
          <StockSummarySkeleton />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {stockList.map((row) => (
              <StockCard
                key={row.id}
                name={row.name}
                type={toStockType(row.type)}
                stock={Number(row.stock)}
                value={Math.round(Number(row.stock) * Number(row.avg_rate))}
                lastPurchase={row.last_purchase ?? ''}
                rateBreakdown={rateBreakdownByBrandId.get(row.id)}
              />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="stock-movement-heading" className="flex flex-col gap-4">
        <h2 id="stock-movement-heading" className="text-lg font-semibold text-heading">
          Stock Movement
        </h2>
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-card-border bg-card p-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-heading/70">Brand</label>
            <select
              className="input-field min-w-[180px]"
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
            >
              <option value="">All brands</option>
              {brands.map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-heading/70">Godown</label>
            <select
              className="input-field min-w-[180px]"
              value={godownFilter}
              onChange={(e) => setGodownFilter(e.target.value)}
            >
              <option value="">All godowns</option>
              {godowns.map((g) => (
                <option key={g.id} value={String(g.id)}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <DataTable<MovementRow>
          data={movement}
          columns={movementColumns}
          isLoading={movementLoading}
          emptyMessage="No stock movements match your filters."
          exportFileName="stock-movement"
          getRowId={(row) => row._tid}
        />
      </section>

      <section aria-labelledby="godown-stock-heading" className="flex flex-col gap-4">
        <h2 id="godown-stock-heading" className="text-lg font-semibold text-heading">
          Godown-wise Stock
        </h2>
        {godownLoading ? (
          <GodownSectionSkeleton />
        ) : godownGroups.length === 0 ? (
          <p className="text-sm text-heading/70">No godown stock to show.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {godownGroups.map((g) => (
              <div
                key={g.id}
                className="rounded-lg border border-card-border bg-card p-4 shadow-sm"
              >
                <h3 className="text-base font-semibold text-heading">{g.name}</h3>
                {g.location ? (
                  <p className="mt-0.5 text-sm text-heading/60">{g.location}</p>
                ) : null}
                <ul className="mt-4 divide-y divide-card-border">
                  {g.brands.map((b) => (
                    <li
                      key={`${g.id}-${b.brand_id}`}
                      className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm first:pt-0"
                    >
                      <div>
                        <span className="font-medium text-heading">{b.brand_name}</span>
                        <span className="ml-2 text-xs text-heading/60">{b.brand_type}</span>
                      </div>
                      <span className="tabular-nums font-semibold text-heading">{b.stock} bags</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 border-t border-card-border pt-3 space-y-1.5 text-xs text-heading/60">
                  <div className="flex justify-between">
                    <span>Est. stock value</span>
                    <span className="font-medium text-heading">{formatINR(godownEstValue(g.brands))}</span>
                  </div>
                  {godownProfit.get(g.id) && (() => {
                    const p = godownProfit.get(g.id)!;
                    return (
                      <>
                        {p.opening_value ? (
                          <div className="flex justify-between">
                            <span>Opening stock value</span>
                            <span className="font-medium text-heading/80">{formatINR(p.opening_value)}</span>
                          </div>
                        ) : null}
                        <div className="flex justify-between">
                          <span>Total purchases</span>
                          <span className="font-medium text-heading/80">{formatINR(p.total_purchase)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total sales</span>
                          <span className="font-medium text-heading/80">{formatINR(p.total_sale)}</span>
                        </div>
                        <div className="flex justify-between border-t border-card-border pt-1.5">
                          <span className="font-semibold">Profit</span>
                          <span className={`font-bold ${p.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {p.profit >= 0 ? '' : '-'}{formatINR(Math.abs(p.profit))}
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Modal
        isOpen={openingOpen}
        onClose={() => setOpeningOpen(false)}
        title="Opening Stock (Godown-wise)"
        size="xl"
      >
        <div className="flex flex-col gap-5">
          <p className="text-sm text-heading/70">
            Record bags already on hand per godown per brand, before any purchase entries. One row per
            godown + brand; saving again overwrites the existing entry. Rate per bag is used to value the stock.
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-heading/70">Godown *</label>
              <select
                className="input-field"
                value={openingForm.godown_id}
                onChange={(e) => setOpeningForm({ ...openingForm, godown_id: e.target.value })}
              >
                <option value="">Select godown</option>
                {godowns.map((g) => (
                  <option key={g.id} value={String(g.id)}>{g.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-heading/70">Brand *</label>
              <select
                className="input-field"
                value={openingForm.brand_id}
                onChange={(e) => setOpeningForm({ ...openingForm, brand_id: e.target.value })}
              >
                <option value="">Select brand</option>
                {brands.map((b) => (
                  <option key={b.id} value={String(b.id)}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-heading/70">Bags *</label>
              <input
                type="number"
                min={0}
                className="input-field"
                value={openingForm.bags}
                onChange={(e) => setOpeningForm({ ...openingForm, bags: e.target.value })}
                placeholder="e.g. 1600"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-heading/70">Rate per bag *</label>
              <input
                type="number"
                min={0}
                step="0.01"
                className="input-field"
                value={openingForm.rate}
                onChange={(e) => setOpeningForm({ ...openingForm, rate: e.target.value })}
                placeholder="e.g. 340"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-heading/70">As of date</label>
              <input
                type="date"
                className="input-field"
                value={openingForm.as_of_date}
                onChange={(e) => setOpeningForm({ ...openingForm, as_of_date: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="mb-1 block text-xs font-medium text-heading/70">Remarks</label>
              <input
                type="text"
                className="input-field"
                value={openingForm.remarks}
                onChange={(e) => setOpeningForm({ ...openingForm, remarks: e.target.value })}
                placeholder="Optional"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="rounded-lg border border-card-border px-4 py-2 text-sm text-heading/80 hover:bg-surface"
              onClick={() => setOpeningForm(emptyOpeningForm)}
            >
              Clear
            </button>
            <button
              type="button"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
              onClick={handleSaveOpening}
              disabled={openingSaving}
            >
              {openingSaving ? 'Saving…' : 'Save Opening'}
            </button>
          </div>

          <div className="border-t border-card-border pt-4">
            <h3 className="mb-2 text-sm font-semibold text-heading">Existing opening stock</h3>
            {openingLoading ? (
              <p className="text-sm text-heading/60">Loading…</p>
            ) : openingRows.length === 0 ? (
              <p className="text-sm text-heading/60">No opening stock recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-surface text-xs font-medium uppercase text-heading/60">
                    <tr>
                      <th className="px-3 py-2 text-left">Godown</th>
                      <th className="px-3 py-2 text-left">Brand</th>
                      <th className="px-3 py-2 text-right">Bags</th>
                      <th className="px-3 py-2 text-right">Rate</th>
                      <th className="px-3 py-2 text-right">Value</th>
                      <th className="px-3 py-2 text-left">As of</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-card-border">
                    {openingRows.map((r) => (
                      <tr key={r.id}>
                        <td className="px-3 py-2">{r.godown_name}</td>
                        <td className="px-3 py-2">{r.brand_name}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.bags}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatINR(Number(r.rate))}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-medium">
                          {formatINR(Math.round(Number(r.bags) * Number(r.rate)))}
                        </td>
                        <td className="px-3 py-2">{r.as_of_date ? formatDate(r.as_of_date) : '—'}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              className="rounded p-1 text-heading/60 hover:bg-card-border/50 hover:text-heading/80"
                              title="Edit"
                              onClick={() => handleEditOpening(r)}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
                              title="Delete"
                              onClick={() => handleDeleteOpening(r)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
