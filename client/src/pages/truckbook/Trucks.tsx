import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, CreditCard } from 'lucide-react';
import { api } from '../../lib/api';
import { formatINR, formatDate } from '../../lib/format';
import { useToastStore, useAuthStore } from '../../lib/store';

interface TruckRow {
  id: number;
  truck_number: string;
  purchase_date: string | null;
  total_value: number;
  down_payment: number;
  financed_amount: number;
  emi_amount: number;
  emi_tenure: number | null;
  lender_name: string | null;
  is_active: number;
  remarks: string | null;
  trip_count: number;
}

const emptyForm = {
  truck_number: '',
  purchase_date: '',
  total_value: '',
  down_payment: '',
  financed_amount: '',
  emi_amount: '',
  emi_tenure: '',
  lender_name: '',
  remarks: '',
};

const emptyRepayForm = {
  date: new Date().toISOString().split('T')[0],
  amount: '',
  mode: 'bank' as 'bank' | 'cash',
  bank_name: '',
  remarks: '',
};

export default function Trucks() {
  const addToast = useToastStore((s) => s.addToast);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const [rows, setRows] = useState<TruckRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TruckRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // EMI Repayments state
  const [repayTarget, setRepayTarget] = useState<TruckRow | null>(null);
  const [repayments, setRepayments] = useState<any[]>([]);
  const [repayForm, setRepayForm] = useState(emptyRepayForm);
  const [repayLoading, setRepayLoading] = useState(false);
  const [repaySaving, setRepaySaving] = useState(false);
  const [repayHistory, setRepayHistory] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.trucks.list();
      setRows(data);
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to load trucks', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (row: TruckRow) => {
    setEditing(row);
    setForm({
      truck_number: row.truck_number,
      purchase_date: row.purchase_date || '',
      total_value: String(row.total_value || ''),
      down_payment: String(row.down_payment || ''),
      financed_amount: String(row.financed_amount || ''),
      emi_amount: String(row.emi_amount || ''),
      emi_tenure: String(row.emi_tenure || ''),
      lender_name: row.lender_name || '',
      remarks: row.remarks || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.truck_number.trim()) { addToast('Truck number is required', 'error'); return; }
    setSaving(true);
    try {
      const payload = {
        truck_number: form.truck_number.trim(),
        purchase_date: form.purchase_date || null,
        total_value: Number(form.total_value) || 0,
        down_payment: Number(form.down_payment) || 0,
        financed_amount: Number(form.financed_amount) || 0,
        emi_amount: Number(form.emi_amount) || 0,
        emi_tenure: form.emi_tenure ? Number(form.emi_tenure) : null,
        lender_name: form.lender_name || null,
        remarks: form.remarks || null,
      };
      if (editing) {
        await api.trucks.update(editing.id, payload);
        addToast('Truck updated', 'success');
      } else {
        await api.trucks.create(payload);
        addToast('Truck added', 'success');
      }
      setModalOpen(false);
      load();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: TruckRow) => {
    if (!window.confirm(`Delete truck "${row.truck_number}"?`)) return;
    try {
      await api.trucks.delete(row.id);
      addToast('Truck deleted', 'success');
      load();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Delete failed', 'error');
    }
  };

  const openRepay = async (row: TruckRow) => {
    setRepayTarget(row);
    setRepayHistory(false);
    setRepayForm({ ...emptyRepayForm, amount: row.emi_amount ? String(row.emi_amount) : '' });
    setRepayLoading(true);
    try {
      const data = await api.truckEmiRepayments.list({ truck_id: row.id });
      setRepayments(data);
    } catch (_) { setRepayments([]); }
    finally { setRepayLoading(false); }
  };

  const loadRepayments = async (truckId: number) => {
    setRepayLoading(true);
    try {
      const data = await api.truckEmiRepayments.list({ truck_id: truckId });
      setRepayments(data);
    } catch (_) { setRepayments([]); }
    finally { setRepayLoading(false); }
  };

  const handleRepaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repayTarget) return;
    const amt = Number(repayForm.amount);
    if (!(amt > 0)) { addToast('Amount must be greater than 0', 'error'); return; }
    setRepaySaving(true);
    try {
      await api.truckEmiRepayments.create({
        truck_id: repayTarget.id,
        date: repayForm.date,
        amount: amt,
        mode: repayForm.mode,
        bank_name: repayForm.mode === 'bank' ? (repayForm.bank_name || null) : null,
        remarks: repayForm.remarks || null,
      });
      addToast('Repayment recorded', 'success');
      setRepayForm({ ...emptyRepayForm, amount: repayTarget.emi_amount ? String(repayTarget.emi_amount) : '' });
      await loadRepayments(repayTarget.id);
      setRepayHistory(true);
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally { setRepaySaving(false); }
  };

  const handleRepayDelete = async (id: number) => {
    if (!window.confirm('Delete this repayment?')) return;
    if (!repayTarget) return;
    try {
      await api.truckEmiRepayments.delete(id);
      addToast('Repayment deleted', 'success');
      await loadRepayments(repayTarget.id);
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Delete failed', 'error');
    }
  };

  const f = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading">Trucks</h1>
          <p className="text-sm text-heading/60 mt-1">{rows.length} truck{rows.length !== 1 ? 's' : ''} registered</p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-orange-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Truck
        </button>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-card-border bg-orange-50 dark:bg-orange-900/30 text-left">
                <th className="px-4 py-3 font-medium text-orange-700 dark:text-orange-300">Truck No.</th>
                <th className="px-4 py-3 font-medium text-orange-700 dark:text-orange-300">Purchase Date</th>
                <th className="px-4 py-3 font-medium text-orange-700 dark:text-orange-300 text-right">Total Value</th>
                <th className="px-4 py-3 font-medium text-orange-700 dark:text-orange-300 text-right">Down Payment</th>
                <th className="px-4 py-3 font-medium text-orange-700 dark:text-orange-300 text-right">Financed</th>
                <th className="px-4 py-3 font-medium text-orange-700 dark:text-orange-300 text-right">EMI</th>
                <th className="px-4 py-3 font-medium text-orange-700 dark:text-orange-300 text-right">Trips</th>
                <th className="px-4 py-3 font-medium text-orange-700 dark:text-orange-300">Lender</th>
                <th className="px-4 py-3 font-medium text-orange-700 dark:text-orange-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-heading/50">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <p className="text-heading/50 mb-3">No trucks added yet</p>
                    <button type="button" onClick={openAdd} className="text-orange-600 dark:text-orange-400 hover:underline text-sm font-medium">Add your first truck</button>
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b border-card-border last:border-0 hover:bg-orange-50/40 dark:hover:bg-orange-900/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-orange-600 dark:text-orange-400">{row.truck_number}</td>
                    <td className="px-4 py-3 text-heading/70">{row.purchase_date ? formatDate(row.purchase_date) : '—'}</td>
                    <td className="px-4 py-3 text-right">{formatINR(Number(row.total_value))}</td>
                    <td className="px-4 py-3 text-right">{formatINR(Number(row.down_payment))}</td>
                    <td className="px-4 py-3 text-right">{formatINR(Number(row.financed_amount))}</td>
                    <td className="px-4 py-3 text-right">
                      {row.emi_amount ? `${formatINR(Number(row.emi_amount))} × ${row.emi_tenure || '?'} mo` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/40 px-2.5 py-0.5 text-xs font-medium text-orange-700 dark:text-orange-300">
                        {row.trip_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-heading/70">{row.lender_name || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => openRepay(row)} className="rounded p-1.5 text-heading/60 hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:text-blue-600 dark:text-blue-400 transition-colors" title="Repayments">
                          <CreditCard className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => openEdit(row)} className="rounded p-1.5 text-heading/60 hover:bg-orange-100 dark:hover:bg-orange-900/40 hover:text-orange-600 dark:text-orange-400 transition-colors" title="Edit">
                          <Pencil className="h-4 w-4" />
                        </button>
                        {isAdmin() && (
                          <button type="button" onClick={() => handleDelete(row)} className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors" title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EMI Repayments Modal */}
      {repayTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-xl bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-card-border px-5 py-4">
              <div>
                <h2 className="font-semibold text-heading">EMI Repayments — {repayTarget.truck_number}</h2>
                {repayTarget.financed_amount > 0 && (
                  <p className="text-xs text-heading/60 mt-0.5">Financed: {formatINR(Number(repayTarget.financed_amount))}</p>
                )}
              </div>
              <button type="button" onClick={() => setRepayTarget(null)} className="rounded-lg p-1.5 hover:bg-card-border/50 transition-colors">
                <X className="h-5 w-5 text-heading/60" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-card-border">
              <button
                type="button"
                onClick={() => setRepayHistory(false)}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${!repayHistory ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400' : 'text-heading/60 hover:text-heading'}`}
              >
                Record Payment
              </button>
              <button
                type="button"
                onClick={() => setRepayHistory(true)}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${repayHistory ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400' : 'text-heading/60 hover:text-heading'}`}
              >
                History ({repayments.length})
              </button>
            </div>

            {!repayHistory ? (
              <form onSubmit={handleRepaySubmit} className="p-5 flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-heading/80 mb-1">Date *</label>
                    <input type="date" className="input-field" value={repayForm.date} onChange={(e) => setRepayForm((p) => ({ ...p, date: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-heading/80 mb-1">Amount (₹) *</label>
                    <input type="number" min="0.01" step="0.01" className="input-field" value={repayForm.amount} onChange={(e) => setRepayForm((p) => ({ ...p, amount: e.target.value }))} placeholder="0" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-heading/80 mb-1">Mode</label>
                    <select className="input-field" value={repayForm.mode} onChange={(e) => setRepayForm((p) => ({ ...p, mode: e.target.value as 'bank' | 'cash' }))}>
                      <option value="bank">Bank</option>
                      <option value="cash">Cash</option>
                    </select>
                  </div>
                  {repayForm.mode === 'bank' && (
                    <div>
                      <label className="block text-sm font-medium text-heading/80 mb-1">Bank Name</label>
                      <input className="input-field" value={repayForm.bank_name} onChange={(e) => setRepayForm((p) => ({ ...p, bank_name: e.target.value }))} placeholder="e.g. SBI" />
                    </div>
                  )}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-heading/80 mb-1">Remarks</label>
                    <input className="input-field" value={repayForm.remarks} onChange={(e) => setRepayForm((p) => ({ ...p, remarks: e.target.value }))} placeholder="Optional notes" />
                  </div>
                </div>
                {/* Progress indicator */}
                {repayTarget.financed_amount > 0 && (
                  <div className="rounded-lg bg-surface border border-card-border px-4 py-3 text-sm">
                    <div className="flex justify-between mb-1.5">
                      <span className="text-heading/70">Total Repaid</span>
                      <span className="font-semibold text-green-700 dark:text-green-300">
                        {formatINR(repayments.reduce((s, r) => s + Number(r.amount), 0))}
                      </span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-heading/70">Original Financed</span>
                      <span className="font-semibold">{formatINR(Number(repayTarget.financed_amount))}</span>
                    </div>
                    {(() => {
                      const totalRepaid = repayments.reduce((s, r) => s + Number(r.amount), 0);
                      const pct = Math.min(100, (totalRepaid / Number(repayTarget.financed_amount)) * 100);
                      return (
                        <div className="h-2 rounded-full bg-card-border/60">
                          <div className="h-2 rounded-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      );
                    })()}
                  </div>
                )}
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setRepayTarget(null)} className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-heading/80 hover:bg-surface transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={repaySaving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors">
                    {repaySaving ? 'Saving…' : 'Record Payment'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-5">
                {/* Progress indicator in history tab */}
                {repayTarget.financed_amount > 0 && (
                  <div className="rounded-lg bg-surface border border-card-border px-4 py-3 text-sm mb-4">
                    <div className="flex justify-between mb-1.5">
                      <span className="text-heading/70">Total Repaid</span>
                      <span className="font-semibold text-green-700 dark:text-green-300">
                        {formatINR(repayments.reduce((s, r) => s + Number(r.amount), 0))}
                      </span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-heading/70">Original Financed</span>
                      <span className="font-semibold">{formatINR(Number(repayTarget.financed_amount))}</span>
                    </div>
                    {(() => {
                      const totalRepaid = repayments.reduce((s, r) => s + Number(r.amount), 0);
                      const pct = Math.min(100, (totalRepaid / Number(repayTarget.financed_amount)) * 100);
                      return (
                        <div className="h-2 rounded-full bg-card-border/60">
                          <div className="h-2 rounded-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      );
                    })()}
                  </div>
                )}
                {repayLoading ? (
                  <p className="text-center text-sm text-heading/50 py-6">Loading…</p>
                ) : repayments.length === 0 ? (
                  <p className="text-center text-sm text-heading/50 py-6">No repayments recorded yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-card-border text-left text-xs font-medium text-heading/60 uppercase tracking-wider">
                          <th className="pb-2">Date</th>
                          <th className="pb-2 text-right">Amount</th>
                          <th className="pb-2">Mode</th>
                          <th className="pb-2">Bank</th>
                          <th className="pb-2">Remarks</th>
                          {isAdmin() && <th className="pb-2"></th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-card-border">
                        {repayments.map((r) => (
                          <tr key={r.id} className="hover:bg-surface/50">
                            <td className="py-2 whitespace-nowrap">{formatDate(r.date)}</td>
                            <td className="py-2 text-right font-medium tabular-nums text-green-700 dark:text-green-300">{formatINR(Number(r.amount))}</td>
                            <td className="py-2 capitalize">{r.mode}</td>
                            <td className="py-2 text-heading/70">{r.bank_name || '—'}</td>
                            <td className="py-2 text-heading/70 max-w-[120px] truncate">{r.remarks || '—'}</td>
                            {isAdmin() && (
                              <td className="py-2">
                                <button type="button" onClick={() => handleRepayDelete(r.id)} className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-xl bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-card-border px-5 py-4">
              <h2 className="font-semibold text-heading">{editing ? 'Edit Truck' : 'Add Truck'}</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg p-1.5 hover:bg-card-border/50 transition-colors">
                <X className="h-5 w-5 text-heading/60" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-heading/80 mb-1">Truck Number *</label>
                  <input className="input-field" value={form.truck_number} onChange={f('truck_number')} placeholder="e.g. MH12AB1234" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-heading/80 mb-1">Purchase Date</label>
                  <input type="date" className="input-field" value={form.purchase_date} onChange={f('purchase_date')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-heading/80 mb-1">Total Value (₹)</label>
                  <input type="number" min="0" step="0.01" className="input-field" value={form.total_value} onChange={f('total_value')} placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-heading/80 mb-1">Down Payment (₹)</label>
                  <input type="number" min="0" step="0.01" className="input-field" value={form.down_payment} onChange={f('down_payment')} placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-heading/80 mb-1">Financed Amount (₹)</label>
                  <input type="number" min="0" step="0.01" className="input-field" value={form.financed_amount} onChange={f('financed_amount')} placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-heading/80 mb-1">EMI Amount (₹)</label>
                  <input type="number" min="0" step="0.01" className="input-field" value={form.emi_amount} onChange={f('emi_amount')} placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-heading/80 mb-1">EMI Tenure (months)</label>
                  <input type="number" min="0" className="input-field" value={form.emi_tenure} onChange={f('emi_tenure')} placeholder="0" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-heading/80 mb-1">Lender Name</label>
                  <input className="input-field" value={form.lender_name} onChange={f('lender_name')} placeholder="Bank / NBFC name" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-heading/80 mb-1">Remarks</label>
                  <textarea className="input-field resize-none" rows={2} value={form.remarks} onChange={f('remarks')} placeholder="Optional notes" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-heading/80 hover:bg-surface transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600 disabled:opacity-60 transition-colors">
                  {saving ? 'Saving…' : editing ? 'Update' : 'Add Truck'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
