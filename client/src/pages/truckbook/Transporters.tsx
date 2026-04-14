import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, X, Building2, TrendingUp, TrendingDown } from 'lucide-react';
import { api } from '../../lib/api';
import { formatINR, formatDate } from '../../lib/format';
import { useToastStore, useAuthStore } from '../../lib/store';

interface TransporterRow {
  id: number;
  name: string;
  phone: string | null;
  is_active: number;
  trip_count: number;
  total_commission: number;
  total_advance_diesel: number;
  total_paid: number;
  outstanding: number;
}

interface LedgerEntry {
  id?: number;
  date: string;
  entry_type: 'commission' | 'advance_diesel' | 'payment';
  payment_type?: 'paid' | 'received';
  amount: number;
  truck_number: string | null;
  load_from: string | null;
  billed_destination: string | null;
  material_name: string | null;
  mode: string | null;
  bank_name: string | null;
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
  const [tForm, setTForm] = useState({ name: '', phone: '' });
  const [tSaving, setTSaving] = useState(false);

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
    setSaving(true);
    try {
      await api.transporters.addPayment(selectedId, {
        date: payForm.date,
        amount: Number(payForm.amount),
        payment_type: payForm.payment_type,
        mode: payForm.mode,
        bank_name: payForm.bank_name || null,
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
      await api.transporters.create({ name: tForm.name.trim(), phone: tForm.phone.trim() || undefined });
      addToast('Transporter added', 'success');
      setModalOpen(false);
      setTForm({ name: '', phone: '' });
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

  const ENTRY_LABELS: Record<string, { label: string; color: string }> = {
    commission: { label: 'Commission', color: 'text-blue-600' },
    advance_diesel: { label: 'Adv. Diesel', color: 'text-orange-600' },
    payment: { label: 'Payment', color: 'text-green-600' },
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading">Transporters</h1>
          <p className="text-sm text-gray-500 mt-1">Ledger & payment tracking</p>
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

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 items-start">
        {/* Left: list */}
        <div className="card p-0 overflow-hidden">
          <div className="border-b border-card-border px-4 py-3 bg-orange-50">
            <p className="font-semibold text-orange-700 text-sm">All Transporters</p>
          </div>
          {loadingList ? (
            <div className="p-6 text-center text-gray-400 text-sm">Loading…</div>
          ) : transporters.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">No transporters yet</div>
          ) : (
            <div className="divide-y divide-card-border">
              {transporters.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedId(t.id === selectedId ? null : t.id)}
                  className={`cursor-pointer px-4 py-3 transition-colors ${
                    selectedId === t.id
                      ? 'bg-orange-50 border-l-4 border-l-orange-500'
                      : 'hover:bg-gray-50 border-l-4 border-l-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-heading truncate">{t.name}</p>
                      {t.phone && <p className="text-xs text-gray-400">{t.phone}</p>}
                      <p className="text-xs text-gray-400">{t.trip_count} trips</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-xs font-semibold ${t.outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatINR(t.outstanding)}
                      </p>
                      <p className="text-xs text-gray-400">outstanding</p>
                    </div>
                  </div>
                  {isAdmin() && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDelete(t.id, t.name); }}
                      className="mt-1 text-xs text-red-500 hover:underline"
                    >
                      Delete
                    </button>
                  )}
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
              <p className="text-gray-400">Select a transporter to view their ledger</p>
            </div>
          ) : loadingLedger ? (
            <div className="card flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
            </div>
          ) : ledger ? (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-4 gap-3">
                <div className="card p-4 text-center bg-blue-50 border-blue-200">
                  <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">Total Receivable</p>
                  <p className="text-lg font-bold text-heading">{formatINR(ledger.totalEarned)}</p>
                  <p className="text-xs text-blue-500 mt-0.5">Commission + Diesel</p>
                </div>
                <div className="card p-4 text-center bg-orange-50 border-orange-200">
                  <p className="text-xs text-orange-600 font-medium uppercase tracking-wide">Paid Out</p>
                  <p className="text-lg font-bold text-heading">{formatINR(ledger.totalPaid)}</p>
                </div>
                <div className="card p-4 text-center bg-green-50 border-green-200">
                  <p className="text-xs text-green-600 font-medium uppercase tracking-wide">Received</p>
                  <p className="text-lg font-bold text-heading">{formatINR(ledger.totalReceived ?? 0)}</p>
                </div>
                <div className={`card p-4 text-center ${ledger.outstanding > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                  <p className={`text-xs font-medium uppercase tracking-wide ${ledger.outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>Outstanding</p>
                  <p className={`text-lg font-bold ${ledger.outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatINR(ledger.outstanding)}</p>
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
                            : 'border-card-border text-gray-600 hover:bg-gray-50'
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
                            : 'border-card-border text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        Received from Transporter
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
                        <input type="date" className="input-field" value={payForm.date}
                          onChange={(e) => setPayForm((p) => ({ ...p, date: e.target.value }))} required />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Amount (₹) *</label>
                        <input type="number" min="0" step="0.01" className="input-field" value={payForm.amount}
                          onChange={(e) => setPayForm((p) => ({ ...p, amount: e.target.value }))} placeholder="0" required />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Mode</label>
                        <select className="input-field" value={payForm.mode}
                          onChange={(e) => setPayForm((p) => ({ ...p, mode: e.target.value as 'cash' | 'bank', bank_name: '' }))}>
                          <option value="cash">Cash</option>
                          <option value="bank">Bank</option>
                        </select>
                      </div>
                      {payForm.mode === 'bank' ? (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Bank</label>
                          <select className="input-field" value={payForm.bank_name}
                            onChange={(e) => setPayForm((p) => ({ ...p, bank_name: e.target.value }))}>
                            <option value="">Select bank</option>
                            {banks.map((b) => <option key={b.id} value={b.bank_name}>{b.bank_name}</option>)}
                          </select>
                        </div>
                      ) : cashHandlers.length > 0 ? (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Cash Handler</label>
                          <select className="input-field" value={payForm.bank_name}
                            onChange={(e) => setPayForm((p) => ({ ...p, bank_name: e.target.value }))}>
                            <option value="">Select handler</option>
                            {cashHandlers.map((h) => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>
                      ) : null}
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Remarks</label>
                        <input className="input-field" value={payForm.remarks}
                          onChange={(e) => setPayForm((p) => ({ ...p, remarks: e.target.value }))} placeholder="Optional" />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-3">
                      <button type="button" onClick={() => setAddPayOpen(false)} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
                      <button type="submit" disabled={saving} className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60 transition-colors ${payForm.payment_type === 'received' ? 'bg-green-500 hover:bg-green-600' : 'bg-orange-500 hover:bg-orange-600'}`}>
                        {saving ? 'Saving…' : payForm.payment_type === 'received' ? 'Record Receipt' : 'Record Payment'}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Ledger table */}
              <div className="card overflow-hidden p-0">
                <div className="border-b border-card-border px-4 py-3 bg-orange-50">
                  <p className="font-medium text-orange-700 text-sm">Ledger — {ledger.transporter.name}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-card-border bg-gray-50 text-left">
                        <th className="px-4 py-2.5 font-medium text-gray-600">Date</th>
                        <th className="px-4 py-2.5 font-medium text-gray-600">Type</th>
                        <th className="px-4 py-2.5 font-medium text-gray-600">Details</th>
                        <th className="px-4 py-2.5 font-medium text-gray-600 text-right">Received</th>
                        <th className="px-4 py-2.5 font-medium text-gray-600 text-right">Paid</th>
                        <th className="px-4 py-2.5 font-medium text-gray-600 text-right">Balance</th>
                        <th className="px-4 py-2.5 font-medium text-gray-600">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledger.ledger.length === 0 ? (
                        <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No entries</td></tr>
                      ) : (
                        ledger.ledger.map((row, i) => {
                          const meta = ENTRY_LABELS[row.entry_type] || { label: row.entry_type, color: 'text-gray-600' };
                          const isPayment = row.entry_type === 'payment';
                          const isPaid = isPayment && (row.payment_type ?? 'paid') === 'paid';
                          const isReceived = isPayment && row.payment_type === 'received';
                          return (
                            <tr key={i} className={`border-b border-card-border last:border-0 ${isPayment ? (isReceived ? 'hover:bg-green-50/40' : 'hover:bg-red-50/40') : 'hover:bg-blue-50/40'} transition-colors`}>
                              <td className="px-4 py-3 whitespace-nowrap text-gray-600">{formatDate(row.date)}</td>
                              <td className="px-4 py-3">
                                {isPayment ? (
                                  isReceived ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                                      <TrendingDown className="h-3 w-3" /> Received
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                                      <TrendingUp className="h-3 w-3" /> Paid
                                    </span>
                                  )
                                ) : (
                                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${meta.color === 'text-blue-600' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                    <TrendingUp className="h-3 w-3" /> {meta.label}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-500 max-w-[180px]">
                                {isPayment
                                  ? <span>{row.mode && <span className="capitalize">{row.mode}</span>}{row.bank_name && ` · ${row.bank_name}`}{row.remarks && ` · ${row.remarks}`}</span>
                                  : <span>{[row.truck_number, row.load_from && row.billed_destination ? `${row.load_from} → ${row.billed_destination}` : row.load_from || row.billed_destination, row.material_name].filter(Boolean).join(' · ')}</span>
                                }
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-blue-700">
                                {!isPayment ? formatINR(row.amount) : '—'}
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-green-700">
                                {isReceived ? formatINR(row.amount) : (isPaid ? <span className="text-red-600">{formatINR(row.amount)}</span> : '—')}
                              </td>
                              <td className={`px-4 py-3 text-right font-semibold ${row.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {formatINR(row.balance)}
                              </td>
                              <td className="px-4 py-3">
                                {isPayment && isAdmin() && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeletePayment(row, selectedId!)}
                                    className="rounded p-1 text-red-500 hover:bg-red-50 transition-colors"
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

      {/* Add Transporter Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40">
          <div className="flex min-h-full items-center justify-center px-4 py-6">
            <div className="w-full max-w-sm rounded-xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-card-border px-5 py-4">
                <h2 className="font-semibold text-heading">Add Transporter</h2>
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg p-1.5 hover:bg-gray-100">
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              <form onSubmit={handleAddTransporter} className="p-5 flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                  <input autoFocus className="input-field" value={tForm.name}
                    onChange={(e) => setTForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Transporter name" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                  <input className="input-field" value={tForm.phone}
                    onChange={(e) => setTForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="Optional" />
                </div>
                <div className="flex justify-end gap-3 pt-1">
                  <button type="button" onClick={() => setModalOpen(false)}
                    className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
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
