import { useCallback, useEffect, useState } from 'react';
import { CreditCard, ChevronDown, ChevronUp, Truck, Plus, Trash2, X, Building2, Wallet } from 'lucide-react';
import { api } from '../../lib/api';
import { formatINR, formatDate } from '../../lib/format';
import { useToastStore } from '../../lib/store';
import { useNavigate } from 'react-router-dom';

interface OwnerSummary {
  owner_name: string;
  trip_count: number;
  total_payable: number;
  advances_paid: number;
  payments_made: number;
  gps_rent: number;
  outstanding: number;
}

interface Payment {
  id: number;
  owner_name: string;
  date: string;
  amount: number;
  mode: 'bank' | 'cash';
  bank_name: string | null;
  cash_handler: string | null;
  remarks: string | null;
}

const emptyForm = () => ({
  date: new Date().toISOString().split('T')[0],
  amount: '',
  mode: 'bank' as 'bank' | 'cash',
  bank_name: '',
  cash_handler: '',
  remarks: '',
});

export default function TransportPayments() {
  const addToast = useToastStore((s) => s.addToast);
  const navigate = useNavigate();

  const [owners, setOwners] = useState<OwnerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [payments, setPayments] = useState<Record<string, Payment[]>>({});
  const [loadingPayments, setLoadingPayments] = useState<Record<string, boolean>>({});
  const [showForm, setShowForm] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [banks, setBanks] = useState<string[]>([]);
  const [cashHandlers, setCashHandlers] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await api.rlOwners.paymentsSummary();
      setOwners(rows);
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to load', 'error');
    } finally { setLoading(false); }
  }, [addToast]);

  useEffect(() => {
    load();
    api.rlBanks.list().then((b: any[]) => setBanks(b.filter((x) => x.is_active !== 0).map((x) => x.name))).catch(() => {});
    api.rlCashHandler.listHandlers().then((h) => setCashHandlers(h.filter((x) => x.is_active !== 0).map((x) => x.name))).catch(() => {});
  }, [load]);

  const toggleOwner = async (name: string) => {
    if (expanded === name) { setExpanded(null); setShowForm(null); return; }
    setExpanded(name);
    if (!payments[name]) {
      setLoadingPayments((m) => ({ ...m, [name]: true }));
      try {
        const rows = await api.rlOwnerPayments.list(name);
        setPayments((m) => ({ ...m, [name]: rows }));
      } catch { /* silent */ }
      finally { setLoadingPayments((m) => ({ ...m, [name]: false })); }
    }
  };

  const openForm = (ownerName: string) => {
    setForm(emptyForm());
    setShowForm(ownerName);
  };

  const handleCreate = async () => {
    if (!showForm) return;
    const amt = Number(form.amount);
    if (!amt || amt <= 0) { addToast('Amount must be positive', 'error'); return; }
    if (!form.date) { addToast('Date is required', 'error'); return; }
    setSaving(true);
    try {
      await api.rlOwnerPayments.create({
        owner_name: showForm,
        date: form.date,
        amount: amt,
        mode: form.mode,
        bank_name: form.mode === 'bank' ? form.bank_name || null : null,
        cash_handler: form.mode === 'cash' ? form.cash_handler || null : null,
        remarks: form.remarks || null,
      });
      addToast('Payment recorded', 'success');
      setShowForm(null);
      // Refresh payments and summary
      const [rows, updated] = await Promise.all([
        api.rlOwnerPayments.list(showForm),
        api.rlOwners.paymentsSummary(),
      ]);
      setPayments((m) => ({ ...m, [showForm]: rows }));
      setOwners(updated);
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to save payment', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async (ownerName: string, payId: number) => {
    if (!confirm('Delete this payment?')) return;
    try {
      await api.rlOwnerPayments.delete(payId);
      addToast('Payment deleted', 'success');
      const [rows, updated] = await Promise.all([
        api.rlOwnerPayments.list(ownerName),
        api.rlOwners.paymentsSummary(),
      ]);
      setPayments((m) => ({ ...m, [ownerName]: rows }));
      setOwners(updated);
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to delete payment', 'error');
    }
  };

  const filtered = owners.filter((o) =>
    !search || o.owner_name.toLowerCase().includes(search.toLowerCase())
  );

  const totalOutstanding = owners.reduce((s, o) => s + o.outstanding, 0);
  const totalPayable = owners.reduce((s, o) => s + o.total_payable, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading">Owner Payments</h1>
          <p className="text-sm text-heading/60 mt-1">Track payments made to truck owners</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search owner…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-card-border bg-card px-3 py-1.5 text-sm text-heading placeholder-heading/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-44"
          />
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-4 border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20">
          <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">Total Payable</p>
          <p className="text-2xl font-bold text-heading mt-1">{formatINR(totalPayable)}</p>
          <p className="text-xs text-heading/50 mt-0.5">Gross earnings of all owners</p>
        </div>
        <div className="card p-4 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <p className="text-xs font-medium text-red-600 dark:text-red-400">Total Outstanding</p>
          <p className="text-2xl font-bold text-heading mt-1">{formatINR(totalOutstanding)}</p>
          <p className="text-xs text-heading/50 mt-0.5">After advances, payments & GPS rent</p>
        </div>
        <div className="card p-4 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
          <p className="text-xs font-medium text-green-600 dark:text-green-400">Owners</p>
          <p className="text-2xl font-bold text-heading mt-1">{owners.length}</p>
          <p className="text-xs text-heading/50 mt-0.5">{owners.filter((o) => o.outstanding > 0).length} with outstanding balance</p>
        </div>
      </div>

      {/* Owner List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-7 w-7 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Truck className="h-12 w-12 text-heading/20 mx-auto mb-3" />
          <p className="text-heading/60 font-medium">{search ? 'No owners match the search' : 'No owners yet'}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((owner) => {
            const isOpen = expanded === owner.owner_name;
            const ownerPayments = payments[owner.owner_name] || [];
            const isLoadingPay = loadingPayments[owner.owner_name];
            const isFormOpen = showForm === owner.owner_name;

            return (
              <div key={owner.owner_name} className="card overflow-hidden p-0">
                {/* Owner Row */}
                <div
                  className="flex flex-wrap items-center gap-3 px-4 py-3 cursor-pointer hover:bg-surface/50 transition-colors"
                  onClick={() => toggleOwner(owner.owner_name)}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-900/30">
                    <Truck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-heading">{owner.owner_name}</p>
                    <p className="text-xs text-heading/50">{owner.trip_count} trips</p>
                  </div>
                  <div className="flex items-center gap-6 text-right">
                    <div>
                      <p className="text-xs text-heading/50">Payable</p>
                      <p className="font-medium text-heading text-sm">{formatINR(owner.total_payable)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-heading/50">Advances</p>
                      <p className="font-medium text-amber-600 dark:text-amber-400 text-sm">−{formatINR(owner.advances_paid)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-heading/50">Paid</p>
                      <p className="font-medium text-green-600 dark:text-green-400 text-sm">−{formatINR(owner.payments_made)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-heading/50">GPS Rent</p>
                      <p className="font-medium text-red-500 dark:text-red-400 text-sm">−{formatINR(owner.gps_rent)}</p>
                    </div>
                    <div className="min-w-[80px]">
                      <p className="text-xs text-heading/50">Outstanding</p>
                      <p className={`font-bold text-sm ${owner.outstanding > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                        {formatINR(owner.outstanding)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); navigate(`/transportbook/owners/${encodeURIComponent(owner.owner_name)}`); }}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline px-2 py-1 rounded"
                      >
                        Ledger
                      </button>
                      {isOpen ? <ChevronUp className="h-4 w-4 text-heading/40" /> : <ChevronDown className="h-4 w-4 text-heading/40" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Panel */}
                {isOpen && (
                  <div className="border-t border-card-border bg-surface/30 px-4 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-heading text-sm">Payment History</h3>
                      {!isFormOpen && (
                        <button
                          type="button"
                          onClick={() => openForm(owner.owner_name)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" /> Record Payment
                        </button>
                      )}
                    </div>

                    {/* Add Payment Form */}
                    {isFormOpen && (
                      <div className="mb-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">New Payment — {owner.owner_name}</p>
                          <button type="button" onClick={() => setShowForm(null)}>
                            <X className="h-4 w-4 text-heading/50" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-heading/70 mb-1">Date *</label>
                            <input type="date" className="input-field" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} required />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-heading/70 mb-1">Amount (₹) *</label>
                            <input type="number" min="0" step="0.01" className="input-field" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0" required />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-heading/70 mb-1">Mode</label>
                            <select className="input-field" value={form.mode} onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value as 'bank' | 'cash', bank_name: '', cash_handler: '' }))}>
                              <option value="bank">Bank Transfer</option>
                              <option value="cash">Cash</option>
                            </select>
                          </div>
                          {form.mode === 'bank' ? (
                            <div>
                              <label className="block text-xs font-medium text-heading/70 mb-1">Bank</label>
                              <select className="input-field" value={form.bank_name} onChange={(e) => setForm((f) => ({ ...f, bank_name: e.target.value }))}>
                                <option value="">— Select bank —</option>
                                {banks.map((b) => <option key={b} value={b}>{b}</option>)}
                              </select>
                            </div>
                          ) : (
                            <div>
                              <label className="block text-xs font-medium text-heading/70 mb-1">Cash Handler</label>
                              <select className="input-field" value={form.cash_handler} onChange={(e) => setForm((f) => ({ ...f, cash_handler: e.target.value }))}>
                                <option value="">— Select handler —</option>
                                {cashHandlers.map((h) => <option key={h} value={h}>{h}</option>)}
                              </select>
                            </div>
                          )}
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-heading/70 mb-1">Remarks</label>
                            <input className="input-field" value={form.remarks} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} placeholder="Optional note" />
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button
                            type="button"
                            onClick={handleCreate}
                            disabled={saving}
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                          >
                            {saving ? 'Saving…' : 'Save Payment'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowForm(null)}
                            className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-heading/70 hover:bg-surface"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {isLoadingPay ? (
                      <p className="text-sm text-heading/50 py-4 text-center">Loading…</p>
                    ) : ownerPayments.length === 0 ? (
                      <p className="text-sm text-heading/50 py-4 text-center">No payments recorded yet.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-card-border text-left">
                              <th className="py-2 pr-4 text-xs font-medium text-heading/60 uppercase tracking-wider">Date</th>
                              <th className="py-2 pr-4 text-xs font-medium text-heading/60 uppercase tracking-wider text-right">Amount</th>
                              <th className="py-2 pr-4 text-xs font-medium text-heading/60 uppercase tracking-wider">Mode</th>
                              <th className="py-2 pr-4 text-xs font-medium text-heading/60 uppercase tracking-wider">Remarks</th>
                              <th className="py-2 text-xs font-medium text-heading/60 uppercase tracking-wider"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {ownerPayments.map((p) => (
                              <tr key={p.id} className="border-b border-card-border last:border-0">
                                <td className="py-2 pr-4 text-heading/70 whitespace-nowrap">{formatDate(p.date)}</td>
                                <td className="py-2 pr-4 text-right font-medium tabular-nums text-green-600 dark:text-green-400">{formatINR(p.amount)}</td>
                                <td className="py-2 pr-4">
                                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-surface border border-card-border text-heading/60">
                                    {p.mode === 'bank' ? <><Building2 className="h-2.5 w-2.5" /> {p.bank_name || 'Bank'}</> : <><Wallet className="h-2.5 w-2.5" /> {p.cash_handler || 'Cash'}</>}
                                  </span>
                                </td>
                                <td className="py-2 pr-4 text-heading/60 text-xs">{p.remarks || '—'}</td>
                                <td className="py-2">
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(owner.owner_name, p.id)}
                                    className="text-heading/30 hover:text-red-500 transition-colors"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t-2 border-card-border">
                              <td className="py-2 pr-4 text-xs font-medium text-heading/60 uppercase">Total Paid</td>
                              <td className="py-2 pr-4 text-right font-bold tabular-nums text-green-600 dark:text-green-400">
                                {formatINR(ownerPayments.reduce((s, p) => s + p.amount, 0))}
                              </td>
                              <td colSpan={3} />
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
