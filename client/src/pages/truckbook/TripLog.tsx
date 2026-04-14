import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
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
  driver_payment: number;
  truck_id: number;
  driver_id: number | null;
  transporter_id: number | null;
  diesel_from_id: number | null;
  billed_party: string | null;
  freight_rate: number;
  loading_charge: number;
  unloading_charge: number;
  advance_litres: number;
  advance_rate: number;
  advance_deduction: number;
  toll_expense: number;
  diesel_litres: number;
  diesel_rate: number;
  transporter_commission: number;
  miscellaneous: number;
  odometer_start: number | null;
  odometer_end: number | null;
  total_km: number;
  remarks: string | null;
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
  advance_litres: '',
  advance_rate: '',
  toll_expense: '',
  loading_charge: '',
  unloading_charge: '',
  diesel_litres: '',
  diesel_rate: '',
  driver_payment: '',
  transporter_commission: '',
  miscellaneous: '',
  odometer_start: '',
  odometer_end: '',
  remarks: '',
};

function n(v: string) { return Number(v) || 0; }

function computeLive(form: typeof emptyForm) {
  const advance_deduction      = n(form.advance_litres) * n(form.advance_rate);
  const diesel_amount          = n(form.diesel_litres) * n(form.diesel_rate);
  const total_freight          = n(form.quantity) * n(form.freight_rate);
  const net_profit             = total_freight
    - n(form.loading_charge) - n(form.unloading_charge)
    - advance_deduction - n(form.toll_expense)
    - diesel_amount - n(form.driver_payment)
    - n(form.transporter_commission) - n(form.miscellaneous);
  const total_km = form.odometer_end && form.odometer_start
    ? n(form.odometer_end) - n(form.odometer_start) : 0;
  return { advance_deduction, diesel_amount, total_freight, net_profit, total_km };
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
      advance_litres: String(row.advance_litres || ''),
      advance_rate: String(row.advance_rate || ''),
      toll_expense: String(row.toll_expense || ''),
      loading_charge: String(row.loading_charge || ''),
      unloading_charge: String(row.unloading_charge || ''),
      diesel_litres: String(row.diesel_litres || ''),
      diesel_rate: String(row.diesel_rate || ''),
      driver_payment: String(row.driver_payment || ''),
      transporter_commission: String(row.transporter_commission || ''),
      miscellaneous: String(row.miscellaneous || ''),
      odometer_start: row.odometer_start ? String(row.odometer_start) : '',
      odometer_end: row.odometer_end ? String(row.odometer_end) : '',
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
        advance_litres: n(form.advance_litres),
        advance_rate: n(form.advance_rate),
        toll_expense: n(form.toll_expense),
        loading_charge: n(form.loading_charge),
        unloading_charge: n(form.unloading_charge),
        diesel_litres: n(form.diesel_litres),
        diesel_rate: n(form.diesel_rate),
        driver_payment: n(form.driver_payment),
        transporter_commission: n(form.transporter_commission),
        miscellaneous: n(form.miscellaneous),
        odometer_start: form.odometer_start ? n(form.odometer_start) : null,
        odometer_end: form.odometer_end ? n(form.odometer_end) : null,
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
    net_freight: acc.net_freight + Number(r.net_freight),
    net_profit: acc.net_profit + Number(r.net_profit),
  }), { quantity: 0, net_freight: 0, net_profit: 0 });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading">Trip Log</h1>
          <p className="text-sm text-gray-500 mt-1">{rows.length} trip{rows.length !== 1 ? 's' : ''} shown</p>
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
          <label className="text-sm font-medium text-gray-600 whitespace-nowrap">Truck:</label>
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
          <label className="text-sm font-medium text-gray-600 whitespace-nowrap">Month:</label>
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
            className="text-sm text-orange-600 hover:underline font-medium"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Summary Strip */}
      {rows.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-4 text-center border-orange-200 bg-orange-50">
            <p className="text-xs text-orange-600 font-medium uppercase tracking-wider">Total Qty</p>
            <p className="text-xl font-bold text-heading">{totalRow.quantity.toFixed(1)} T</p>
          </div>
          <div className="card p-4 text-center border-orange-200 bg-orange-50">
            <p className="text-xs text-orange-600 font-medium uppercase tracking-wider">Net Freight</p>
            <p className="text-xl font-bold text-heading">{formatINR(totalRow.net_freight)}</p>
          </div>
          <div className="card p-4 text-center border-orange-200 bg-orange-50">
            <p className="text-xs text-orange-600 font-medium uppercase tracking-wider">Net Profit</p>
            <p className={`text-xl font-bold ${totalRow.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
              <tr className="border-b border-card-border bg-orange-50 text-left">
                <th className="px-4 py-3 font-medium text-orange-700">Date</th>
                <th className="px-4 py-3 font-medium text-orange-700">Truck</th>
                <th className="px-4 py-3 font-medium text-orange-700">Driver</th>
                <th className="px-4 py-3 font-medium text-orange-700">Material</th>
                <th className="px-4 py-3 font-medium text-orange-700 text-right">Qty (T)</th>
                <th className="px-4 py-3 font-medium text-orange-700">Route</th>
                <th className="px-4 py-3 font-medium text-orange-700 text-right">Net Freight</th>
                <th className="px-4 py-3 font-medium text-orange-700 text-right">Net Profit</th>
                <th className="px-4 py-3 font-medium text-orange-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <p className="text-gray-400 mb-3">No trips found</p>
                    <button type="button" onClick={openAdd} className="text-orange-600 hover:underline text-sm font-medium">Log first trip</button>
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b border-card-border last:border-0 hover:bg-orange-50/40 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(row.date)}</td>
                    <td className="px-4 py-3 font-medium text-orange-600">{row.truck_number}</td>
                    <td className="px-4 py-3 text-gray-600">{row.driver_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{row.material_name || '—'}</td>
                    <td className="px-4 py-3 text-right">{row.quantity || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs max-w-[140px] truncate">
                      {row.load_from && row.billed_destination ? `${row.load_from} → ${row.billed_destination}` : row.load_from || row.billed_destination || '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{formatINR(Number(row.net_freight))}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${Number(row.net_profit) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatINR(Number(row.net_profit))}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => openEdit(row)} className="rounded p-1.5 text-gray-500 hover:bg-orange-100 hover:text-orange-600 transition-colors" title="Edit">
                          <Pencil className="h-4 w-4" />
                        </button>
                        {isAdmin() && (
                          <button type="button" onClick={() => handleDelete(row)} className="rounded p-1.5 text-red-500 hover:bg-red-50 transition-colors" title="Delete">
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

      {/* Modal — flat form, no accordions */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40">
          <div className="flex min-h-full items-start justify-center px-4 py-6">
            <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-card-border px-5 py-4">
                <h2 className="font-semibold text-heading">{editing ? 'Edit Trip' : 'Add Trip'}</h2>
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg p-1.5 hover:bg-gray-100 transition-colors">
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="p-5 flex flex-col gap-6">

                  {/* 1. Trip Info */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-orange-500 mb-3">Trip Info</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
                        <input type="date" className="input-field" value={form.date} onChange={f('date')} required />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Truck *</label>
                        <select className="input-field" value={form.truck_id} onChange={f('truck_id')} required>
                          <option value="">Select truck</option>
                          {trucks.map((t) => <option key={t.id} value={String(t.id)}>{t.truck_number}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Driver *</label>
                        <select className="input-field" value={form.driver_id} onChange={f('driver_id')} required>
                          <option value="">Select driver</option>
                          {drivers.map((d) => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Transporter *</label>
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
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Material *</label>
                        <input className="input-field" value={form.material_name} onChange={f('material_name')} placeholder="e.g. Cement" required />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Quantity (tons) *</label>
                        <input type="number" min="0" step="0.01" className="input-field" value={form.quantity} onChange={f('quantity')} placeholder="0" required />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Load From *</label>
                        <input className="input-field" value={form.load_from} onChange={f('load_from')} placeholder="Origin" required />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Billed Party *</label>
                        <input className="input-field" value={form.billed_party} onChange={f('billed_party')} placeholder="Party name" required />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Destination *</label>
                        <input className="input-field" value={form.billed_destination} onChange={f('billed_destination')} placeholder="Destination" required />
                      </div>
                    </div>
                  </div>

                  {/* 3. Freight */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-orange-500 mb-3">Freight</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Freight Rate (₹/ton) *</label>
                        <input type="number" min="0" step="0.01" className="input-field" value={form.freight_rate} onChange={f('freight_rate')} placeholder="0" required />
                      </div>
                      <div className="flex items-end">
                        <div className="rounded-lg bg-orange-50 border border-orange-200 px-3 py-2 text-xs w-full">
                          <span className="text-gray-500">Total Freight </span>
                          <span className="text-orange-600 text-[10px]">({n(form.quantity)} × {n(form.freight_rate)})</span>
                          <p className="font-bold text-orange-700 text-sm mt-0.5">{formatINR(live.total_freight)}</p>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Advance Diesel (Ltrs) *</label>
                        <input type="number" min="0" step="0.01" className="input-field" value={form.advance_litres} onChange={f('advance_litres')} placeholder="0" required />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Advance Rate (₹/L) *</label>
                        <input type="number" min="0" step="0.01" className="input-field" value={form.advance_rate} onChange={f('advance_rate')} placeholder="0" required />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Diesel From (Transporter) *</label>
                        <select className="input-field" value={form.diesel_from_id} onChange={f('diesel_from_id')} required>
                          <option value="">Select transporter who provided diesel</option>
                          {transporters.map((t) => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
                        </select>
                        {live.advance_deduction > 0 && (
                          <p className="text-xs text-orange-600 mt-1">
                            Advance deduction: {formatINR(live.advance_deduction)} → goes to {transporters.find(t => String(t.id) === form.diesel_from_id)?.name || '—'}'s ledger
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Toll Expense (₹) *</label>
                        <input type="number" min="0" step="0.01" className="input-field" value={form.toll_expense} onChange={f('toll_expense')} placeholder="0" required />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Transporter Commission (₹) *</label>
                        <input type="number" min="0" step="0.01" className="input-field" value={form.transporter_commission} onChange={f('transporter_commission')} placeholder="0" required />
                      </div>
                    </div>
                  </div>

                  {/* 4. Trip Costs */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-orange-500 mb-3">Trip Costs</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Loading Charge (₹) *</label>
                        <input type="number" min="0" step="0.01" className="input-field" value={form.loading_charge} onChange={f('loading_charge')} placeholder="0" required />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Unloading Charge (₹) *</label>
                        <input type="number" min="0" step="0.01" className="input-field" value={form.unloading_charge} onChange={f('unloading_charge')} placeholder="0" required />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Diesel Litres *</label>
                        <input type="number" min="0" step="0.01" className="input-field" value={form.diesel_litres} onChange={f('diesel_litres')} placeholder="0" required />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Diesel Rate (₹/L) *</label>
                        <input type="number" min="0" step="0.01" className="input-field" value={form.diesel_rate} onChange={f('diesel_rate')} placeholder="0" required />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Driver Payment (₹) *</label>
                        <input type="number" min="0" step="0.01" className="input-field" value={form.driver_payment} onChange={f('driver_payment')} placeholder="0" required />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Miscellaneous (₹) *</label>
                        <input type="number" min="0" step="0.01" className="input-field" value={form.miscellaneous} onChange={f('miscellaneous')} placeholder="0" required />
                      </div>
                      <div className="col-span-2 rounded-lg bg-orange-50 border border-orange-200 px-3 py-2 text-xs flex flex-wrap gap-3">
                        <span><span className="text-gray-500">Trip Diesel: </span><span className="font-semibold text-orange-700">{formatINR(live.diesel_amount)}</span></span>
                        <span><span className="text-gray-500">Adv Diesel: </span><span className="font-semibold text-orange-700">{formatINR(live.advance_deduction)}</span></span>
                        <span><span className="text-gray-500">Total Diesel: </span><span className="font-semibold text-orange-700">{formatINR(live.diesel_amount + live.advance_deduction)}</span></span>
                      </div>
                    </div>
                  </div>

                  {/* 5. Odometer & Remarks */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-orange-500 mb-3">Odometer & Remarks</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Odometer Start (km) *</label>
                        <input type="number" min="0" className="input-field" value={form.odometer_start} onChange={f('odometer_start')} placeholder="0" required />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Odometer End (km) *</label>
                        <input type="number" min="0" className="input-field" value={form.odometer_end} onChange={f('odometer_end')} placeholder="0" required />
                      </div>
                      {live.total_km > 0 && (
                        <div className="col-span-2 rounded-lg bg-orange-50 border border-orange-200 px-3 py-2 text-xs">
                          <span className="text-gray-500">Distance: </span>
                          <span className="font-semibold text-orange-700">{live.total_km} km</span>
                        </div>
                      )}
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Remarks</label>
                        <textarea className="input-field resize-none" rows={2} value={form.remarks} onChange={f('remarks')} placeholder="Optional notes" />
                      </div>
                    </div>
                  </div>

                  {/* Live Summary */}
                  <div className="rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 p-4 text-white">
                    <p className="text-xs font-semibold uppercase tracking-wider mb-3 opacity-80">Live Summary</p>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div className="bg-white/10 rounded-lg p-2">
                        <p className="text-xs opacity-70">Total Freight</p>
                        <p className="font-bold">{formatINR(live.total_freight)}</p>
                      </div>
                      <div className="bg-white/10 rounded-lg p-2">
                        <p className="text-xs opacity-70">Loading + Unloading</p>
                        <p className="font-bold">−{formatINR(n(form.loading_charge) + n(form.unloading_charge))}</p>
                      </div>
                      <div className="bg-white/10 rounded-lg p-2">
                        <p className="text-xs opacity-70">Advance Diesel</p>
                        <p className="font-bold">−{formatINR(live.advance_deduction)}</p>
                      </div>
                      <div className="bg-white/10 rounded-lg p-2">
                        <p className="text-xs opacity-70">Trip Diesel</p>
                        <p className="font-bold">−{formatINR(live.diesel_amount)}</p>
                      </div>
                      <div className="bg-white/10 rounded-lg p-2">
                        <p className="text-xs opacity-70">Driver + Misc</p>
                        <p className="font-bold">−{formatINR(n(form.driver_payment) + n(form.miscellaneous))}</p>
                      </div>
                      <div className="bg-white/10 rounded-lg p-2">
                        <p className="text-xs opacity-70">Toll + Commission</p>
                        <p className="font-bold">−{formatINR(n(form.toll_expense) + n(form.transporter_commission))}</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/20 flex items-center justify-between">
                      <span className="text-sm font-medium">Net Profit</span>
                      <span className={`text-xl font-bold ${live.net_profit >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                        {formatINR(live.net_profit)}
                      </span>
                    </div>
                  </div>

                </div>

                <div className="flex justify-end gap-3 border-t border-card-border px-5 py-4">
                  <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600 disabled:opacity-60 transition-colors">
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
