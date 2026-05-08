import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, X, IndianRupee, Plus, Minus } from 'lucide-react';
import { api } from '../../lib/api';
import { formatINR, formatDate } from '../../lib/format';
import { useToastStore } from '../../lib/store';

interface MiscItem { description: string; amount: string; }

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
  transporter_commission: number;
  advance_deduction: number;
  toll_expense: number;
  fastag_id: number | null;
  loading_charge: number;
  loading_charge_description: string | null;
  unloading_charge: number;
  unloading_charge_description: string | null;
  diesel_amount: number;
  trip_diesel_from_id: number | null;
  diesel_from_id: number | null;
  driver_payment: number;
  miscellaneous: number;
  miscellaneous_items: MiscItem[] | null;
  odometer_start: number | null;
  odometer_end: number | null;
  total_km: number;
  expense_completed: boolean;
}

interface Truck { id: number; truck_number: string; }
interface Transporter { id: number; name: string }
interface Fastag { id: number; name: string; balance: number; is_active: number }

const emptyForm = {
  loading_charge: '',
  loading_charge_description: '',
  unloading_charge: '',
  unloading_charge_description: '',
  trip_diesel_amount: '',
  trip_diesel_from_id: '',
  driver_payment: '',
  toll_expense: '',
  fastag_id: '',
  odometer_start: '',
  odometer_end: '',
  advance_diesel_amount: '',
  diesel_from_id: '',
};

function n(v: string) { return Number(v) || 0; }

function parseMiscItems(row: TripRow): MiscItem[] {
  if (row.miscellaneous_items && Array.isArray(row.miscellaneous_items) && row.miscellaneous_items.length > 0) {
    return row.miscellaneous_items.map((i) => ({ description: i.description || '', amount: String(i.amount || '') }));
  }
  if (Number(row.miscellaneous) > 0) {
    return [{ description: '', amount: String(row.miscellaneous) }];
  }
  return [{ description: '', amount: '' }];
}

export default function TripExpenses() {
  const addToast = useToastStore((s) => s.addToast);
  const [rows, setRows] = useState<TripRow[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [fastags, setFastags] = useState<Fastag[]>([]);
  const [loading, setLoading] = useState(true);
  const [walletBal, setWalletBal] = useState<number>(0);
  const [filterTruck, setFilterTruck] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'filed'>('pending');
  const [target, setTarget] = useState<TripRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [miscItems, setMiscItems] = useState<MiscItem[]>([{ description: '', amount: '' }]);
  const [saving, setSaving] = useState(false);

  // Drill-down state — double-click on Trip Expense cell
  const [drillRow, setDrillRow] = useState<TripRow | null>(null);

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
      const [t, w, ft, tp] = await Promise.all([api.trucks.list(), api.wallet.summary(), api.fastags.list(), api.transporters.list()]);
      setTrucks(t);
      setWalletBal(Number(w.balance) || 0);
      setFastags(ft as Fastag[]);
      setTransporters(tp as Transporter[]);
    } catch (_) {}
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadMeta(); }, [loadMeta]);

  useEffect(() => {
    if (!target) return;
    api.wallet.summary().then((s) => setWalletBal(Number(s.balance) || 0)).catch(() => {});
    api.fastags.list().then((ft) => setFastags(ft as Fastag[])).catch(() => {});
  }, [target]);

  const filtered = useMemo(() => {
    if (filterStatus === 'all') return rows;
    return rows.filter((r) => filterStatus === 'filed' ? r.expense_completed : !r.expense_completed);
  }, [rows, filterStatus]);

  const open = (row: TripRow) => {
    setTarget(row);
    setMiscItems(parseMiscItems(row));
    setForm({
      loading_charge: String(row.loading_charge || ''),
      loading_charge_description: row.loading_charge_description || '',
      unloading_charge: String(row.unloading_charge || ''),
      unloading_charge_description: row.unloading_charge_description || '',
      trip_diesel_amount: String(row.diesel_amount || ''),
      trip_diesel_from_id: row.trip_diesel_from_id ? String(row.trip_diesel_from_id) : '',
      driver_payment: String(row.driver_payment || ''),
      toll_expense: String(row.toll_expense || ''),
      fastag_id: row.fastag_id ? String(row.fastag_id) : '',
      odometer_start: row.odometer_start != null ? String(row.odometer_start) : '',
      odometer_end: row.odometer_end != null ? String(row.odometer_end) : '',
      advance_diesel_amount: String(row.advance_deduction || ''),
      diesel_from_id: row.diesel_from_id ? String(row.diesel_from_id) : '',
    });
  };

  const miscTotal = useMemo(() => miscItems.reduce((s, i) => s + n(i.amount), 0), [miscItems]);

  const live = useMemo(() => {
    const diesel_amount = n(form.trip_diesel_amount);
    const tripDieselFromTransporter = !!form.trip_diesel_from_id;
    const wallet_expense = n(form.loading_charge) + n(form.unloading_charge)
      + n(form.driver_payment) + miscTotal
      + (tripDieselFromTransporter ? 0 : diesel_amount);
    const total_km = form.odometer_start && form.odometer_end
      ? n(form.odometer_end) - n(form.odometer_start) : 0;
    return { diesel_amount, tripDieselFromTransporter, wallet_expense, total_km };
  }, [form, miscTotal]);

  const save = async () => {
    if (!target) return;
    if (n(form.advance_diesel_amount) > 0 && !form.diesel_from_id) {
      addToast('Pick the transporter who provided the advance diesel', 'error');
      return;
    }
    setSaving(true);
    try {
      const validMiscItems = miscItems
        .filter((i) => n(i.amount) > 0 || i.description.trim())
        .map((i) => ({ description: i.description, amount: n(i.amount) }));
      await api.truckTrips.updateExpense(target.id, {
        loading_charge: n(form.loading_charge),
        loading_charge_description: form.loading_charge_description || undefined,
        unloading_charge: n(form.unloading_charge),
        unloading_charge_description: form.unloading_charge_description || undefined,
        trip_diesel_amount: n(form.trip_diesel_amount),
        trip_diesel_from_id: form.trip_diesel_from_id ? Number(form.trip_diesel_from_id) : null,
        driver_payment: n(form.driver_payment),
        miscellaneous_items: validMiscItems,
        toll_expense: n(form.toll_expense),
        fastag_id: form.fastag_id ? Number(form.fastag_id) : null,
        odometer_start: form.odometer_start ? n(form.odometer_start) : null,
        odometer_end: form.odometer_end ? n(form.odometer_end) : null,
        advance_diesel_amount: n(form.advance_diesel_amount),
        diesel_from_id: form.diesel_from_id ? Number(form.diesel_from_id) : null,
      });
      addToast('Trip expenses filed', 'success');
      setTarget(null);
      load();
      api.wallet.summary().then((s) => setWalletBal(Number(s.balance) || 0)).catch(() => {});
      api.fastags.list().then((ft) => setFastags(ft as Fastag[])).catch(() => {});
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally { setSaving(false); }
  };

  const f = (field: keyof typeof emptyForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const setMiscCount = (count: number) => {
    const clamped = Math.max(1, Math.min(10, count));
    setMiscItems((prev) => {
      if (clamped > prev.length) {
        return [...prev, ...Array(clamped - prev.length).fill({ description: '', amount: '' })];
      }
      return prev.slice(0, clamped);
    });
  };

  const totals = filtered.reduce((acc, r) => ({
    quantity: acc.quantity + Number(r.quantity),
    total_freight: acc.total_freight + Number(r.total_freight),
    total_fuel: acc.total_fuel + Number(r.diesel_amount),
    total_toll: acc.total_toll + Number(r.toll_expense),
    net_profit: acc.net_profit + Number(r.net_profit),
    pending: acc.pending + (r.expense_completed ? 0 : 1),
  }), { quantity: 0, total_freight: 0, total_fuel: 0, total_toll: 0, net_profit: 0, pending: 0 });

  const oldWalletExpense = target
    ? Number(target.loading_charge) + Number(target.unloading_charge)
      + Number(target.driver_payment) + Number(target.miscellaneous)
      + (target.trip_diesel_from_id ? 0 : Number(target.diesel_amount))
    : 0;
  const effectiveWallet = walletBal + (target?.expense_completed ? oldWalletExpense : 0);
  const walletShort = !!target && live.wallet_expense > 0 && effectiveWallet < live.wallet_expense;

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

      {/* Summary Strip */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:grid-cols-5">
          {[
            { label: 'Total Qty', value: `${totals.quantity.toFixed(1)} T`, cls: 'text-heading' },
            { label: 'Total Freight', value: formatINR(totals.total_freight), cls: 'text-heading' },
            { label: 'Total Fuel', value: formatINR(totals.total_fuel), cls: 'text-red-600 dark:text-red-400' },
            { label: 'Total Toll', value: formatINR(totals.total_toll), cls: 'text-red-600 dark:text-red-400' },
            { label: 'Net Profit', value: formatINR(totals.net_profit), cls: totals.net_profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400' },
          ].map(({ label, value, cls }) => (
            <div key={label} className="card p-4 text-center border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/30">
              <p className="text-xs text-orange-600 dark:text-orange-400 font-medium uppercase tracking-wider">{label}</p>
              <p className={`text-xl font-bold ${cls}`}>{value}</p>
            </div>
          ))}
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
                <th className="px-4 py-3 font-medium text-orange-700 dark:text-orange-300 text-right">
                  Trip Expense
                  <span className="ml-1 text-[10px] font-normal text-orange-500">(dbl-click for detail)</span>
                </th>
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
                      <td
                        className={`px-4 py-3 text-right ${row.expense_completed ? 'text-red-600 dark:text-red-400 cursor-pointer select-none' : ''}`}
                        onDoubleClick={() => row.expense_completed && setDrillRow(row)}
                        title={row.expense_completed ? 'Double-click to see expense breakdown' : undefined}
                      >
                        {row.expense_completed ? formatINR(expense) : '—'}
                      </td>
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

      {/* Expense Drill-down Modal */}
      {drillRow && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40" onClick={() => setDrillRow(null)}>
          <div className="flex min-h-full items-start justify-center px-4 py-8" onClick={(e) => e.stopPropagation()}>
            <div className="w-full max-w-sm rounded-xl bg-card shadow-2xl">
              <div className="flex items-center justify-between border-b border-card-border px-5 py-4">
                <div>
                  <h2 className="font-semibold text-heading">Expense Breakdown</h2>
                  <p className="text-xs text-heading/60 mt-0.5">{drillRow.truck_number} · {formatDate(drillRow.date)}</p>
                </div>
                <button type="button" onClick={() => setDrillRow(null)} className="rounded-lg p-1.5 hover:bg-card-border/50">
                  <X className="h-5 w-5 text-heading/60" />
                </button>
              </div>
              <div className="p-5 flex flex-col gap-1 text-sm">
                {[
                  { label: 'Loading Charge', value: Number(drillRow.loading_charge), sub: drillRow.loading_charge_description },
                  { label: 'Unloading Charge', value: Number(drillRow.unloading_charge), sub: drillRow.unloading_charge_description },
                  { label: 'Diesel', value: Number(drillRow.diesel_amount) },
                  { label: 'Driver Payment', value: Number(drillRow.driver_payment) },
                  { label: 'Toll', value: Number(drillRow.toll_expense) },
                ].filter((i) => i.value > 0).map(({ label, value, sub }) => (
                  <div key={label} className="flex items-start justify-between gap-2 py-1.5 border-b border-card-border/50 last:border-0">
                    <div>
                      <span className="text-heading/80">{label}</span>
                      {sub && <p className="text-[11px] text-heading/50 mt-0.5">{sub}</p>}
                    </div>
                    <span className="font-medium text-red-600 dark:text-red-400 whitespace-nowrap">{formatINR(value)}</span>
                  </div>
                ))}
                {/* Misc items */}
                {(() => {
                  const items = drillRow.miscellaneous_items && Array.isArray(drillRow.miscellaneous_items) && drillRow.miscellaneous_items.length > 0
                    ? drillRow.miscellaneous_items
                    : (Number(drillRow.miscellaneous) > 0 ? [{ description: 'Miscellaneous', amount: Number(drillRow.miscellaneous) }] : []);
                  return items.map((item, i) => (
                    Number(item.amount) > 0 && (
                      <div key={i} className="flex items-start justify-between gap-2 py-1.5 border-b border-card-border/50 last:border-0">
                        <span className="text-heading/80">{item.description || `Misc ${i + 1}`}</span>
                        <span className="font-medium text-red-600 dark:text-red-400 whitespace-nowrap">{formatINR(Number(item.amount))}</span>
                      </div>
                    )
                  ));
                })()}
                <div className="flex items-center justify-between pt-2 mt-1 border-t-2 border-orange-200 dark:border-orange-800 font-semibold">
                  <span className="text-orange-700 dark:text-orange-300">Total Expense</span>
                  <span className="text-red-600 dark:text-red-400">
                    {formatINR(Number(drillRow.loading_charge) + Number(drillRow.unloading_charge) + Number(drillRow.diesel_amount) + Number(drillRow.driver_payment) + Number(drillRow.miscellaneous))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expense Filing Modal */}
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

              <div className="p-5 flex flex-col gap-5">
                {/* Trip Expenses */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-orange-500 mb-3">Trip Expenses</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-heading/70 mb-1">Loading Charge (₹)</label>
                      <input type="number" min="0" step="0.01" className="input-field" value={form.loading_charge} onChange={f('loading_charge')} placeholder="0" />
                      <input
                        type="text"
                        className="input-field mt-1.5 text-xs"
                        value={form.loading_charge_description}
                        onChange={(e) => setForm((p) => ({ ...p, loading_charge_description: e.target.value }))}
                        placeholder="Description (optional)"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-heading/70 mb-1">Unloading Charge (₹)</label>
                      <input type="number" min="0" step="0.01" className="input-field" value={form.unloading_charge} onChange={f('unloading_charge')} placeholder="0" />
                      <input
                        type="text"
                        className="input-field mt-1.5 text-xs"
                        value={form.unloading_charge_description}
                        onChange={(e) => setForm((p) => ({ ...p, unloading_charge_description: e.target.value }))}
                        placeholder="Description (optional)"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-heading/70 mb-1">Driver Payment (₹)</label>
                      <input type="number" min="0" step="0.01" className="input-field" value={form.driver_payment} onChange={f('driver_payment')} placeholder="0" />
                    </div>
                  </div>
                </div>

                {/* Miscellaneous */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-orange-500">Miscellaneous</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-heading/60">Charges:</span>
                      <button
                        type="button"
                        onClick={() => setMiscCount(miscItems.length - 1)}
                        disabled={miscItems.length <= 1}
                        className="flex h-6 w-6 items-center justify-center rounded-md border border-card-border hover:bg-surface disabled:opacity-40"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-sm font-medium w-4 text-center">{miscItems.length}</span>
                      <button
                        type="button"
                        onClick={() => setMiscCount(miscItems.length + 1)}
                        disabled={miscItems.length >= 10}
                        className="flex h-6 w-6 items-center justify-center rounded-md border border-card-border hover:bg-surface disabled:opacity-40"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {miscItems.map((item, i) => (
                      <div key={i} className="grid grid-cols-[1fr_auto] gap-2 items-start">
                        <input
                          type="text"
                          className="input-field text-sm"
                          value={item.description}
                          onChange={(e) => setMiscItems((prev) => prev.map((x, j) => j === i ? { ...x, description: e.target.value } : x))}
                          placeholder={`Description ${miscItems.length > 1 ? i + 1 : ''}`}
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="input-field text-sm w-28"
                          value={item.amount}
                          onChange={(e) => setMiscItems((prev) => prev.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))}
                          placeholder="0"
                        />
                      </div>
                    ))}
                  </div>
                  {miscTotal > 0 && (
                    <p className="mt-1.5 text-xs text-orange-600 dark:text-orange-400">
                      Total misc: <strong>{formatINR(miscTotal)}</strong>
                    </p>
                  )}
                </div>

                {/* Trip Diesel */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-orange-500 mb-3">Trip Diesel</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                    <div>
                      <label className="block text-xs font-medium text-heading/70 mb-1">Trip Diesel Amount (₹)</label>
                      <input type="number" min="0" step="0.01" className="input-field" value={form.advance_diesel_amount} onChange={f('advance_diesel_amount')} placeholder="0" />
                    </div>
                    <div className="rounded-lg bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 px-3 py-2 text-xs">
                      <span className="text-heading/60">From Transporter (set in Trip Log): </span>
                      <span className="font-semibold text-orange-700 dark:text-orange-300">
                        {form.diesel_from_id
                          ? transporters.find((t) => String(t.id) === form.diesel_from_id)?.name || '—'
                          : 'Not set'}
                      </span>
                      {n(form.advance_diesel_amount) > 0 && !form.diesel_from_id && (
                        <p className="mt-1 text-amber-700 dark:text-amber-300">⚠ Pick the transporter in Trip Log to credit their ledger.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Additional Diesel */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-orange-500 mb-3">Additional Diesel (optional)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-heading/70 mb-1">Additional Diesel Amount (₹)</label>
                      <input type="number" min="0" step="0.01" className="input-field" value={form.trip_diesel_amount} onChange={f('trip_diesel_amount')} placeholder="0" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-heading/70 mb-1">From Transporter (optional)</label>
                      <select className="input-field" value={form.trip_diesel_from_id} onChange={(e) => setForm((p) => ({ ...p, trip_diesel_from_id: e.target.value }))}>
                        <option value="">Wallet-funded</option>
                        {transporters.map((t) => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
                      </select>
                      {n(form.trip_diesel_amount) > 0 && (
                        <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                          {form.trip_diesel_from_id
                            ? `${formatINR(n(form.trip_diesel_amount))} → ${transporters.find((t) => String(t.id) === form.trip_diesel_from_id)?.name || '—'}'s ledger`
                            : `${formatINR(n(form.trip_diesel_amount))} debits the wallet`}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Toll */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-orange-500 mb-3">Toll (FastTag-funded)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-heading/70 mb-1">Toll Expense (₹)</label>
                      <input type="number" min="0" step="0.01" className="input-field" value={form.toll_expense} onChange={f('toll_expense')} placeholder="0" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-heading/70 mb-1">Toll FastTag {n(form.toll_expense) > 0 ? '*' : ''}</label>
                      <select className="input-field" value={form.fastag_id} onChange={(e) => setForm((p) => ({ ...p, fastag_id: e.target.value }))}>
                        <option value="">{n(form.toll_expense) > 0 ? 'Select FastTag' : 'No toll'}</option>
                        {fastags.filter((ft) => ft.is_active === 1 || String(ft.id) === form.fastag_id).map((ft) => (
                          <option key={ft.id} value={ft.id}>{ft.name} — {formatINR(ft.balance)}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Odometer */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-orange-500 mb-3">Odometer</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-heading/70 mb-1">Odometer Start (km)</label>
                      <input type="number" min="0" className="input-field" value={form.odometer_start} onChange={f('odometer_start')} placeholder="0" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-heading/70 mb-1">Odometer End (km)</label>
                      <input type="number" min="0" className="input-field" value={form.odometer_end} onChange={f('odometer_end')} placeholder="0" />
                    </div>
                  </div>
                  {live.total_km > 0 && (
                    <p className="mt-2 text-xs text-heading/60">Distance: <strong className="text-orange-700 dark:text-orange-300">{live.total_km} km</strong></p>
                  )}
                </div>

                {/* Summary bar */}
                <div className="rounded-lg bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 px-3 py-2 text-xs flex flex-wrap gap-3">
                  <span><span className="text-heading/60">Wallet Outflow: </span><span className="font-semibold text-orange-700 dark:text-orange-300">{formatINR(live.wallet_expense)}</span></span>
                  <span><span className="text-heading/60">Toll (FastTag): </span><span className="font-semibold text-orange-700 dark:text-orange-300">{formatINR(n(form.toll_expense))}</span></span>
                  {n(form.advance_diesel_amount) > 0 && (
                    <span><span className="text-heading/60">Trip Diesel (Ledger): </span><span className="font-semibold text-orange-700 dark:text-orange-300">{formatINR(n(form.advance_diesel_amount))}</span></span>
                  )}
                  {live.tripDieselFromTransporter && (
                    <span><span className="text-heading/60">Add. Diesel (Ledger): </span><span className="font-semibold text-orange-700 dark:text-orange-300">{formatINR(live.diesel_amount)}</span></span>
                  )}
                  {(() => {
                    const projected = Number(target.total_freight)
                      - Number(target.transporter_commission || 0)
                      - n(form.advance_diesel_amount)
                      - n(form.toll_expense)
                      - n(form.loading_charge) - n(form.unloading_charge)
                      - live.diesel_amount - n(form.driver_payment) - miscTotal;
                    return (
                      <span><span className="text-heading/60">Projected Net Profit: </span><span className={`font-semibold ${projected >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{formatINR(projected)}</span></span>
                    );
                  })()}
                </div>

                <p className="text-[11px] text-heading/60">
                  Driver payment feeds the driver's ledger as earned. Toll comes off the FastTag. Trip diesel always posts to a transporter's ledger. Additional diesel is wallet-funded by default; pick a transporter to put it on their ledger instead.
                </p>
              </div>

              {(() => {
                const selectedFastag = fastags.find((ft) => String(ft.id) === form.fastag_id);
                const oldToll = target && Number(target.fastag_id) === selectedFastag?.id ? Number(target.toll_expense) || 0 : 0;
                const fastagShort = !!selectedFastag && n(form.toll_expense) > 0 && (selectedFastag.balance + oldToll) < n(form.toll_expense);
                const tollNeedsTag = n(form.toll_expense) > 0 && !form.fastag_id;
                const blockSave = walletShort || fastagShort || tollNeedsTag;
                return (
                  <>
                    {(walletShort || fastagShort || tollNeedsTag) && (
                      <div className="border-t border-amber-300 bg-amber-50 dark:bg-amber-900/30 px-5 py-3 text-xs text-amber-800 dark:text-amber-200 space-y-1">
                        {walletShort && (
                          <div>⚠ Wallet has only <strong>{formatINR(effectiveWallet)}</strong> — wallet outflow is <strong>{formatINR(live.wallet_expense)}</strong>. Top up the Wallet before saving.</div>
                        )}
                        {tollNeedsTag && (
                          <div>⚠ Toll is {formatINR(n(form.toll_expense))} but no FastTag is selected. Pick one to deduct from.</div>
                        )}
                        {fastagShort && selectedFastag && (
                          <div>⚠ {selectedFastag.name} has only <strong>{formatINR(selectedFastag.balance + oldToll)}</strong> — toll is <strong>{formatINR(n(form.toll_expense))}</strong>. Top up the FastTag or pick a different one.</div>
                        )}
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-3 border-t border-card-border px-5 py-4">
                      <span className="text-xs text-heading/60">
                        Wallet: <strong className={walletShort ? 'text-amber-700 dark:text-amber-300' : 'text-heading'}>{formatINR(effectiveWallet)}</strong>
                        {selectedFastag && <> · {selectedFastag.name}: <strong className={fastagShort ? 'text-amber-700 dark:text-amber-300' : 'text-heading'}>{formatINR(selectedFastag.balance + oldToll)}</strong></>}
                      </span>
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => setTarget(null)} className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-heading/80 hover:bg-surface">
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={save}
                          disabled={saving || blockSave}
                          title={blockSave ? 'Wallet or FastTag short' : undefined}
                          className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {saving ? 'Saving…' : target.expense_completed ? 'Update Expense' : 'File Expense'}
                        </button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
