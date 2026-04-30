import { useEffect, useState, useCallback } from 'react';
import { Pencil, Trash2, ArrowLeftRight } from 'lucide-react';
import { api } from '../lib/api';
import { formatINR, formatDate } from '../lib/format';
import { useAuthStore, useToastStore } from '../lib/store';
import { usePagination, PaginationBar } from '../components/tables/SimplePagination';
import { BankTransferButton } from '../components/BankTransferButton';
import { BankOpeningButton } from '../components/BankOpeningButton';

type Transfer = { id: number; date: string; from_bank: string; to_bank: string; amount: number; remarks: string | null };
type BankRow = { bank_name: string; balance: number };

export default function BankTransfers() {
  const addToast = useToastStore((s) => s.addToast);
  const isAdmin = useAuthStore((s) => s.isAdmin());
  const [rows, setRows] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);

  // edit modal state
  const [editing, setEditing] = useState<Transfer | null>(null);
  const [banks, setBanks] = useState<BankRow[]>([]);
  const [editForm, setEditForm] = useState({ date: '', from_bank: '', to_bank: '', amount: '', remarks: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.bankTransfers.list();
      setRows(list);
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to load', 'error');
    } finally { setLoading(false); }
  }, [addToast]);
  useEffect(() => { load(); }, [load]);

  const openEdit = async (t: Transfer) => {
    setEditing(t);
    setEditForm({ date: t.date, from_bank: t.from_bank, to_bank: t.to_bank, amount: String(t.amount), remarks: t.remarks ?? '' });
    try {
      const s = (await api.capital.summary()) as any;
      setBanks((s?.banks ?? []) as BankRow[]);
    } catch { setBanks([]); }
  };

  const closeEdit = () => { setEditing(null); setBanks([]); };

  const saveEdit = async () => {
    if (!editing) return;
    if (!editForm.date || !editForm.from_bank || !editForm.to_bank || !editForm.amount) {
      addToast('All fields are required', 'error'); return;
    }
    if (editForm.from_bank === editForm.to_bank) {
      addToast('From and To bank must be different', 'error'); return;
    }
    const amt = Number(editForm.amount);
    if (!(amt > 0)) { addToast('Amount must be > 0', 'error'); return; }
    setSavingEdit(true);
    try {
      await api.bankTransfers.update(editing.id, {
        date: editForm.date,
        from_bank: editForm.from_bank,
        to_bank: editForm.to_bank,
        amount: amt,
        remarks: editForm.remarks.trim() || null,
      });
      addToast('Transfer updated', 'success');
      closeEdit();
      load();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally { setSavingEdit(false); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this transfer? Both banks will be re-credited/debited accordingly.')) return;
    try {
      await api.bankTransfers.delete(id);
      addToast('Deleted', 'success');
      load();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Delete failed', 'error');
    }
  };

  const totalIn = rows.reduce((s, t) => s + t.amount, 0);
  const pg = usePagination(rows, 25);

  // Cap the edit amount to source bank balance + the row's own amount (so editing the same row
  // doesn't reject because its existing outflow is already counted).
  const editSourceBal = banks.find((b) => b.bank_name === editForm.from_bank)?.balance ?? 0;
  const editAdjusted = editing && editing.from_bank === editForm.from_bank
    ? editSourceBal + Number(editing.amount)
    : editSourceBal;
  const editOver = !!editForm.from_bank && Number(editForm.amount) > editAdjusted;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-heading">Bank Transfers</h1>
          <p className="mt-1 text-sm text-heading/60">Money moved from one bank account to another. Net cash effect is zero — only the per-bank balances move.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BankOpeningButton onSaved={load} />
          <BankTransferButton onSaved={load} />
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-900/30 p-5">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <ArrowLeftRight className="h-5 w-5" />
            <p className="text-xs font-semibold uppercase tracking-wide">Total Routed</p>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums text-blue-800 dark:text-blue-200">{formatINR(totalIn)}</p>
          <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">Across {rows.length} {rows.length === 1 ? 'transfer' : 'transfers'}</p>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="border-b border-card-border bg-surface px-4 py-2">
          <h2 className="text-sm font-semibold text-heading">Transfer log</h2>
        </div>
        {loading ? (
          <p className="px-4 py-8 text-center text-sm text-heading/60">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-heading/60">No bank transfers yet. Click "Transfer Between Banks" to record one.</p>
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-surface text-left text-xs font-medium uppercase tracking-wide text-heading/60">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">From</th>
                  <th className="px-4 py-3">To</th>
                  <th className="px-4 py-3 text-right">Amount (₹)</th>
                  <th className="px-4 py-3">Remarks</th>
                  {isAdmin && <th className="px-4 py-3"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border">
                {pg.pageData.map((t) => (
                  <tr key={t.id} className="hover:bg-surface">
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(t.date)}</td>
                    <td className="px-4 py-3 font-medium text-heading">{t.from_bank}</td>
                    <td className="px-4 py-3 font-medium text-heading">{t.to_bank}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-blue-700 dark:text-blue-300">{formatINR(t.amount)}</td>
                    <td className="px-4 py-3 text-heading/70 max-w-[200px] truncate">{t.remarks || '—'}</td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => openEdit(t)} className="rounded p-1.5 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/30" title="Edit">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => handleDelete(t.id)} className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30" title="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
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

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-card p-6 shadow-xl">
            <h3 className="mb-1 text-base font-semibold text-heading">Edit Transfer</h3>
            <p className="mb-4 text-xs text-heading/60">Changes re-balance both banks accordingly.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-heading/70">Date *</label>
                <input type="date" className="input-field w-full" value={editForm.date} onChange={(e) => setEditForm((p) => ({ ...p, date: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-heading/70">Amount (₹) *</label>
                <input
                  type="number"
                  min={0}
                  max={editForm.from_bank ? editAdjusted : undefined}
                  step={0.01}
                  className={`input-field w-full ${editOver ? 'border-red-500 focus:ring-red-500' : ''}`}
                  value={editForm.amount}
                  onChange={(e) => setEditForm((p) => ({ ...p, amount: e.target.value }))}
                />
                {editForm.from_bank && (
                  editOver ? (
                    <p className="mt-1 text-[11px] text-red-600">Exceeds available balance ({formatINR(editAdjusted)}).</p>
                  ) : (
                    <p className="mt-1 text-[11px] text-heading/50">Max in {editForm.from_bank}: {formatINR(editAdjusted)}</p>
                  )
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-heading/70">From Bank *</label>
                <select className="input-field w-full" value={editForm.from_bank} onChange={(e) => setEditForm((p) => ({ ...p, from_bank: e.target.value }))}>
                  <option value="">Select source bank</option>
                  {banks.map((b) => <option key={b.bank_name} value={b.bank_name}>{b.bank_name} — {formatINR(b.balance)}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-heading/70">To Bank *</label>
                <select className="input-field w-full" value={editForm.to_bank} onChange={(e) => setEditForm((p) => ({ ...p, to_bank: e.target.value }))}>
                  <option value="">Select destination bank</option>
                  {banks.filter((b) => b.bank_name !== editForm.from_bank).map((b) => (
                    <option key={b.bank_name} value={b.bank_name}>{b.bank_name} — {formatINR(b.balance)}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-heading/70">Remarks</label>
                <input type="text" className="input-field w-full" value={editForm.remarks} onChange={(e) => setEditForm((p) => ({ ...p, remarks: e.target.value }))} />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2 border-t border-card-border pt-4">
              <button type="button" onClick={closeEdit} className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-heading/80 hover:bg-surface">Cancel</button>
              <button type="button" onClick={saveEdit} disabled={savingEdit} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {savingEdit ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
