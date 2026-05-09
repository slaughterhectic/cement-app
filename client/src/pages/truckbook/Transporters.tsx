import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, X, Building2, TrendingUp, TrendingDown, Printer } from 'lucide-react';
import { api } from '../../lib/api';
import { formatINR, formatDate } from '../../lib/format';
import { useToastStore, useAuthStore } from '../../lib/store';
import { openTransporterLedgerPdf } from '../../lib/transporterLedgerPdf';

interface TransporterRow {
  id: number;
  name: string;
  phone: string | null;
  is_active: number;
  trip_count: number;
  total_commission: number;
  total_advance_diesel: number;
  total_trip_diesel: number;
  total_paid: number;
  total_received: number;
  outstanding: number;
  has_gst: boolean;
}

interface LedgerEntry {
  id?: number;
  date: string;
  entry_type: 'commission' | 'advance_diesel' | 'trip_diesel' | 'payment';
  payment_type?: 'paid' | 'received';
  amount: number;
  truck_number: string | null;
  load_from: string | null;
  billed_destination: string | null;
  material_name: string | null;
  mode: string | null;
  bank_name: string | null;
  cash_handler: string | null;
  remarks: string | null;
  balance: number;
}

interface LedgerData {
  transporter: TransporterRow;
  ledger: LedgerEntry[];
  totalEarned: number;
  totalPaid: number;
  totalReceived: number;
  outstanding: number;
}

const emptyPayForm = {
  date: new Date().toISOString().split('T')[0],
  amount: '',
  payment_type: 'paid' as 'paid' | 'received',
  mode: 'cash' as 'cash' | 'bank',
  bank_name: '',
  cash_handler: '',
  remarks: '',
};

export default function Transporters() {
  const addToast = useToastStore((s) => s.addToast);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const [transporters, setTransporters] = useState<TransporterRow[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [ledger, setLedger] = useState<LedgerData | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [payForm, setPayForm] = useState(emptyPayForm);
  const [addPayOpen, setAddPayOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [banks, setBanks] = useState<{ id: number; bank_name: string }[]>([]);
  const [cashHandlers, setCashHandlers] = useState<string[]>([]);

  // Add transporter modal
  const [modalOpen, setModalOpen] = useState(false);
  const [tForm, setTForm] = useState({ name: '', phone: '', has_gst: false });
  const [tSaving, setTSaving] = useState(false);

  // GST breakdown popup
  const [gstPopup, setGstPopup] = useState<TransporterRow | null>(null);

  // Print ledger modal
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Filter + sort state for the transporters list
  const [searchQuery, setSearchQuery] = useState('');
  const [gstFilter, setGstFilter] = useState<'all' | 'gst' | 'no-gst'>('all');
  const [sortBy, setSortBy] = useState<'outstanding_desc' | 'outstanding_asc' | 'commission_desc' | 'trip_diesel_desc' | 'advance_diesel_desc' | 'trips_desc' | 'name_asc'>('outstanding_desc');

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      setTransporters(await api.transporters.list());
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed', 'error');
    } finally { setLoadingList(false); }
  }, [addToast]);

  const loadLedger = useCallback(async (id: number) => {
    setLoadingLedger(true);
    try {
      setLedger(await api.transporters.ledger(id));
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to load ledger', 'error');
    } finally { setLoadingLedger(false); }
  }, [addToast]);

  useEffect(() => {
    loadList();
    api.capital.banks().then(setBanks).catch(() => {});
    api.imprest.handlers().then((rows: any[]) => setCashHandlers(rows.map((r) => r.handler_name))).catch(() => {});
  }, [loadList]);

  useEffect(() => {
    if (selectedId) loadLedger(selectedId);
    else setLedger(null);
  }, [selectedId, loadLedger]);

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !payForm.amount) { addToast('Amount required', 'error'); return; }
    if (payForm.mode === 'cash' && !payForm.cash_handler) {
      addToast('Select a cash handler', 'error'); return;
    }
    if (payForm.mode === 'bank' && !payForm.bank_name) {
      addToast('Select a bank', 'error'); return;
    }
    setSaving(true);
    try {
      await api.transporters.addPayment(selectedId, {
        date: payForm.date,
        amount: Number(payForm.amount),
        payment_type: payForm.payment_type,
        mode: payForm.mode,
        bank_name: payForm.mode === 'bank' ? (payForm.bank_name || null) : null,
        cash_handler: payForm.mode === 'cash' ? (payForm.cash_handler || null) : null,
        remarks: payForm.remarks || null,
      });
      addToast('Payment recorded', 'success');
      setPayForm(emptyPayForm);
      setAddPayOpen(false);
      loadLedger(selectedId);
      loadList();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed', 'error');
    } finally { setSaving(false); }
  };

  const handleAddTransporter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tForm.name.trim()) return;
    setTSaving(true);
    try {
      await api.transporters.create({ name: tForm.name.trim(), phone: tForm.phone.trim() || undefined, has_gst: tForm.has_gst });
      addToast('Transporter added', 'success');
      setModalOpen(false);
      setTForm({ name: '', phone: '', has_gst: false });
      loadList();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed', 'error');
    } finally { setTSaving(false); }
  };

  const handleDeletePayment = async (entry: LedgerEntry, transporterId: number) => {
    if (!entry.id) return;
    if (!window.confirm('Delete this payment?')) return;
    try {
      await api.transporters.deletePayment(transporterId, entry.id);
      addToast('Payment deleted', 'success');
      loadLedger(transporterId);
      loadList();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed', 'error');
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Delete transporter "${name}"?`)) return;
    try {
      await api.transporters.delete(id);
      addToast('Deleted', 'success');
      if (selectedId === id) setSelectedId(null);
      loadList();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed', 'error');
    }
  };

  const handlePrint = (withGst: boolean) => {
    if (!ledger) return;
    setShowPrintModal(false);
    const ok = openTransporterLedgerPdf({
      transporterName: ledger.transporter.name,
      phone: ledger.transporter.phone,
      totalReceivable: ledger.totalEarned,
      totalPaid: ledger.totalPaid,
      totalReceived: ledger.totalReceived ?? 0,
      outstanding: ledger.outstanding,
      entries: ledger.ledger,
      withGst,
    });
    if (!ok) addToast('Popup blocked — please allow popups for this site', 'error');
  };

  const filteredTransporters = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = transporters.filter((t) => {
      if (q && !t.name.toLowerCase().includes(q) && !(t.phone || '').toLowerCase().includes(q)) return false;
      if (gstFilter === 'gst' && !t.has_gst) return false;
      if (gstFilter === 'no-gst' && t.has_gst) return false;
      return true;
    });
    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sortBy) {
        case 'outstanding_desc': return (b.outstanding ?? 0) - (a.outstanding ?? 0);
        case 'outstanding_asc':  return (a.outstanding ?? 0) - (b.outstanding ?? 0);
        case 'commission_desc':  return (b.total_commission ?? 0) - (a.total_commission ?? 0);
        case 'trip_diesel_desc': return (b.total_trip_diesel ?? 0) - (a.total_trip_diesel ?? 0);
        case 'advance_diesel_desc': return (b.total_advance_diesel ?? 0) - (a.total_advance_diesel ?? 0);
        case 'trips_desc':       return (b.trip_count ?? 0) - (a.trip_count ?? 0);
        case 'name_asc':         return a.name.localeCompare(b.name);
        default: return 0;
      }
    });
    return sorted;
  }, [transporters, searchQuery, gstFilter, sortBy]);

  // Aggregate totals across the filtered list — drives the overall KPI strip.
  const aggregates = useMemo(() => filteredTransporters.reduce((acc, t) => ({
    receivable: acc.receivable + (Number(t.total_commission) || 0)
                              + (Number(t.total_advance_diesel) || 0)
                              + (Number(t.total_trip_diesel) || 0),
    paid: acc.paid + (Number(t.total_paid) || 0),
    received: acc.received + (Number(t.total_received) || 0),
    outstanding: acc.outstanding + (Number(t.outstanding) || 0),
    commission: acc.commission + (Number(t.total_commission) || 0),
    advance: acc.advance + (Number(t.total_advance_diesel) || 0),
    tripDiesel: acc.tripDiesel + (Number(t.total_trip_diesel) || 0),
    trips: acc.trips + (Number(t.trip_count) || 0),
  }), { receivable: 0, paid: 0, received: 0, outstanding: 0, commission: 0, advance: 0, tripDiesel: 0, trips: 0 }), [filteredTransporters]);

  const ENTRY_LABELS: Record<string, { label: string; color: string }> = {
    commission: { label: 'Commission', color: 'text-blue-600 dark:text-blue-400' },
    advance_diesel: { label: 'Trip Diesel', color: 'text-orange-600 dark:text-orange-400' },
    trip_diesel: { label: 'Add. Diesel', color: 'text-amber-600 dark:text-amber-400' },
    payment: { label: 'Payment', color: 'text-green-600 dark:text-green-400' },
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading">Transporters</h1>
          <p className="text-sm text-heading/60 mt-1">Ledger & payment tracking</p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-orange-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Transporter
        </button>
      </div>

      {/* Overall KPI strip — aggregates across the filtered list. */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="card p-3 text-center bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800">
          <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium uppercase tracking-wider">Receivable</p>
          <p className="text-base font-bold text-heading">{formatINR(aggregates.receivable)}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-[10px] text-heading/60 font-medium uppercase tracking-wider">Commission</p>
          <p className="text-base font-bold text-heading">{formatINR(aggregates.commission)}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-[10px] text-heading/60 font-medium uppercase tracking-wider">Trip Diesel</p>
          <p className="text-base font-bold text-heading">{formatINR(aggregates.tripDiesel)}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-[10px] text-heading/60 font-medium uppercase tracking-wider">Adv Diesel</p>
          <p className="text-base font-bold text-heading">{formatINR(aggregates.advance)}</p>
        </div>
        <div className="card p-3 text-center bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800">
          <p className="text-[10px] text-orange-600 dark:text-orange-400 font-medium uppercase tracking-wider">Paid Out</p>
          <p className="text-base font-bold text-heading">{formatINR(aggregates.paid)}</p>
        </div>
        <div className="card p-3 text-center bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800">
          <p className="text-[10px] text-green-600 dark:text-green-400 font-medium uppercase tracking-wider">Received</p>
          <p className="text-base font-bold text-heading">{formatINR(aggregates.received)}</p>
        </div>
        <div className={`card p-3 text-center ${aggregates.outstanding > 0 ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800' : 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800'}`}>
          <p className={`text-[10px] font-medium uppercase tracking-wider ${aggregates.outstanding > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>Outstanding</p>
          <p className={`text-base font-bold ${aggregates.outstanding > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>{formatINR(aggregates.outstanding)}</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="card flex flex-wrap items-center gap-3 p-3">
        <input
          type="text"
          className="input-field py-1.5 text-sm flex-1 min-w-[160px]"
          placeholder="Search by name or phone…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="flex items-center gap-1 rounded-lg border border-card-border bg-surface p-0.5 text-sm">
          {(['all', 'gst', 'no-gst'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setGstFilter(v)}
              className={`px-3 py-1 rounded-md font-medium capitalize transition-colors ${
                gstFilter === v ? 'bg-orange-500 text-white' : 'text-heading/70 hover:bg-card-border/40'
              }`}
            >
              {v === 'all' ? 'All' : v === 'gst' ? 'GST' : 'No GST'}
            </button>
          ))}
        </div>
        <select
          className="input-field py-1.5 text-sm"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
        >
          <option value="outstanding_desc">Sort: Outstanding ↓</option>
          <option value="outstanding_asc">Sort: Outstanding ↑</option>
          <option value="commission_desc">Sort: Commission ↓</option>
          <option value="trip_diesel_desc">Sort: Trip Diesel ↓</option>
          <option value="advance_diesel_desc">Sort: Adv Diesel ↓</option>
          <option value="trips_desc">Sort: Trips ↓</option>
          <option value="name_asc">Sort: Name A–Z</option>
        </select>
        <span className="text-xs text-heading/60">{filteredTransporters.length} of {transporters.length}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 items-start">
        {/* Left: list */}
        <div className="card p-0 overflow-hidden">
          <div className="border-b border-card-border px-4 py-3 bg-orange-50 dark:bg-orange-900/30">
            <p className="font-semibold text-orange-700 dark:text-orange-300 text-sm">All Transporters</p>
          </div>
          {loadingList ? (
            <div className="p-6 text-center text-heading/50 text-sm">Loading…</div>
          ) : filteredTransporters.length === 0 ? (
            <div className="p-6 text-center text-heading/50 text-sm">{transporters.length === 0 ? 'No transporters yet' : 'No transporters match the filters'}</div>
          ) : (
            <div className="divide-y divide-card-border">
              {filteredTransporters.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedId(t.id === selectedId ? null : t.id)}
                  className={`cursor-pointer px-4 py-3 transition-colors ${
                    selectedId === t.id
                      ? 'bg-orange-50 dark:bg-orange-900/30 border-l-4 border-l-orange-500'
                      : 'hover:bg-surface border-l-4 border-l-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-medium text-sm text-heading truncate">{t.name}</p>
                        {t.has_gst && (
                          <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:text-blue-300">
                            GST
                          </span>
                        )}
                      </div>
                      {t.phone && <p className="text-xs text-heading/50">{t.phone}</p>}
                      <p className="text-xs text-heading/50">{t.trip_count} trips</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-xs font-semibold ${t.outstanding > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                        {formatINR(t.outstanding)}
                      </p>
                      <p className="text-xs text-heading/50">outstanding</p>
                    </div>
                  </div>
                  <div className="mt-1 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setGstPopup(t); }}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      GST Breakdown
                    </button>
                    {isAdmin() && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDelete(t.id, t.name); }}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: ledger */}
        <div className="flex flex-col gap-4">
          {!selectedId ? (
            <div className="card flex flex-col items-center justify-center py-20 text-center">
              <Building2 className="h-12 w-12 text-orange-200 mb-3" />
              <p className="text-heading/50">Select a transporter to view their ledger</p>
            </div>
          ) : loadingLedger ? (
            <div className="card flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
            </div>
          ) : ledger ? (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-4 gap-3">
                <div className="card p-4 text-center bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium uppercase tracking-wide">Total Receivable</p>
                  <p className="text-lg font-bold text-heading">{formatINR(ledger.totalEarned)}</p>
                  <p className="text-xs text-blue-500 mt-0.5">Commission + Diesel</p>
                </div>
                <div className="card p-4 text-center bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800">
                  <p className="text-xs text-orange-600 dark:text-orange-400 font-medium uppercase tracking-wide">Paid Out</p>
                  <p className="text-lg font-bold text-heading">{formatINR(ledger.totalPaid)}</p>
                </div>
                <div className="card p-4 text-center bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800">
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium uppercase tracking-wide">Received</p>
                  <p className="text-lg font-bold text-heading">{formatINR(ledger.totalReceived ?? 0)}</p>
                </div>
                <div className={`card p-4 text-center ${ledger.outstanding > 0 ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800' : 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800'}`}>
                  <p className={`text-xs font-medium uppercase tracking-wide ${ledger.outstanding > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>Outstanding</p>
                  <p className={`text-lg font-bold ${ledger.outstanding > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>{formatINR(ledger.outstanding)}</p>
                </div>
              </div>

              {/* Add Payment */}
              <div className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-medium text-sm text-heading">Record Payment — {ledger.transporter.name}</p>
                  <button
                    type="button"
                    onClick={() => setAddPayOpen(!addPayOpen)}
                    className="inline-flex items-center gap-1 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-600 transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    Add Payment
                  </button>
                </div>
                {addPayOpen && (
                  <form onSubmit={handleAddPayment} className="mt-3 pt-3 border-t border-card-border">
                    {/* Direction toggle */}
                    <div className="flex gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() => setPayForm((p) => ({ ...p, payment_type: 'paid' }))}
                        className={`flex-1 rounded-lg border py-2 text-xs font-semibold transition-colors ${
                          payForm.payment_type === 'paid'
                            ? 'bg-red-500 border-red-500 text-white'
                            : 'border-card-border text-heading/70 hover:bg-surface'
                        }`}
                      >
                        Paid to Transporter
                      </button>
                      <button
                        type="button"
                        onClick={() => setPayForm((p) => ({ ...p, payment_type: 'received' }))}
                        className={`flex-1 rounded-lg border py-2 text-xs font-semibold transition-colors ${
                          payForm.payment_type === 'received'
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-card-border text-heading/70 hover:bg-surface'
                        }`}
                      >
                        Received from Transporter
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-heading/70 mb-1">Date *</label>
                        <input type="date" className="input-field" value={payForm.date}
                          onChange={(e) => setPayForm((p) => ({ ...p, date: e.target.value }))} required />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-heading/70 mb-1">Amount (₹) *</label>
                        <input type="number" min="0" step="0.01" className="input-field" value={payForm.amount}
                          onChange={(e) => setPayForm((p) => ({ ...p, amount: e.target.value }))} placeholder="0" required />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-heading/70 mb-1">Mode</label>
                        <select className="input-field" value={payForm.mode}
                          onChange={(e) => setPayForm((p) => ({ ...p, mode: e.target.value as 'cash' | 'bank', bank_name: '', cash_handler: '' }))}>
                          <option value="cash">Cash</option>
                          <option value="bank">Bank</option>
                        </select>
                      </div>
                      {payForm.mode === 'bank' ? (
                        <div>
                          <label className="block text-xs font-medium text-heading/70 mb-1">Bank *</label>
                          <select className="input-field" value={payForm.bank_name}
                            onChange={(e) => setPayForm((p) => ({ ...p, bank_name: e.target.value }))}>
                            <option value="">Select bank</option>
                            {banks.map((b) => <option key={b.id} value={b.bank_name}>{b.bank_name}</option>)}
                          </select>
                        </div>
                      ) : (
                        <div>
                          <label className="block text-xs font-medium text-heading/70 mb-1">Cash Handler *</label>
                          <select className="input-field" value={payForm.cash_handler}
                            onChange={(e) => setPayForm((p) => ({ ...p, cash_handler: e.target.value }))}>
                            <option value="">Select handler</option>
                            {cashHandlers.map((h) => <option key={h} value={h}>{h}</option>)}
                          </select>
                          {cashHandlers.length === 0 && (
                            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">Add one in Capital → Add Cash Handler.</p>
                          )}
                        </div>
                      )}
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-heading/70 mb-1">Remarks</label>
                        <input className="input-field" value={payForm.remarks}
                          onChange={(e) => setPayForm((p) => ({ ...p, remarks: e.target.value }))} placeholder="Optional" />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-3">
                      <button type="button" onClick={() => setAddPayOpen(false)} className="text-sm text-heading/60 hover:text-heading/80">Cancel</button>
                      <button type="submit" disabled={saving} className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60 transition-colors ${payForm.payment_type === 'received' ? 'bg-green-500 hover:bg-green-600' : 'bg-orange-500 hover:bg-orange-600'}`}>
                        {saving ? 'Saving…' : payForm.payment_type === 'received' ? 'Record Receipt' : 'Record Payment'}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Ledger table */}
              <div className="card overflow-hidden p-0">
                <div className="flex items-center justify-between border-b border-card-border px-4 py-3 bg-orange-50 dark:bg-orange-900/30">
                  <p className="font-medium text-orange-700 dark:text-orange-300 text-sm">Ledger — {ledger.transporter.name}</p>
                  <button
                    type="button"
                    onClick={() => setShowPrintModal(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-orange-300 dark:border-orange-700 bg-white dark:bg-orange-900/40 px-3 py-1.5 text-xs font-medium text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/60 transition-colors"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Print Ledger
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-card-border bg-surface text-left">
                        <th className="px-4 py-2.5 font-medium text-heading/70">Date</th>
                        <th className="px-4 py-2.5 font-medium text-heading/70">Type</th>
                        <th className="px-4 py-2.5 font-medium text-heading/70">Details</th>
                        <th className="px-4 py-2.5 font-medium text-heading/70 text-right">Received</th>
                        <th className="px-4 py-2.5 font-medium text-heading/70 text-right">Paid</th>
                        <th className="px-4 py-2.5 font-medium text-heading/70 text-right">Balance</th>
                        <th className="px-4 py-2.5 font-medium text-heading/70">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledger.ledger.length === 0 ? (
                        <tr><td colSpan={7} className="px-4 py-8 text-center text-heading/50">No entries</td></tr>
                      ) : (
                        ledger.ledger.map((row, i) => {
                          const meta = ENTRY_LABELS[row.entry_type] || { label: row.entry_type, color: 'text-heading/70' };
                          const isPayment = row.entry_type === 'payment';
                          const isPaid = isPayment && (row.payment_type ?? 'paid') === 'paid';
                          const isReceived = isPayment && row.payment_type === 'received';
                          return (
                            <tr key={i} className={`border-b border-card-border last:border-0 ${isPayment ? (isReceived ? 'hover:bg-green-50/40 dark:hover:bg-green-900/30' : 'hover:bg-red-50/40 dark:hover:bg-red-900/30') : 'hover:bg-blue-50/40 dark:hover:bg-blue-900/30'} transition-colors`}>
                              <td className="px-4 py-3 whitespace-nowrap text-heading/70">{formatDate(row.date)}</td>
                              <td className="px-4 py-3">
                                {isPayment ? (
                                  isReceived ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/40 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-300">
                                      <TrendingDown className="h-3 w-3" /> Received
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-900/40 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-300">
                                      <TrendingUp className="h-3 w-3" /> Paid
                                    </span>
                                  )
                                ) : (
                                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${meta.color === 'text-blue-600 dark:text-blue-400' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300'}`}>
                                    <TrendingUp className="h-3 w-3" /> {meta.label}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-xs text-heading/60 max-w-[180px]">
                                {isPayment
                                  ? <span>
                                      {row.mode && <span className="capitalize">{row.mode}</span>}
                                      {row.mode === 'cash' && row.cash_handler && ` · ${row.cash_handler}`}
                                      {row.mode === 'bank' && row.bank_name && ` · ${row.bank_name}`}
                                      {row.remarks && ` · ${row.remarks}`}
                                    </span>
                                  : <span>{[row.truck_number, row.load_from && row.billed_destination ? `${row.load_from} → ${row.billed_destination}` : row.load_from || row.billed_destination, row.material_name].filter(Boolean).join(' · ')}</span>
                                }
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-blue-700 dark:text-blue-300">
                                {!isPayment ? formatINR(row.amount) : '—'}
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-green-700 dark:text-green-300">
                                {isReceived ? formatINR(row.amount) : (isPaid ? <span className="text-red-600 dark:text-red-400">{formatINR(row.amount)}</span> : '—')}
                              </td>
                              <td className={`px-4 py-3 text-right font-semibold ${row.balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                {formatINR(row.balance)}
                              </td>
                              <td className="px-4 py-3">
                                {isPayment && isAdmin() && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeletePayment(row, selectedId!)}
                                    className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                    title="Delete payment"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Print Ledger Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40" onClick={() => setShowPrintModal(false)}>
          <div className="flex min-h-full items-center justify-center px-4 py-6" onClick={(e) => e.stopPropagation()}>
            <div className="w-full max-w-xs rounded-xl bg-card shadow-2xl">
              <div className="flex items-center justify-between border-b border-card-border px-5 py-4">
                <div>
                  <h2 className="font-semibold text-heading">Print Ledger</h2>
                  <p className="text-xs text-heading/60 mt-0.5">{ledger?.transporter.name}</p>
                </div>
                <button type="button" onClick={() => setShowPrintModal(false)} className="rounded-lg p-1.5 hover:bg-card-border/50">
                  <X className="h-5 w-5 text-heading/60" />
                </button>
              </div>
              <div className="p-5 flex flex-col gap-3">
                <p className="text-sm text-heading/70">Choose print format:</p>
                <button
                  type="button"
                  onClick={() => handlePrint(false)}
                  className="w-full rounded-lg border border-card-border bg-surface px-4 py-3 text-left hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                >
                  <p className="font-medium text-sm text-heading">Without GST</p>
                  <p className="text-xs text-heading/50 mt-0.5">Print basic ledger with base amounts only</p>
                </button>
                <button
                  type="button"
                  onClick={() => handlePrint(true)}
                  className="w-full rounded-lg border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 px-4 py-3 text-left hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                >
                  <p className="font-medium text-sm text-blue-700 dark:text-blue-300">With GST (18%)</p>
                  <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-0.5">Includes GST breakdown at the bottom</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GST Breakdown Popup */}
      {gstPopup && (() => {
        const base = Number(gstPopup.total_commission) + Number(gstPopup.total_advance_diesel) + Number(gstPopup.total_trip_diesel);
        const gst = base * 0.18;
        const total = base + gst;
        return (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40" onClick={() => setGstPopup(null)}>
            <div className="flex min-h-full items-start justify-center px-4 py-10" onClick={(e) => e.stopPropagation()}>
              <div className="w-full max-w-xs rounded-xl bg-card shadow-2xl">
                <div className="flex items-center justify-between border-b border-card-border px-5 py-4">
                  <div>
                    <h2 className="font-semibold text-heading">GST Breakdown</h2>
                    <p className="text-xs text-heading/60 mt-0.5">{gstPopup.name}</p>
                  </div>
                  <button type="button" onClick={() => setGstPopup(null)} className="rounded-lg p-1.5 hover:bg-card-border/50">
                    <X className="h-5 w-5 text-heading/60" />
                  </button>
                </div>
                <div className="p-5 flex flex-col gap-1 text-sm">
                  <div className="flex items-center justify-between py-1.5 border-b border-card-border/50">
                    <span className="text-heading/70">Commission</span>
                    <span className="font-medium text-heading">{formatINR(Number(gstPopup.total_commission))}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-card-border/50">
                    <span className="text-heading/70">Trip Diesel</span>
                    <span className="font-medium text-heading">{formatINR(Number(gstPopup.total_advance_diesel))}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-card-border/50">
                    <span className="text-heading/70">Add. Diesel</span>
                    <span className="font-medium text-heading">{formatINR(Number(gstPopup.total_trip_diesel))}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-card-border/50 font-medium">
                    <span className="text-heading/80">Base Total</span>
                    <span className="text-heading">{formatINR(base)}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-card-border/50 text-blue-600 dark:text-blue-400">
                    <span>GST @ 18%</span>
                    <span className="font-medium">{formatINR(gst)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 mt-1 border-t-2 border-orange-200 dark:border-orange-800 font-semibold">
                    <span className="text-orange-700 dark:text-orange-300">Total with GST</span>
                    <span className="text-orange-600 dark:text-orange-400">{formatINR(total)}</span>
                  </div>
                  <p className="mt-3 text-[11px] text-heading/40 text-center">Calculation only — not saved</p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Add Transporter Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40">
          <div className="flex min-h-full items-center justify-center px-4 py-6">
            <div className="w-full max-w-sm rounded-xl bg-card shadow-2xl">
              <div className="flex items-center justify-between border-b border-card-border px-5 py-4">
                <h2 className="font-semibold text-heading">Add Transporter</h2>
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg p-1.5 hover:bg-card-border/50">
                  <X className="h-5 w-5 text-heading/60" />
                </button>
              </div>
              <form onSubmit={handleAddTransporter} className="p-5 flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-medium text-heading/70 mb-1">Name *</label>
                  <input autoFocus className="input-field" value={tForm.name}
                    onChange={(e) => setTForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Transporter name" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-heading/70 mb-1">Phone</label>
                  <input className="input-field" value={tForm.phone}
                    onChange={(e) => setTForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="Optional" />
                </div>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-card-border text-orange-500 focus:ring-orange-500"
                    checked={tForm.has_gst}
                    onChange={(e) => setTForm((p) => ({ ...p, has_gst: e.target.checked }))}
                  />
                  <span className="text-sm text-heading">
                    Has GST?
                    <span className="block text-[11px] text-heading/60">If yes, +18% GST is added on top of freight in Trip Log.</span>
                  </span>
                </label>
                <div className="flex justify-end gap-3 pt-1">
                  <button type="button" onClick={() => setModalOpen(false)}
                    className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-heading/80 hover:bg-surface">
                    Cancel
                  </button>
                  <button type="submit" disabled={tSaving || !tForm.name.trim()}
                    className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-60">
                    {tSaving ? 'Adding…' : 'Add Transporter'}
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
