import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { api } from '../../lib/api';
import { formatINR, formatDate } from '../../lib/format';
import { useToastStore, useAuthStore } from '../../lib/store';

interface TripRow {
  id: number;
  date: string;
  builty_number: string | null;
  do_number: string | null;
  truck_owner_id: number;
  truck_number: string;
  owner_name: string;
  driver_name: string | null;
  party_name: string;
  location: string | null;
  dch_type: string | null;
  material_type: string | null;
  qty: number;
  acc_freight_rate: number;
  commission_pct: number;
  diesel_advance: number;
  cash_advance: number;
  acc_amount: number;
  commission_amount: number;
  builty_charge: number;
  handling_rate: number;
  handling_charge: number;
  bill_amount: number;
  final_payment: number;
  petrol_slip_number: string | null;
  epod_bill_number: string | null;
  difference_rate: number;
  remarks: string | null;
}

interface OwnerOption { id: number; truck_number: string; owner_name: string; }

const emptyForm = {
  date: new Date().toISOString().split('T')[0],
  builty_number: '',
  do_number: '',
  truck_owner_id: '',
  party_name: '',
  location: '',
  dch_type: '',
  material_type: '',
  qty: '',
  acc_freight_rate: '',
  commission_pct: '6.29',
  diesel_advance: '',
  cash_advance: '',
  petrol_slip_number: '',
  epod_bill_number: '',
  difference_rate: '',
  remarks: '',
};

const DCH_TYPES = ['IT', 'DC', 'DE', 'IS'];
const MATERIAL_TYPES = ['Non-Trade', 'SOW', 'Normal'];

interface RateSettings {
  handling_non_trade: number;
  handling_sow: number;
  bilty_per_mt: number;
}

const DEFAULT_RATES: RateSettings = {
  handling_non_trade: 17,
  handling_sow: 17,
  bilty_per_mt: 10,
};

function n(v: string) { return Number(v) || 0; }

function handlingRate(materialType: string, rates: RateSettings): number {
  if (materialType === 'Non-Trade') return rates.handling_non_trade;
  if (materialType === 'SOW') return rates.handling_sow;
  return 0;
}

function computeLive(form: typeof emptyForm, rates: RateSettings) {
  const qty = n(form.qty);
  const accFreightRate = n(form.acc_freight_rate);
  const commissionPct = n(form.commission_pct);
  const dieselAdvance = n(form.diesel_advance);
  const cashAdvance = n(form.cash_advance);

  const acc_amount = qty * accFreightRate;
  const commission_amount = acc_amount * commissionPct / 100;
  const builty_charge = qty * rates.bilty_per_mt;
  const handling_charge = qty * handlingRate(form.material_type, rates);
  const bill_amount = acc_amount + handling_charge;
  const final_payment = acc_amount - commission_amount - builty_charge - dieselAdvance - cashAdvance;

  return { acc_amount, commission_amount, builty_charge, handling_charge, bill_amount, final_payment };
}

export default function TransportTrips() {
  const addToast = useToastStore((s) => s.addToast);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const [rows, setRows] = useState<TripRow[]>([]);
  const [owners, setOwners] = useState<OwnerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TripRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterOwner, setFilterOwner] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [rates, setRates] = useState<RateSettings>(DEFAULT_RATES);

  const live = computeLive(form, rates);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterOwner) params.truck_owner_id = filterOwner;
      if (filterMonth) params.month = filterMonth;
      const data = await api.rlTrips.list(Object.keys(params).length ? params : undefined);
      setRows(data);
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to load trips', 'error');
    } finally { setLoading(false); }
  }, [addToast, filterOwner, filterMonth]);

  const loadOwners = useCallback(async () => {
    try {
      const data = await api.rlTruckOwners.list();
      setOwners(data);
    } catch (_) {}
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadOwners(); }, [loadOwners]);
  useEffect(() => {
    api.settings.list()
      .then((s) => setRates({
        handling_non_trade: Number(s.handling_non_trade_per_mt) || DEFAULT_RATES.handling_non_trade,
        handling_sow: Number(s.handling_sow_per_mt) || DEFAULT_RATES.handling_sow,
        bilty_per_mt: Number(s.bilty_per_mt) || DEFAULT_RATES.bilty_per_mt,
      }))
      .catch(() => {});
  }, []);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };

  const openEdit = (row: TripRow) => {
    setEditing(row);
    setForm({
      date: row.date,
      builty_number: row.builty_number || '',
      do_number: row.do_number || '',
      truck_owner_id: String(row.truck_owner_id),
      party_name: row.party_name,
      location: row.location || '',
      dch_type: row.dch_type || '',
      material_type: row.material_type || '',
      qty: String(row.qty || ''),
      acc_freight_rate: String(row.acc_freight_rate || ''),
      commission_pct: String(row.commission_pct ?? 6.29),
      diesel_advance: String(row.diesel_advance || ''),
      cash_advance: String(row.cash_advance || ''),
      petrol_slip_number: row.petrol_slip_number || '',
      epod_bill_number: row.epod_bill_number || '',
      difference_rate: String(row.difference_rate || ''),
      remarks: row.remarks || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.truck_owner_id) { addToast('Select a truck owner', 'error'); return; }
    if (!form.party_name.trim()) { addToast('Party name is required', 'error'); return; }
    setSaving(true);
    try {
      const payload = {
        date: form.date,
        builty_number: form.builty_number || null,
        do_number: form.do_number || null,
        truck_owner_id: Number(form.truck_owner_id),
        party_name: form.party_name.trim(),
        location: form.location || null,
        dch_type: form.dch_type || null,
        material_type: form.material_type || null,
        qty: n(form.qty),
        acc_freight_rate: n(form.acc_freight_rate),
        commission_pct: n(form.commission_pct) || 6.29,
        diesel_advance: n(form.diesel_advance),
        cash_advance: n(form.cash_advance),
        petrol_slip_number: form.petrol_slip_number || null,
        epod_bill_number: form.epod_bill_number || null,
        difference_rate: n(form.difference_rate),
        remarks: form.remarks || null,
      };
      if (editing) {
        await api.rlTrips.update(editing.id, payload);
        addToast('Trip updated', 'success');
      } else {
        await api.rlTrips.create(payload);
        addToast('Trip added', 'success');
      }
      setModalOpen(false);
      load();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async (row: TripRow) => {
    if (!window.confirm(`Delete trip for ${row.truck_number} on ${formatDate(row.date)}?`)) return;
    try {
      await api.rlTrips.delete(row.id);
      addToast('Trip deleted', 'success');
      load();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Delete failed', 'error');
    }
  };

  const f = (field: keyof typeof emptyForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const totals = rows.reduce(
    (acc, r) => ({
      qty: acc.qty + Number(r.qty),
      acc_amount: acc.acc_amount + Number(r.acc_amount),
      commission_amount: acc.commission_amount + Number(r.commission_amount),
      diesel_advance: acc.diesel_advance + Number(r.diesel_advance),
      cash_advance: acc.cash_advance + Number(r.cash_advance),
      final_payment: acc.final_payment + Number(r.final_payment),
    }),
    { qty: 0, acc_amount: 0, commission_amount: 0, diesel_advance: 0, cash_advance: 0, final_payment: 0 }
  );

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
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-600 transition-colors"
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
            className="input-field py-1.5 text-sm min-w-[160px]"
            value={filterOwner}
            onChange={(e) => setFilterOwner(e.target.value)}
          >
            <option value="">All Trucks</option>
            {owners.map((o) => (
              <option key={o.id} value={String(o.id)}>{o.truck_number} — {o.owner_name}</option>
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
        {(filterOwner || filterMonth) && (
          <button
            type="button"
            onClick={() => { setFilterOwner(''); setFilterMonth(''); }}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Summary Strip */}
      {rows.length > 0 && (
        <div className="grid grid-cols-3 gap-4 lg:grid-cols-6">
          <div className="card p-3 text-center border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/30">
            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">Total Qty</p>
            <p className="text-lg font-bold text-heading">{totals.qty.toFixed(2)} T</p>
          </div>
          <div className="card p-3 text-center border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/30">
            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">ACC Amount</p>
            <p className="text-lg font-bold text-heading">{formatINR(totals.acc_amount)}</p>
          </div>
          <div className="card p-3 text-center border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30">
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Commission</p>
            <p className="text-lg font-bold text-heading">{formatINR(totals.commission_amount)}</p>
          </div>
          <div className="card p-3 text-center border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30">
            <p className="text-xs text-red-600 dark:text-red-400 font-medium">Diesel Adv</p>
            <p className="text-lg font-bold text-heading">{formatINR(totals.diesel_advance)}</p>
          </div>
          <div className="card p-3 text-center border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30">
            <p className="text-xs text-red-600 dark:text-red-400 font-medium">Cash Adv</p>
            <p className="text-lg font-bold text-heading">{formatINR(totals.cash_advance)}</p>
          </div>
          <div className="card p-3 text-center border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/30">
            <p className="text-xs text-green-600 dark:text-green-400 font-medium">Final Pay</p>
            <p className="text-lg font-bold text-heading">{formatINR(totals.final_payment)}</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-card-border bg-indigo-50 dark:bg-indigo-900/30 text-left">
                <th className="px-3 py-3 font-medium text-indigo-700 dark:text-indigo-300">Date</th>
                <th className="px-3 py-3 font-medium text-indigo-700 dark:text-indigo-300">Builty#</th>
                <th className="px-3 py-3 font-medium text-indigo-700 dark:text-indigo-300">Truck</th>
                <th className="px-3 py-3 font-medium text-indigo-700 dark:text-indigo-300">Party</th>
                <th className="px-3 py-3 font-medium text-indigo-700 dark:text-indigo-300">DCH</th>
                <th className="px-3 py-3 font-medium text-indigo-700 dark:text-indigo-300">Material</th>
                <th className="px-3 py-3 font-medium text-indigo-700 dark:text-indigo-300 text-right">Qty (T)</th>
                <th className="px-3 py-3 font-medium text-indigo-700 dark:text-indigo-300 text-right">ACC Amt</th>
                <th className="px-3 py-3 font-medium text-indigo-700 dark:text-indigo-300 text-right">Handling</th>
                <th className="px-3 py-3 font-medium text-indigo-700 dark:text-indigo-300 text-right">Commission</th>
                <th className="px-3 py-3 font-medium text-indigo-700 dark:text-indigo-300 text-right">Bilty</th>
                <th className="px-3 py-3 font-medium text-indigo-700 dark:text-indigo-300 text-right">Advances</th>
                <th className="px-3 py-3 font-medium text-indigo-700 dark:text-indigo-300 text-right">Final Pay</th>
                <th className="px-3 py-3 font-medium text-indigo-700 dark:text-indigo-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={14} className="px-4 py-8 text-center text-heading/50">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-4 py-12 text-center">
                    <p className="text-heading/50 mb-3">No trips found</p>
                    <button type="button" onClick={openAdd} className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm font-medium">Log first trip</button>
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b border-card-border last:border-0 hover:bg-indigo-50 dark:hover:bg-indigo-900/30/30 transition-colors">
                    <td className="px-3 py-2.5 whitespace-nowrap">{formatDate(row.date)}</td>
                    <td className="px-3 py-2.5 text-heading/70 text-xs">{row.builty_number || '—'}</td>
                    <td className="px-3 py-2.5 font-medium text-indigo-600 dark:text-indigo-400">{row.truck_number}</td>
                    <td className="px-3 py-2.5 text-heading/80">{row.party_name}</td>
                    <td className="px-3 py-2.5">
                      {row.dch_type ? (
                        <span className="rounded-full bg-indigo-100 dark:bg-indigo-900/40 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300">{row.dch_type}</span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      {row.material_type ? (
                        <span className="rounded-full bg-purple-100 dark:bg-purple-900/40 px-2 py-0.5 text-xs font-medium text-purple-700 dark:text-purple-300">{row.material_type}</span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right">{Number(row.qty).toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-right font-medium">{formatINR(Number(row.acc_amount))}</td>
                    <td className="px-3 py-2.5 text-right text-green-600 dark:text-green-400">{formatINR(Number(row.handling_charge || 0))}</td>
                    <td className="px-3 py-2.5 text-right text-amber-600 dark:text-amber-400">{formatINR(Number(row.commission_amount))}</td>
                    <td className="px-3 py-2.5 text-right text-amber-600 dark:text-amber-400">{formatINR(Number(row.builty_charge))}</td>
                    <td className="px-3 py-2.5 text-right text-red-600 dark:text-red-400 text-xs">
                      D: {formatINR(Number(row.diesel_advance))} / C: {formatINR(Number(row.cash_advance))}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-green-600 dark:text-green-400">{formatINR(Number(row.final_payment))}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="rounded p-1.5 text-heading/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 hover:text-indigo-600 dark:text-indigo-400 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {isAdmin() && (
                          <button
                            type="button"
                            onClick={() => handleDelete(row)}
                            className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                            title="Delete"
                          >
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

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40">
          <div className="flex min-h-full items-start justify-center px-4 py-6">
            <div className="w-full max-w-2xl rounded-xl bg-card shadow-2xl">
              <div className="flex items-center justify-between border-b border-card-border px-5 py-4 sticky top-0 bg-card z-10">
                <h2 className="font-semibold text-heading">{editing ? 'Edit Trip' : 'Add Trip'}</h2>
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg p-1.5 hover:bg-card-border/50 transition-colors">
                  <X className="h-5 w-5 text-heading/60" />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="p-5 flex flex-col gap-6">

                  {/* Trip Info */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500 mb-3">Trip Info</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-heading/70 mb-1">Date *</label>
                        <input type="date" className="input-field" value={form.date} onChange={f('date')} required />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-heading/70 mb-1">Truck Owner *</label>
                        <select className="input-field" value={form.truck_owner_id} onChange={f('truck_owner_id')} required>
                          <option value="">Select truck owner</option>
                          {owners.map((o) => (
                            <option key={o.id} value={String(o.id)}>{o.truck_number} — {o.owner_name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-heading/70 mb-1">Builty Number</label>
                        <input className="input-field" value={form.builty_number} onChange={f('builty_number')} placeholder="Builty / LR number" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-heading/70 mb-1">DO Number</label>
                        <input className="input-field" value={form.do_number} onChange={f('do_number')} placeholder="Delivery order number" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-heading/70 mb-1">Party Name *</label>
                        <input className="input-field" value={form.party_name} onChange={f('party_name')} placeholder="e.g. ACC Limited" required />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-heading/70 mb-1">Location</label>
                        <input className="input-field" value={form.location} onChange={f('location')} placeholder="Destination" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-heading/70 mb-1">DCH Type</label>
                        <select className="input-field" value={form.dch_type} onChange={f('dch_type')}>
                          <option value="">Select type</option>
                          {DCH_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-heading/70 mb-1">Material Type</label>
                        <select className="input-field" value={form.material_type} onChange={f('material_type')}>
                          <option value="">Select material</option>
                          {MATERIAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Freight & Computation */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500 mb-3">Freight Details</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-heading/70 mb-1">Quantity (Tons) *</label>
                        <input type="number" min="0" step="0.01" className="input-field" value={form.qty} onChange={f('qty')} placeholder="0" required />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-heading/70 mb-1">ACC Freight Rate (₹/T) *</label>
                        <input type="number" min="0" step="0.01" className="input-field" value={form.acc_freight_rate} onChange={f('acc_freight_rate')} placeholder="0" required />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-heading/70 mb-1">Commission % *</label>
                        <input type="number" min="0" max="100" step="0.01" className="input-field" value={form.commission_pct} onChange={f('commission_pct')} placeholder="6.29" required />
                      </div>
                      <div className="flex items-end">
                        <div className="rounded-lg bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 px-3 py-2 text-xs w-full">
                          <p className="text-heading/60">ACC Amount</p>
                          <p className="font-bold text-indigo-700 dark:text-indigo-300 text-sm">{formatINR(live.acc_amount)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Advances */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500 mb-3">Advances</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-heading/70 mb-1">Diesel Advance (₹)</label>
                        <input type="number" min="0" step="0.01" className="input-field" value={form.diesel_advance} onChange={f('diesel_advance')} placeholder="0" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-heading/70 mb-1">Cash Advance (₹)</label>
                        <input type="number" min="0" step="0.01" className="input-field" value={form.cash_advance} onChange={f('cash_advance')} placeholder="0" />
                      </div>
                    </div>
                  </div>

                  {/* Additional Details */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500 mb-3">Additional Details</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-heading/70 mb-1">Petrol Slip Number</label>
                        <input className="input-field" value={form.petrol_slip_number} onChange={f('petrol_slip_number')} placeholder="Slip number" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-heading/70 mb-1">EPOD Bill Number</label>
                        <input className="input-field" value={form.epod_bill_number} onChange={f('epod_bill_number')} placeholder="EPOD number" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-heading/70 mb-1">Difference Rate (₹/T)</label>
                        <input type="number" min="0" step="0.01" className="input-field" value={form.difference_rate} onChange={f('difference_rate')} placeholder="0" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-heading/70 mb-1">Remarks</label>
                        <input className="input-field" value={form.remarks} onChange={f('remarks')} placeholder="Optional notes" />
                      </div>
                    </div>
                  </div>

                  {/* Live Summary */}
                  <div className="rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 p-4 text-white">
                    <p className="text-xs font-semibold uppercase tracking-wider mb-3 opacity-80">Live Computation</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                      <div className="bg-card/10 rounded-lg p-2">
                        <p className="text-xs opacity-70">ACC Amount</p>
                        <p className="font-bold">{formatINR(live.acc_amount)}</p>
                      </div>
                      <div className="bg-card/10 rounded-lg p-2">
                        <p className="text-xs opacity-70">Handling (+)</p>
                        <p className="font-bold text-green-200">+{formatINR(live.handling_charge)}</p>
                      </div>
                      <div className="bg-card/10 rounded-lg p-2">
                        <p className="text-xs opacity-70">Commission</p>
                        <p className="font-bold text-yellow-200">−{formatINR(live.commission_amount)}</p>
                      </div>
                      <div className="bg-card/10 rounded-lg p-2">
                        <p className="text-xs opacity-70">Builty Charge</p>
                        <p className="font-bold text-yellow-200">−{formatINR(live.builty_charge)}</p>
                      </div>
                      <div className="bg-card/10 rounded-lg p-2 col-span-2 sm:col-span-4">
                        <p className="text-xs opacity-70">Advances</p>
                        <p className="font-bold text-red-200">−{formatINR(n(form.diesel_advance) + n(form.cash_advance))}</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/20 flex items-center justify-between">
                      <span className="text-sm font-medium">Bill to Party</span>
                      <span className="text-lg font-bold text-green-100">{formatINR(live.bill_amount)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm font-medium">Final Payment to Truck Owner</span>
                      <span className="text-xl font-bold">{formatINR(live.final_payment)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 border-t border-card-border px-5 py-4">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-heading/80 hover:bg-surface transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-600 disabled:opacity-60 transition-colors"
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
