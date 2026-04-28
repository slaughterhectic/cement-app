import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Wallet, ExternalLink } from 'lucide-react';
import { api } from '../lib/api';
import { formatINR } from '../lib/format';
import { useAuthStore, useToastStore } from '../lib/store';

interface SuspenseParty {
  id: number;
  name: string;
  type: string;
  outstanding: number;
  opening_balance: number;
  opening_balance_type: string;
}

export default function SuspensePage() {
  const addToast = useToastStore((s) => s.addToast);
  const isAdmin = useAuthStore((s) => s.isAdmin());
  const [rows, setRows] = useState<SuspenseParty[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', opening_balance: '', opening_balance_type: 'dr' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all = (await api.parties.list()) as any[];
      setRows(all.filter((p) => p.type === 'suspense'));
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to load', 'error');
    } finally { setLoading(false); }
  }, [addToast]);
  useEffect(() => { load(); }, [load]);

  const totalNet = rows.reduce((s, r) => s + Number(r.outstanding ?? 0), 0);

  const handleSave = async () => {
    if (!form.name.trim()) { addToast('Name is required', 'error'); return; }
    setSaving(true);
    try {
      await api.parties.create({
        name: form.name.trim(),
        type: 'suspense',
        opening_balance: parseFloat(form.opening_balance) || 0,
        opening_balance_type: form.opening_balance_type,
      });
      addToast('Suspense party added', 'success');
      setShowForm(false);
      setForm({ name: '', opening_balance: '', opening_balance_type: 'dr' });
      load();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-heading">Suspense</h1>
          <p className="mt-1 text-sm text-heading/60">Suspense entities act as routing accounts. Pay or receive on a regular party "via Suspense" — the entry posts to both ledgers and bypasses cash/bank.</p>
        </div>
        {isAdmin && (
          <button type="button" onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700">
            <Plus className="h-4 w-4" /> Add Suspense
          </button>
        )}
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50/80 dark:bg-purple-900/30 p-5">
          <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
            <Wallet className="h-5 w-5" />
            <p className="text-xs font-semibold uppercase tracking-wide">Net Suspense Balance</p>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums text-purple-800 dark:text-purple-200">{formatINR(totalNet)}</p>
          <p className="mt-1 text-xs text-purple-600 dark:text-purple-400">Across {rows.length} {rows.length === 1 ? 'party' : 'parties'}</p>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="border-b border-card-border bg-surface px-4 py-2">
          <h2 className="text-sm font-semibold text-heading">Suspense parties</h2>
          <p className="text-[11px] text-heading/60">Click a name to open its full ledger.</p>
        </div>
        {loading ? (
          <p className="px-4 py-8 text-center text-sm text-heading/60">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-heading/60">No suspense parties yet. Add one to start routing payments.</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-surface text-left text-xs font-medium uppercase tracking-wide text-heading/60">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3 text-right">Opening (₹)</th>
                <th className="px-4 py-3 text-right">Net Balance (₹)</th>
                <th className="px-4 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-surface">
                  <td className="px-4 py-3 font-medium">
                    <Link to={`/parties/${r.id}`} className="inline-flex items-center gap-1 text-brand-600 hover:underline">
                      {r.name} <ExternalLink className="h-3 w-3 opacity-60" />
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-heading/70">{formatINR(Number(r.opening_balance) || 0)} {r.opening_balance_type === 'cr' ? 'Cr' : 'Dr'}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span className={Number(r.outstanding) > 0 ? 'font-semibold text-red-700 dark:text-red-300' : Number(r.outstanding) < 0 ? 'font-semibold text-emerald-700 dark:text-emerald-300' : 'text-heading/60'}>
                      {formatINR(Number(r.outstanding) || 0)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/parties/${r.id}`} className="text-xs text-brand-600 hover:underline">View ledger →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-xl">
            <h3 className="mb-4 text-base font-semibold text-heading">Add Suspense Party</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-heading/70">Name *</label>
                <input type="text" className="input-field w-full" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-heading/70">Opening Balance (₹)</label>
                  <input type="number" min={0} step={0.01} className="input-field w-full" value={form.opening_balance} onChange={(e) => setForm((p) => ({ ...p, opening_balance: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-heading/70">Type</label>
                  <select className="input-field w-full" value={form.opening_balance_type} onChange={(e) => setForm((p) => ({ ...p, opening_balance_type: e.target.value }))}>
                    <option value="dr">Dr (they owe us)</option>
                    <option value="cr">Cr (we owe them)</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2 border-t border-card-border pt-4">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              <button type="button" onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
