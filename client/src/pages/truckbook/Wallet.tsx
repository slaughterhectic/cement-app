import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { api } from '../../lib/api';
import { formatINR, formatDate } from '../../lib/format';
import { useAuthStore, useToastStore } from '../../lib/store';
import { usePagination, PaginationBar } from '../../components/tables/SimplePagination';

type Txn = {
  id: number;
  date: string;
  type: 'credit' | 'debit';
  amount: number;
  mode: 'bank' | 'cash' | null;
  bank_name: string | null;
  cash_handler: string | null;
  source_table: string;
  source_id: number | null;
  remarks: string | null;
  truck_number?: string | null;
};

export default function Wallet() {
  const addToast = useToastStore((s) => s.addToast);
  const isAdmin = useAuthStore((s) => s.isAdmin());
  const [summary, setSummary] = useState<{ total_credits: number; total_debits: number; balance: number; count: number } | null>(null);
  const [rows, setRows] = useState<Txn[]>([]);
  const [banks, setBanks] = useState<string[]>([]);
  const [handlers, setHandlers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    mode: 'bank' as 'bank' | 'cash',
    bank_name: '',
    cash_handler: '',
    remarks: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, t, bks, hdl] = await Promise.all([
        api.wallet.summary(),
        api.wallet.transactions(),
        api.capital.banks(),
        api.imprest.handlers(),
      ]);
      setSummary(s);
      setRows(t as Txn[]);
      setBanks((bks as any[]).map((b) => b.bank_name));
      setHandlers((hdl as any[]).map((h) => h.handler_name));
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to load', 'error');
    } finally { setLoading(false); }
  }, [addToast]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.date || !form.amount) { addToast('Date and amount are required', 'error'); return; }
    const amt = Number(form.amount);
    if (!(amt > 0)) { addToast('Amount must be > 0', 'error'); return; }
    if (form.mode === 'bank' && !form.bank_name) { addToast('Pick a bank', 'error'); return; }
    if (form.mode === 'cash' && !form.cash_handler) { addToast('Pick a cash handler', 'error'); return; }
    setSaving(true);
    try {
      await api.wallet.credit({
        date: form.date,
        amount: amt,
        mode: form.mode,
        bank_name: form.mode === 'bank' ? form.bank_name : null,
        cash_handler: form.mode === 'cash' ? form.cash_handler : null,
        remarks: form.remarks.trim() || null,
      });
      addToast('Wallet credited', 'success');
      setShowForm(false);
      setForm({ date: new Date().toISOString().split('T')[0], amount: '', mode: 'bank', bank_name: '', cash_handler: '', remarks: '' });
      load();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this wallet entry? Bank/cash will be re-credited if it was a top-up.')) return;
    try {
      await api.wallet.deleteTxn(id);
      addToast('Deleted', 'success');
      load();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Delete failed', 'error');
    }
  };

  const pg = usePagination(rows, 20);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-heading">Wallet</h1>
          <p className="mt-1 text-sm text-heading/60">Top up the wallet from a bank or cash handler. Trip Log freight is auto-deducted from this wallet — a trip is blocked if the wallet doesn't have enough.</p>
        </div>
        <button type="button" onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700">
          <Plus className="h-4 w-4" /> Credit Wallet
        </button>
      </header>

      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className={`rounded-xl border p-5 ${summary.balance < 0 ? 'border-orange-300 bg-orange-50/80 dark:bg-orange-900/30' : 'border-emerald-200 bg-emerald-50/80 dark:bg-emerald-900/30'}`}>
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
              <WalletIcon className="h-5 w-5" />
              <p className="text-xs font-semibold uppercase tracking-wide">Wallet Balance</p>
            </div>
            <p className={`mt-2 text-2xl font-bold tabular-nums ${summary.balance < 0 ? 'text-orange-700 dark:text-orange-300' : 'text-emerald-800 dark:text-emerald-200'}`}>
              {summary.balance < 0 ? '−' : ''}{formatINR(Math.abs(summary.balance))}
            </p>
            <p className="mt-1 text-xs text-heading/60">{summary.count} transaction{summary.count === 1 ? '' : 's'}</p>
          </div>
          <div className="rounded-xl border border-green-200 bg-green-50/80 dark:bg-green-900/30 p-5">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <ArrowDownLeft className="h-5 w-5" />
              <p className="text-xs font-semibold uppercase tracking-wide">Total Credits</p>
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-green-800 dark:text-green-200">{formatINR(summary.total_credits)}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 dark:bg-amber-900/30 p-5">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <ArrowUpRight className="h-5 w-5" />
              <p className="text-xs font-semibold uppercase tracking-wide">Total Debits (Freight)</p>
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-amber-800 dark:text-amber-200">{formatINR(summary.total_debits)}</p>
          </div>
        </div>
      )}

      <div className="card overflow-hidden p-0">
        <div className="border-b border-card-border bg-surface px-4 py-2">
          <h2 className="text-sm font-semibold text-heading">Wallet ledger</h2>
        </div>
        {loading ? (
          <p className="px-4 py-8 text-center text-sm text-heading/60">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-heading/60">No wallet activity yet. Credit the wallet to start.</p>
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-surface text-left text-xs font-medium uppercase tracking-wide text-heading/60">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Vehicle</th>
                  <th className="px-4 py-3">Source / Trip</th>
                  <th className="px-4 py-3 text-right">Credit (₹)</th>
                  <th className="px-4 py-3 text-right">Debit (₹)</th>
                  <th className="px-4 py-3">Remarks</th>
                  {isAdmin && <th className="px-4 py-3"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border">
                {pg.pageData.map((t) => (
                  <tr key={t.id} className="hover:bg-surface">
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(t.date)}</td>
                    <td className="px-4 py-3">
                      {t.type === 'credit' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/40 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:text-green-300">Credit</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/40 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">Debit</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-heading">
                      {t.source_table === 'truck_trip' && t.truck_number ? t.truck_number : <span className="text-heading/40">—</span>}
                    </td>
                    <td className="px-4 py-3 text-heading/80">
                      {t.type === 'credit'
                        ? (t.mode === 'bank' ? `Bank — ${t.bank_name || '—'}` : `Cash — ${t.cash_handler || '—'}`)
                        : t.source_table === 'truck_trip' ? `Trip #${t.source_id}` : t.source_table}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-green-700 dark:text-green-300">{t.type === 'credit' ? formatINR(t.amount) : '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-amber-700 dark:text-amber-300">{t.type === 'debit' ? formatINR(t.amount) : '—'}</td>
                    <td className="px-4 py-3 text-heading/70 max-w-[220px] truncate">{t.remarks || '—'}</td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        {t.source_table === 'manual' ? (
                          <button type="button" onClick={() => handleDelete(t.id)} className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30" title="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
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
          <PaginationBar pg={pg} />
          </>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-card p-6 shadow-xl">
            <h3 className="mb-1 text-base font-semibold text-heading">Credit Wallet</h3>
            <p className="mb-4 text-xs text-heading/60">The amount is moved out of the chosen bank or cash handler and added to the wallet.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-heading/70">Date *</label>
                <input type="date" className="input-field w-full" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-heading/70">Amount (₹) *</label>
                <input type="number" min={0} step={0.01} className="input-field w-full" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-heading/70">Mode *</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setForm((p) => ({ ...p, mode: 'bank' }))} className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${form.mode === 'bank' ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-card-border bg-card text-heading/80 hover:bg-surface'}`}>Bank</button>
                  <button type="button" onClick={() => setForm((p) => ({ ...p, mode: 'cash' }))} className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${form.mode === 'cash' ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-card-border bg-card text-heading/80 hover:bg-surface'}`}>Cash</button>
                </div>
              </div>
              {form.mode === 'bank' ? (
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-heading/70">Bank *</label>
                  <select className="input-field w-full" value={form.bank_name} onChange={(e) => setForm((p) => ({ ...p, bank_name: e.target.value }))}>
                    <option value="">Select bank</option>
                    {banks.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              ) : (
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-heading/70">Cash Handler *</label>
                  <select className="input-field w-full" value={form.cash_handler} onChange={(e) => setForm((p) => ({ ...p, cash_handler: e.target.value }))}>
                    <option value="">Select handler</option>
                    {handlers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              )}
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-heading/70">Remarks</label>
                <input type="text" className="input-field w-full" value={form.remarks} onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))} />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2 border-t border-card-border pt-4">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              <button type="button" onClick={save} disabled={saving} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save Credit'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
