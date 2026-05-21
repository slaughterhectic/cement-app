import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, Pencil } from 'lucide-react';
import { Fragment } from 'react';
import { api } from '../../lib/api';
import { formatINR, formatDate } from '../../lib/format';
import { useAuthStore, useToastStore } from '../../lib/store';

type DieselParty = {
  id: number;
  name: string;
  phone: string | null;
  opening_balance: number;
  is_active: number;
  total_credits: number;
  total_debits: number;
  balance: number;
  remarks: string | null;
};

type Txn = {
  id: number;
  diesel_party_id: number;
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
  owner_name?: string | null;
};

const emptyAdd = { name: '', phone: '', opening_balance: '', remarks: '' };

export default function DieselParties() {
  const addToast = useToastStore((s) => s.addToast);
  const canEditTransport = useAuthStore((s) => s.canEditTransport());
  const [rows, setRows] = useState<DieselParty[]>([]);
  const [banks, setBanks] = useState<string[]>([]);
  const [handlers, setHandlers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [txns, setTxns] = useState<Record<number, Txn[]>>({});
  const todayDiesel = new Date().toISOString().split('T')[0];
  const firstOfMonthDiesel = todayDiesel.substring(0, 7) + '-01';
  const [fromDate, setFromDate] = useState<string>(firstOfMonthDiesel);
  const [toDate, setToDate] = useState<string>(todayDiesel);

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState(emptyAdd);
  const [savingAdd, setSavingAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<DieselParty | null>(null);

  const [creditTarget, setCreditTarget] = useState<DieselParty | null>(null);
  const [creditForm, setCreditForm] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    mode: 'bank' as 'bank' | 'cash',
    bank_name: '',
    cash_handler: '',
    remarks: '',
  });
  const [savingCredit, setSavingCredit] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, bks, hs] = await Promise.all([
        api.rlDieselParties.list(),
        api.rlBanks.list().catch(() => []),
        api.rlCashHandler.listHandlers().catch(() => []),
      ]);
      setRows(list as DieselParty[]);
      setBanks((bks as any[]).filter((b) => b.is_active !== 0).map((b) => b.name));
      setHandlers((hs as any[]).filter((h) => h.is_active !== 0).map((h) => h.name));
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to load', 'error');
    } finally { setLoading(false); }
  }, [addToast]);
  useEffect(() => { load(); }, [load]);

  const toggle = async (id: number) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    try {
      const list = await api.rlDieselParties.transactions(id);
      setTxns((m) => ({ ...m, [id]: list as Txn[] }));
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to load transactions', 'error');
    }
  };

  const totalAcrossPumps = rows.reduce((s, r) => s + r.balance, 0);

  const isThisMonthDiesel = fromDate === firstOfMonthDiesel && toDate === todayDiesel;

  // Date-range-filtered totals across all expanded pumps — recalculated from loaded txns.
  const rangeTotals = (() => {
    let credits = 0, debits = 0;
    for (const list of Object.values(txns)) {
      for (const t of list) {
        const d = String(t.date || '');
        if (fromDate && d < fromDate) continue;
        if (toDate && d > toDate) continue;
        if (t.type === 'credit') credits += Number(t.amount) || 0;
        else debits += Number(t.amount) || 0;
      }
    }
    return { credits, debits };
  })();

  const openEdit = (r: DieselParty) => {
    setEditTarget(r);
    setAddForm({
      name: r.name,
      phone: r.phone || '',
      opening_balance: String(r.opening_balance || ''),
      remarks: r.remarks || '',
    });
    setShowAdd(true);
  };

  const saveAdd = async () => {
    if (!addForm.name.trim()) { addToast('Name is required', 'error'); return; }
    setSavingAdd(true);
    try {
      const payload = {
        name: addForm.name.trim(),
        phone: addForm.phone.trim() || null,
        opening_balance: Number(addForm.opening_balance) || 0,
        remarks: addForm.remarks.trim() || null,
      };
      if (editTarget) {
        await api.rlDieselParties.update(editTarget.id, { ...payload, is_active: editTarget.is_active });
        addToast('Diesel party updated', 'success');
      } else {
        await api.rlDieselParties.create(payload);
        addToast('Diesel party added', 'success');
      }
      setShowAdd(false);
      setEditTarget(null);
      setAddForm(emptyAdd);
      load();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally { setSavingAdd(false); }
  };

  const saveCredit = async () => {
    if (!creditTarget) return;
    if (!creditForm.date || !creditForm.amount) {
      addToast('Date and amount are required', 'error'); return;
    }
    if (creditForm.mode === 'bank' && !creditForm.bank_name) {
      addToast('Pick a bank', 'error'); return;
    }
    if (creditForm.mode === 'cash' && !creditForm.cash_handler) {
      addToast('Pick a cash handler', 'error'); return;
    }
    const amt = Number(creditForm.amount);
    if (!(amt > 0)) { addToast('Amount must be > 0', 'error'); return; }
    setSavingCredit(true);
    try {
      await api.rlDieselParties.credit(creditTarget.id, {
        date: creditForm.date,
        amount: amt,
        mode: creditForm.mode,
        bank_name: creditForm.mode === 'bank' ? creditForm.bank_name : null,
        cash_handler: creditForm.mode === 'cash' ? creditForm.cash_handler : null,
        remarks: creditForm.remarks.trim() || null,
      });
      addToast('Diesel party credited', 'success');
      setCreditTarget(null);
      setCreditForm({ date: new Date().toISOString().split('T')[0], amount: '', mode: 'bank', bank_name: '', cash_handler: '', remarks: '' });
      load();
      if (expanded === creditTarget.id) {
        const list = await api.rlDieselParties.transactions(creditTarget.id);
        setTxns((m) => ({ ...m, [creditTarget.id]: list as Txn[] }));
      }
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally { setSavingCredit(false); }
  };

  const deleteParty = async (id: number) => {
    if (!window.confirm('Delete this diesel party? Trips that reference it will block deletion.')) return;
    try {
      await api.rlDieselParties.delete(id);
      addToast('Deleted', 'success');
      load();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Delete failed', 'error');
    }
  };

  const deleteTxn = async (pid: number, txId: number) => {
    if (!window.confirm('Delete this diesel transaction?')) return;
    try {
      await api.rlDieselParties.deleteTxn(pid, txId);
      addToast('Deleted', 'success');
      load();
      const list = await api.rlDieselParties.transactions(pid);
      setTxns((m) => ({ ...m, [pid]: list as Txn[] }));
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Delete failed', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-heading">Diesel Parties</h1>
          <p className="mt-1 text-sm text-heading/60">
            One ledger per diesel pump. Top-ups (bank/cash) raise the balance; trip diesel
            advances auto-debit the chosen pump's ledger so you can see what each supplier
            owes — or is owed — at a glance.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setEditTarget(null); setAddForm(emptyAdd); setShowAdd(true); }}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-600"
        >
          <Plus className="h-4 w-4" /> Add Diesel Party
        </button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/80 dark:bg-indigo-900/30 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">Total Across Pumps</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-indigo-800 dark:text-indigo-200">{formatINR(totalAcrossPumps)}</p>
          <p className="mt-1 text-xs text-indigo-600 dark:text-indigo-400">{rows.length} pump{rows.length === 1 ? '' : 's'}</p>
        </div>
        <div className="rounded-xl border border-card-border bg-card p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-xs font-semibold uppercase tracking-wide text-heading/60">Period Summary</p>
            <div className="flex flex-wrap items-center gap-2">
              <input type="date" className="input-field py-1 text-xs" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              <span className="text-xs text-heading/50">to</span>
              <input type="date" className="input-field py-1 text-xs" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              <button type="button" onClick={() => { setFromDate(firstOfMonthDiesel); setToDate(todayDiesel); }}
                className={`rounded px-2 py-1 text-[11px] font-medium transition-colors ${isThisMonthDiesel ? 'bg-indigo-500 text-white' : 'border border-card-border text-heading/70 hover:bg-surface'}`}>
                This Month
              </button>
              <button type="button" onClick={() => { setFromDate(''); setToDate(''); }}
                className={`rounded px-2 py-1 text-[11px] font-medium transition-colors ${!fromDate && !toDate ? 'bg-indigo-500 text-white' : 'border border-card-border text-heading/70 hover:bg-surface'}`}>
                All
              </button>
            </div>
          </div>
          {Object.keys(txns).length > 0 ? (
            <div className="flex gap-4 text-sm">
              <div>
                <p className="text-xs text-heading/60">Paid to Pumps</p>
                <p className="font-bold tabular-nums text-green-700 dark:text-green-300">{formatINR(rangeTotals.credits)}</p>
              </div>
              <div>
                <p className="text-xs text-heading/60">Diesel Drawn (via trips)</p>
                <p className="font-bold tabular-nums text-amber-700 dark:text-amber-300">{formatINR(rangeTotals.debits)}</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-heading/50">Expand a pump below to load its transactions.</p>
          )}
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="border-b border-card-border bg-surface px-4 py-2">
          <h2 className="text-sm font-semibold text-heading">Pumps</h2>
        </div>
        {loading ? (
          <p className="px-4 py-8 text-center text-sm text-heading/60">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-heading/60">No diesel parties yet. Add one to start linking trip diesel advances.</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-surface text-left text-xs font-medium uppercase tracking-wide text-heading/60">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3 text-right">Opening (₹)</th>
                <th className="px-4 py-3 text-right">Paid to Pump (₹)</th>
                <th className="px-4 py-3 text-right">Diesel Drawn (₹)</th>
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
                        {r.phone && <span className="ml-2 text-[11px] text-heading/50">{r.phone}</span>}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-heading/70">{formatINR(r.opening_balance)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-green-700 dark:text-green-300">{formatINR(r.total_credits)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-amber-700 dark:text-amber-300">{formatINR(r.total_debits)}</td>
                      <td className={`px-4 py-3 text-right tabular-nums text-lg font-bold ${r.balance >= 0 ? 'text-indigo-700 dark:text-indigo-300' : 'text-red-700 dark:text-red-300'}`}>{formatINR(r.balance)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => setCreditTarget(r)} className="inline-flex items-center gap-1 rounded bg-indigo-500 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-600">
                            <Plus className="h-3 w-3" /> Pay Pump
                          </button>
                          <button type="button" onClick={() => openEdit(r)} className="rounded p-1.5 text-heading/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 hover:text-indigo-600 dark:text-indigo-400" title="Edit">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          {canEditTransport && (
                            <button type="button" onClick={() => deleteParty(r.id)} className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30" title="Delete">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isOpen && (() => {
                      const filtered = list.filter((t) => {
                        const d = String(t.date || '');
                        return (!fromDate || d >= fromDate) && (!toDate || d <= toDate);
                      });
                      return (
                      <tr className="bg-surface/60">
                        <td colSpan={6} className="px-4 py-3">
                          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-heading/70">
                            <span className="font-medium">Range:</span>
                            <input type="date" className="input-field py-0.5 text-xs" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                            <span>to</span>
                            <input type="date" className="input-field py-0.5 text-xs" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                            <span className="ml-2">{filtered.length} of {list.length} rows</span>
                          </div>
                          {filtered.length === 0 ? (
                            <p className="py-4 text-center text-xs text-heading/60">{fromDate || toDate ? 'No transactions in selected date range.' : 'No transactions yet.'}</p>
                          ) : (
                            <div className="max-h-96 overflow-y-auto rounded-lg border border-card-border bg-card">
                              <table className="min-w-full text-xs">
                                <thead className="sticky top-0 bg-surface">
                                  <tr className="text-left text-[11px] font-medium uppercase tracking-wide text-heading/60">
                                    <th className="px-3 py-2">Date</th>
                                    <th className="px-3 py-2">Entry</th>
                                    <th className="px-3 py-2">Vehicle</th>
                                    <th className="px-3 py-2">Source</th>
                                    <th className="px-3 py-2 text-right">Paid to Pump (₹)</th>
                                    <th className="px-3 py-2 text-right">Diesel Drawn (₹)</th>
                                    <th className="px-3 py-2">Remarks</th>
                                    {canEditTransport && <th className="px-3 py-2"></th>}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-card-border">
                                  {filtered.map((t) => (
                                    <tr key={t.id} className="hover:bg-surface/70">
                                      <td className="px-3 py-2 whitespace-nowrap">{formatDate(t.date)}</td>
                                      <td className="px-3 py-2">
                                        {t.type === 'credit'
                                          ? <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/40 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:text-green-300">Payment</span>
                                          : <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">Diesel</span>
                                        }
                                      </td>
                                      <td className="px-3 py-2 font-medium text-heading">
                                        {t.source_table === 'rl_trip' && t.truck_number ? t.truck_number : <span className="text-heading/40">—</span>}
                                      </td>
                                      <td className="px-3 py-2 text-heading/70">
                                        {t.type === 'credit'
                                          ? (t.mode === 'cash'
                                              ? `Cash — ${t.cash_handler || ''}`.trim()
                                              : `Bank — ${t.bank_name || ''}`.trim())
                                          : t.source_table === 'rl_trip' ? `Trip #${t.source_id}` : t.source_table}
                                      </td>
                                      <td className="px-3 py-2 text-right tabular-nums text-green-700 dark:text-green-300">{t.type === 'credit' ? formatINR(t.amount) : '—'}</td>
                                      <td className="px-3 py-2 text-right tabular-nums text-amber-700 dark:text-amber-300">{t.type === 'debit' ? formatINR(t.amount) : '—'}</td>
                                      <td className="px-3 py-2 text-heading/70 max-w-[200px] truncate">{t.remarks || '—'}</td>
                                      {canEditTransport && (
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
                      );
                    })()}
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
            <h3 className="mb-4 text-base font-semibold text-heading">{editTarget ? 'Edit Diesel Party' : 'Add Diesel Party'}</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-heading/70">Name *</label>
                <input type="text" className="input-field w-full" placeholder="e.g. HP Pump - NH28" value={addForm.name} onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-heading/70">Phone</label>
                <input type="text" className="input-field w-full" value={addForm.phone} onChange={(e) => setAddForm((p) => ({ ...p, phone: e.target.value }))} />
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
              <button type="button" onClick={() => { setShowAdd(false); setEditTarget(null); }} className="btn-secondary">Cancel</button>
              <button type="button" onClick={saveAdd} disabled={savingAdd} className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600 disabled:opacity-50">{savingAdd ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {creditTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-xl">
            <h3 className="mb-1 text-base font-semibold text-heading">Pay Pump — {creditTarget.name}</h3>
            <p className="mb-4 text-xs text-heading/60">Record a payment made to this pump — from bank transfer or cash handler.</p>
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
                <label className="mb-1 block text-xs font-medium text-heading/70">Mode *</label>
                <div className="inline-flex w-full rounded-lg border border-card-border bg-card p-1 text-sm">
                  <button type="button" onClick={() => setCreditForm((p) => ({ ...p, mode: 'bank' }))} className={`flex-1 rounded-md px-3 py-1.5 font-medium ${creditForm.mode === 'bank' ? 'bg-indigo-500 text-white' : 'text-heading/70 hover:bg-surface'}`}>Bank</button>
                  <button type="button" onClick={() => setCreditForm((p) => ({ ...p, mode: 'cash' }))} className={`flex-1 rounded-md px-3 py-1.5 font-medium ${creditForm.mode === 'cash' ? 'bg-indigo-500 text-white' : 'text-heading/70 hover:bg-surface'}`}>Cash</button>
                </div>
              </div>
              {creditForm.mode === 'bank' ? (
                <div>
                  <label className="mb-1 block text-xs font-medium text-heading/70">Bank *</label>
                  <select className="input-field w-full" value={creditForm.bank_name} onChange={(e) => setCreditForm((p) => ({ ...p, bank_name: e.target.value }))}>
                    <option value="">Select bank</option>
                    {banks.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="mb-1 block text-xs font-medium text-heading/70">Cash Handler *</label>
                  <select className="input-field w-full" value={creditForm.cash_handler} onChange={(e) => setCreditForm((p) => ({ ...p, cash_handler: e.target.value }))}>
                    <option value="">Select handler</option>
                    {handlers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs font-medium text-heading/70">Remarks</label>
                <input type="text" className="input-field w-full" value={creditForm.remarks} onChange={(e) => setCreditForm((p) => ({ ...p, remarks: e.target.value }))} />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2 border-t border-card-border pt-4">
              <button type="button" onClick={() => setCreditTarget(null)} className="btn-secondary">Cancel</button>
              <button type="button" onClick={saveCredit} disabled={savingCredit} className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600 disabled:opacity-50">{savingCredit ? 'Saving…' : 'Credit'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
