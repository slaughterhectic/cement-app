import { useEffect, useState, useCallback } from 'react';
import { Pencil, Plus, Trash2, RefreshCw, Building2, Wallet, TrendingUp, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';
import { formatINR, formatDate } from '../lib/format';
import { useToastStore } from '../lib/store';
import { usePagination, PaginationBar } from '../components/tables/SimplePagination';

interface CapitalSummary {
  cash: { handler: string; opening: number; total_received: number; total_spent: number; balance: number }[];
  totalCash: number;
  banks: { bank_name: string; opening: number; total_received: number; total_paid: number; balance: number }[];
  totalBank: number;
  stockValue: { value: number; bags: number };
  totalOutstanding: number;
  totalLoans: number;
  totalCapital: number;
}

const EXPENSE_CATEGORIES = [
  'Staff welfare & Refreshment',
  'Office expense',
  'Labour - Loading / Unloading',
  'Travel Expense',
  'Driver expense',
  'Fuel expense',
  'Miscellaneous',
];

function ImprestSection() {
  const addToast = useToastStore((s) => s.addToast);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedHandler, setSelectedHandler] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editRow, setEditRow] = useState<any | null>(null);
  const [openingEdit, setOpeningEdit] = useState<{ [k: string]: string }>({});
  const [showAddHandler, setShowAddHandler] = useState(false);
  const [newHandlerName, setNewHandlerName] = useState('');
  const [newHandlerBalance, setNewHandlerBalance] = useState('');

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    particulars: '',
    narration: '',
    debit: '',
    credit: '',
    remark: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.imprest.list({});
      setData(res as any[]);
      if (!selectedHandler && (res as any[]).length > 0) {
        setSelectedHandler((res as any[])[0].handler_name);
      }
    } catch {
      addToast('Failed to load cash book', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedHandler, addToast]);

  useEffect(() => { load(); }, [load]);

  const handlerData = data.find((d: any) => d.handler_name === selectedHandler);

  const handleSave = async () => {
    try {
      const payload = {
        date: form.date,
        handler_name: selectedHandler,
        particulars: form.particulars,
        narration: form.narration,
        debit: parseFloat(form.debit) || 0,
        credit: parseFloat(form.credit) || 0,
        remark: form.remark,
      };
      if (editRow) {
        await api.imprest.update(editRow.id, payload);
        addToast('Entry updated', 'success');
      } else {
        await api.imprest.create(payload);
        addToast('Entry added', 'success');
      }
      setShowForm(false);
      setEditRow(null);
      setForm({ date: new Date().toISOString().split('T')[0], particulars: '', narration: '', debit: '', credit: '', remark: '' });
      load();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Save failed', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this entry?')) return;
    try {
      await api.imprest.delete(id);
      addToast('Deleted', 'success');
      load();
    } catch {
      addToast('Delete failed', 'error');
    }
  };

  const handleOpeningUpdate = async (handler: string) => {
    const val = parseFloat(openingEdit[handler] ?? '');
    if (Number.isNaN(val)) return;
    try {
      await api.imprest.upsertHandler({ handler_name: handler, opening_balance: val });
      addToast('Opening balance updated', 'success');
      setOpeningEdit((p) => ({ ...p, [handler]: '' }));
      load();
    } catch {
      addToast('Update failed', 'error');
    }
  };

  const txPg = usePagination(handlerData?.transactions ?? [], 20);

  // Category-wise breakdown
  const categoryTotals: Record<string, number> = {};
  handlerData?.transactions?.forEach((t: any) => {
    if (t.debit > 0 && t.particulars) {
      const cat = t.particulars.trim();
      categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(t.debit);
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Handler:</label>
          <select
            className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm"
            value={selectedHandler}
            onChange={(e) => setSelectedHandler(e.target.value)}
          >
            {data.map((d: any) => (
              <option key={d.handler_name} value={d.handler_name}>{d.handler_name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowAddHandler(true)}
            className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            <Plus className="h-3.5 w-3.5" /> Add Handler
          </button>
        </div>
        <button
          type="button"
          onClick={() => { setEditRow(null); setShowForm(true); }}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" /> Add Entry
        </button>
      </div>

      {handlerData && (
        <>
          {/* Opening balance editor */}
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-card-border bg-white p-3">
            <span className="text-sm text-gray-600">Opening balance for <strong>{handlerData.handler_name}</strong>:</span>
            <input
              type="number"
              className="w-32 rounded border border-gray-200 px-2 py-1 text-sm"
              placeholder={String(handlerData.opening_balance)}
              value={openingEdit[handlerData.handler_name] ?? ''}
              onChange={(e) => setOpeningEdit((p) => ({ ...p, [handlerData.handler_name]: e.target.value }))}
            />
            <button
              type="button"
              onClick={() => handleOpeningUpdate(handlerData.handler_name)}
              className="rounded-md border border-gray-200 px-3 py-1 text-xs font-medium hover:bg-gray-50"
            >
              Update
            </button>
          </div>

          {/* Summary cards */}
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-blue-100 bg-blue-50/80 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-blue-700">Opening</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-blue-900">{formatINR(handlerData.opening_balance)}</p>
            </div>
            <div className="rounded-lg border border-green-100 bg-green-50/80 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-green-700">Total Received</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-green-900">{formatINR(handlerData.transactions.reduce((s: number, t: any) => s + Number(t.credit), 0))}</p>
            </div>
            <div className="rounded-lg border border-red-100 bg-red-50/80 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-red-700">Total Spent</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-red-900">{formatINR(handlerData.transactions.reduce((s: number, t: any) => s + Number(t.debit), 0))}</p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/90 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Current Balance</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-emerald-900">{formatINR(handlerData.current_balance)}</p>
            </div>
          </div>

          {/* Category breakdown */}
          {Object.keys(categoryTotals).length > 0 && (
            <div className="card p-4">
              <h4 className="mb-3 text-sm font-semibold text-heading">Expense breakdown by category</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(categoryTotals)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, amt]) => (
                    <div key={cat} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                      <p className="text-xs text-gray-600">{cat}</p>
                      <p className="text-sm font-semibold text-gray-900">{formatINR(amt)}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Transaction table */}
          <div className="card overflow-hidden p-0">
            <h4 className="border-b border-card-border px-4 py-3 text-sm font-semibold text-heading">
              Transactions — {handlerData.handler_name}
            </h4>
            {loading ? (
              <p className="px-4 py-6 text-sm text-gray-500">Loading…</p>
            ) : handlerData.transactions.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-500">No transactions yet.</p>
            ) : (
              <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Narration</th>
                      <th className="px-4 py-3 text-right">Debit (₹)</th>
                      <th className="px-4 py-3 text-right">Credit (₹)</th>
                      <th className="px-4 py-3 text-right">Balance (₹)</th>
                      <th className="px-4 py-3">Remark</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr className="bg-blue-50/60">
                      <td colSpan={5} className="px-4 py-2 text-xs font-medium text-blue-700">Opening Balance</td>
                      <td className="px-4 py-2 text-right tabular-nums font-semibold text-blue-800">{formatINR(handlerData.opening_balance)}</td>
                      <td colSpan={2} />
                    </tr>
                    {txPg.pageData.map((t: any) => (
                      <tr key={t.id} className={t.credit > 0 ? 'bg-green-50/30 hover:bg-green-50' : 'hover:bg-gray-50'}>
                        <td className="px-4 py-2 whitespace-nowrap">{formatDate(t.date)}</td>
                        <td className="px-4 py-2 max-w-[140px] truncate">{t.particulars || '—'}</td>
                        <td className="px-4 py-2 max-w-[200px] truncate text-gray-600">{t.narration || '—'}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-red-700">{t.debit > 0 ? formatINR(t.debit) : '—'}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-green-700">{t.credit > 0 ? formatINR(t.credit) : '—'}</td>
                        <td className="px-4 py-2 text-right tabular-nums font-medium">{formatINR(t.running_balance)}</td>
                        <td className="px-4 py-2 text-gray-600">{t.remark || '—'}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => { setEditRow(t); setForm({ date: t.date, particulars: t.particulars || '', narration: t.narration || '', debit: t.debit > 0 ? String(t.debit) : '', credit: t.credit > 0 ? String(t.credit) : '', remark: t.remark || '' }); setShowForm(true); }} className="rounded p-1 text-brand-600 hover:bg-brand-50"><Pencil className="h-3.5 w-3.5" /></button>
                            <button type="button" onClick={() => handleDelete(t.id)} className="rounded p-1 text-red-500 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationBar pg={txPg} />
              </>
            )}
          </div>
        </>
      )}

      {/* Add/Edit form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-base font-semibold text-heading">{editRow ? 'Edit Entry' : 'Add Cash Entry'}</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Date *</label>
                <input type="date" className="input-field w-full" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Category (Particulars)</label>
                <input list="imp-cats" type="text" className="input-field w-full" value={form.particulars} onChange={(e) => setForm((p) => ({ ...p, particulars: e.target.value }))} />
                <datalist id="imp-cats">{EXPENSE_CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-600">Narration / Description</label>
                <input type="text" className="input-field w-full" value={form.narration} onChange={(e) => setForm((p) => ({ ...p, narration: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Debit (Expense) ₹</label>
                <input type="number" min={0} step={0.01} className="input-field w-full" value={form.debit} onChange={(e) => setForm((p) => ({ ...p, debit: e.target.value, credit: '' }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Credit (Received) ₹</label>
                <input type="number" min={0} step={0.01} className="input-field w-full" value={form.credit} onChange={(e) => setForm((p) => ({ ...p, credit: e.target.value, debit: '' }))} />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-600">Remark</label>
                <input type="text" className="input-field w-full" value={form.remark} onChange={(e) => setForm((p) => ({ ...p, remark: e.target.value }))} />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => { setShowForm(false); setEditRow(null); }} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="button" onClick={handleSave} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">Save</button>
            </div>
          </div>
        </div>
      )}

      {showAddHandler && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-base font-semibold text-heading">Add Cash Handler</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Handler Name *</label>
                <input
                  type="text"
                  className="input-field w-full"
                  placeholder="e.g. Rahul, Vijay"
                  value={newHandlerName}
                  onChange={(e) => setNewHandlerName(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Opening Balance (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  className="input-field w-full"
                  placeholder="0"
                  value={newHandlerBalance}
                  onChange={(e) => setNewHandlerBalance(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => { setShowAddHandler(false); setNewHandlerName(''); setNewHandlerBalance(''); }} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button
                type="button"
                disabled={!newHandlerName.trim()}
                onClick={async () => {
                  try {
                    await api.imprest.upsertHandler({ handler_name: newHandlerName.trim(), opening_balance: parseFloat(newHandlerBalance) || 0 });
                    addToast(`Handler "${newHandlerName.trim()}" added`, 'success');
                    setShowAddHandler(false);
                    setNewHandlerName('');
                    setNewHandlerBalance('');
                    setSelectedHandler(newHandlerName.trim());
                    load();
                  } catch {
                    addToast('Failed to add handler', 'error');
                  }
                }}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BankSection({ summary, onRefresh }: { summary: CapitalSummary; onRefresh: () => void }) {
  const addToast = useToastStore((s) => s.addToast);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ bank_name: '', opening_balance: '' });

  const handleSave = async () => {
    try {
      await api.capital.upsertBank({ bank_name: form.bank_name.trim(), opening_balance: parseFloat(form.opening_balance) || 0 });
      addToast('Bank updated', 'success');
      setShowAdd(false);
      setForm({ bank_name: '', opening_balance: '' });
      onRefresh();
    } catch {
      addToast('Save failed', 'error');
    }
  };

  const handleDelete = async (name: string) => {
    if (!window.confirm(`Remove ${name} opening balance?`)) return;
    try {
      await api.capital.deleteBank(name);
      addToast('Removed', 'success');
      onRefresh();
    } catch {
      addToast('Delete failed', 'error');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-heading">Bank balances</h4>
          <p className="text-xs text-gray-500 mt-0.5">
            Add bank accounts (e.g. Kotak, BOB, HDFC) and set their opening balance.
            Running balance = Opening + receipts tagged to that bank − expenses paid via that bank.
          </p>
        </div>
        <button type="button" onClick={() => setShowAdd(true)} className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-gray-50 shrink-0">
          <Plus className="h-3.5 w-3.5" /> Add Bank
        </button>
      </div>

      {summary.banks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
          No banks configured yet. Click "Add Bank" to add Kotak, BOB, HDFC etc. with their opening balances.
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Bank</th>
                <th className="px-4 py-3 text-right">Opening (₹)</th>
                <th className="px-4 py-3 text-right">+ Received (₹)</th>
                <th className="px-4 py-3 text-right">− Paid Out (₹)</th>
                <th className="px-4 py-3 text-right font-semibold text-blue-700">Balance (₹)</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {summary.banks.map((b) => (
                <tr key={b.bank_name} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-heading">{b.bank_name}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-600">{formatINR(b.opening)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-green-700">{formatINR(b.total_received)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-red-700">{formatINR(b.total_paid)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-xl font-bold text-blue-700">{formatINR(b.balance)}</td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => handleDelete(b.bank_name)} className="rounded p-1 text-gray-400 hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-gray-300 bg-blue-50/60 font-semibold">
                <td className="px-4 py-3 text-blue-800">Total</td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-600">{formatINR(summary.banks.reduce((s, b) => s + b.opening, 0))}</td>
                <td className="px-4 py-3 text-right tabular-nums text-green-700">{formatINR(summary.banks.reduce((s, b) => s + b.total_received, 0))}</td>
                <td className="px-4 py-3 text-right tabular-nums text-red-700">{formatINR(summary.banks.reduce((s, b) => s + b.total_paid, 0))}</td>
                <td className="px-4 py-3 text-right tabular-nums text-xl font-bold text-blue-800">{formatINR(summary.totalBank)}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-base font-semibold">Add / Update Bank</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium">Bank Name</label>
                <input type="text" className="input-field w-full" placeholder="e.g. Kotak, BOB, HDFC" value={form.bank_name} onChange={(e) => setForm((p) => ({ ...p, bank_name: e.target.value }))} />
                <p className="mt-1 text-xs text-gray-500">Must match the bank name used in Payments and Expenses.</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Opening Balance (₹)</label>
                <input type="number" step={0.01} className="input-field w-full" placeholder="Balance at the start of tracking" value={form.opening_balance} onChange={(e) => setForm((p) => ({ ...p, opening_balance: e.target.value }))} />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setShowAdd(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="button" onClick={handleSave} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Capital() {
  const [summary, setSummary] = useState<CapitalSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const addToast = useToastStore((s) => s.addToast);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await api.capital.summary();
      setSummary(s as CapitalSummary);
    } catch {
      addToast('Failed to load capital summary', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-heading">Revenue &amp; Capital</h1>
          <p className="mt-1 text-sm text-heading/60">Cash, bank balances, and capital overview.</p>
        </div>
        <button type="button" onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </header>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl border border-card-border bg-gray-100" />
          ))}
        </div>
      ) : !summary ? (
        <p className="text-sm text-gray-500">Could not load capital data.</p>
      ) : (
        <>
          {/* Top KPI cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-5">
              <div className="flex items-center gap-2 text-emerald-700">
                <Wallet className="h-5 w-5" />
                <span className="text-xs font-semibold uppercase tracking-wide">Total Capital</span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums text-emerald-800">{formatINR(summary.totalCapital)}</p>
              <p className="mt-1 text-xs text-emerald-700">Cash + all banks</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-5">
              <div className="flex items-center gap-2 text-amber-700">
                <Wallet className="h-5 w-5" />
                <span className="text-xs font-semibold uppercase tracking-wide">Cash in Hand</span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums text-amber-800">{formatINR(summary.totalCash)}</p>
              <p className="mt-1 text-xs text-amber-700">{summary.cash.map((c) => c.handler).join(', ')}</p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50/90 p-5">
              <div className="flex items-center gap-2 text-blue-700">
                <Building2 className="h-5 w-5" />
                <span className="text-xs font-semibold uppercase tracking-wide">Total Bank</span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums text-blue-800">{formatINR(summary.totalBank)}</p>
              <p className="mt-1 text-xs text-blue-700">{summary.banks.length} bank account{summary.banks.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="rounded-xl border border-purple-200 bg-purple-50/90 p-5">
              <div className="flex items-center gap-2 text-purple-700">
                <TrendingUp className="h-5 w-5" />
                <span className="text-xs font-semibold uppercase tracking-wide">Stock Value</span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums text-purple-800">{formatINR(summary.stockValue.value)}</p>
              <p className="mt-1 text-xs text-purple-700">{summary.stockValue.bags.toLocaleString('en-IN')} bags in stock</p>
            </div>
          </div>

          {/* Secondary info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-card-border bg-white p-4">
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-semibold">Outstanding Receivables</span>
              </div>
              <p className="mt-2 text-xl font-bold tabular-nums text-red-700">{formatINR(summary.totalOutstanding)}</p>
              <p className="text-xs text-gray-500 mt-1">Money owed by all parties</p>
            </div>
            <div className="rounded-lg border border-card-border bg-white p-4">
              <div className="flex items-center gap-2 text-orange-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-semibold">Loan Outstanding</span>
              </div>
              <p className="mt-2 text-xl font-bold tabular-nums text-orange-700">{formatINR(summary.totalLoans)}</p>
              <p className="text-xs text-gray-500 mt-1">Principal debt outstanding</p>
            </div>
          </div>

          {/* Bank breakdown */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-heading">Bank breakdown</h2>
            <BankSection summary={summary} onRefresh={load} />
          </section>

          {/* Cash/Imprest section */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-heading">Cash book — Imprest handlers</h2>
            <ImprestSection />
          </section>
        </>
      )}
    </div>
  );
}
