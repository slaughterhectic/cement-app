import { useCallback, useEffect, useState } from 'react';
import { Plus, X, Trash2, ChevronDown, ChevronRight, ArrowDown, ArrowUp, Pencil, Download } from 'lucide-react';
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
  range_opening?: number;
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

const todayStr = new Date().toISOString().split('T')[0];
const firstOfMonthStr = todayStr.substring(0, 7) + '-01';

const emptyForm = { name: '', opening_balance: '' };
const emptyTxn = { date: todayStr, type: 'credit' as 'credit' | 'debit', amount: '', particulars: '', remarks: '' };

export default function TransportBanks() {
  const addToast = useToastStore((s) => s.addToast);
  const canEditTransport = useAuthStore((s) => s.canEditTransport());
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState<string>(firstOfMonthStr);
  const [toDate, setToDate] = useState<string>(todayStr);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [statements, setStatements] = useState<Record<number, Txn[]>>({});
  const [stmtLoading, setStmtLoading] = useState<Record<number, boolean>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Bank | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editTxn, setEditTxn] = useState<Txn | null>(null);
  const [editTxnForm, setEditTxnForm] = useState(emptyTxn);
  const [editTxnSaving, setEditTxnSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setBanks(await api.rlBanks.list(fromDate || undefined, toDate || undefined)); }
    catch (e) { addToast(e instanceof Error ? e.message : 'Failed to load banks', 'error'); }
    finally { setLoading(false); }
  }, [addToast, fromDate, toDate]);

  useEffect(() => { load(); }, [load]);

  const reloadStatement = async (bankId: number) => {
    setStmtLoading((p) => ({ ...p, [bankId]: true }));
    try {
      const data = await api.rlBanks.statement(bankId);
      setStatements((p) => ({ ...p, [bankId]: data.ledger || [] }));
    } catch (e) { addToast(e instanceof Error ? e.message : 'Failed to load statement', 'error'); }
    finally { setStmtLoading((p) => ({ ...p, [bankId]: false })); }
  };

  const toggle = async (id: number) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (statements[id]) return;
    reloadStatement(id);
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

  const downloadCSV = (bank: Bank, txns: Txn[]) => {
    const header = ['Date', 'Type', 'Particulars', 'Remarks', 'Credit', 'Debit', 'Balance'];
    const rows = [...txns].reverse().map((t) => [
      t.date,
      t.type === 'credit' ? 'Credit' : 'Debit',
      t.particulars || '',
      t.remarks || '',
      t.type === 'credit' ? t.amount : '',
      t.type === 'debit'  ? t.amount : '',
      t.balance,
    ]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${bank.name.replace(/\s+/g, '_')}_statement.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = (bank: Bank, txns: Txn[]) => {
    const ordered = [...txns].reverse();
    const rows = ordered.map((t) => `
      <tr>
        <td>${t.date}</td>
        <td><span class="${t.type === 'credit' ? 'credit' : 'debit'}">${t.type === 'credit' ? 'Credit' : 'Debit'}</span></td>
        <td>${t.particulars || '—'}${t.remarks ? `<br/><small>${t.remarks}</small>` : ''}${t.source_table && t.source_table !== 'manual' ? `<br/><small class="muted">via ${t.source_table.replace('rl_', '')}</small>` : ''}</td>
        <td class="num green">${t.type === 'credit' ? '₹' + t.amount.toLocaleString('en-IN') : '—'}</td>
        <td class="num red">${t.type === 'debit' ? '₹' + t.amount.toLocaleString('en-IN') : '—'}</td>
        <td class="num">${t.balance < 0 ? '−' : ''}₹${Math.abs(t.balance).toLocaleString('en-IN')}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
      <title>${bank.name} — Statement</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 24px; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        .meta { color: #666; font-size: 11px; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f0f4ff; text-align: left; padding: 7px 8px; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; border-bottom: 2px solid #c7d2fe; }
        td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
        .num { text-align: right; font-variant-numeric: tabular-nums; }
        .green { color: #15803d; font-weight: 600; }
        .red   { color: #b91c1c; font-weight: 600; }
        .credit { background:#dcfce7; color:#15803d; padding:1px 6px; border-radius:999px; font-size:10px; }
        .debit  { background:#fee2e2; color:#b91c1c; padding:1px 6px; border-radius:999px; font-size:10px; }
        .muted { color:#9ca3af; }
        small { display:block; color:#6b7280; font-size:10px; }
        @media print { button { display:none; } }
      </style></head><body>
      <h1>${bank.name}</h1>
      <p class="meta">Bank Statement · ${txns.length} transactions · Generated ${new Date().toLocaleDateString('en-IN')}</p>
      <table>
        <thead><tr><th>Date</th><th>Type</th><th>Particulars</th><th class="num">Credit</th><th class="num">Debit</th><th class="num">Balance</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <script>window.onload=()=>window.print();<\/script>
    </body></html>`;

    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
  };

  const submitEditTxn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTxn || !editTxnForm.amount) return;
    setEditTxnSaving(true);
    try {
      await api.rlBanks.updateTransaction(editTxn.bank_id, editTxn.id, {
        date: editTxnForm.date, type: editTxnForm.type, amount: Number(editTxnForm.amount),
        particulars: editTxnForm.particulars || null, remarks: editTxnForm.remarks || null,
      });
      addToast('Transaction updated', 'success');
      const bankId = editTxn.bank_id;
      setEditTxn(null); setEditTxnForm(emptyTxn);
      load();
      reloadStatement(bankId);
    } catch (e) { addToast(e instanceof Error ? e.message : 'Update failed', 'error'); }
    finally { setEditTxnSaving(false); }
  };

  const deleteTxn = async (bankId: number, txId: number) => {
    if (!window.confirm('Delete this transaction?')) return;
    try {
      await api.rlBanks.deleteTransaction(bankId, txId);
      addToast('Deleted', 'success');
      load();
      reloadStatement(bankId);
    } catch (e) { addToast(e instanceof Error ? e.message : 'Delete failed', 'error'); }
  };

  const isThisMonth = fromDate === firstOfMonthStr && toDate === todayStr;
  const isAllTime   = !fromDate && !toDate;
  const activeBanks = banks.filter((b) => b.is_active);
  const totalOpening = activeBanks.reduce((s, b) => s + (b.range_opening ?? b.opening_balance), 0);
  const totalCredits = activeBanks.reduce((s, b) => s + b.total_credits, 0);
  const totalDebits  = activeBanks.reduce((s, b) => s + b.total_debits,  0);
  const totalClosing = activeBanks.reduce((s, b) => s + b.balance, 0);

  const TxnForm = ({ formData, onChange, onSubmit, saving: isSaving, onCancel, title, subtitle }: {
    formData: typeof emptyTxn;
    onChange: (f: typeof emptyTxn) => void;
    onSubmit: (e: React.FormEvent) => void;
    saving: boolean;
    onCancel: () => void;
    title: string;
    subtitle?: string;
  }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-xl bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-card-border px-5 py-4">
          <div>
            <h2 className="font-semibold text-heading">{title}</h2>
            {subtitle && <p className="text-xs text-heading/60">{subtitle}</p>}
          </div>
          <button type="button" onClick={onCancel} className="rounded-lg p-1.5 hover:bg-card-border/50"><X className="h-5 w-5 text-heading/60" /></button>
        </div>
        <form onSubmit={onSubmit} className="p-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-heading/70 mb-1">Date *</label>
              <input type="date" className="input-field" value={formData.date} onChange={(e) => onChange({ ...formData, date: e.target.value })} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-heading/70 mb-1">Amount (₹) *</label>
              <input type="number" min="0" step="0.01" className="input-field" value={formData.amount} onChange={(e) => onChange({ ...formData, amount: e.target.value })} required />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-heading/70 mb-1">Direction *</label>
            <div className="flex items-center gap-1 rounded-lg border border-card-border bg-surface p-0.5 text-sm">
              {(['credit', 'debit'] as const).map((t) => (
                <button key={t} type="button" onClick={() => onChange({ ...formData, type: t })}
                  className={`flex-1 px-3 py-1.5 rounded-md font-medium capitalize transition-colors ${formData.type === t ? 'bg-indigo-500 text-white' : 'text-heading/70 hover:bg-card-border/40'}`}>
                  {t === 'credit' ? 'Credit (money in)' : 'Debit (money out)'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-heading/70 mb-1">Particulars</label>
            <input className="input-field" value={formData.particulars} onChange={(e) => onChange({ ...formData, particulars: e.target.value })} placeholder="e.g. Payment received from ACC" />
          </div>
          <div>
            <label className="block text-xs font-medium text-heading/70 mb-1">Remarks</label>
            <input className="input-field" value={formData.remarks} onChange={(e) => onChange({ ...formData, remarks: e.target.value })} placeholder="Optional" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onCancel} className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-heading/80 hover:bg-surface">Cancel</button>
            <button type="submit" disabled={isSaving} className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600 disabled:opacity-60">
              {isSaving ? 'Saving…' : title}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

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

      {/* Date range filter */}
      <div className="card flex flex-wrap items-center gap-3 p-3">
        <label className="text-sm font-medium text-heading/70">From:</label>
        <input type="date" className="input-field py-1.5 text-sm" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <label className="text-sm font-medium text-heading/70">To:</label>
        <input type="date" className="input-field py-1.5 text-sm" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        <button type="button" onClick={() => { setFromDate(firstOfMonthStr); setToDate(todayStr); }}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${isThisMonth ? 'bg-indigo-500 text-white' : 'border border-card-border text-heading/70 hover:bg-surface'}`}>
          This Month
        </button>
        <button type="button" onClick={() => { setFromDate(''); setToDate(''); }}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${isAllTime ? 'bg-indigo-500 text-white' : 'border border-card-border text-heading/70 hover:bg-surface'}`}>
          All Time
        </button>
        <span className="ml-auto text-xs text-heading/60">
          {fromDate && toDate ? `${fromDate} → ${toDate}` : isAllTime ? 'All time' : fromDate ? `From ${fromDate}` : `Up to ${toDate}`}
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
                <th className="px-4 py-3 font-medium text-green-700 dark:text-green-300 text-right">Credits</th>
                <th className="px-4 py-3 font-medium text-red-700 dark:text-red-300 text-right">Debits</th>
                <th className="px-4 py-3 font-medium text-indigo-700 dark:text-indigo-300 text-right">Closing</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-heading/50">Loading…</td></tr>
              ) : banks.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-heading/50">No banks yet. Add one above.</td></tr>
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
                      <td className="px-4 py-3 text-right tabular-nums text-heading/70">{formatINR(b.range_opening ?? b.opening_balance)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-green-700 dark:text-green-300">{formatINR(b.total_credits)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-red-700 dark:text-red-300">{formatINR(b.total_debits)}</td>
                      <td className={`px-4 py-3 text-right tabular-nums font-bold ${b.balance >= 0 ? 'text-indigo-700 dark:text-indigo-300' : 'text-red-700 dark:text-red-300'}`}>{formatINR(b.balance)}</td>
                    </tr>
                    {open && (
                      <tr key={`${b.id}-stmt`} className="bg-surface/60">
                        <td colSpan={5} className="px-4 py-3">
                          {stmtLoading[b.id] ? (
                            <p className="py-4 text-center text-xs text-heading/60">Loading statement…</p>
                          ) : list.length === 0 ? (
                            <p className="py-4 text-center text-xs text-heading/60">No transactions yet.</p>
                          ) : (
                            <div className="max-h-[480px] overflow-y-auto rounded-lg border border-card-border bg-card">
                              <div className="sticky top-0 flex items-center justify-between border-b border-card-border bg-surface px-3 py-2">
                                <span className="text-xs font-medium text-heading/60">{list.length} transactions</span>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => downloadCSV(b, list)}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-card-border bg-card px-3 py-1 text-xs font-medium text-heading/70 hover:bg-surface transition-colors"
                                  >
                                    <Download className="h-3 w-3" /> CSV
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => downloadPDF(b, list)}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-1 text-xs font-medium text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                                  >
                                    <Download className="h-3 w-3" /> PDF
                                  </button>
                                </div>
                              </div>
                              <table className="min-w-full text-xs">
                                <thead className="sticky top-[33px] bg-surface">
                                  <tr className="text-left text-[11px] font-medium uppercase tracking-wide text-heading/60">
                                    <th className="px-3 py-2">Date</th>
                                    <th className="px-3 py-2">Type</th>
                                    <th className="px-3 py-2">Particulars</th>
                                    <th className="px-3 py-2 text-right">Credit</th>
                                    <th className="px-3 py-2 text-right">Debit</th>
                                    <th className="px-3 py-2 text-right">Balance</th>
                                    {canEditTransport && <th className="px-3 py-2 w-16"></th>}
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
                                        {t.source_table && t.source_table !== 'manual' && (
                                          <p className="text-[10px] text-heading/40 italic">via {t.source_table.replace('rl_', '')}</p>
                                        )}
                                      </td>
                                      <td className="px-3 py-2 text-right tabular-nums text-green-700 dark:text-green-300">{t.type === 'credit' ? formatINR(t.amount) : '—'}</td>
                                      <td className="px-3 py-2 text-right tabular-nums text-red-700 dark:text-red-300">{t.type === 'debit' ? formatINR(t.amount) : '—'}</td>
                                      <td className="px-3 py-2 text-right tabular-nums font-medium">{formatINR(t.balance)}</td>
                                      {canEditTransport && (
                                        <td className="px-3 py-2">
                                          {t.source_table === 'manual' ? (
                                            <div className="flex items-center gap-1">
                                              <button type="button" title="Edit" onClick={() => {
                                                setEditTxn(t);
                                                setEditTxnForm({ date: t.date, type: t.type, amount: String(t.amount), particulars: t.particulars || '', remarks: t.remarks || '' });
                                              }} className="rounded p-1 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30">
                                                <Pencil className="h-3 w-3" />
                                              </button>
                                              <button type="button" title="Delete" onClick={() => deleteTxn(b.id, t.id)} className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30">
                                                <Trash2 className="h-3 w-3" />
                                              </button>
                                            </div>
                                          ) : (
                                            <span className="text-[10px] text-heading/40">auto</span>
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
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Bank Modal */}
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

      {/* Edit Transaction Modal */}
      {editTxn && (
        <TxnForm
          title="Save Changes"
          subtitle="Edit manual transaction"
          formData={editTxnForm}
          onChange={setEditTxnForm}
          onSubmit={submitEditTxn}
          saving={editTxnSaving}
          onCancel={() => setEditTxn(null)}
        />
      )}
    </div>
  );
}
