import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { Fragment } from 'react';
import { api } from '../../lib/api';
import { formatINR, formatDate } from '../../lib/format';
import { useAuthStore, useToastStore } from '../../lib/store';

type Fastag = {
  id: number;
  name: string;
  opening_balance: number;
  is_active: number;
  total_credits: number;
  total_debits: number;
  balance: number;
  remarks: string | null;
};

type Txn = {
  id: number;
  fastag_id: number;
  date: string;
  type: 'credit' | 'debit';
  amount: number;
  bank_name: string | null;
  source_table: string;
  source_id: number | null;
  remarks: string | null;
  truck_number?: string | null;
};

export default function Fastags() {
  const addToast = useToastStore((s) => s.addToast);
  const isAdmin = useAuthStore((s) => s.isAdmin());
  const [rows, setRows] = useState<Fastag[]>([]);
  const [banks, setBanks] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [txns, setTxns] = useState<Record<number, Txn[]>>({});

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', opening_balance: '', remarks: '' });
  const [savingAdd, setSavingAdd] = useState(false);

  const [creditTarget, setCreditTarget] = useState<Fastag | null>(null);
  const [creditForm, setCreditForm] = useState({ date: new Date().toISOString().split('T')[0], amount: '', bank_name: '', remarks: '' });
  const [savingCredit, setSavingCredit] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, bks] = await Promise.all([api.fastags.list(), api.capital.banks()]);
      setRows(list as Fastag[]);
      setBanks((bks as any[]).map((b) => b.bank_name));
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to load', 'error');
    } finally { setLoading(false); }
  }, [addToast]);
  useEffect(() => { load(); }, [load]);

  const toggle = async (id: number) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    try {
      const list = await api.fastags.transactions(id);
      setTxns((m) => ({ ...m, [id]: list as Txn[] }));
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to load transactions', 'error');
    }
  };

  const totalAcrossTags = rows.reduce((s, r) => s + r.balance, 0);

  const saveAdd = async () => {
    if (!addForm.name.trim()) { addToast('Name is required', 'error'); return; }
    setSavingAdd(true);
    try {
      await api.fastags.create({
        name: addForm.name.trim(),
        opening_balance: Number(addForm.opening_balance) || 0,
        remarks: addForm.remarks.trim() || null,
      });
      addToast('FastTag added', 'success');
      setShowAdd(false);
      setAddForm({ name: '', opening_balance: '', remarks: '' });
      load();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally { setSavingAdd(false); }
  };

  const saveCredit = async () => {
    if (!creditTarget) return;
    if (!creditForm.date || !creditForm.amount || !creditForm.bank_name) {
      addToast('Date, amount and bank are required', 'error'); return;
    }
    const amt = Number(creditForm.amount);
    if (!(amt > 0)) { addToast('Amount must be > 0', 'error'); return; }
    setSavingCredit(true);
    try {
      await api.fastags.credit(creditTarget.id, {
        date: creditForm.date, amount: amt, bank_name: creditForm.bank_name,
        remarks: creditForm.remarks.trim() || null,
      });
      addToast('FastTag credited', 'success');
      setCreditTarget(null);
      setCreditForm({ date: new Date().toISOString().split('T')[0], amount: '', bank_name: '', remarks: '' });
      load();
      if (expanded === creditTarget.id) {
        const list = await api.fastags.transactions(creditTarget.id);
        setTxns((m) => ({ ...m, [creditTarget.id]: list as Txn[] }));
      }
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally { setSavingCredit(false); }
  };

  const deleteFastag = async (id: number) => {
    if (!window.confirm('Delete this FastTag account?')) return;
    try {
      await api.fastags.delete(id);
      addToast('Deleted', 'success');
      load();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Delete failed', 'error');
    }
  };

  const deleteTxn = async (fid: number, txId: number) => {
    if (!window.confirm('Delete this FastTag transaction?')) return;
    try {
      await api.fastags.deleteTxn(fid, txId);
      addToast('Deleted', 'success');
      load();
      const list = await api.fastags.transactions(fid);
      setTxns((m) => ({ ...m, [fid]: list as Txn[] }));
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Delete failed', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-heading">FastTags</h1>
          <p className="mt-1 text-sm text-heading/60">FastTag accounts are funded from a bank only. Trip Log toll is auto-deducted from the FastTag picked on the trip — a trip is blocked if the FastTag doesn't have enough balance.</p>
        </div>
        <button type="button" onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Add FastTag
        </button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-blue-200 bg-blue-50/80 dark:bg-blue-900/30 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">Total Across Tags</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-blue-800 dark:text-blue-200">{formatINR(totalAcrossTags)}</p>
          <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">{rows.length} FastTag{rows.length === 1 ? '' : 's'}</p>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="border-b border-card-border bg-surface px-4 py-2">
          <h2 className="text-sm font-semibold text-heading">Accounts</h2>
        </div>
        {loading ? (
          <p className="px-4 py-8 text-center text-sm text-heading/60">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-heading/60">No FastTag accounts yet. Add one to start.</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-surface text-left text-xs font-medium uppercase tracking-wide text-heading/60">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3 text-right">Opening (₹)</th>
                <th className="px-4 py-3 text-right">+ Credits (₹)</th>
                <th className="px-4 py-3 text-right">− Debits (₹)</th>
                <th className="px-4 py-3 text-right">Balance (₹)</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border">
              {rows.map((r) => {
                const isOpen = expanded === r.id;
                const list = txns[r.id] || [];
                return (
                  <Fragment key={r.id}>
                    <tr className="hover:bg-surface">
                      <td className="px-4 py-3 font-medium">
                        <button type="button" onClick={() => toggle(r.id)} className="inline-flex items-center gap-2 text-heading hover:underline">
                          {isOpen ? <ChevronDown className="h-4 w-4 text-heading/60" /> : <ChevronRight className="h-4 w-4 text-heading/60" />}
                          {r.name}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-heading/70">{formatINR(r.opening_balance)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-green-700 dark:text-green-300">{formatINR(r.total_credits)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-amber-700 dark:text-amber-300">{formatINR(r.total_debits)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-lg font-bold text-blue-700 dark:text-blue-300">{formatINR(r.balance)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => setCreditTarget(r)} className="inline-flex items-center gap-1 rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700">
                            <Plus className="h-3 w-3" /> Credit
                          </button>
                          {isAdmin && (
                            <button type="button" onClick={() => deleteFastag(r.id)} className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30" title="Delete">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-surface/60">
                        <td colSpan={6} className="px-4 py-3">
                          {list.length === 0 ? (
                            <p className="py-4 text-center text-xs text-heading/60">No transactions yet.</p>
                          ) : (
                            <div className="max-h-96 overflow-y-auto rounded-lg border border-card-border bg-card">
                              <table className="min-w-full text-xs">
                                <thead className="sticky top-0 bg-surface">
                                  <tr className="text-left text-[11px] font-medium uppercase tracking-wide text-heading/60">
                                    <th className="px-3 py-2">Date</th>
                                    <th className="px-3 py-2">Type</th>
                                    <th className="px-3 py-2">Vehicle</th>
                                    <th className="px-3 py-2">Source</th>
                                    <th className="px-3 py-2 text-right">Credit (₹)</th>
                                    <th className="px-3 py-2 text-right">Debit (₹)</th>
                                    <th className="px-3 py-2">Remarks</th>
                                    {isAdmin && <th className="px-3 py-2"></th>}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-card-border">
                                  {list.map((t) => (
                                    <tr key={t.id} className="hover:bg-surface/70">
                                      <td className="px-3 py-2 whitespace-nowrap">{formatDate(t.date)}</td>
                                      <td className="px-3 py-2">{t.type === 'credit' ? 'Credit' : 'Debit'}</td>
                                      <td className="px-3 py-2 font-medium text-heading">
                                        {t.source_table === 'truck_trip' && t.truck_number ? t.truck_number : <span className="text-heading/40">—</span>}
                                      </td>
                                      <td className="px-3 py-2 text-heading/70">
                                        {t.type === 'credit'
                                          ? (t.bank_name ? `Bank — ${t.bank_name}` : 'Bank')
                                          : t.source_table === 'truck_trip' ? `Trip #${t.source_id}` : t.source_table}
                                      </td>
                                      <td className="px-3 py-2 text-right tabular-nums text-green-700 dark:text-green-300">{t.type === 'credit' ? formatINR(t.amount) : '—'}</td>
                                      <td className="px-3 py-2 text-right tabular-nums text-amber-700 dark:text-amber-300">{t.type === 'debit' ? formatINR(t.amount) : '—'}</td>
                                      <td className="px-3 py-2 text-heading/70 max-w-[200px] truncate">{t.remarks || '—'}</td>
                                      {isAdmin && (
                                        <td className="px-3 py-2">
                                          {t.source_table === 'manual' ? (
                                            <button type="button" onClick={() => deleteTxn(r.id, t.id)} className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30">
                                              <Trash2 className="h-3 w-3" />
                                            </button>
                                          ) : (
                                            <span className="text-[10px] text-heading/50">via trip</span>
                                          )}
                                        </td>
                                      )}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-xl">
            <h3 className="mb-4 text-base font-semibold text-heading">Add FastTag</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-heading/70">Name *</label>
                <input type="text" className="input-field w-full" placeholder="e.g. ICICI FastTag, HDFC FastTag" value={addForm.name} onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-heading/70">Opening Balance (₹)</label>
                <input type="number" min={0} step={0.01} className="input-field w-full" value={addForm.opening_balance} onChange={(e) => setAddForm((p) => ({ ...p, opening_balance: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-heading/70">Remarks</label>
                <input type="text" className="input-field w-full" value={addForm.remarks} onChange={(e) => setAddForm((p) => ({ ...p, remarks: e.target.value }))} />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2 border-t border-card-border pt-4">
              <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
              <button type="button" onClick={saveAdd} disabled={savingAdd} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{savingAdd ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {creditTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-xl">
            <h3 className="mb-1 text-base font-semibold text-heading">Credit {creditTarget.name}</h3>
            <p className="mb-4 text-xs text-heading/60">FastTag credits come from a bank only — the bank balance drops by the credited amount.</p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-heading/70">Date *</label>
                  <input type="date" className="input-field w-full" value={creditForm.date} onChange={(e) => setCreditForm((p) => ({ ...p, date: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-heading/70">Amount (₹) *</label>
                  <input type="number" min={0} step={0.01} className="input-field w-full" value={creditForm.amount} onChange={(e) => setCreditForm((p) => ({ ...p, amount: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-heading/70">Bank *</label>
                <select className="input-field w-full" value={creditForm.bank_name} onChange={(e) => setCreditForm((p) => ({ ...p, bank_name: e.target.value }))}>
                  <option value="">Select bank</option>
                  {banks.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-heading/70">Remarks</label>
                <input type="text" className="input-field w-full" value={creditForm.remarks} onChange={(e) => setCreditForm((p) => ({ ...p, remarks: e.target.value }))} />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2 border-t border-card-border pt-4">
              <button type="button" onClick={() => setCreditTarget(null)} className="btn-secondary">Cancel</button>
              <button type="button" onClick={saveCredit} disabled={savingCredit} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{savingCredit ? 'Saving…' : 'Credit'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
