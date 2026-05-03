import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, IndianRupee } from 'lucide-react';
import { api } from '../../lib/api';
import { formatINR, formatDate } from '../../lib/format';
import { useToastStore, useAuthStore } from '../../lib/store';

interface TripRow {
  id: number;
  date: string;
  truck_number: string;
  driver_name: string | null;
  transporter_name: string | null;
  diesel_from_name: string | null;
  material_name: string | null;
  quantity: number;
  load_from: string | null;
  billed_destination: string | null;
  net_freight: number;
  net_profit: number;
  total_freight: number;
  diesel_amount: number;
  truck_id: number;
  driver_id: number | null;
  transporter_id: number | null;
  diesel_from_id: number | null;
  billed_party: string | null;
  freight_rate: number;
  advance_deduction: number;
  toll_expense: number;
  transporter_commission: number;
  odometer_start: number | null;
  odometer_end: number | null;
  total_km: number;
  remarks: string | null;
  expense_completed: boolean;
}

interface Truck { id: number; truck_number: string; }
interface Driver { id: number; name: string; }
interface Transporter { id: number; name: string; }

const emptyForm = {
  date: new Date().toISOString().split('T')[0],
  truck_id: '',
  driver_id: '',
  transporter_id: '',
  diesel_from_id: '',
  material_name: '',
  quantity: '',
  load_from: '',
  billed_party: '',
  billed_destination: '',
  freight_rate: '',
  advance_diesel_amount: '',
  transporter_commission: '',
  remarks: '',
};

function n(v: string) { return Number(v) || 0; }

function computeLive(form: typeof emptyForm) {
  const advance_deduction = n(form.advance_diesel_amount);
  const total_freight     = n(form.quantity) * n(form.freight_rate);
  // Net Freight = freight side only — toll, odometer and trip expenses live in Trip Expenses.
  const net_freight       = total_freight - n(form.transporter_commission) - advance_deduction;
  return { advance_deduction, total_freight, net_freight };
}

export default function TripLog() {
  const addToast = useToastStore((s) => s.addToast);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const [rows, setRows] = useState<TripRow[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TripRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterTruck, setFilterTruck] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [freightTarget, setFreightTarget] = useState<TripRow | null>(null);
  const [freightForm, setFreightForm] = useState({ freight_rate: '', quantity: '' });
  const [savingFreight, setSavingFreight] = useState(false);

  const live = computeLive(form);

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
      const [t, d, tp] = await Promise.all([api.trucks.list(), api.drivers.list(), api.transporters.list()]);
      setTrucks(t);
      setDrivers(d);
      setTransporters(tp);
    } catch (_) {}
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadMeta(); }, [loadMeta]);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };

  const openEdit = (row: TripRow) => {
    setEditing(row);
    setForm({
      date: row.date,
      truck_id: String(row.truck_id),
      driver_id: row.driver_id ? String(row.driver_id) : '',
      transporter_id: row.transporter_id ? String(row.transporter_id) : '',
      diesel_from_id: row.diesel_from_id ? String(row.diesel_from_id) : '',
      material_name: row.material_name || '',
      quantity: String(row.quantity || ''),
      load_from: row.load_from || '',
      billed_party: row.billed_party || '',
      billed_destination: row.billed_destination || '',
      freight_rate: String(row.freight_rate || ''),
      advance_diesel_amount: String(row.advance_deduction || ''),
      transporter_commission: String(row.transporter_commission || ''),
      remarks: row.remarks || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        date: form.date,
        truck_id: Number(form.truck_id),
        driver_id: form.driver_id ? Number(form.driver_id) : null,
        transporter_id: form.transporter_id ? Number(form.transporter_id) : null,
        diesel_from_id: form.diesel_from_id ? Number(form.diesel_from_id) : null,
        material_name: form.material_name || null,
        quantity: n(form.quantity),
        load_from: form.load_from || null,
        billed_party: form.billed_party || null,
        billed_destination: form.billed_destination || null,
        freight_rate: n(form.freight_rate),
        advance_diesel_amount: n(form.advance_diesel_amount),
        transporter_commission: n(form.transporter_commission),
        remarks: form.remarks || null,
      };
      if (editing) { await api.truckTrips.update(editing.id, payload); addToast('Trip updated', 'success'); }
      else { await api.truckTrips.create(payload); addToast('Trip added', 'success'); }
      setModalOpen(false);
      load();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally { setSaving(false); }
  };

  const openFreight = (row: TripRow) => {
    setFreightTarget(row);
    setFreightForm({
      freight_rate: row.freight_rate ? String(row.freight_rate) : '',
      quantity: row.quantity ? String(row.quantity) : '',
    });
  };

  const saveFreight = async () => {
    if (!freightTarget) return;
    const rate = Number(freightForm.freight_rate);
    if (!Number.isFinite(rate) || rate <= 0) {
      addToast('Enter a valid freight rate', 'error'); return;
    }
    const qty = freightForm.quantity ? Number(freightForm.quantity) : undefined;
    if (qty !== undefined && (!Number.isFinite(qty) || qty < 0)) {
      addToast('Enter a valid quantity', 'error'); return;
    }
    setSavingFreight(true);
    try {
      await api.truckTrips.updateFreight(freightTarget.id, { freight_rate: rate, ...(qty !== undefined ? { quantity: qty } : {}) });
      addToast('Freight updated', 'success');
      setFreightTarget(null);
      load();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Update failed', 'error');
    } finally { setSavingFreight(false); }
  };

  const handleDelete = async (row: TripRow) => {
    if (!window.confirm(`Delete trip on ${formatDate(row.date)} for ${row.truck_number}?`)) return;
    try {
      await api.truckTrips.delete(row.id);
      addToast('Trip deleted', 'success');
      load();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Delete failed', 'error');
    }
  };

  const f = (field: keyof typeof emptyForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const totalRow = rows.reduce((acc, r) => ({
    quantity: acc.quantity + Number(r.quantity),
    total_freight: acc.total_freight + Number(r.total_freight),
    net_profit: acc.net_profit + Number(r.net_profit),
    total_fuel: acc.total_fuel + Number(r.diesel_amount),
    total_toll: acc.total_toll + Number(r.toll_expense),
  }), { quantity: 0, total_freight: 0, net_profit: 0, total_fuel: 0, total_toll: 0 });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading">Trip Log</h1>
          <p className="text-sm text-heading/60 mt-1">{rows.length} trip{rows.length !== 1 ? 's' : ''} shown</p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-orange-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Trip
        </button>
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap gap-4 p-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-heading/70 whitespace-nowrap">Truck:</label>
          <select
            className="input-field py-1.5 text-sm min-w-[140px]"
            value={filterTruck}
            onChange={(e) => setFilterTruck(e.target.value)}
          >
            <option value="">All Trucks</option>
            {trucks.map((t) => (
              <option key={t.id} value={String(t.id)}>{t.truck_number}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-heading/70 whitespace-nowrap">Month:</label>
          <input
            type="month"
            className="input-field py-1.5 text-sm"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
          />
        </div>
        {(filterTruck || filterMonth) && (
          <button
            type="button"
            onClick={() => { setFilterTruck(''); setFilterMonth(''); }}
            className="text-sm text-orange-600 dark:text-orange-400 hover:underline font-medium"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Summary Strip */}
      {rows.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:grid-cols-5">
          <div className="card p-4 text-center border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/30">
            <p className="text-xs text-orange-600 dark:text-orange-400 font-medium uppercase tracking-wider">Total Qty</p>
            <p className="text-xl font-bold text-heading">{totalRow.quantity.toFixed(1)} T</p>
          </div>
          <div className="card p-4 text-center border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/30">
            <p className="text-xs text-orange-600 dark:text-orange-400 font-medium uppercase tracking-wider">Total Freight</p>
            <p className="text-xl font-bold text-heading">{formatINR(totalRow.total_freight)}</p>
          </div>
          <div className="card p-4 text-center border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/30">
            <p className="text-xs text-orange-600 dark:text-orange-400 font-medium uppercase tracking-wider">Total Fuel</p>
            <p className="text-xl font-bold text-red-600 dark:text-red-400">{formatINR(totalRow.total_fuel)}</p>
          </div>
          <div className="card p-4 text-center border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/30">
            <p className="text-xs text-orange-600 dark:text-orange-400 font-medium uppercase tracking-wider">Total Toll</p>
            <p className="text-xl font-bold text-red-600 dark:text-red-400">{formatINR(totalRow.total_toll)}</p>
          </div>
          <div className="card p-4 text-center border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/30">
            <p className="text-xs text-orange-600 dark:text-orange-400 font-medium uppercase tracking-wider">Net Profit</p>
            <p className={`text-xl font-bold ${totalRow.net_profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatINR(totalRow.net_profit)}
            </p>
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
                <th className="px-4 py-3 font-medium text-orange-700 dark:text-orange-300">Material</th>
                <th className="px-4 py-3 font-medium text-orange-700 dark:text-orange-300 text-right">Qty (T)</th>
                <th className="px-4 py-3 font-medium text-orange-700 dark:text-orange-300">Route</th>
                <th className="px-4 py-3 font-medium text-orange-700 dark:text-orange-300 text-right">Total Freight</th>
                <th className="px-4 py-3 font-medium text-orange-700 dark:text-orange-300 text-right">Net Profit</th>
                <th className="px-4 py-3 font-medium text-orange-700 dark:text-orange-300">Expenses</th>
                <th className="px-4 py-3 font-medium text-orange-700 dark:text-orange-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-heading/50">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center">
                    <p className="text-heading/50 mb-3">No trips found</p>
                    <button type="button" onClick={openAdd} className="text-orange-600 dark:text-orange-400 hover:underline text-sm font-medium">Log first trip</button>
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b border-card-border last:border-0 hover:bg-orange-50/40 dark:hover:bg-orange-900/30 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(row.date)}</td>
                    <td className="px-4 py-3 font-medium text-orange-600 dark:text-orange-400">{row.truck_number}</td>
                    <td className="px-4 py-3 text-heading/70">{row.driver_name || '—'}</td>
                    <td className="px-4 py-3 text-heading/70">{row.material_name || '—'}</td>
                    <td className="px-4 py-3 text-right">{row.quantity || '—'}</td>
                    <td className="px-4 py-3 text-heading/70 text-xs max-w-[140px] truncate">
                      {row.load_from && row.billed_destination ? `${row.load_from} → ${row.billed_destination}` : row.load_from || row.billed_destination || '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {Number(row.freight_rate) > 0 ? (
                        formatINR(Number(row.total_freight))
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-heading/40">—</span>
                          <button
                            type="button"
                            onClick={() => openFreight(row)}
                            className="inline-flex items-center gap-1 rounded-md border border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/30 px-2 py-0.5 text-[11px] font-medium text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/50"
                            title="Set freight rate"
                          >
                            <IndianRupee className="h-3 w-3" /> Set
                          </button>
                        </div>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold ${Number(row.net_profit) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatINR(Number(row.net_profit))}
                    </td>
                    <td className="px-4 py-3">
                      {row.expense_completed ? (
                        <span className="inline-flex items-center rounded-full bg-green-50 dark:bg-green-900/30 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:text-green-300">
                          Filed
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {Number(row.freight_rate) > 0 && (
                          <button type="button" onClick={() => openFreight(row)} className="rounded p-1.5 text-heading/60 hover:bg-orange-100 dark:hover:bg-orange-900/40 hover:text-orange-600 dark:text-orange-400 transition-colors" title="Update freight rate">
                            <IndianRupee className="h-4 w-4" />
                          </button>
                        )}
                        <button type="button" onClick={() => openEdit(row)} className="rounded p-1.5 text-heading/60 hover:bg-orange-100 dark:hover:bg-orange-900/40 hover:text-orange-600 dark:text-orange-400 transition-colors" title="Edit">
                          <Pencil className="h-4 w-4" />
                        </button>
                        {isAdmin() && (
                          <button type="button" onClick={() => handleDelete(row)} className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors" title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Set / Update Freight — small focused modal scoped to freight rate + qty.
          Re-runs the wallet pre-flight on the server side. */}
      {freightTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-xl">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-base font-semibold text-heading">
                  {Number(freightTarget.freight_rate) > 0 ? 'Update Freight' : 'Set Freight'}
                </h3>
                <p className="mt-0.5 text-xs text-heading/60">
                  {freightTarget.truck_number} · {formatDate(freightTarget.date)}
                </p>
              </div>
              <button type="button" onClick={() => setFreightTarget(null)} className="rounded-lg p-1.5 hover:bg-card-border/50">
                <X className="h-5 w-5 text-heading/60" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-heading/70">Quantity (tons)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="input-field w-full"
                    value={freightForm.quantity}
                    onChange={(e) => setFreightForm((p) => ({ ...p, quantity: e.target.value }))}
                    placeholder={String(freightTarget.quantity || 0)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-heading/70">Freight Rate (₹/ton) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="input-field w-full"
                    value={freightForm.freight_rate}
                    onChange={(e) => setFreightForm((p) => ({ ...p, freight_rate: e.target.value }))}
                    placeholder="0"
                    autoFocus
                  />
                </div>
              </div>
              <div className="rounded-lg bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 px-3 py-2 text-xs">
                <span className="text-heading/60">New Total Freight: </span>
                <span className="font-bold text-orange-700 dark:text-orange-300">
                  {formatINR((Number(freightForm.quantity) || Number(freightTarget.quantity) || 0) * (Number(freightForm.freight_rate) || 0))}
                </span>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2 border-t border-card-border pt-4">
              <button type="button" onClick={() => setFreightTarget(null)} className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-heading/80 hover:bg-surface">
                Cancel
              </button>
              <button
                type="button"
                onClick={saveFreight}
                disabled={savingFreight}
                className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
              >
                {savingFreight ? 'Saving…' : 'Save Freight'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — flat form, no accordions */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40">
          <div className="flex min-h-full items-start justify-center px-4 py-6">
            <div className="w-full max-w-2xl rounded-xl bg-card shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-card-border px-5 py-4">
                <h2 className="font-semibold text-heading">{editing ? 'Edit Trip' : 'Add Trip'}</h2>
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg p-1.5 hover:bg-card-border/50 transition-colors">
                  <X className="h-5 w-5 text-heading/60" />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="p-5 flex flex-col gap-6">

                  {/* 1. Trip Info */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-orange-500 mb-3">Trip Info</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-heading/70 mb-1">Date *</label>
                        <input type="date" className="input-field" value={form.date} onChange={f('date')} required />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-heading/70 mb-1">Truck *</label>
                        <select className="input-field" value={form.truck_id} onChange={f('truck_id')} required>
                          <option value="">Select truck</option>
                          {trucks.map((t) => <option key={t.id} value={String(t.id)}>{t.truck_number}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-heading/70 mb-1">Driver *</label>
                        <select className="input-field" value={form.driver_id} onChange={f('driver_id')} required>
                          <option value="">Select driver</option>
                          {drivers.map((d) => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-heading/70 mb-1">Transporter *</label>
                        <select className="input-field" value={form.transporter_id} onChange={f('transporter_id')} required>
                          <option value="">Select transporter</option>
                          {transporters.map((t) => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* 2. Loading Details */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-orange-500 mb-3">Loading Details</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-heading/70 mb-1">Material *</label>
                        <input className="input-field" value={form.material_name} onChange={f('material_name')} placeholder="e.g. Cement" required />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-heading/70 mb-1">Quantity (tons) *</label>
                        <input type="number" min="0" step="0.01" className="input-field" value={form.quantity} onChange={f('quantity')} placeholder="0" required />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-heading/70 mb-1">Load From *</label>
                        <input className="input-field" value={form.load_from} onChange={f('load_from')} placeholder="Origin" required />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-heading/70 mb-1">Billed Party *</label>
                        <input className="input-field" value={form.billed_party} onChange={f('billed_party')} placeholder="Party name" required />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-heading/70 mb-1">Destination *</label>
                        <input className="input-field" value={form.billed_destination} onChange={f('billed_destination')} placeholder="Destination" required />
                      </div>
                    </div>
                  </div>

                  {/* 3. Freight */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-orange-500 mb-3">Freight</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-heading/70 mb-1">Freight Rate (₹/ton)</label>
                        <input type="number" min="0" step="0.01" className="input-field" value={form.freight_rate} onChange={f('freight_rate')} placeholder="0 — fill later if not yet locked" />
                      </div>
                      <div className="flex items-end">
                        <div className="rounded-lg bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 px-3 py-2 text-xs w-full">
                          <span className="text-heading/60">Total Freight </span>
                          <span className="text-orange-600 dark:text-orange-400 text-[10px]">({n(form.quantity)} × {n(form.freight_rate)})</span>
                          <p className="font-bold text-orange-700 dark:text-orange-300 text-sm mt-0.5">{formatINR(live.total_freight)}</p>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-heading/70 mb-1">Advance Diesel Amount (₹)</label>
                        <input type="number" min="0" step="0.01" className="input-field" value={form.advance_diesel_amount} onChange={f('advance_diesel_amount')} placeholder="0 — optional, can be filed later" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-heading/70 mb-1">Diesel From (Transporter) {live.advance_deduction > 0 ? '*' : ''}</label>
                        <select className="input-field" value={form.diesel_from_id} onChange={f('diesel_from_id')} required={live.advance_deduction > 0}>
                          <option value="">{live.advance_deduction > 0 ? 'Select transporter' : 'No advance diesel'}</option>
                          {transporters.map((t) => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
                        </select>
                        {live.advance_deduction > 0 && (
                          <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                            Advance deduction: {formatINR(live.advance_deduction)} → goes to {transporters.find(t => String(t.id) === form.diesel_from_id)?.name || '—'}'s ledger
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-heading/70 mb-1">Transporter Commission (₹) *</label>
                        <input type="number" min="0" step="0.01" className="input-field" value={form.transporter_commission} onChange={f('transporter_commission')} placeholder="0" required />
                      </div>
                    </div>
                  </div>

                  {/* 4. Remarks */}
                  <div>
                    <label className="block text-xs font-medium text-heading/70 mb-1">Remarks</label>
                    <textarea className="input-field resize-none" rows={2} value={form.remarks} onChange={f('remarks')} placeholder="Optional notes" />
                  </div>

                  {/* Live Summary — freight side only. Toll, odometer & trip expenses are filed in the Trip Expenses tab. */}
                  <div className="rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 p-4 text-white">
                    <p className="text-xs font-semibold uppercase tracking-wider mb-3 opacity-80">Live Summary</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-card/10 rounded-lg p-2">
                        <p className="text-xs opacity-70">Total Freight</p>
                        <p className="font-bold">{formatINR(live.total_freight)}</p>
                      </div>
                      <div className="bg-card/10 rounded-lg p-2">
                        <p className="text-xs opacity-70">Transporter Commission</p>
                        <p className="font-bold">−{formatINR(n(form.transporter_commission))}</p>
                      </div>
                      <div className="bg-card/10 rounded-lg p-2 col-span-2">
                        <p className="text-xs opacity-70">Adv Diesel (Transporter Ledger)</p>
                        <p className="font-bold text-yellow-200">−{formatINR(live.advance_deduction)}</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/20 flex items-center justify-between">
                      <span className="text-sm font-medium">Net Freight</span>
                      <span className={`text-xl font-bold ${live.net_freight >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                        {formatINR(live.net_freight)}
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] opacity-80">Toll (FastTag), odometer and trip expenses (loading, unloading, diesel, driver, misc — wallet) are filed in the Trip Expenses tab.</p>
                  </div>

                </div>

                <div className="flex items-center justify-end gap-3 border-t border-card-border px-5 py-4">
                  <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-heading/80 hover:bg-surface transition-colors">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving ? 'Saving…' : editing ? 'Update Trip' : 'Add Trip'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
