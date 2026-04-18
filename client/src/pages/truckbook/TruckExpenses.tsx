import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { formatINR, formatDate } from '../../lib/format';
import { useToastStore, useAuthStore } from '../../lib/store';

interface ExpenseRow {
  id: number;
  date: string;
  truck_id: number | null;
  truck_number: string | null;
  category: string | null;
  description: string | null;
  amount: number;
  mode: 'cash' | 'bank';
  bank_name: string | null;
  cash_handler: string | null;
}

interface Truck { id: number; truck_number: string; }
interface Bank { id: number; bank_name: string; }

const CATEGORIES = ['EMI', 'Maintenance', 'Road Tax', 'Pollution Certificate', 'Insurance', 'Fuel (bulk)', 'Other'];

const emptyForm = {
  date: new Date().toISOString().split('T')[0],
  truck_id: '',
  category: '',
  description: '',
  amount: '',
  mode: 'cash' as 'cash' | 'bank',
  bank_name: '',
  cash_handler: '',
};

export default function TruckExpenses() {
  const addToast = useToastStore((s) => s.addToast);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [cashHandlers, setCashHandlers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterTruck, setFilterTruck] = useState('');
  const [filterMonth, setFilterMonth] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterTruck) params.truck_id = filterTruck;
      const data = await api.truckExpenses.list(Object.keys(params).length ? params : undefined);
      setRows(data);
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to load expenses', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, filterTruck]);

  const loadMeta = useCallback(async () => {
    try {
      const [t, b, h] = await Promise.all([
        api.trucks.list(),
        api.capital.banks(),
        api.imprest.handlers(),
      ]);
      setTrucks(t);
      setBanks(b);
      setCashHandlers((h || []).map((row: any) => row.handler_name));
    } catch (_) {}
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadMeta(); }, [loadMeta]);

  // Filter by month client-side
  const filteredRows = filterMonth
    ? rows.filter((r) => r.date?.substring(0, 7) === filterMonth)
    : rows;

  // Category totals
  const categoryTotals = filteredRows.reduce<Record<string, number>>((acc, r) => {
    const cat = r.category || 'Uncategorized';
    acc[cat] = (acc[cat] || 0) + Number(r.amount);
    return acc;
  }, {});

  const grandTotal = filteredRows.reduce((s, r) => s + Number(r.amount), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.amount) { addToast('Date and Amount are required', 'error'); return; }
    if (form.mode === 'cash' && !form.cash_handler) {
      addToast('Select a cash handler', 'error'); return;
    }
    if (form.mode === 'bank' && !form.bank_name) {
      addToast('Select a bank', 'error'); return;
    }
    setSaving(true);
    try {
      await api.truckExpenses.create({
        date: form.date,
        truck_id: form.truck_id ? Number(form.truck_id) : null,
        category: form.category || null,
        description: form.description || null,
        amount: Number(form.amount),
        mode: form.mode,
        bank_name: form.mode === 'bank' ? (form.bank_name || null) : null,
        cash_handler: form.mode === 'cash' ? (form.cash_handler || null) : null,
      });
      addToast('Expense added', 'success');
      setForm(emptyForm);
      setModalOpen(false);
      load();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await api.truckExpenses.delete(id);
      addToast('Expense deleted', 'success');
      load();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Delete failed', 'error');
    }
  };

  const f = (field: keyof typeof emptyForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading">Truck Expenses</h1>
          <p className="text-sm text-gray-500 mt-1">Fixed & periodic truck expenses</p>
        </div>
        <button
          type="button"
          onClick={() => { setForm(emptyForm); setModalOpen(true); }}
          className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-orange-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Expense
        </button>
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap gap-4 p-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600 whitespace-nowrap">Truck:</label>
          <select className="input-field py-1.5 text-sm min-w-[140px]" value={filterTruck}
            onChange={(e) => setFilterTruck(e.target.value)}>
            <option value="">All Trucks</option>
            {trucks.map((t) => <option key={t.id} value={String(t.id)}>{t.truck_number}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600 whitespace-nowrap">Month:</label>
          <input type="month" className="input-field py-1.5 text-sm" value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)} />
        </div>
        {(filterTruck || filterMonth) && (
          <button type="button" onClick={() => { setFilterTruck(''); setFilterMonth(''); }}
            className="text-sm text-orange-600 hover:underline font-medium">
            Clear filters
          </button>
        )}
      </div>

      {/* Category summary */}
      {Object.keys(categoryTotals).length > 0 && (
        <div className="card p-4">
          <p className="text-sm font-semibold text-heading mb-3">Expense by Category</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(categoryTotals)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, total]) => (
                <div key={cat} className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-center">
                  <p className="text-xs text-orange-600 font-medium">{cat}</p>
                  <p className="text-sm font-bold text-heading">{formatINR(total)}</p>
                </div>
              ))}
            <div className="rounded-lg border-2 border-orange-500 bg-orange-500 px-3 py-2 text-center">
              <p className="text-xs text-orange-100 font-medium">Total</p>
              <p className="text-sm font-bold text-white">{formatINR(grandTotal)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-card-border bg-orange-50 text-left">
                <th className="px-4 py-3 font-medium text-orange-700">Date</th>
                <th className="px-4 py-3 font-medium text-orange-700">Truck</th>
                <th className="px-4 py-3 font-medium text-orange-700">Category</th>
                <th className="px-4 py-3 font-medium text-orange-700">Description</th>
                <th className="px-4 py-3 font-medium text-orange-700 text-right">Amount</th>
                <th className="px-4 py-3 font-medium text-orange-700">Mode</th>
                <th className="px-4 py-3 font-medium text-orange-700">Bank / Handler</th>
                {isAdmin() && <th className="px-4 py-3 font-medium text-orange-700">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <p className="text-gray-400 mb-3">No expenses found</p>
                    <button type="button" onClick={() => setModalOpen(true)}
                      className="text-orange-600 hover:underline text-sm font-medium">Add first expense</button>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.id} className="border-b border-card-border last:border-0 hover:bg-orange-50/40 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(row.date)}</td>
                    <td className="px-4 py-3 font-medium text-orange-600">{row.truck_number || '—'}</td>
                    <td className="px-4 py-3">
                      {row.category ? (
                        <span className="inline-flex rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-700">
                          {row.category}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{row.description || '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatINR(Number(row.amount))}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        row.mode === 'cash' ? 'bg-slate-100 text-slate-700' : 'bg-emerald-50 text-emerald-800'
                      }`}>
                        {row.mode}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {row.mode === 'cash' ? (row.cash_handler || '—') : (row.bank_name || '—')}
                    </td>
                    {isAdmin() && (
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => handleDelete(row.id)}
                          className="rounded p-1.5 text-red-500 hover:bg-red-50 transition-colors" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
            {filteredRows.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-orange-200 bg-orange-50 font-semibold">
                  <td colSpan={4} className="px-4 py-3 text-orange-700">Total</td>
                  <td className="px-4 py-3 text-right text-orange-700">{formatINR(grandTotal)}</td>
                  <td colSpan={isAdmin() ? 3 : 2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-card-border px-5 py-4">
              <h2 className="font-semibold text-heading">Add Truck Expense</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg p-1.5 hover:bg-gray-100">
                <span className="sr-only">Close</span>
                <Plus className="h-5 w-5 text-gray-500 rotate-45" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input type="date" className="input-field" value={form.date} onChange={f('date')} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Truck *</label>
                  <select className="input-field" value={form.truck_id} onChange={f('truck_id')} required>
                    <option value="">Select truck</option>
                    {trucks.map((t) => <option key={t.id} value={String(t.id)}>{t.truck_number}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <select className="input-field" value={form.category} onChange={f('category')} required>
                    <option value="">Select category</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
                  <input type="number" min="0" step="0.01" className="input-field" value={form.amount} onChange={f('amount')} placeholder="0" required />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input className="input-field" value={form.description} onChange={f('description')} placeholder="Optional description" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mode</label>
                  <select
                    className="input-field"
                    value={form.mode}
                    onChange={(e) => setForm((p) => ({ ...p, mode: e.target.value as 'cash' | 'bank', bank_name: '', cash_handler: '' }))}
                  >
                    <option value="cash">Cash</option>
                    <option value="bank">Bank</option>
                  </select>
                </div>
                {form.mode === 'bank' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name *</label>
                    <select className="input-field" value={form.bank_name} onChange={f('bank_name')}>
                      <option value="">Select bank</option>
                      {banks.map((b) => <option key={b.id} value={b.bank_name}>{b.bank_name}</option>)}
                    </select>
                    {banks.length === 0 && (
                      <p className="text-xs text-amber-600 mt-1">No banks configured — add them in Settings</p>
                    )}
                  </div>
                )}
                {form.mode === 'cash' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cash Handler *</label>
                    <select className="input-field" value={form.cash_handler} onChange={f('cash_handler')}>
                      <option value="">Select handler</option>
                      {cashHandlers.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                    {cashHandlers.length === 0 && (
                      <p className="text-xs text-amber-600 mt-1">Add one in Capital → Add Cash Handler.</p>
                    )}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-60 transition-colors">
                  {saving ? 'Saving…' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
