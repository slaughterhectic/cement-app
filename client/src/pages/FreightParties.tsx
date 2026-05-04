import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, X, Building2 } from 'lucide-react';
import { api } from '../lib/api';
import { formatINR, formatDate } from '../lib/format';
import { useToastStore, useAuthStore } from '../lib/store';

interface FreightPartyRow {
  id: number;
  name: string;
  phone: string | null;
  is_active: number;
  opening_balance: number;
  purchase_count: number;
  total_freight: number;
  total_paid: number;
  total_received: number;
  outstanding: number;
}

interface LedgerEntry {
  source_id?: number;
  date: string;
  entry_type: 'freight' | 'payment';
  payment_type?: 'paid' | 'received';
  amount: number;
  particulars: string;
  qty?: number;
  rate?: number;
  mode: string | null;
  bank_name: string | null;
  cash_handler?: string | null;
  remarks: string | null;
  balance: number;
}

interface LedgerData {
  freight_party: FreightPartyRow;
  ledger: LedgerEntry[];
  totalFreight: number;
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

export default function FreightParties() {
  const addToast = useToastStore((s) => s.addToast);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const [freightParties, setFreightParties] = useState<FreightPartyRow[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [ledger, setLedger] = useState<LedgerData | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [payForm, setPayForm] = useState(emptyPayForm);
  const [addPayOpen, setAddPayOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [banks, setBanks] = useState<{ id: number; bank_name: string }[]>([]);
  const [cashHandlers, setCashHandlers] = useState<string[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [tForm, setTForm] = useState({ name: '', phone: '', opening_balance: '' });
  const [tSaving, setTSaving] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'outstanding_desc' | 'outstanding_asc' | 'freight_desc' | 'paid_desc' | 'name_asc'>('outstanding_desc');

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      setFreightParties(await api.freightParties.list());
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed', 'error');
    } finally { setLoadingList(false); }
  }, [addToast]);

  const loadLedger = useCallback(async (id: number) => {
    setLoadingLedger(true);
    try {
      setLedger(await api.freightParties.ledger(id));
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
    if (payForm.mode === 'cash' && !payForm.cash_handler) { addToast('Select a cash handler', 'error'); return; }
    if (payForm.mode === 'bank' && !payForm.bank_name) { addToast('Select a bank', 'error'); return; }
    setSaving(true);
    try {
      const result = await api.freightParties.addPayment(selectedId, {
        date: payForm.date,
        amount: Number(payForm.amount),
        payment_type: payForm.payment_type,
        mode: payForm.mode,
        bank_name: payForm.mode === 'bank' ? (payForm.bank_name || null) : null,
        cash_handler: payForm.mode === 'cash' ? (payForm.cash_handler || null) : null,
        remarks: payForm.remarks || null,
      });
      if ((result as any).pending) addToast('Entry sent for admin approval', 'info');
      else addToast('Payment recorded', 'success');
      setPayForm(emptyPayForm);
      setAddPayOpen(false);
      loadLedger(selectedId);
      loadList();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed', 'error');
    } finally { setSaving(false); }
  };

  const handleAddFreightParty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tForm.name.trim()) return;
    setTSaving(true);
    try {
      await api.freightParties.create({
        name: tForm.name.trim(),
        phone: tForm.phone.trim() || undefined,
        opening_balance: tForm.opening_balance ? Number(tForm.opening_balance) : undefined,
      });
      addToast('Freight party added', 'success');
      setModalOpen(false);
      setTForm({ name: '', phone: '', opening_balance: '' });
      loadList();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed', 'error');
    } finally { setTSaving(false); }
  };

  const handleDeletePayment = async (entry: LedgerEntry, freightPartyId: number) => {
    if (!entry.source_id) return;
    if (!window.confirm('Delete this payment?')) return;
    try {
      await api.freightParties.deletePayment(freightPartyId, entry.source_id);
      addToast('Payment deleted', 'success');
      loadLedger(freightPartyId);
      loadList();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed', 'error');
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Delete freight party "${name}"?`)) return;
    try {
      await api.freightParties.delete(id);
      addToast('Deleted', 'success');
      if (selectedId === id) setSelectedId(null);
      loadList();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed', 'error');
    }
  };

  const filteredFreightParties = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = freightParties.filter((fp) => {
      if (q && !fp.name.toLowerCase().includes(q) && !(fp.phone || '').toLowerCase().includes(q)) return false;
      return true;
    });
    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sortBy) {
        case 'outstanding_desc': return (b.outstanding ?? 0) - (a.outstanding ?? 0);
        case 'outstanding_asc':  return (a.outstanding ?? 0) - (b.outstanding ?? 0);
        case 'freight_desc':     return (b.total_freight ?? 0) - (a.total_freight ?? 0);
        case 'paid_desc':        return (b.total_paid ?? 0) - (a.total_paid ?? 0);
        case 'name_asc':         return a.name.localeCompare(b.name);
        default: return 0;
      }
    });
    return sorted;
  }, [freightParties, searchQuery, sortBy]);

  const aggregates = useMemo(() => filteredFreightParties.reduce((acc, fp) => ({
    freight: acc.freight + (Number(fp.total_freight) || 0),
    paid: acc.paid + (Number(fp.total_paid) || 0),
    received: acc.received + (Number(fp.total_received) || 0),
    outstanding: acc.outstanding + (Number(fp.outstanding) || 0),
  }), { freight: 0, paid: 0, received: 0, outstanding: 0 }), [filteredFreightParties]);

  const ENTRY_LABELS: Record<string, { label: string; color: string }> = {
    freight: { label: 'Freight', color: 'text-orange-600 dark:text-orange-400' },
    payment: { label: 'Payment', color: 'text-green-600 dark:text-green-400' },
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading">Freight Parties</h1>
          <p className="text-sm text-heading/60 mt-1">Freight charges & payment tracking</p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Freight Party
        </button>
      </div>

      {/* Overall KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-3 text-center bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800">
          <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium uppercase tracking-wider">Total Freight</p>
          <p className="text-base font-bold text-heading">{formatINR(aggregates.freight)}</p>
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
        <select className="input-field py-1.5 text-sm" value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}>
          <option value="outstanding_desc">Sort: Outstanding ↓</option>
          <option value="outstanding_asc">Sort: Outstanding ↑</option>
          <option value="freight_desc">Sort: Freight ↓</option>
          <option value="paid_desc">Sort: Paid ↓</option>
          <option value="name_asc">Sort: Name A–Z</option>
        </select>
        <span className="text-xs text-heading/60">{filteredFreightParties.length} of {freightParties.length}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 items-start">
        {/* Left: list */}
        <div className="card p-0 overflow-hidden">
          <div className="border-b border-card-border px-4 py-3 bg-brand-50 dark:bg-brand-900/30">
            <p className="font-semibold text-brand-700 dark:text-brand-300 text-sm">All Freight Parties</p>
          </div>
          {loadingList ? (
            <div className="p-6 text-center text-heading/50 text-sm">Loading…</div>
          ) : filteredFreightParties.length === 0 ? (
            <div className="p-6 text-center text-heading/50 text-sm">{freightParties.length === 0 ? 'No freight parties yet' : 'No matches'}</div>
          ) : (
            <div className="divide-y divide-card-border">
              {filteredFreightParties.map((fp) => (
                <div
                  key={fp.id}
                  onClick={() => setSelectedId(fp.id === selectedId ? null : fp.id)}
                  className={`cursor-pointer px-4 py-3 transition-colors ${
                    selectedId === fp.id ? 'bg-brand-50 dark:bg-brand-900/30 border-l-4 border-l-brand-500' : 'hover:bg-surface border-l-4 border-l-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-heading truncate">{fp.name}</p>
                      {fp.phone && <p className="text-xs text-heading/50">{fp.phone}</p>}
                      <p className="text-xs text-heading/50">{fp.purchase_count} purchases</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-xs font-semibold ${fp.outstanding > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                        {formatINR(fp.outstanding)}
                      </p>
                      <p className="text-xs text-heading/50">outstanding</p>
                    </div>
                  </div>
                  {isAdmin() && (
                    <button type="button" onClick={(e) => { e.stopPropagation(); handleDelete(fp.id, fp.name); }} className="mt-1 text-xs text-red-500 hover:underline">
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
              <Building2 className="h-12 w-12 text-brand-200 mb-3" />
              <p className="text-heading/50">Select a freight party to view their ledger</p>
            </div>
          ) : loadingLedger ? (
            <div className="card flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            </div>
          ) : ledger ? (
            <>
              <div className="grid grid-cols-4 gap-3">
                <div className="card p-4 text-center bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium uppercase tracking-wide">Total Freight</p>
                  <p className="text-lg font-bold text-heading">{formatINR(ledger.totalFreight)}</p>
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

              <div className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-medium text-sm text-heading">Record Payment — {ledger.freight_party.name}</p>
                  <button type="button" onClick={() => setAddPayOpen(!addPayOpen)} className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 transition-colors">
                    <Plus className="h-3 w-3" /> Add Payment
                  </button>
                </div>
                {addPayOpen && (
                  <form onSubmit={handleAddPayment} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-heading/70 mb-1">Date *</label>
                      <input type="date" className="input-field py-1.5 text-sm" value={payForm.date} onChange={(e) => setPayForm({ ...payForm, date: e.target.value })} required />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-heading/70 mb-1">Amount *</label>
                      <input type="number" min="0" step="0.01" className="input-field py-1.5 text-sm" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} required />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-heading/70 mb-1">Direction</label>
                      <div className="flex items-center gap-1 rounded-lg border border-card-border bg-surface p-0.5 text-sm">
                        {(['paid', 'received'] as const).map((v) => (
                          <button key={v} type="button" onClick={() => setPayForm({ ...payForm, payment_type: v })} className={`flex-1 px-3 py-1 rounded-md font-medium capitalize transition-colors ${payForm.payment_type === v ? 'bg-brand-500 text-white' : 'text-heading/70 hover:bg-card-border/40'}`}>
                            {v === 'paid' ? 'Paid (Dr)' : 'Received (Cr)'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-heading/70 mb-1">Mode</label>
                      <div className="flex items-center gap-1 rounded-lg border border-card-border bg-surface p-0.5 text-sm">
                        {(['cash', 'bank'] as const).map((m) => (
                          <button key={m} type="button" onClick={() => setPayForm({ ...payForm, mode: m })} className={`flex-1 px-3 py-1 rounded-md font-medium capitalize transition-colors ${payForm.mode === m ? 'bg-brand-500 text-white' : 'text-heading/70 hover:bg-card-border/40'}`}>
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                    {payForm.mode === 'cash' ? (
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-heading/70 mb-1">Cash handler *</label>
                        <select className="input-field py-1.5 text-sm" value={payForm.cash_handler} onChange={(e) => setPayForm({ ...payForm, cash_handler: e.target.value })} required>
                          <option value="">Select handler</option>
                          {cashHandlers.map((h) => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                    ) : (
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-heading/70 mb-1">Bank *</label>
                        <select className="input-field py-1.5 text-sm" value={payForm.bank_name} onChange={(e) => setPayForm({ ...payForm, bank_name: e.target.value })} required>
                          <option value="">Select bank</option>
                          {banks.map((b) => <option key={b.id} value={b.bank_name}>{b.bank_name}</option>)}
                        </select>
                      </div>
                    )}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-heading/70 mb-1">Remarks</label>
                      <input type="text" className="input-field py-1.5 text-sm" value={payForm.remarks} onChange={(e) => setPayForm({ ...payForm, remarks: e.target.value })} placeholder="Optional" />
                    </div>
                    <div className="sm:col-span-2 flex justify-end gap-2">
                      <button type="button" onClick={() => setAddPayOpen(false)} className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-heading/80 hover:bg-surface">Cancel</button>
                      <button type="submit" disabled={saving} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
                        {saving ? 'Saving…' : 'Save Payment'}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              <div className="card p-0 overflow-hidden">
                <div className="border-b border-card-border px-4 py-3 bg-brand-50 dark:bg-brand-900/30">
                  <p className="font-medium text-brand-700 dark:text-brand-300 text-sm">Ledger — {ledger.freight_party.name}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-card-border bg-surface text-left">
                        <th className="px-4 py-2 font-medium text-heading/70">Date</th>
                        <th className="px-4 py-2 font-medium text-heading/70">Type</th>
                        <th className="px-4 py-2 font-medium text-heading/70">Details</th>
                        <th className="px-4 py-2 font-medium text-heading/70 text-right">Debit</th>
                        <th className="px-4 py-2 font-medium text-heading/70 text-right">Credit</th>
                        <th className="px-4 py-2 font-medium text-heading/70 text-right">Balance</th>
                        <th className="px-4 py-2 font-medium text-heading/70">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledger.ledger.length === 0 ? (
                        <tr><td colSpan={7} className="px-4 py-8 text-center text-heading/50">No ledger entries yet</td></tr>
                      ) : (
                        ledger.ledger.map((e, i) => {
                          const lbl = ENTRY_LABELS[e.entry_type] ?? { label: e.entry_type, color: 'text-heading/60' };
                          const isPayment = e.entry_type === 'payment';
                          // For freight party — we owe them. Freight = debit on our books, payment paid = credit on our books.
                          const debit  = isPayment ? 0 : e.amount;
                          const credit = isPayment ? e.amount : 0;
                          return (
                            <tr key={i} className="border-b border-card-border last:border-0">
                              <td className="px-4 py-2 whitespace-nowrap">{formatDate(e.date)}</td>
                              <td className={`px-4 py-2 ${lbl.color} font-medium`}>{lbl.label}{isPayment && e.payment_type === 'received' ? ' (Cr)' : isPayment ? ' (Dr)' : ''}</td>
                              <td className="px-4 py-2 text-heading/70 text-xs">{e.particulars}</td>
                              <td className="px-4 py-2 text-right">{debit > 0 ? formatINR(debit) : '—'}</td>
                              <td className="px-4 py-2 text-right">{credit > 0 ? formatINR(credit) : '—'}</td>
                              <td className="px-4 py-2 text-right font-semibold">{formatINR(e.balance)}</td>
                              <td className="px-4 py-2">
                                {isPayment && isAdmin() && e.source_id && (
                                  <button type="button" onClick={() => handleDeletePayment(e, ledger.freight_party.id)} className="text-xs text-red-500 hover:underline">Delete</button>
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

      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40">
          <div className="flex min-h-full items-center justify-center px-4 py-6">
            <div className="w-full max-w-sm rounded-xl bg-card shadow-2xl">
              <div className="flex items-center justify-between border-b border-card-border px-5 py-4">
                <h2 className="font-semibold text-heading">Add Freight Party</h2>
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg p-1.5 hover:bg-card-border/50">
                  <X className="h-5 w-5 text-heading/60" />
                </button>
              </div>
              <form onSubmit={handleAddFreightParty} className="p-5 flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-medium text-heading/70 mb-1">Name *</label>
                  <input autoFocus className="input-field" value={tForm.name} onChange={(e) => setTForm((p) => ({ ...p, name: e.target.value }))} placeholder="Freight party name" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-heading/70 mb-1">Phone</label>
                  <input className="input-field" value={tForm.phone} onChange={(e) => setTForm((p) => ({ ...p, phone: e.target.value }))} placeholder="Optional" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-heading/70 mb-1">Opening balance</label>
                  <input type="number" step="0.01" className="input-field" value={tForm.opening_balance} onChange={(e) => setTForm((p) => ({ ...p, opening_balance: e.target.value }))} placeholder="0 (we owe them at start)" />
                </div>
                <div className="flex justify-end gap-3 pt-1">
                  <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-heading/80 hover:bg-surface">Cancel</button>
                  <button type="submit" disabled={tSaving || !tForm.name.trim()} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
                    {tSaving ? 'Adding…' : 'Add Freight Party'}
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
