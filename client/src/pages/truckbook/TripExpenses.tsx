import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, X, IndianRupee } from 'lucide-react';
import { api } from '../../lib/api';
import { formatINR, formatDate } from '../../lib/format';
import { useToastStore } from '../../lib/store';

interface TripRow {
  id: number;
  date: string;
  truck_number: string;
  driver_name: string | null;
  material_name: string | null;
  quantity: number;
  load_from: string | null;
  billed_destination: string | null;
  total_freight: number;
  net_freight: number;
  net_profit: number;
  toll_expense: number;
  loading_charge: number;
  unloading_charge: number;
  diesel_litres: number;
  diesel_rate: number;
  diesel_amount: number;
  driver_payment: number;
  miscellaneous: number;
  expense_completed: boolean;
}

interface Truck { id: number; truck_number: string; }

const emptyForm = {
  loading_charge: '',
  unloading_charge: '',
  diesel_litres: '',
  diesel_rate: '',
  driver_payment: '',
  miscellaneous: '',
};

function n(v: string) { return Number(v) || 0; }

export default function TripExpenses() {
  const addToast = useToastStore((s) => s.addToast);
  const [rows, setRows] = useState<TripRow[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [loading, setLoading] = useState(true);
  const [walletBal, setWalletBal] = useState<number>(0);
  const [filterTruck, setFilterTruck] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'filed'>('pending');
  const [target, setTarget] = useState<TripRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterTruck) params.truck_id = filterTruck;
      if (filterMonth) params.month = filterMonth;
      const data = await api.truckTrips.list(Object.keys(params).length ? params : undefined);
      setRows(data);
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to load trips', 'error');
    } finally { setLoading(false); }
  }, [addToast, filterTruck, filterMonth]);

  const loadMeta = useCallback(async () => {
    try {
      const [t, w] = await Promise.all([api.trucks.list(), api.wallet.summary()]);
      setTrucks(t);
      setWalletBal(Number(w.balance) || 0);
    } catch (_) {}
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadMeta(); }, [loadMeta]);

  // Re-fetch wallet whenever the modal opens — top-ups may have happened.
  useEffect(() => {
    if (!target) return;
    api.wallet.summary().then((s) => setWalletBal(Number(s.balance) || 0)).catch(() => {});
  }, [target]);

  const filtered = useMemo(() => {
    if (filterStatus === 'all') return rows;
    return rows.filter((r) => filterStatus === 'filed' ? r.expense_completed : !r.expense_completed);
  }, [rows, filterStatus]);

  const open = (row: TripRow) => {
    setTarget(row);
    setForm({
      loading_charge: String(row.loading_charge || ''),
      unloading_charge: String(row.unloading_charge || ''),
      diesel_litres: String(row.diesel_litres || ''),
      diesel_rate: String(row.diesel_rate || ''),
      driver_payment: String(row.driver_payment || ''),
      miscellaneous: String(row.miscellaneous || ''),
    });
  };

  const live = useMemo(() => {
    const diesel_amount = n(form.diesel_litres) * n(form.diesel_rate);
    const trip_expense = n(form.loading_charge) + n(form.unloading_charge)
      + diesel_amount + n(form.driver_payment) + n(form.miscellaneous);
    return { diesel_amount, trip_expense };
  }, [form]);

  const save = async () => {
    if (!target) return;
    setSaving(true);
    try {
      await api.truckTrips.updateExpense(target.id, {
        loading_charge: n(form.loading_charge),
        unloading_charge: n(form.unloading_charge),
        diesel_litres: n(form.diesel_litres),
        diesel_rate: n(form.diesel_rate),
        driver_payment: n(form.driver_payment),
        miscellaneous: n(form.miscellaneous),
      });
      addToast('Trip expenses filed', 'success');
      setTarget(null);
      load();
      api.wallet.summary().then((s) => setWalletBal(Number(s.balance) || 0)).catch(() => {});
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally { setSaving(false); }
  };

  const f = (field: keyof typeof emptyForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const totals = filtered.reduce((acc, r) => ({
    quantity: acc.quantity + Number(r.quantity),
    total_freight: acc.total_freight + Number(r.total_freight),
    total_fuel: acc.total_fuel + Number(r.diesel_amount),
    total_toll: acc.total_toll + Number(r.toll_expense),
    net_profit: acc.net_profit + Number(r.net_profit),
    pending: acc.pending + (r.expense_completed ? 0 : 1),
  }), { quantity: 0, total_freight: 0, total_fuel: 0, total_toll: 0, net_profit: 0, pending: 0 });

  const oldExpense = target ? Number(target.loading_charge) + Number(target.unloading_charge)
    + Number(target.diesel_amount) + Number(target.driver_payment) + Number(target.miscellaneous) : 0;
  const effectiveWallet = walletBal + (target?.expense_completed ? oldExpense : 0);
  const walletShort = !!target && live.trip_expense > 0 && effectiveWallet < live.trip_expense;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading">Trip Expenses</h1>
          <p className="text-sm text-heading/60 mt-1">
            {totals.pending} pending · {filtered.length} shown · Wallet {formatINR(walletBal)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap items-center gap-4 p-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-heading/70 whitespace-nowrap">Truck:</label>
          <select className="input-field py-1.5 text-sm min-w-[140px]" value={filterTruck} onChange={(e) => setFilterTruck(e.target.value)}>
            <option value="">All Trucks</option>
            {trucks.map((t) => <option key={t.id} value={String(t.id)}>{t.truck_number}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-heading/70 whitespace-nowrap">Month:</label>
          <input type="month" className="input-field py-1.5 text-sm" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-card-border bg-surface p-0.5 text-sm">
          {(['pending', 'filed', 'all'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-md font-medium capitalize transition-colors ${
                filterStatus === s ? 'bg-orange-500 text-white' : 'text-heading/70 hover:bg-card-border/40'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        {(filterTruck || filterMonth) && (
          <button type="button" onClick={() => { setFilterTruck(''); setFilterMonth(''); }} className="text-sm text-orange-600 dark:text-orange-400 hover:underline font-medium">
            Clear filters
          </button>
        )}
      </div>

      {/* Summary Strip — same KPIs as Trip Log so the two tabs stay in sync. */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:grid-cols-5">
          <div className="card p-4 text-center border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/30">
            <p className="text-xs text-orange-600 dark:text-orange-400 font-medium uppercase tracking-wider">Total Qty</p>
            <p className="text-xl font-bold text-heading">{totals.quantity.toFixed(1)} T</p>
          </div>
          <div className="card p-4 text-center border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/30">
            <p className="text-xs text-orange-600 dark:text-orange-400 font-medium uppercase tracking-wider">Total Freight</p>
            <p className="text-xl font-bold text-heading">{formatINR(totals.total_freight)}</p>
          </div>
          <div className="card p-4 text-center border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/30">
            <p className="text-xs text-orange-600 dark:text-orange-400 font-medium uppercase tracking-wider">Total Fuel</p>
            <p className="text-xl font-bold text-red-600 dark:text-red-400">{formatINR(totals.total_fuel)}</p>
          </div>
          <div className="card p-4 text-center border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/30">
            <p className="text-xs text-orange-600 dark:text-orange-400 font-medium uppercase tracking-wider">Total Toll</p>
            <p className="text-xl font-bold text-red-600 dark:text-red-400">{formatINR(totals.total_toll)}</p>
          </div>
          <div className="card p-4 text-center border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/30">
            <p className="text-xs text-orange-600 dark:text-orange-400 font-medium uppercase tracking-wider">Net Profit</p>
            <p className={`text-xl font-bold ${totals.net_profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{formatINR(totals.net_profit)}</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-card-border bg-orange-50 dark:bg-orange-900/30 text-left">
                <th className="px-4 py-3 font-medium text-orange-700 dark:text-orange-300">Date</th>
                <th className="px-4 py-3 font-medium text-orange-700 dark:text-orange-300">Truck</th>
                <th className="px-4 py-3 font-medium text-orange-700 dark:text-orange-300">Driver</th>
                <th className="px-4 py-3 font-medium text-orange-700 dark:text-orange-300">Route</th>
                <th className="px-4 py-3 font-medium text-orange-700 dark:text-orange-300 text-right">Net Freight</th>
                <th className="px-4 py-3 font-medium text-orange-700 dark:text-orange-300 text-right">Trip Expense</th>
                <th className="px-4 py-3 font-medium text-orange-700 dark:text-orange-300 text-right">Net Profit</th>
                <th className="px-4 py-3 font-medium text-orange-700 dark:text-orange-300">Status</th>
                <th className="px-4 py-3 font-medium text-orange-700 dark:text-orange-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-heading/50">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-heading/50">No trips match the filters.</td></tr>
              ) : (
                filtered.map((row) => {
                  const expense = Number(row.loading_charge) + Number(row.unloading_charge)
                    + Number(row.diesel_amount) + Number(row.driver_payment) + Number(row.miscellaneous);
                  return (
                    <tr key={row.id} className="border-b border-card-border last:border-0 hover:bg-orange-50/40 dark:hover:bg-orange-900/30 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">{formatDate(row.date)}</td>
                      <td className="px-4 py-3 font-medium text-orange-600 dark:text-orange-400">{row.truck_number}</td>
                      <td className="px-4 py-3 text-heading/70">{row.driver_name || '—'}</td>
                      <td className="px-4 py-3 text-heading/70 text-xs max-w-[140px] truncate">
                        {row.load_from && row.billed_destination ? `${row.load_from} → ${row.billed_destination}` : row.load_from || row.billed_destination || '—'}
                      </td>
                      <td className="px-4 py-3 text-right">{formatINR(Number(row.net_freight))}</td>
                      <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">{row.expense_completed ? formatINR(expense) : '—'}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${Number(row.net_profit) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {row.expense_completed ? formatINR(Number(row.net_profit)) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {row.expense_completed ? (
                          <span className="inline-flex items-center rounded-full bg-green-50 dark:bg-green-900/30 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:text-green-300">Filed</span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">Pending</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => open(row)}
                          className="inline-flex items-center gap-1 rounded-md border border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/30 px-2 py-1 text-xs font-medium text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/50"
                          title={row.expense_completed ? 'Edit expense' : 'File expense'}
                        >
                          {row.expense_completed ? <Pencil className="h-3 w-3" /> : <IndianRupee className="h-3 w-3" />}
                          {row.expense_completed ? 'Edit' : 'File'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expense modal */}
      {target && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40">
          <div className="flex min-h-full items-start justify-center px-4 py-6">
            <div className="w-full max-w-xl rounded-xl bg-card shadow-2xl">
              <div className="flex items-center justify-between border-b border-card-border px-5 py-4">
                <div>
                  <h2 className="font-semibold text-heading">{target.expense_completed ? 'Edit Trip Expense' : 'File Trip Expense'}</h2>
                  <p className="mt-0.5 text-xs text-heading/60">
                    {target.truck_number} · {formatDate(target.date)} · Net Freight {formatINR(Number(target.net_freight))}
                  </p>
                </div>
                <button type="button" onClick={() => setTarget(null)} className="rounded-lg p-1.5 hover:bg-card-border/50">
                  <X className="h-5 w-5 text-heading/60" />
                </button>
              </div>

              <div className="p-5 flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-heading/70 mb-1">Loading Charge (₹)</label>
                    <input type="number" min="0" step="0.01" className="input-field" value={form.loading_charge} onChange={f('loading_charge')} placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-heading/70 mb-1">Unloading Charge (₹)</label>
                    <input type="number" min="0" step="0.01" className="input-field" value={form.unloading_charge} onChange={f('unloading_charge')} placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-heading/70 mb-1">Diesel Litres</label>
                    <input type="number" min="0" step="0.01" className="input-field" value={form.diesel_litres} onChange={f('diesel_litres')} placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-heading/70 mb-1">Diesel Rate (₹/L)</label>
                    <input type="number" min="0" step="0.01" className="input-field" value={form.diesel_rate} onChange={f('diesel_rate')} placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-heading/70 mb-1">Driver Payment (₹)</label>
                    <input type="number" min="0" step="0.01" className="input-field" value={form.driver_payment} onChange={f('driver_payment')} placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-heading/70 mb-1">Miscellaneous (₹)</label>
                    <input type="number" min="0" step="0.01" className="input-field" value={form.miscellaneous} onChange={f('miscellaneous')} placeholder="0" />
                  </div>
                </div>

                <div className="rounded-lg bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 px-3 py-2 text-xs flex flex-wrap gap-3">
                  <span><span className="text-heading/60">Trip Diesel: </span><span className="font-semibold text-orange-700 dark:text-orange-300">{formatINR(live.diesel_amount)}</span></span>
                  <span><span className="text-heading/60">Total Expense: </span><span className="font-semibold text-orange-700 dark:text-orange-300">{formatINR(live.trip_expense)}</span></span>
                  <span><span className="text-heading/60">Projected Net Profit: </span><span className={`font-semibold ${Number(target.net_freight) - live.trip_expense >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{formatINR(Number(target.net_freight) - live.trip_expense)}</span></span>
                </div>

                <p className="text-[11px] text-heading/60">
                  Driver payment also feeds the driver's ledger as earned. Toll &amp; advance diesel are not part of trip expenses — they were settled on the trip itself.
                </p>
              </div>

              {walletShort && (
                <div className="border-t border-amber-300 bg-amber-50 dark:bg-amber-900/30 px-5 py-3 text-xs text-amber-800 dark:text-amber-200">
                  ⚠ Wallet has only <strong>{formatINR(effectiveWallet)}</strong> — trip expense is <strong>{formatINR(live.trip_expense)}</strong>. Top up the Wallet before saving.
                </div>
              )}

              <div className="flex items-center justify-between gap-3 border-t border-card-border px-5 py-4">
                <span className="text-xs text-heading/60">
                  Wallet: <strong className={walletShort ? 'text-amber-700 dark:text-amber-300' : 'text-heading'}>{formatINR(effectiveWallet)}</strong>
                </span>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setTarget(null)} className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-heading/80 hover:bg-surface">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={save}
                    disabled={saving || walletShort}
                    title={walletShort ? 'Insufficient wallet balance' : undefined}
                    className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving…' : target.expense_completed ? 'Update Expense' : 'File Expense'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
