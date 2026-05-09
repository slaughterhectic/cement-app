import { useCallback, useEffect, useState } from 'react';
import { Plus, X, Trash2, ChevronDown, ChevronRight, ArrowDown, ArrowUp } from 'lucide-react';
import { api } from '../../lib/api';
import { formatINR, formatDate } from '../../lib/format';
import { useAuthStore, useToastStore } from '../../lib/store';

type Bank = {
  id: number;
  name: string;
  opening_balance: number;
  is_active: number;
  total_credits: number;
  total_debits: number;
  balance: number;
  all_time_balance?: number;
  day_opening?: number;
  txn_count: number;
};

type Txn = {
  id: number;
  bank_id: number;
  date: string;
  type: 'credit' | 'debit';
  amount: number;
  particulars: string | null;
  remarks: string | null;
  source_table: string | null;
  source_id: number | null;
  balance: number;
};

const emptyForm = { name: '', opening_balance: '' };
const emptyTxn = { date: new Date().toISOString().split('T')[0], type: 'credit' as 'credit' | 'debit', amount: '', particulars: '', remarks: '' };

export default function TransportBanks() {
  const addToast = useToastStore((s) => s.addToast);
  const canEditTransport = useAuthStore((s) => s.canEditTransport());
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<string>(new Date().toISOString().split('T')[0]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [statements, setStatements] = useState<Record<number, Txn[]>>({});
  const [stmtLoading, setStmtLoading] = useState<Record<number, boolean>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Bank | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [txnTarget, setTxnTarget] = useState<Bank | null>(null);
  const [txnForm, setTxnForm] = useState(emptyTxn);
  const [txnSaving, setTxnSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setBanks(await api.rlBanks.list(dateFilter)); }
    catch (e) { addToast(e instanceof Error ? e.message : 'Failed to load banks', 'error'); }
    finally { setLoading(false); }
  }, [addToast, dateFilter]);

  useEffect(() => { load(); }, [load]);

  const toggle = async (id: number) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (statements[id]) return;
    setStmtLoading((p) => ({ ...p, [id]: true }));
    try {
      const data = await api.rlBanks.statement(id);
      setStatements((p) => ({ ...p, [id]: data.ledger || [] }));
    } catch (e) { addToast(e instanceof Error ? e.message : 'Failed to load statement', 'error'); }
    finally { setStmtLoading((p) => ({ ...p, [id]: false })); }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { addToast('Bank name required', 'error'); return; }
    setSaving(true);
    try {
      if (editing) await api.rlBanks.update(editing.id, { name: form.name.trim(), opening_balance: Number(form.opening_balance) || 0, is_active: editing.is_active });
      else await api.rlBanks.create({ name: form.name.trim(), opening_balance: Number(form.opening_balance) || 0 });
      addToast(editing ? 'Bank updated' : 'Bank added', 'success');
      setAddOpen(false); setEditing(null); setForm(emptyForm); load();
    } catch (e) { addToast(e instanceof Error ? e.message : 'Save failed', 'error'); }
    finally { setSaving(false); }
  };

  const submitTxn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txnTarget || !txnForm.amount) return;
    setTxnSaving(true);
    try {
      const result = await api.rlBanks.addTransaction(txnTarget.id, {
        date: txnForm.date, type: txnForm.type, amount: Number(txnForm.amount),
        particulars: txnForm.particulars || null, remarks: txnForm.remarks || null,
      });
      if ((result as any).pending) addToast('Sent for admin approval', 'info');
      else addToast('Transaction added', 'success');
      setTxnTarget(null); setTxnForm(emptyTxn);
      // refresh both list and the expanded statement
      load();
      setStatements((p) => { const c = { ...p }; delete c[txnTarget.id]; return c; });
      if (expanded === txnTarget.id) toggle(txnTarget.id);
    } catch (e) { addToast(e instanceof Error ? e.message : 'Save failed', 'error'); }
    finally { setTxnSaving(false); }
  };

  const today = new Date().toISOString().split('T')[0];
  const isToday = dateFilter === today;
  const activeBanks = banks.filter((b) => b.is_active);
  const totalOpening  = activeBanks.reduce((s, b) => s + (b.day_opening  ?? b.opening_balance), 0);
  const totalCredits  = activeBanks.reduce((s, b) => s + b.total_credits,  0);
  const totalDebits   = activeBanks.reduce((s, b) => s + b.total_debits,   0);
  const totalClosing  = activeBanks.reduce((s, b) => s + b.balance, 0);

  const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading">Bank</h1>
          <p className="text-sm text-heading/60 mt-1">TransportBook-only banks. All credits / debits stay scoped to this book.</p>
        </div>
        <button type="button" onClick={() => { setEditing(null); setForm(emptyForm); setAddOpen(true); }}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-600">
          <Plus className="h-4 w-4" /> Add Bank
        </button>
      </div>

      {/* Date filter */}
      <div className="card flex flex-wrap items-center gap-3 p-3">
        <label className="text-sm font-medium text-heading/70">Date:</label>
        <input type="date" className="input-field py-1.5 text-sm" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
        <button type="button" onClick={() => setDateFilter(today)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${isToday ? 'bg-indigo-500 text-white' : 'border border-card-border text-heading/70 hover:bg-surface'}`}>
          Today
        </button>
        <span className="ml-auto text-xs text-heading/60">
          {isToday ? "Today's" : fmtDate(dateFilter)} opening / closing per bank
        </span>
      </div>

      {/* Summary KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-3 text-center">
          <p className="text-[11px] uppercase tracking-wider font-medium text-heading/60">Opening</p>
          <p className="text-lg font-bold text-heading mt-0.5">{formatINR(totalOpening)}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-[11px] uppercase tracking-wider font-medium text-green-600">Credits</p>
          <p className="text-lg font-bold text-green-700 dark:text-green-300 mt-0.5">{formatINR(totalCredits)}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-[11px] uppercase tracking-wider font-medium text-red-600">Debits</p>
          <p className="text-lg font-bold text-red-700 dark:text-red-300 mt-0.5">{formatINR(totalDebits)}</p>
        </div>
        <div className="card p-3 text-center bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800">
          <p className="text-[11px] uppercase tracking-wider font-medium text-blue-700 dark:text-blue-300">Closing</p>
          <p className="text-lg font-bold text-heading mt-0.5">{formatINR(totalClosing)}</p>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-card-border bg-indigo-50 dark:bg-indigo-900/30 text-left">
                <th className="px-4 py-3 font-medium text-indigo-700 dark:text-indigo-300">Bank</th>
                <th className="px-4 py-3 font-medium text-indigo-700 dark:text-indigo-300 text-right">Opening</th>
                <th className="px-4 py-3 font-medium text-indigo-700 dark:text-indigo-300 text-right text-green-700 dark:text-green-300">Credits</th>
                <th className="px-4 py-3 font-medium text-red-700 dark:text-red-300 text-right">Debits</th>
                <th className="px-4 py-3 font-medium text-indigo-700 dark:text-indigo-300 text-right">Closing</th>
                <th className="px-4 py-3 font-medium text-indigo-700 dark:text-indigo-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-heading/50">Loading…</td></tr>
              ) : banks.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-heading/50">No banks yet. Add one above.</td></tr>
              ) : banks.map((b) => {
                const open = expanded === b.id;
                const list = statements[b.id] || [];
                return (
                  <>
                    <tr key={b.id} className="border-b border-card-border last:border-0 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/20">
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => toggle(b.id)} className="inline-flex items-center gap-2 font-medium text-heading hover:underline">
                          {open ? <ChevronDown className="h-4 w-4 text-heading/60" /> : <ChevronRight className="h-4 w-4 text-heading/60" />}
                          {b.name}
                        </button>
                        {!b.is_active && <span className="ml-2 text-[10px] uppercase rounded-full bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 text-slate-600">Inactive</span>}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-heading/70">{formatINR(b.day_opening ?? b.opening_balance)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-green-700 dark:text-green-300">{formatINR(b.total_credits)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-red-700 dark:text-red-300">{formatINR(b.total_debits)}</td>
                      <td className={`px-4 py-3 text-right tabular-nums font-bold ${b.balance >= 0 ? 'text-indigo-700 dark:text-indigo-300' : 'text-red-700 dark:text-red-300'}`}>{formatINR(b.balance)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => { setTxnForm(emptyTxn); setTxnTarget(b); }}
                            className="rounded bg-indigo-500 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-600">+ Txn</button>
                          {canEditTransport && (
                            <>
                              <button type="button" onClick={() => { setEditing(b); setForm({ name: b.name, opening_balance: String(b.opening_balance) }); setAddOpen(true); }}
                                className="rounded p-1.5 text-heading/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/40">Edit</button>
                              <button type="button" onClick={async () => {
                                if (!window.confirm(`Delete bank "${b.name}"? All its transactions will be deleted too.`)) return;
                                try { await api.rlBanks.delete(b.id); addToast('Deleted'); load(); }
                                catch (e) { addToast(e instanceof Error ? e.message : 'Failed', 'error'); }
                              }} className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"><Trash2 className="h-3.5 w-3.5" /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    {open && (
                      <tr key={`${b.id}-stmt`} className="bg-surface/60">
                        <td colSpan={6} className="px-4 py-3">
                          {stmtLoading[b.id] ? (
                            <p className="py-4 text-center text-xs text-heading/60">Loading statement…</p>
                          ) : list.length === 0 ? (
                            <p className="py-4 text-center text-xs text-heading/60">No transactions yet.</p>
                          ) : (
                            <div className="max-h-[480px] overflow-y-auto rounded-lg border border-card-border bg-card">
                              <table className="min-w-full text-xs">
                                <thead className="sticky top-0 bg-surface">
                                  <tr className="text-left text-[11px] font-medium uppercase tracking-wide text-heading/60">
                                    <th className="px-3 py-2">Date</th>
                                    <th className="px-3 py-2">Type</th>
                                    <th className="px-3 py-2">Particulars</th>
                                    <th className="px-3 py-2 text-right">Credit</th>
                                    <th className="px-3 py-2 text-right">Debit</th>
                                    <th className="px-3 py-2 text-right">Balance</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-card-border">
                                  {list.map((t) => (
                                    <tr key={t.id} className="hover:bg-surface/70">
                                      <td className="px-3 py-2 whitespace-nowrap">{formatDate(t.date)}</td>
                                      <td className="px-3 py-2">
                                        {t.type === 'credit' ? (
                                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/40 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:text-green-300"><ArrowDown className="h-2.5 w-2.5" /> Credit</span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-900/40 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:text-red-300"><ArrowUp className="h-2.5 w-2.5" /> Debit</span>
                                        )}
                                      </td>
                                      <td className="px-3 py-2 text-heading/80">
                                        {t.particulars || '—'}
                                        {t.remarks && <p className="text-[11px] text-heading/50">{t.remarks}</p>}
                                      </td>
                                      <td className="px-3 py-2 text-right tabular-nums text-green-700 dark:text-green-300">{t.type === 'credit' ? formatINR(t.amount) : '—'}</td>
                                      <td className="px-3 py-2 text-right tabular-nums text-red-700 dark:text-red-300">{t.type === 'debit' ? formatINR(t.amount) : '—'}</td>
                                      <td className="px-3 py-2 text-right tabular-nums font-medium">{formatINR(t.balance)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-card-border px-5 py-4">
              <h2 className="font-semibold text-heading">{editing ? 'Edit Bank' : 'Add Bank'}</h2>
              <button type="button" onClick={() => { setAddOpen(false); setEditing(null); }} className="rounded-lg p-1.5 hover:bg-card-border/50"><X className="h-5 w-5 text-heading/60" /></button>
            </div>
            <form onSubmit={submit} className="p-5 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-heading/70 mb-1">Name *</label>
                <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
              </div>
              <div>
                <label className="block text-xs font-medium text-heading/70 mb-1">Opening Balance (₹)</label>
                <input type="number" step="0.01" className="input-field" value={form.opening_balance} onChange={(e) => setForm({ ...form, opening_balance: e.target.value })} placeholder="0" />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => { setAddOpen(false); setEditing(null); }} className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-heading/80 hover:bg-surface">Cancel</button>
                <button type="submit" disabled={saving} className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600 disabled:opacity-60">{saving ? 'Saving…' : (editing ? 'Update' : 'Add Bank')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {txnTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-card-border px-5 py-4">
              <div>
                <h2 className="font-semibold text-heading">Add Transaction</h2>
                <p className="text-xs text-heading/60">{txnTarget.name}</p>
              </div>
              <button type="button" onClick={() => setTxnTarget(null)} className="rounded-lg p-1.5 hover:bg-card-border/50"><X className="h-5 w-5 text-heading/60" /></button>
            </div>
            <form onSubmit={submitTxn} className="p-5 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-heading/70 mb-1">Date *</label>
                  <input type="date" className="input-field" value={txnForm.date} onChange={(e) => setTxnForm({ ...txnForm, date: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-heading/70 mb-1">Amount (₹) *</label>
                  <input type="number" min="0" step="0.01" className="input-field" value={txnForm.amount} onChange={(e) => setTxnForm({ ...txnForm, amount: e.target.value })} required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-heading/70 mb-1">Direction *</label>
                <div className="flex items-center gap-1 rounded-lg border border-card-border bg-surface p-0.5 text-sm">
                  {(['credit', 'debit'] as const).map((t) => (
                    <button key={t} type="button" onClick={() => setTxnForm({ ...txnForm, type: t })}
                      className={`flex-1 px-3 py-1.5 rounded-md font-medium capitalize transition-colors ${txnForm.type === t ? 'bg-indigo-500 text-white' : 'text-heading/70 hover:bg-card-border/40'}`}>
                      {t === 'credit' ? 'Credit (money in)' : 'Debit (money out)'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-heading/70 mb-1">Particulars</label>
                <input className="input-field" value={txnForm.particulars} onChange={(e) => setTxnForm({ ...txnForm, particulars: e.target.value })} placeholder="e.g. Payment received from ACC" />
              </div>
              <div>
                <label className="block text-xs font-medium text-heading/70 mb-1">Remarks</label>
                <input className="input-field" value={txnForm.remarks} onChange={(e) => setTxnForm({ ...txnForm, remarks: e.target.value })} placeholder="Optional" />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setTxnTarget(null)} className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-heading/80 hover:bg-surface">Cancel</button>
                <button type="submit" disabled={txnSaving} className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600 disabled:opacity-60">{txnSaving ? 'Saving…' : 'Add Transaction'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
