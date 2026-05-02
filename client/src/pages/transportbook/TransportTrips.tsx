import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Plus, Pencil, Search, Trash2, X } from 'lucide-react';
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
  eway_bill_number: string | null;
  eway_bill_generated_at: string | null;
  eway_bill_valid_until: string | null;
  delivery_status: 'pending' | 'in_transit' | 'delivered' | null;
  delivered_at: string | null;
  eway_status: 'delivered' | 'expired' | 'risk' | 'warning' | 'ok' | 'none';
  eway_hours_left: number | null;
  diesel_party_id: number | null;
  diesel_party_name: string | null;
  company: 'acc' | 'jk';
}

interface DieselPartyOption {
  id: number;
  name: string;
}

interface OwnerOption {
  id: number;
  truck_number: string;
  owner_name: string;
  commission_pct?: number | null;
}

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
  diesel_party_id: '',
  cash_advance: '',
  petrol_slip_number: '',
  epod_bill_number: '',
  difference_rate: '',
  remarks: '',
  eway_bill_number: '',
  eway_bill_generated_at: '',
  eway_bill_valid_until: '',
  delivery_status: 'pending' as 'pending' | 'in_transit' | 'delivered',
  delivered_at: '',
  company: 'acc' as 'acc' | 'jk',
};

const DCH_TYPES = ['IT', 'DC', 'DE', 'IS'];
const MATERIAL_TYPES = ['Non-Trade', 'SOW', 'Normal'];
const DELIVERY_STATUSES: Array<'pending' | 'in_transit' | 'delivered'> = ['pending', 'in_transit', 'delivered'];

const EWAY_STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  ok: { label: 'OK', cls: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' },
  warning: { label: 'Expiring Soon', cls: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' },
  risk: { label: 'At Risk', cls: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 animate-pulse' },
  expired: { label: 'Expired', cls: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' },
  delivered: { label: 'Delivered', cls: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' },
  none: { label: 'No E-Way', cls: 'bg-surface text-heading/60' },
};

function formatHoursLeft(h: number | null): string {
  if (h === null || h === undefined) return '';
  if (h <= 0) return `expired ${Math.abs(Math.round(h))}h ago`;
  if (h < 1) return `${Math.round(h * 60)}m left`;
  if (h < 48) return `${h.toFixed(1)}h left`;
  return `${Math.round(h / 24)}d left`;
}

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

interface SearchableOwnerSelectProps {
  value: string;
  onChange: (id: string) => void;
  options: OwnerOption[];
  placeholder: string;
  allowClear?: boolean;
  clearLabel?: string;
  className?: string;
  required?: boolean;
}

function SearchableOwnerSelect({
  value,
  onChange,
  options,
  placeholder,
  allowClear = false,
  clearLabel = 'All Trucks',
  className = '',
  required = false,
}: SearchableOwnerSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => String(o.id) === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.truck_number.toLowerCase().includes(q) ||
        o.owner_name.toLowerCase().includes(q),
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
    return;
  }, [open]);

  const pick = (id: string) => {
    onChange(id);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`input-field flex items-center justify-between gap-2 text-left w-full ${
          selected ? 'text-heading' : 'text-heading/50'
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">
          {selected ? `${selected.truck_number} — ${selected.owner_name}` : placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 text-heading/50 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {/* Hidden input to satisfy native required validation when used in a form */}
      {required && (
        <input
          tabIndex={-1}
          aria-hidden="true"
          required
          value={value}
          onChange={() => {}}
          className="sr-only absolute inset-0 opacity-0 pointer-events-none"
        />
      )}
      {open && (
        <div className="absolute left-0 right-0 z-30 mt-1 rounded-lg border border-card-border bg-card shadow-xl overflow-hidden">
          <div className="flex items-center gap-2 border-b border-card-border px-3 py-2">
            <Search className="h-4 w-4 text-heading/50 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  setOpen(false);
                  setQuery('');
                } else if (e.key === 'Enter' && filtered.length > 0) {
                  e.preventDefault();
                  pick(String(filtered[0].id));
                }
              }}
              placeholder="Search truck or owner…"
              className="w-full bg-transparent text-sm text-heading placeholder:text-heading/40 focus:outline-none"
            />
          </div>
          <ul className="max-h-64 overflow-y-auto py-1" role="listbox">
            {allowClear && (
              <li>
                <button
                  type="button"
                  onClick={() => pick('')}
                  className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/30 ${
                    value === '' ? 'text-indigo-600 dark:text-indigo-400 font-medium' : 'text-heading/80'
                  }`}
                >
                  <span>{clearLabel}</span>
                  {value === '' && <Check className="h-4 w-4" />}
                </button>
              </li>
            )}
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-center text-sm text-heading/50">No matches</li>
            ) : (
              filtered.map((o) => {
                const isSelected = String(o.id) === value;
                return (
                  <li key={o.id}>
                    <button
                      type="button"
                      onClick={() => pick(String(o.id))}
                      className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/30 ${
                        isSelected ? 'text-indigo-600 dark:text-indigo-400 font-medium' : 'text-heading/80'
                      }`}
                    >
                      <span className="truncate">
                        <span className="font-medium">{o.truck_number}</span>
                        <span className="text-heading/60"> — {o.owner_name}</span>
                      </span>
                      {isSelected && <Check className="h-4 w-4 shrink-0" />}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
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
  const [dieselParties, setDieselParties] = useState<DieselPartyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TripRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterOwner, setFilterOwner] = useState('');
  // Default to current YYYY-MM so the page opens scoped to this month, not all trips ever.
  const [filterMonth, setFilterMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [filterEwayAtRisk, setFilterEwayAtRisk] = useState(false);
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

  const loadDieselParties = useCallback(async () => {
    try {
      const data = await api.rlDieselParties.list();
      setDieselParties((data as any[]).filter((d) => d.is_active).map((d) => ({ id: d.id, name: d.name })));
    } catch (_) {}
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadOwners(); }, [loadOwners]);
  useEffect(() => { loadDieselParties(); }, [loadDieselParties]);
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
      diesel_party_id: row.diesel_party_id ? String(row.diesel_party_id) : '',
      cash_advance: String(row.cash_advance || ''),
      petrol_slip_number: row.petrol_slip_number || '',
      epod_bill_number: row.epod_bill_number || '',
      difference_rate: String(row.difference_rate || ''),
      remarks: row.remarks || '',
      eway_bill_number: row.eway_bill_number || '',
      eway_bill_generated_at: row.eway_bill_generated_at ? row.eway_bill_generated_at.slice(0, 16) : '',
      eway_bill_valid_until: row.eway_bill_valid_until ? row.eway_bill_valid_until.slice(0, 16) : '',
      delivery_status: (row.delivery_status || 'pending') as 'pending' | 'in_transit' | 'delivered',
      delivered_at: row.delivered_at ? row.delivered_at.slice(0, 16) : '',
      company: (row.company === 'jk' ? 'jk' : 'acc') as 'acc' | 'jk',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.truck_owner_id) { addToast('Select a truck owner', 'error'); return; }
    if (!form.party_name.trim()) { addToast('Party name is required', 'error'); return; }
    if (n(form.diesel_advance) > 0 && !form.diesel_party_id) {
      addToast('Pick the diesel pump for this advance so it lands on the right ledger', 'error');
      return;
    }
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
        diesel_party_id: form.diesel_party_id ? Number(form.diesel_party_id) : null,
        cash_advance: n(form.cash_advance),
        petrol_slip_number: form.petrol_slip_number || null,
        epod_bill_number: form.epod_bill_number || null,
        difference_rate: n(form.difference_rate),
        remarks: form.remarks || null,
        eway_bill_number: form.eway_bill_number || null,
        eway_bill_generated_at: form.eway_bill_generated_at ? new Date(form.eway_bill_generated_at).toISOString() : null,
        eway_bill_valid_until: form.eway_bill_valid_until ? new Date(form.eway_bill_valid_until).toISOString() : null,
        delivery_status: form.delivery_status,
        delivered_at: form.delivered_at ? new Date(form.delivered_at).toISOString() : null,
        company: form.company,
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

  const visibleRows = filterEwayAtRisk
    ? rows.filter((r) => ['risk', 'warning', 'expired'].includes(r.eway_status))
    : rows;

  const totals = visibleRows.reduce(
    (acc, r) => ({
      qty: acc.qty + Number(r.qty),
      acc_amount: acc.acc_amount + Number(r.acc_amount),
      commission_amount: acc.commission_amount + Number(r.commission_amount),
      builty_charge: acc.builty_charge + Number(r.builty_charge || 0),
      diesel_advance: acc.diesel_advance + Number(r.diesel_advance),
      cash_advance: acc.cash_advance + Number(r.cash_advance),
      final_payment: acc.final_payment + Number(r.final_payment),
    }),
    { qty: 0, acc_amount: 0, commission_amount: 0, builty_charge: 0, diesel_advance: 0, cash_advance: 0, final_payment: 0 }
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading">Trip Log</h1>
          <p className="text-sm text-heading/60 mt-1">{visibleRows.length} of {rows.length} trip{rows.length !== 1 ? 's' : ''} shown</p>
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
          <SearchableOwnerSelect
            value={filterOwner}
            onChange={setFilterOwner}
            options={owners}
            placeholder="All Trucks"
            allowClear
            clearLabel="All Trucks"
            className="min-w-[220px]"
          />
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
        <label className="inline-flex items-center gap-2 text-sm text-heading/70 cursor-pointer">
          <input
            type="checkbox"
            className="rounded border-card-border"
            checked={filterEwayAtRisk}
            onChange={(e) => setFilterEwayAtRisk(e.target.checked)}
          />
          <span>E-Way at-risk only</span>
        </label>
        {(filterOwner || filterMonth || filterEwayAtRisk) && (
          <button
            type="button"
            onClick={() => { setFilterOwner(''); setFilterMonth(''); setFilterEwayAtRisk(false); }}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Summary Strip */}
      {visibleRows.length > 0 && (
        <div className="grid grid-cols-3 gap-4 lg:grid-cols-7">
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
          <div className="card p-3 text-center border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30">
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Bilty</p>
            <p className="text-lg font-bold text-heading">{formatINR(totals.builty_charge)}</p>
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
                <th className="px-3 py-3 font-medium text-indigo-700 dark:text-indigo-300 text-right">Qty (T)</th>
                <th className="px-3 py-3 font-medium text-indigo-700 dark:text-indigo-300 text-right">ACC Amt</th>
                <th className="px-3 py-3 font-medium text-indigo-700 dark:text-indigo-300 text-right">Handling</th>
                <th className="px-3 py-3 font-medium text-indigo-700 dark:text-indigo-300 text-right">Commission</th>
                <th className="px-3 py-3 font-medium text-indigo-700 dark:text-indigo-300 text-right">Bilty</th>
                <th className="px-3 py-3 font-medium text-indigo-700 dark:text-indigo-300 text-right">Advances</th>
                <th className="px-3 py-3 font-medium text-indigo-700 dark:text-indigo-300 text-right">Final Pay</th>
                <th className="px-3 py-3 font-medium text-indigo-700 dark:text-indigo-300">E-Way</th>
                <th className="px-3 py-3 font-medium text-indigo-700 dark:text-indigo-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={14} className="px-4 py-8 text-center text-heading/50">Loading...</td></tr>
              ) : visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-4 py-12 text-center">
                    <p className="text-heading/50 mb-3">{rows.length === 0 ? 'No trips found' : 'No trips match current filters'}</p>
                    {rows.length === 0 && (
                      <button type="button" onClick={openAdd} className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm font-medium">Log first trip</button>
                    )}
                  </td>
                </tr>
              ) : (
                visibleRows.map((row) => {
                  const risky = row.eway_status === 'expired' || row.eway_status === 'risk';
                  return (
                  <tr key={row.id} className={`border-b border-card-border last:border-0 transition-colors ${risky ? 'bg-red-50/60 dark:bg-red-900/20 hover:bg-red-50 dark:hover:bg-red-900/30' : 'hover:bg-indigo-50/30 dark:hover:bg-indigo-900/30'}`}>
                    <td className="px-3 py-2.5 whitespace-nowrap">{formatDate(row.date)}</td>
                    <td className="px-3 py-2.5 text-heading/70 text-xs">{row.builty_number || '—'}</td>
                    <td className="px-3 py-2.5 font-medium text-indigo-600 dark:text-indigo-400">{row.truck_number}</td>
                    <td className="px-3 py-2.5 text-heading/80">
                      <div className="flex flex-col gap-0.5">
                        <span>{row.party_name}</span>
                        <span className={`inline-flex w-fit items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${row.company === 'jk' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' : 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'}`}>
                          {row.company === 'jk' ? 'JK' : 'ACC'}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      {row.dch_type ? (
                        <span className="rounded-full bg-indigo-100 dark:bg-indigo-900/40 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300">{row.dch_type}</span>
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
                      <div className="flex flex-col gap-0.5">
                        <span className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium ${EWAY_STATUS_STYLES[row.eway_status]?.cls || EWAY_STATUS_STYLES.none.cls}`}>
                          {EWAY_STATUS_STYLES[row.eway_status]?.label || 'No E-Way'}
                        </span>
                        {row.eway_status !== 'none' && row.eway_status !== 'delivered' && row.eway_hours_left !== null && (
                          <span className="text-[10px] text-heading/50 ml-1">{formatHoursLeft(row.eway_hours_left)}</span>
                        )}
                        {row.eway_bill_number && (
                          <span className="text-[10px] text-heading/50 ml-1 font-mono truncate max-w-[90px]" title={row.eway_bill_number}>{row.eway_bill_number}</span>
                        )}
                      </div>
                    </td>
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
                  );
                })
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
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-heading/70 mb-1">Bill To *</label>
                        <div className="inline-flex w-full rounded-lg border border-card-border bg-card p-1 text-sm">
                          <button
                            type="button"
                            onClick={() => setForm((p) => ({ ...p, company: 'acc' }))}
                            className={`flex-1 rounded-md px-3 py-1.5 font-medium ${form.company === 'acc' ? 'bg-indigo-500 text-white shadow-sm' : 'text-heading/70 hover:bg-surface'}`}
                          >
                            ACC
                          </button>
                          <button
                            type="button"
                            onClick={() => setForm((p) => ({ ...p, company: 'jk' }))}
                            className={`flex-1 rounded-md px-3 py-1.5 font-medium ${form.company === 'jk' ? 'bg-emerald-500 text-white shadow-sm' : 'text-heading/70 hover:bg-surface'}`}
                          >
                            JK
                          </button>
                        </div>
                        <p className="mt-1 text-[10px] text-heading/50">
                          Trip freight auto-shifts into this company's billing as receivable.
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-heading/70 mb-1">Date *</label>
                        <input type="date" className="input-field" value={form.date} onChange={f('date')} required />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-heading/70 mb-1">Truck Owner *</label>
                        <SearchableOwnerSelect
                          value={form.truck_owner_id}
                          onChange={(id) => {
                            const picked = owners.find((o) => String(o.id) === id);
                            setForm((prev) => ({
                              ...prev,
                              truck_owner_id: id,
                              commission_pct:
                                picked && picked.commission_pct != null
                                  ? String(picked.commission_pct)
                                  : prev.commission_pct,
                            }));
                          }}
                          options={owners}
                          placeholder="Select truck owner"
                          required
                        />
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
                      <div className="flex items-end">
                        <div className="rounded-lg bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 px-3 py-2 text-xs w-full">
                          <p className="text-heading/60">Commission</p>
                          <p className="font-bold text-indigo-700 dark:text-indigo-300 text-sm">
                            {Number(form.commission_pct || 0).toFixed(2)}%
                            <span className="ml-2 text-[10px] font-normal text-heading/60">
                              from truck master
                            </span>
                          </p>
                        </div>
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
                        <label className="block text-xs font-medium text-heading/70 mb-1">
                          Diesel Pump {n(form.diesel_advance) > 0 && <span className="text-red-500">*</span>}
                        </label>
                        <select className="input-field" value={form.diesel_party_id} onChange={f('diesel_party_id')}>
                          <option value="">— Select pump —</option>
                          {dieselParties.map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                        {dieselParties.length === 0 && (
                          <p className="mt-1 text-[10px] text-amber-600 dark:text-amber-400">
                            No diesel parties yet — add one from TransportBook → Diesel.
                          </p>
                        )}
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

                  {/* E-Way Bill & Delivery */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500 mb-3">E-Way Bill & Delivery</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-heading/70 mb-1">E-Way Bill Number</label>
                        <input className="input-field" value={form.eway_bill_number} onChange={f('eway_bill_number')} placeholder="12-digit EBN" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-heading/70 mb-1">Generated At</label>
                        <input type="datetime-local" className="input-field" value={form.eway_bill_generated_at} onChange={f('eway_bill_generated_at')} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-heading/70 mb-1">Valid Until *</label>
                        <input type="datetime-local" className="input-field" value={form.eway_bill_valid_until} onChange={f('eway_bill_valid_until')} />
                        <p className="mt-1 text-[10px] text-heading/50">Drives the at-risk alerts on the dashboard.</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-heading/70 mb-1">Delivery Status</label>
                        <select className="input-field" value={form.delivery_status} onChange={f('delivery_status')}>
                          {DELIVERY_STATUSES.map((s) => (
                            <option key={s} value={s}>{s.replace('_', ' ')}</option>
                          ))}
                        </select>
                      </div>
                      {form.delivery_status === 'delivered' && (
                        <div>
                          <label className="block text-xs font-medium text-heading/70 mb-1">Delivered At</label>
                          <input type="datetime-local" className="input-field" value={form.delivered_at} onChange={f('delivered_at')} />
                        </div>
                      )}
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
