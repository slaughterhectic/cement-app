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
  advance_party: string | null;
  diesel_party_id: number | null;
};

const EXPENSE_CATEGORIES = ['Salary', 'Office Rent', 'Stationery', 'Utilities', 'Freight payment', 'Travel Expense', 'Repairs', 'Other'];
const CATEGORIES = ['Advance', 'Diesel', ...EXPENSE_CATEGORIES];

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
  advance_party: '',
  diesel_party_id: '',
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
  if (c === 'Advance') {
    return (
      <span className="inline-flex rounded-full bg-orange-100 dark:bg-orange-900/40 px-2.5 py-0.5 text-xs font-semibold text-orange-800 dark:text-orange-200">{c}</span>
    );
  }
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
  const [dieselParties, setDieselParties] = useState<{ id: number; name: string }[]>([]);
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
    api.rlDieselParties.list().then((d: any[]) => setDieselParties(d.filter((x) => x.is_active).map((x) => ({ id: x.id, name: x.name })))).catch(() => {});
  }, [load]);

  const monthRows = useMemo(
    () => (monthFilter ? rows.filter((r) => String(r.date).startsWith(monthFilter)) : rows),
    [rows, monthFilter]
  );
  // Advances and Diesel payments are tracked separately — not counted in operational expense totals.
  const advanceRows = useMemo(() => monthRows.filter((r) => r.category === 'Advance'), [monthRows]);
  const dieselExpenseRows = useMemo(() => monthRows.filter((r) => r.category === 'Diesel'), [monthRows]);
  const expenseRows = useMemo(() => monthRows.filter((r) => r.category !== 'Advance' && r.category !== 'Diesel'), [monthRows]);
  const advanceTotal = useMemo(() => advanceRows.reduce((s, r) => s + (Number(r.amount) || 0), 0), [advanceRows]);
  const dieselTotal = useMemo(() => dieselExpenseRows.reduce((s, r) => s + (Number(r.amount) || 0), 0), [dieselExpenseRows]);
  const monthRowsTotal = useMemo(
    () => expenseRows.reduce((s, r) => s + (Number(r.amount) || 0), 0),
    [expenseRows]
  );
  const categoryBreakdown = useMemo(() => {
    const m = new Map<string, { total: number; count: number }>();
    for (const r of expenseRows) {
      const key = (r.category && r.category.trim()) || 'Uncategorised';
      const cur = m.get(key) || { total: 0, count: 0 };
      cur.total += Number(r.amount) || 0;
      cur.count += 1;
      m.set(key, cur);
    }
    return Array.from(m.entries()).map(([category, v]) => ({ category, ...v })).sort((a, b) => b.total - a.total);
  }, [expenseRows]);

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
      advance_party: row.advance_party || '',
      diesel_party_id: row.diesel_party_id ? String(row.diesel_party_id) : '',
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
        advance_party: form.category === 'Advance' ? (form.advance_party || null) : null,
        diesel_party_id: form.category === 'Diesel' ? (Number(form.diesel_party_id) || null) : null,
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
    {
      accessorKey: 'description', header: 'Description',
      cell: ({ getValue, row }) => {
        const desc = (getValue() as string) || '';
        const party = (row.original as ExpenseRow).advance_party;
        const cat = (row.original as ExpenseRow).category;
        if (cat === 'Advance' && party) {
          return <span>{party}{desc ? <span className="text-heading/50"> · {desc}</span> : null}</span>;
        }
        return desc || '—';
      },
    },
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
          <div className="mt-1 flex flex-wrap items-center gap-4">
            <p className="text-sm text-heading/70">
              Expenses: <span className="font-semibold text-heading">{formatINR(monthRowsTotal)}</span>
            </p>
            {dieselTotal > 0 && (
              <p className="text-sm text-cyan-600 dark:text-cyan-400">
                Diesel: <span className="font-semibold">{formatINR(dieselTotal)}</span>
              </p>
            )}
            {advanceTotal > 0 && (
              <p className="text-sm text-orange-600 dark:text-orange-400">
                Advances: <span className="font-semibold">{formatINR(advanceTotal)}</span>
              </p>
            )}
          </div>
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
            {monthFilter ? `${monthLabel(monthFilter)} expenses: ` : 'All-time expenses: '}
            <span className="font-semibold text-heading">{formatINR(monthRowsTotal)}</span>
            <span className="text-xs text-heading/50"> · {expenseRows.length} rows</span>
            {dieselTotal > 0 && (
              <span className="ml-3 text-cyan-600 dark:text-cyan-400 font-medium">
                + {formatINR(dieselTotal)} diesel
              </span>
            )}
            {advanceTotal > 0 && (
              <span className="ml-2 text-orange-600 dark:text-orange-400 font-medium">
                + {formatINR(advanceTotal)} advances
              </span>
            )}
          </span>
        </div>
        {/* Diesel bucket — shown separately, syncs to diesel party ledger */}
        {dieselExpenseRows.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 mb-2">Diesel Payments (auto-posted to pump ledger)</p>
            <div className="flex flex-wrap gap-2">
              {(() => {
                const byParty = new Map<string, { total: number; count: number; dates: string[] }>();
                for (const r of dieselExpenseRows) {
                  const key = r.diesel_party_id
                    ? (dieselParties.find((d) => d.id === r.diesel_party_id)?.name || `Pump #${r.diesel_party_id}`)
                    : (r.description?.trim() || 'Diesel (no pump)');
                  const cur = byParty.get(key) || { total: 0, count: 0, dates: [] };
                  cur.total += Number(r.amount) || 0;
                  cur.count += 1;
                  cur.dates.push(r.date);
                  byParty.set(key, cur);
                }
                return Array.from(byParty.entries()).map(([party, v]) => {
                  const sortedDates = v.dates.sort();
                  const dateRange = v.dates.length === 1
                    ? formatDate(sortedDates[0])
                    : `${formatDate(sortedDates[0])} – ${formatDate(sortedDates[sortedDates.length - 1])}`;
                  return (
                    <div key={party} className="rounded-lg border border-cyan-200 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-900/30 px-3 py-2 text-xs">
                      <p className="font-medium text-cyan-900 dark:text-cyan-100">{party}</p>
                      <p className="mt-0.5 font-semibold text-heading">{formatINR(v.total)}</p>
                      <p className="text-[11px] text-heading/60">{v.count} entr{v.count === 1 ? 'y' : 'ies'} · {dateRange}</p>
                    </div>
                  );
                });
              })()}
              <div className="rounded-lg border border-cyan-300 dark:border-cyan-700 bg-cyan-100 dark:bg-cyan-900/50 px-3 py-2 text-xs font-semibold flex flex-col justify-center">
                <p className="text-cyan-700 dark:text-cyan-300">Total Diesel</p>
                <p className="text-heading">{formatINR(dieselTotal)}</p>
              </div>
            </div>
          </div>
        )}
        {/* Advance bucket — shown separately from expense breakdown */}
        {advanceRows.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400 mb-2">Advances (not counted in expenses)</p>
            <div className="flex flex-wrap gap-2">
              {(() => {
                const byParty = new Map<string, { total: number; count: number }>();
                for (const r of advanceRows) {
                  const key = r.advance_party?.trim() || r.description?.trim() || 'Unknown party';
                  const cur = byParty.get(key) || { total: 0, count: 0 };
                  cur.total += Number(r.amount) || 0;
                  cur.count += 1;
                  byParty.set(key, cur);
                }
                return Array.from(byParty.entries()).map(([party, v]) => (
                  <div key={party} className="rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/30 px-3 py-2 text-xs">
                    <p className="font-medium text-orange-900 dark:text-orange-100">{party}</p>
                    <p className="mt-0.5 font-semibold text-heading">{formatINR(v.total)}</p>
                    <p className="text-[11px] text-heading/60">{v.count} entr{v.count === 1 ? 'y' : 'ies'}</p>
                  </div>
                ));
              })()}
              <div className="rounded-lg border border-orange-300 dark:border-orange-700 bg-orange-100 dark:bg-orange-900/50 px-3 py-2 text-xs font-semibold flex flex-col justify-center">
                <p className="text-orange-700 dark:text-orange-300">Total Advances</p>
                <p className="text-heading">{formatINR(advanceTotal)}</p>
              </div>
            </div>
          </div>
        )}
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
        emptyMessage={monthFilter ? `No entries in ${monthLabel(monthFilter)}.` : 'No entries yet.'}
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
                <h2 className="font-semibold text-heading">
                  {editRow
                    ? (editRow.category === 'Advance' ? 'Edit Advance' : 'Edit Expense')
                    : (form.category === 'Advance' ? 'Record Advance' : 'Add Expense')}
                </h2>
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
                  <select className="input-field" value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value, advance_party: '', diesel_party_id: '' })}>
                    <option value="">— None —</option>
                    <optgroup label="── Advance ──">
                      <option value="Advance">Advance</option>
                    </optgroup>
                    <optgroup label="── Expenses ──">
                      <option value="Diesel">Diesel</option>
                      {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </optgroup>
                  </select>
                </div>
                {form.category === 'Advance' && (
                  <div>
                    <label className="block text-xs font-medium text-heading/70 mb-1">Advance Recipient *</label>
                    <input
                      className="input-field"
                      value={form.advance_party}
                      onChange={(e) => setForm({ ...form, advance_party: e.target.value })}
                      placeholder="e.g. Rajesh Kumar (truck owner name)"
                      required
                    />
                    <p className="mt-1 text-[10px] text-heading/50">If this matches a truck owner name, it auto-posts to their ledger.</p>
                  </div>
                )}
                {form.category === 'Diesel' && (
                  <div>
                    <label className="block text-xs font-medium text-heading/70 mb-1">Diesel Party</label>
                    <select className="input-field" value={form.diesel_party_id} onChange={(e) => setForm({ ...form, diesel_party_id: e.target.value })}>
                      <option value="">— Select pump —</option>
                      {dieselParties.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                    {form.diesel_party_id && <p className="mt-1 text-[10px] text-heading/50">Payment will reflect as a credit in this diesel party's ledger.</p>}
                  </div>
                )}
                {form.category !== 'Advance' && form.category !== 'Diesel' && (
                  <div>
                    <label className="block text-xs font-medium text-heading/70 mb-1">Company</label>
                    <select className="input-field" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value as '' | 'acc' | 'jk' })}>
                      <option value="">— General —</option>
                      <option value="acc">ACC Cement</option>
                      <option value="jk">JK Cement</option>
                    </select>
                  </div>
                )}
                <div className={form.category === 'Advance' || form.category === 'Diesel' ? '' : 'sm:col-span-2 sm:col-start-1'}>
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
                  <input className="input-field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder={form.category === 'Advance' ? 'e.g. Advance for April trip' : 'e.g. May salary — Anuj'} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-heading/70 mb-1">Remarks</label>
                  <input className="input-field" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} placeholder="Optional" />
                </div>
                {form.category === 'Advance' && (
                  <div className="sm:col-span-2 rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/30 px-3 py-2 text-xs text-orange-700 dark:text-orange-300">
                    This advance will appear in the <strong>Advance bucket</strong> (not counted in expense totals).
                    {form.mode === 'bank' && ' Bank ledger will be debited automatically.'}
                    {form.advance_party && ' If recipient matches a truck owner, their ledger will also be updated.'}
                  </div>
                )}
                <div className="sm:col-span-2 flex justify-end gap-2 pt-1">
                  <button type="button" onClick={() => { setModalOpen(false); setEditRow(null); }} className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-heading/80 hover:bg-surface">Cancel</button>
                  <button type="submit" disabled={saving}
                    className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60 ${form.category === 'Advance' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-indigo-500 hover:bg-indigo-600'}`}>
                    {saving ? 'Saving…' : editRow ? 'Save Changes' : form.category === 'Advance' ? 'Record Advance' : 'Add Expense'}
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
