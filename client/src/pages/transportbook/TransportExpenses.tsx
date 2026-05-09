import { MonthPicker } from '../../components/MonthPicker';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import type { ColumnDef } from '../../components/tables/DataTable';
import { DataTable } from '../../components/tables/DataTable';
import { api } from '../../lib/api';
import { formatDate, formatINR } from '../../lib/format';
import { useAuthStore, useToastStore } from '../../lib/store';

type ExpenseRow = {
  id: number;
  date: string;
  amount: number;
  category: string | null;
  description: string | null;
  mode: 'cash' | 'bank';
  bank_name: string | null;
  cash_handler: string | null;
  remarks: string | null;
  company: 'acc' | 'jk' | null;
};

const CATEGORIES = ['Salary', 'Office Rent', 'Stationery', 'Utilities', 'Freight payment', 'Travel Expense', 'Repairs', 'Other'];

const emptyForm = {
  date: new Date().toISOString().split('T')[0],
  category: '',
  description: '',
  amount: '',
  mode: 'cash' as 'cash' | 'bank',
  bank_name: '',
  cash_handler: '',
  remarks: '',
  company: '' as '' | 'acc' | 'jk',
};

function modeBadge(mode: string) {
  const m = String(mode).toLowerCase();
  return m === 'cash' ? (
    <span className="inline-flex rounded-full bg-slate-100 dark:bg-slate-900/40 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-300">cash</span>
  ) : (
    <span className="inline-flex rounded-full bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:text-emerald-200">bank</span>
  );
}

function categoryBadge(category: string | null) {
  const c = category?.trim() || '—';
  if (c === '—') return c;
  return (
    <span className="inline-flex rounded-full bg-amber-50 dark:bg-amber-900/30 px-2.5 py-0.5 text-xs font-medium text-amber-900 dark:text-amber-100">{c}</span>
  );
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(ym: string): string {
  if (!ym) return '';
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export default function TransportExpenses() {
  const addToast = useToastStore((s) => s.addToast);
  const canEditTransport = useAuthStore((s) => s.canEditTransport);
  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [monthTotal, setMonthTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRow, setEditRow] = useState<ExpenseRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [banks, setBanks] = useState<string[]>([]);
  const [handlers, setHandlers] = useState<string[]>([]);
  const [monthFilter, setMonthFilter] = useState<string>(currentMonth());
  const [companyFilter, setCompanyFilter] = useState<'' | 'acc' | 'jk'>('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.rlExpenses.list(companyFilter || undefined);
      setRows((res.data || []) as ExpenseRow[]);
      setMonthTotal(Number(res.monthTotal) || 0);
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to load expenses', 'error');
    } finally { setLoading(false); }
  }, [addToast, companyFilter]);

  useEffect(() => {
    load();
    api.rlBanks.list().then((b: any[]) => setBanks(b.filter((x) => x.is_active !== 0).map((x) => x.name))).catch(() => {});
    api.imprest.handlers().then((h: any[]) => setHandlers(h.map((x) => x.handler_name))).catch(() => {});
  }, [load]);

  const monthRows = useMemo(
    () => (monthFilter ? rows.filter((r) => String(r.date).startsWith(monthFilter)) : rows),
    [rows, monthFilter]
  );
  const monthRowsTotal = useMemo(
    () => monthRows.reduce((s, r) => s + (Number(r.amount) || 0), 0),
    [monthRows]
  );
  const categoryBreakdown = useMemo(() => {
    const m = new Map<string, { total: number; count: number }>();
    for (const r of monthRows) {
      const key = (r.category && r.category.trim()) || 'Uncategorised';
      const cur = m.get(key) || { total: 0, count: 0 };
      cur.total += Number(r.amount) || 0;
      cur.count += 1;
      m.set(key, cur);
    }
    return Array.from(m.entries()).map(([category, v]) => ({ category, ...v })).sort((a, b) => b.total - a.total);
  }, [monthRows]);

  const prevMonth = useMemo(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const openAdd = () => { setEditRow(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (row: ExpenseRow) => {
    setEditRow(row);
    setForm({
      date: row.date,
      category: row.category || '',
      description: row.description || '',
      amount: String(row.amount),
      mode: row.mode,
      bank_name: row.bank_name || '',
      cash_handler: row.cash_handler || '',
      remarks: row.remarks || '',
      company: row.company || '',
    });
    setModalOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.amount) { addToast('Date and amount are required', 'error'); return; }
    if (form.mode === 'bank' && !form.bank_name) { addToast('Pick a bank', 'error'); return; }
    if (form.mode === 'cash' && !form.cash_handler) { addToast('Pick a cash handler', 'error'); return; }
    setSaving(true);
    try {
      const payload = {
        date: form.date,
        category: form.category || null,
        description: form.description || null,
        amount: Number(form.amount),
        mode: form.mode,
        bank_name: form.mode === 'bank' ? form.bank_name : null,
        cash_handler: form.mode === 'cash' ? form.cash_handler : null,
        remarks: form.remarks || null,
        company: form.company || null,
      };
      if (editRow) {
        await api.rlExpenses.update(editRow.id, payload);
        addToast('Expense updated', 'success');
      } else {
        const result = await api.rlExpenses.create(payload);
        if ((result as any).pending) addToast('Sent for admin approval', 'info');
        else addToast('Expense added', 'success');
      }
      setModalOpen(false);
      setForm(emptyForm);
      setEditRow(null);
      load();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = (row: ExpenseRow) => {
    if (!window.confirm(`Delete expense "${row.description || row.category}" (${formatINR(row.amount)})?`)) return;
    api.rlExpenses.delete(row.id).then(() => { addToast('Deleted'); load(); })
      .catch((e) => addToast(e instanceof Error ? e.message : 'Delete failed', 'error'));
  };

  const columns = useMemo<ColumnDef<ExpenseRow>[]>(() => [
    { accessorKey: 'date', header: 'Date', cell: ({ getValue }) => formatDate(String(getValue())) },
    { accessorKey: 'description', header: 'Description', cell: ({ getValue }) => (getValue() as string) || '—' },
    { accessorKey: 'category', header: 'Category', cell: ({ getValue }) => categoryBadge((getValue() as string | null) ?? null) },
    { accessorKey: 'amount', header: 'Amount', cell: ({ getValue }) => formatINR(Number(getValue())) },
    { accessorKey: 'mode', header: 'Mode', cell: ({ getValue }) => modeBadge(String(getValue() ?? '')) },
    { accessorKey: 'bank_name', header: 'Bank', cell: ({ getValue }) => (getValue() as string) ?? '—' },
    {
      id: 'actions', header: 'Actions', enableSorting: false, enableHiding: false,
      cell: ({ row }) => canEditTransport() ? (
        <div className="flex items-center gap-1">
          <button type="button" className="rounded p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30" onClick={() => openEdit(row.original)}>
            <Pencil className="h-4 w-4" />
          </button>
          <button type="button" className="rounded p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30" onClick={() => handleDelete(row.original)}>
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ) : null,
    },
  ], [canEditTransport]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading">Transport Expenses</h1>
          <p className="mt-2 text-lg text-heading/80">
            This month: <span className="font-semibold text-heading">{formatINR(monthTotal)}</span>
          </p>
        </div>
        <button type="button" onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-600">
          <Plus className="h-4 w-4" /> Add Expense
        </button>
      </div>

      {/* Company bucket tabs */}
      <div className="flex items-center gap-1 rounded-lg border border-card-border bg-surface p-0.5 w-fit text-sm">
        {([['', 'All Expenses'], ['acc', 'ACC Expenses'], ['jk', 'JK Expenses']] as const).map(([val, label]) => (
          <button key={val} type="button" onClick={() => setCompanyFilter(val)}
            className={`px-4 py-1.5 rounded-md font-medium transition-colors ${companyFilter === val ? 'bg-indigo-500 text-white' : 'text-heading/70 hover:bg-card-border/40'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Month filter + breakdown */}
      <div className="card flex flex-col gap-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium text-heading/70">Month:</label>
          <MonthPicker value={monthFilter} onChange={setMonthFilter} />
          <button type="button" onClick={() => setMonthFilter(currentMonth())}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${monthFilter === currentMonth() ? 'bg-indigo-500 text-white' : 'border border-card-border text-heading/70 hover:bg-surface'}`}>
            This month
          </button>
          <button type="button" onClick={() => setMonthFilter(prevMonth)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${monthFilter === prevMonth ? 'bg-indigo-500 text-white' : 'border border-card-border text-heading/70 hover:bg-surface'}`}>
            Previous month
          </button>
          <button type="button" onClick={() => setMonthFilter('2025-04')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${monthFilter && monthFilter < '2026-01' ? 'bg-amber-500 text-white' : 'border border-card-border text-heading/70 hover:bg-surface'}`}>
            FY 25-26
          </button>
          <button type="button" onClick={() => setMonthFilter('')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${!monthFilter ? 'bg-indigo-500 text-white' : 'border border-card-border text-heading/70 hover:bg-surface'}`}>
            All time
          </button>
          <span className="ml-auto text-sm text-heading/70">
            {monthFilter ? `${monthLabel(monthFilter)} total: ` : 'All-time total: '}
            <span className="font-semibold text-heading">{formatINR(monthRowsTotal)}</span>
            <span className="text-xs text-heading/50"> · {monthRows.length} rows</span>
          </span>
        </div>
        {categoryBreakdown.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-heading/60 mb-2">Category breakdown</p>
            <div className="flex flex-wrap gap-2">
              {categoryBreakdown.map((c) => {
                const pct = monthRowsTotal > 0 ? (c.total / monthRowsTotal) * 100 : 0;
                return (
                  <div key={c.category} className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30 px-3 py-2 text-xs">
                    <p className="font-medium text-amber-900 dark:text-amber-100">{c.category}</p>
                    <p className="mt-0.5 font-semibold text-heading">{formatINR(c.total)}</p>
                    <p className="text-[11px] text-heading/60">{c.count} entries · {pct.toFixed(1)}%</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <DataTable<ExpenseRow>
        data={monthRows}
        columns={columns}
        isLoading={loading}
        emptyMessage={monthFilter ? `No expenses in ${monthLabel(monthFilter)}.` : 'No expenses yet.'}
        emptyAction={{ label: 'Add Expense', onClick: openAdd }}
        exportFileName={monthFilter ? `transport_expenses_${monthFilter}` : 'transport_expenses'}
        canDelete={canEditTransport()}
        canDownload
      />

      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40">
          <div className="flex min-h-full items-center justify-center px-4 py-6">
            <div className="w-full max-w-lg rounded-xl bg-card shadow-2xl">
              <div className="flex items-center justify-between border-b border-card-border px-5 py-4">
                <h2 className="font-semibold text-heading">{editRow ? 'Edit Expense' : 'Add Expense'}</h2>
                <button type="button" onClick={() => { setModalOpen(false); setEditRow(null); }} className="rounded-lg p-1.5 hover:bg-card-border/50">
                  <X className="h-5 w-5 text-heading/60" />
                </button>
              </div>
              <form onSubmit={submit} className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-heading/70 mb-1">Date *</label>
                  <input type="date" className="input-field" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-heading/70 mb-1">Amount (₹) *</label>
                  <input type="number" min="0" step="0.01" className="input-field" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-heading/70 mb-1">Category</label>
                  <select className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    <option value="">— None —</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-heading/70 mb-1">Company</label>
                  <select className="input-field" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value as '' | 'acc' | 'jk' })}>
                    <option value="">— General —</option>
                    <option value="acc">ACC Cement</option>
                    <option value="jk">JK Cement</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-heading/70 mb-1">Mode *</label>
                  <div className="flex items-center gap-1 rounded-lg border border-card-border bg-surface p-0.5 text-sm">
                    {(['cash', 'bank'] as const).map((m) => (
                      <button key={m} type="button" onClick={() => setForm({ ...form, mode: m })}
                        className={`flex-1 px-3 py-1.5 rounded-md font-medium capitalize transition-colors ${form.mode === m ? 'bg-indigo-500 text-white' : 'text-heading/70 hover:bg-card-border/40'}`}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
                {form.mode === 'cash' ? (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-heading/70 mb-1">Cash Handler *</label>
                    <select className="input-field" value={form.cash_handler} onChange={(e) => setForm({ ...form, cash_handler: e.target.value })} required>
                      <option value="">Select handler</option>
                      {handlers.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ) : (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-heading/70 mb-1">Bank *</label>
                    <select className="input-field" value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} required>
                      <option value="">Select bank</option>
                      {banks.map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-heading/70 mb-1">Description</label>
                  <input className="input-field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. May salary — Anuj" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-heading/70 mb-1">Remarks</label>
                  <input className="input-field" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} placeholder="Optional" />
                </div>
                <div className="sm:col-span-2 flex justify-end gap-2 pt-1">
                  <button type="button" onClick={() => { setModalOpen(false); setEditRow(null); }} className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-heading/80 hover:bg-surface">Cancel</button>
                  <button type="submit" disabled={saving} className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600 disabled:opacity-60">
                    {saving ? 'Saving…' : editRow ? 'Save Changes' : 'Add Expense'}
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
