import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { formatDate, formatINR } from '../lib/format';
import { DataTable, type ColumnDef } from '../components/tables/DataTable';
import StockCard from '../components/ui/StockCard';
import type { StockType } from '../components/ui/StockCard';
import { Package } from 'lucide-react';
import { useToastStore } from '../lib/store';

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
          className="rounded-xl border-2 border-card-border bg-white p-5 shadow-sm"
          role="status"
          aria-label="Loading"
        >
          <div className="flex justify-between gap-2">
            <div className="h-6 w-32 animate-pulse rounded-md bg-gray-200" />
            <div className="h-5 w-12 animate-pulse rounded-md bg-gray-200" />
          </div>
          <div className="mt-4 h-9 w-20 animate-pulse rounded-md bg-gray-200" />
          <div className="mt-1 h-4 w-28 animate-pulse rounded bg-gray-200" />
          <div className="mt-4 space-y-2 border-t border-card-border pt-4">
            <div className="flex justify-between gap-2">
              <div className="h-4 w-12 animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
            </div>
            <div className="flex justify-between gap-2">
              <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
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
          className="rounded-lg border border-card-border bg-white p-4 shadow-sm"
          role="status"
          aria-label="Loading"
        >
          <div className="h-5 w-40 animate-pulse rounded-md bg-gray-200" />
          <div className="mt-2 h-4 w-56 animate-pulse rounded bg-gray-200" />
          <div className="mt-4 space-y-2">
            <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
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

  const [movement, setMovement] = useState<MovementRow[]>([]);
  const [movementLoading, setMovementLoading] = useState(true);
  const [brandFilter, setBrandFilter] = useState('');
  const [godownFilter, setGodownFilter] = useState('');

  const [godownStock, setGodownStock] = useState<GodownStockRow[]>([]);
  const [godownLoading, setGodownLoading] = useState(true);

  const [brands, setBrands] = useState<{ id: number; name: string }[]>([]);
  const [godowns, setGodowns] = useState<{ id: number; name: string; location?: string | null }[]>([]);

  const loadStockList = useCallback(async () => {
    setStockListLoading(true);
    try {
      const rows = (await api.stock.list()) as StockSummaryRow[];
      setStockList(Array.isArray(rows) ? rows : []);
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
      const rows = (await api.stock.godown()) as GodownStockRow[];
      setGodownStock(Array.isArray(rows) ? rows : []);
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
    Promise.all([api.brands(), api.godowns()])
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
                isPurchase ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
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
          return <span className="font-medium text-emerald-600 tabular-nums">{n || '—'}</span>;
        },
      },
      {
        accessorKey: 'bags_out',
        header: 'Bags Out',
        cell: ({ getValue }) => {
          const n = Number(getValue() ?? 0);
          return <span className="font-medium text-red-600 tabular-nums">{n || '—'}</span>;
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
          <p className="mt-1 text-sm text-gray-600">Brand summary, movement log, and godown-wise quantities.</p>
        </div>
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
              />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="stock-movement-heading" className="flex flex-col gap-4">
        <h2 id="stock-movement-heading" className="text-lg font-semibold text-heading">
          Stock Movement
        </h2>
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-card-border bg-white p-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Brand</label>
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
            <label className="mb-1 block text-xs font-medium text-gray-600">Godown</label>
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
          <p className="text-sm text-gray-600">No godown stock to show.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {godownGroups.map((g) => (
              <div
                key={g.id}
                className="rounded-lg border border-card-border bg-white p-4 shadow-sm"
              >
                <h3 className="text-base font-semibold text-heading">{g.name}</h3>
                {g.location ? (
                  <p className="mt-0.5 text-sm text-gray-500">{g.location}</p>
                ) : null}
                <ul className="mt-4 divide-y divide-gray-100">
                  {g.brands.map((b) => (
                    <li
                      key={`${g.id}-${b.brand_id}`}
                      className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm first:pt-0"
                    >
                      <div>
                        <span className="font-medium text-gray-900">{b.brand_name}</span>
                        <span className="ml-2 text-xs text-gray-500">{b.brand_type}</span>
                      </div>
                      <span className="tabular-nums font-semibold text-heading">{b.stock} bags</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 border-t border-card-border pt-3 text-xs text-gray-500">
                  Est. value (brand avg rate):{' '}
                  <span className="font-medium text-heading">{formatINR(godownEstValue(g.brands))}</span>
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
