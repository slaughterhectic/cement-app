import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { formatINR, formatDate, formatNumber } from '../lib/format';
import { DataTable, type ColumnDef } from '../components/tables/DataTable';
import { BarChart3, TrendingUp, Users, FileSpreadsheet } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type TabId = 'pnl' | 'brands' | 'outstanding' | 'daily';

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

interface PnlResponse {
  month: string;
  totalPurchases: number;
  totalSales: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  monthlyTrend: { month: string; sales: number; purchases: number; expenses: number }[];
}

interface BrandReportRow {
  id: number;
  name: string;
  type: string;
  bags_purchased: number;
  bags_sold: number;
  avg_purchase_rate: number;
  avg_sale_rate: number;
  avg_margin: number;
  total_profit: number;
}

interface OutstandingRow {
  id: number;
  name: string;
  location: string | null;
  district: string | null;
  phone: string | null;
  outstanding: number;
  last_sale: string | null;
  last_payment: string | null;
}

interface DailyRegisterRow {
  id: number;
  date: string;
  cement_name: string;
  cement_type: string | null;
  purchase_from: string | null;
  purchase_rate: number | null;
  quantity: number;
  purchase_amount: number | null;
  truck_number: string | null;
  sale_to: string;
  sale_rate: number;
  destination: string | null;
  sale_amount: number;
  party_receiving: string | null;
}

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

const tabs: { id: TabId; label: string; icon: typeof BarChart3 }[] = [
  { id: 'pnl', label: 'Monthly P&L', icon: BarChart3 },
  { id: 'brands', label: 'Brand Performance', icon: TrendingUp },
  { id: 'outstanding', label: 'Outstanding', icon: Users },
  { id: 'daily', label: 'Daily Sale Register', icon: FileSpreadsheet },
];

export default function Reports() {
  const [tab, setTab] = useState<TabId>('pnl');
  const [pnlMonth, setPnlMonth] = useState(currentMonth);
  const [dailyMonth, setDailyMonth] = useState(currentMonth);

  const [pnl, setPnl] = useState<PnlResponse | null>(null);
  const [pnlLoading, setPnlLoading] = useState(false);

  const [brands, setBrands] = useState<BrandReportRow[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(false);

  const [outstanding, setOutstanding] = useState<OutstandingRow[]>([]);
  const [outstandingLoading, setOutstandingLoading] = useState(false);

  const [dailyRows, setDailyRows] = useState<DailyRegisterRow[]>([]);
  const [dailyLoading, setDailyLoading] = useState(false);

  useEffect(() => {
    if (tab !== 'pnl') return;
    let cancelled = false;
    setPnlLoading(true);
    api.reports
      .pnl(pnlMonth)
      .then((r) => {
        if (!cancelled) setPnl(r as PnlResponse);
      })
      .catch(() => {
        if (!cancelled) setPnl(null);
      })
      .finally(() => {
        if (!cancelled) setPnlLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, pnlMonth]);

  useEffect(() => {
    if (tab !== 'brands') return;
    let cancelled = false;
    setBrandsLoading(true);
    api.reports
      .brands()
      .then((r) => {
        if (!cancelled) setBrands(r as BrandReportRow[]);
      })
      .catch(() => {
        if (!cancelled) setBrands([]);
      })
      .finally(() => {
        if (!cancelled) setBrandsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab]);

  useEffect(() => {
    if (tab !== 'outstanding') return;
    let cancelled = false;
    setOutstandingLoading(true);
    api.reports
      .outstanding()
      .then((r) => {
        if (!cancelled) setOutstanding(r as OutstandingRow[]);
      })
      .catch(() => {
        if (!cancelled) setOutstanding([]);
      })
      .finally(() => {
        if (!cancelled) setOutstandingLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab]);

  useEffect(() => {
    if (tab !== 'daily') return;
    let cancelled = false;
    setDailyLoading(true);
    api.reports
      .dailyRegister(dailyMonth)
      .then((r) => {
        if (!cancelled) setDailyRows(r as DailyRegisterRow[]);
      })
      .catch(() => {
        if (!cancelled) setDailyRows([]);
      })
      .finally(() => {
        if (!cancelled) setDailyLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, dailyMonth]);

  const chartData =
    pnl?.monthlyTrend?.map((row) => ({
      month: row.month,
      sales: Number(row.sales) || 0,
      purchases: Number(row.purchases) || 0,
      expenses: Number(row.expenses) || 0,
    })) ?? [];

  const totalOutstanding = outstanding.reduce((s, r) => s + (Number(r.outstanding) || 0), 0);

  const brandColumns: ColumnDef<BrandReportRow, unknown>[] = [
    { accessorKey: 'name', header: 'Brand' },
    { accessorKey: 'type', header: 'Type' },
    {
      accessorKey: 'bags_purchased',
      header: 'Bags Purchased',
      cell: ({ getValue }) => formatNumber(Number(getValue()) || 0),
    },
    {
      accessorKey: 'bags_sold',
      header: 'Bags Sold',
      cell: ({ getValue }) => formatNumber(Number(getValue()) || 0),
    },
    {
      accessorKey: 'avg_purchase_rate',
      header: 'Avg Purchase Rate (₹)',
      cell: ({ getValue }) => formatINR(Number(getValue()) || 0),
    },
    {
      accessorKey: 'avg_sale_rate',
      header: 'Avg Sale Rate (₹)',
      cell: ({ getValue }) => formatINR(Number(getValue()) || 0),
    },
    {
      accessorKey: 'avg_margin',
      header: 'Avg Margin/Bag (₹)',
      cell: ({ getValue }) => {
        const v = Number(getValue()) || 0;
        const cls = v >= 0 ? 'text-emerald-600' : 'text-red-600';
        return <span className={`font-medium ${cls}`}>{formatINR(v)}</span>;
      },
    },
    {
      accessorKey: 'total_profit',
      header: 'Total Profit (₹)',
      cell: ({ getValue }) => {
        const v = Number(getValue()) || 0;
        const cls = v >= 0 ? 'text-green-600' : 'text-red-600';
        return <span className={`font-semibold ${cls}`}>{formatINR(v)}</span>;
      },
    },
  ];

  const outstandingColumns: ColumnDef<OutstandingRow, unknown>[] = [
    {
      accessorKey: 'name',
      header: 'Party Name',
      cell: ({ row }) => (
        <Link to={`/parties/${row.original.id}`} className="font-medium text-brand-600 hover:underline">
          {row.original.name}
        </Link>
      ),
    },
    {
      id: 'location',
      header: 'Location',
      accessorFn: (r) => [r.location, r.district].filter(Boolean).join(', ') || '—',
    },
    {
      accessorKey: 'outstanding',
      header: 'Outstanding (₹)',
      sortingFn: (a, b, col) =>
        Number(a.getValue(col)) - Number(b.getValue(col)),
      cell: ({ getValue }) => (
        <span className="font-semibold text-red-600">{formatINR(Number(getValue()) || 0)}</span>
      ),
    },
    {
      accessorKey: 'last_sale',
      header: 'Last Sale Date',
      cell: ({ getValue }) => formatDate(String(getValue() || '')) || '—',
    },
    {
      accessorKey: 'last_payment',
      header: 'Last Payment Date',
      cell: ({ getValue }) => formatDate(String(getValue() || '')) || '—',
    },
    {
      id: 'days_since_payment',
      header: 'Days Since Last Payment',
      accessorFn: (r) => daysSince(r.last_payment) ?? -1,
      cell: ({ row }) => {
        const d = daysSince(row.original.last_payment);
        return d == null ? '—' : String(d);
      },
    },
  ];

  const dailyColumns: ColumnDef<DailyRegisterRow, unknown>[] = [
    {
      id: 'sno',
      header: 'S.No',
      cell: ({ row, table }) => {
        const pageIndex = table.getState().pagination.pageIndex;
        const pageSize = table.getState().pagination.pageSize;
        return pageIndex * pageSize + row.index + 1;
      },
    },
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ getValue }) => formatDate(String(getValue() || '')),
    },
    { accessorKey: 'cement_name', header: 'Cement Name' },
    {
      accessorKey: 'cement_type',
      header: 'Type',
      cell: ({ getValue }) => String(getValue() || '—'),
    },
    {
      accessorKey: 'purchase_from',
      header: 'Purchase From',
      cell: ({ getValue }) => String(getValue() || '—'),
    },
    {
      accessorKey: 'purchase_rate',
      header: 'Purchase Rate (₹)',
      cell: ({ getValue }) => formatINR(Number(getValue()) || 0),
    },
    {
      accessorKey: 'quantity',
      header: 'Quantity (bags)',
      cell: ({ getValue }) => formatNumber(Number(getValue()) || 0),
    },
    {
      accessorKey: 'purchase_amount',
      header: 'Purchase Amount (₹)',
      cell: ({ getValue }) => formatINR(Number(getValue()) || 0),
    },
    {
      accessorKey: 'truck_number',
      header: 'Truck No.',
      cell: ({ getValue }) => String(getValue() || '—'),
    },
    { accessorKey: 'sale_to', header: 'Sale To' },
    {
      accessorKey: 'sale_rate',
      header: 'Sale Rate (₹)',
      cell: ({ getValue }) => formatINR(Number(getValue()) || 0),
    },
    {
      accessorKey: 'destination',
      header: 'Destination',
      cell: ({ getValue }) => String(getValue() || '—'),
    },
    {
      accessorKey: 'sale_amount',
      header: 'Sale Amount (₹)',
      cell: ({ getValue }) => formatINR(Number(getValue()) || 0),
    },
    {
      accessorKey: 'party_receiving',
      header: 'Party Receiving',
      cell: ({ getValue }) => String(getValue() || '—'),
    },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-heading">Reports</h1>
        <p className="mt-1 text-sm text-heading/60">P&amp;L, brands, outstanding dues, and daily sale register.</p>
      </header>

      <div className="flex flex-wrap gap-2 border-b border-card-border pb-px">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={[
              'inline-flex items-center gap-2 rounded-t-lg border border-b-0 px-4 py-2.5 text-sm font-medium transition-colors',
              tab === id
                ? 'border-card-border bg-white text-brand-600 shadow-sm'
                : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900',
            ].join(' ')}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'pnl' && (
        <section className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium text-gray-700">
              Month
              <input
                type="month"
                value={pnlMonth}
                onChange={(e) => setPnlMonth(e.target.value)}
                className="ml-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none ring-brand-500 focus:border-brand-400 focus:ring-2"
              />
            </label>
          </div>

          {pnlLoading ? (
            <p className="text-sm text-gray-500">Loading P&amp;L…</p>
          ) : pnl ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <div className="rounded-lg border border-blue-100 bg-blue-50/80 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-blue-800/80">Total Purchases</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-blue-900">
                    {formatINR(Number(pnl.totalPurchases) || 0)}
                  </p>
                </div>
                <div className="rounded-lg border border-green-100 bg-green-50/80 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-green-800/80">Total Sales</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-green-900">
                    {formatINR(Number(pnl.totalSales) || 0)}
                  </p>
                </div>
                <div className="rounded-lg border border-emerald-100 bg-emerald-50/80 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-emerald-800/80">Gross Profit</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-900">
                    {formatINR(Number(pnl.grossProfit) || 0)}
                  </p>
                </div>
                <div className="rounded-lg border border-amber-100 bg-amber-50/80 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-amber-900/80">Expenses</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-amber-950">
                    {formatINR(Number(pnl.totalExpenses) || 0)}
                  </p>
                </div>
                <div
                  className={`rounded-lg border p-4 sm:col-span-2 lg:col-span-2 xl:col-span-2 ${
                    (Number(pnl.netProfit) || 0) >= 0
                      ? 'border-emerald-200 bg-emerald-50/90'
                      : 'border-red-200 bg-red-50/90'
                  }`}
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-600">Net Profit</p>
                  <p
                    className={`mt-1 text-2xl font-bold tabular-nums ${
                      (Number(pnl.netProfit) || 0) >= 0 ? 'text-emerald-700' : 'text-red-700'
                    }`}
                  >
                    {formatINR(Number(pnl.netProfit) || 0)}
                  </p>
                  <p className="mt-2 text-sm text-gray-600">
                    Profit margin:{' '}
                    <span className="font-semibold text-gray-900">
                      {(Number(pnl.profitMargin) || 0).toFixed(1)}%
                    </span>
                  </p>
                </div>
              </div>

              <div className="card p-4">
                <h2 className="mb-4 text-sm font-semibold text-heading">Monthly trend</h2>
                <div className="h-[320px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatNumber(v)} />
                      <Tooltip
                        formatter={(value: number) => formatINR(value)}
                        labelFormatter={(l) => `Month: ${l}`}
                      />
                      <Legend />
                      <Bar dataKey="sales" name="Sales" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="purchases" name="Purchases" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" name="Expenses" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">Could not load P&amp;L.</p>
          )}
        </section>
      )}

      {tab === 'brands' && (
        <section>
          <DataTable<BrandReportRow>
            data={brands}
            columns={brandColumns}
            isLoading={brandsLoading}
            emptyMessage="No brand data."
            exportFileName="brand_performance"
          />
        </section>
      )}

      {tab === 'outstanding' && (
        <section className="space-y-4">
          <div className="rounded-lg border border-card-border bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total outstanding (all parties)</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-red-600">{formatINR(totalOutstanding)}</p>
          </div>
          <DataTable<OutstandingRow>
            data={outstanding}
            columns={outstandingColumns}
            isLoading={outstandingLoading}
            emptyMessage="No outstanding balances."
            exportFileName="outstanding_report"
            getRowId={(r) => r.id}
          />
        </section>
      )}

      {tab === 'daily' && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium text-gray-700">
              Month
              <input
                type="month"
                value={dailyMonth}
                onChange={(e) => setDailyMonth(e.target.value)}
                className="ml-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none ring-brand-500 focus:border-brand-400 focus:ring-2"
              />
            </label>
          </div>
          <DataTable<DailyRegisterRow>
            data={dailyRows}
            columns={dailyColumns}
            isLoading={dailyLoading}
            emptyMessage="No sales in this month."
            exportFileName={`daily_register_${dailyMonth}`}
            getRowId={(r) => r.id}
            pageSize={50}
          />
        </section>
      )}
    </div>
  );
}
