import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Eye, ToggleLeft, ToggleRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useToastStore, useAuthStore } from '../../lib/store';

interface OwnerRow {
  id: number;
  truck_number: string;
  owner_name: string;
  owner_phone: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  bank_account: string | null;
  ifsc_code: string | null;
  beneficiary_name: string | null;
  pan_number: string | null;
  is_active: number;
  trip_count: number;
  commission_pct: number | null;
}

const emptyForm = {
  truck_number: '',
  owner_name: '',
  owner_phone: '',
  driver_name: '',
  driver_phone: '',
  bank_account: '',
  ifsc_code: '',
  beneficiary_name: '',
  pan_number: '',
  commission_pct: '6.29',
};

function maskAccount(account: string | null): string {
  if (!account) return '—';
  if (account.length <= 4) return account;
  return '*'.repeat(account.length - 4) + account.slice(-4);
}

export default function TruckOwners() {
  const navigate = useNavigate();
  const addToast = useToastStore((s) => s.addToast);
  const canEditTransport = useAuthStore((s) => s.canEditTransport);
  const [rows, setRows] = useState<OwnerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<OwnerRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.rlTruckOwners.list();
      setRows(data);
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to load truck owners', 'error');
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

  const openEdit = (row: OwnerRow) => {
    setEditing(row);
    setForm({
      truck_number: row.truck_number,
      owner_name: row.owner_name,
      owner_phone: row.owner_phone || '',
      driver_name: row.driver_name || '',
      driver_phone: row.driver_phone || '',
      bank_account: row.bank_account || '',
      ifsc_code: row.ifsc_code || '',
      beneficiary_name: row.beneficiary_name || '',
      pan_number: row.pan_number || '',
      commission_pct: row.commission_pct != null ? String(row.commission_pct) : '6.29',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.truck_number.trim()) { addToast('Truck number is required', 'error'); return; }
    if (!form.owner_name.trim()) { addToast('Owner name is required', 'error'); return; }
    const commissionPct = Number(form.commission_pct);
    if (!Number.isFinite(commissionPct) || commissionPct < 0 || commissionPct > 100) {
      addToast('Commission % must be between 0 and 100', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        truck_number: form.truck_number.trim(),
        owner_name: form.owner_name.trim(),
        owner_phone: form.owner_phone || null,
        driver_name: form.driver_name || null,
        driver_phone: form.driver_phone || null,
        bank_account: form.bank_account || null,
        ifsc_code: form.ifsc_code || null,
        beneficiary_name: form.beneficiary_name || null,
        pan_number: form.pan_number || null,
        commission_pct: commissionPct,
      };
      if (editing) {
        await api.rlTruckOwners.update(editing.id, payload);
        addToast('Truck owner updated', 'success');
      } else {
        await api.rlTruckOwners.create(payload);
        addToast('Truck owner added', 'success');
      }
      setModalOpen(false);
      load();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: OwnerRow) => {
    if (!window.confirm(`Delete truck owner "${row.owner_name} (${row.truck_number})"?`)) return;
    try {
      await api.rlTruckOwners.delete(row.id);
      addToast('Truck owner deleted', 'success');
      load();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Delete failed', 'error');
    }
  };

  const handleToggleActive = async (row: OwnerRow) => {
    const nextActive = row.is_active === 1 ? 0 : 1;
    const verb = nextActive === 1 ? 'activate' : 'deactivate';
    if (nextActive === 1 &&
        !window.confirm(`Activate ${row.truck_number}? GPS rent will start debiting from this month.`)) return;
    if (nextActive === 0 &&
        !window.confirm(`Deactivate ${row.truck_number}? GPS rent will stop accruing.`)) return;
    try {
      await api.rlTruckOwners.update(row.id, {
        truck_number: row.truck_number,
        owner_name: row.owner_name,
        owner_phone: row.owner_phone,
        driver_name: row.driver_name,
        driver_phone: row.driver_phone,
        bank_account: row.bank_account,
        ifsc_code: row.ifsc_code,
        beneficiary_name: row.beneficiary_name,
        pan_number: row.pan_number,
        is_active: nextActive,
        commission_pct: row.commission_pct ?? 6.29,
      });
      addToast(`Truck ${verb}d`, 'success');
      load();
    } catch (e) {
      addToast(e instanceof Error ? e.message : `Failed to ${verb}`, 'error');
    }
  };

  const f = (field: keyof typeof emptyForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading">Truck Owners</h1>
          <p className="text-sm text-heading/60 mt-1">{rows.length} truck owner{rows.length !== 1 ? 's' : ''} registered</p>
        </div>
        {canEditTransport() && (
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Truck Owner
          </button>
        )}
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-card-border bg-indigo-50 dark:bg-indigo-900/30 text-left">
                <th className="px-4 py-3 font-medium text-indigo-700 dark:text-indigo-300">Truck No.</th>
                <th className="px-4 py-3 font-medium text-indigo-700 dark:text-indigo-300">Owner Name</th>
                <th className="px-4 py-3 font-medium text-indigo-700 dark:text-indigo-300">Owner Phone</th>
                <th className="px-4 py-3 font-medium text-indigo-700 dark:text-indigo-300">Driver</th>
                <th className="px-4 py-3 font-medium text-indigo-700 dark:text-indigo-300">Bank Account</th>
                <th className="px-4 py-3 font-medium text-indigo-700 dark:text-indigo-300">PAN</th>
                <th className="px-4 py-3 font-medium text-indigo-700 dark:text-indigo-300 text-right">Comm %</th>
                <th className="px-4 py-3 font-medium text-indigo-700 dark:text-indigo-300 text-right">Trips</th>
                <th className="px-4 py-3 font-medium text-indigo-700 dark:text-indigo-300">Status</th>
                <th className="px-4 py-3 font-medium text-indigo-700 dark:text-indigo-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-heading/50">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center">
                    <p className="text-heading/50 mb-3">No truck owners added yet</p>
                    <button type="button" onClick={openAdd} className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm font-medium">Add your first truck owner</button>
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b border-card-border last:border-0 hover:bg-indigo-50/40 dark:hover:bg-indigo-900/30 transition-colors">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => navigate(`/transportbook/trucks/${row.id}`)}
                        className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        {row.truck_number}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-medium text-heading/90">{row.owner_name}</td>
                    <td className="px-4 py-3 text-heading/70">{row.owner_phone || '—'}</td>
                    <td className="px-4 py-3 text-heading/70">{row.driver_name || '—'}</td>
                    <td className="px-4 py-3 text-heading/70 font-mono text-xs">{maskAccount(row.bank_account)}</td>
                    <td className="px-4 py-3 text-heading/70">{row.pan_number || '—'}</td>
                    <td className="px-4 py-3 text-right text-heading/80 font-medium">
                      {row.commission_pct != null ? `${Number(row.commission_pct).toFixed(2)}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                        {row.trip_count}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${row.is_active ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' : 'bg-surface text-heading/60'}`}>
                        {row.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => navigate(`/transportbook/trucks/${row.id}`)}
                          className="rounded p-1.5 text-heading/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 hover:text-indigo-600 dark:text-indigo-400 transition-colors"
                          title="View Ledger"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {canEditTransport() && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleToggleActive(row)}
                              className={`rounded p-1.5 hover:bg-card-border/50 transition-colors ${row.is_active ? 'text-green-600 dark:text-green-400' : 'text-heading/50'}`}
                              title={row.is_active ? 'Deactivate (stop GPS rent)' : 'Activate (start GPS rent)'}
                            >
                              {row.is_active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => openEdit(row)}
                              className="rounded p-1.5 text-heading/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 hover:text-indigo-600 dark:text-indigo-400 transition-colors"
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(row)}
                              className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
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

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-2xl rounded-xl bg-card shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-card-border px-5 py-4 sticky top-0 bg-card z-10">
              <h2 className="font-semibold text-heading">{editing ? 'Edit Truck Owner' : 'Add Truck Owner'}</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg p-1.5 hover:bg-card-border/50 transition-colors">
                <X className="h-5 w-5 text-heading/60" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500">Truck & Owner Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-heading/80 mb-1">Truck Number *</label>
                  <input className="input-field" value={form.truck_number} onChange={f('truck_number')} placeholder="e.g. HR55AB1234" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-heading/80 mb-1">Owner Name *</label>
                  <input className="input-field" value={form.owner_name} onChange={f('owner_name')} placeholder="Owner's full name" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-heading/80 mb-1">Owner Phone *</label>
                  <input className="input-field" value={form.owner_phone} onChange={f('owner_phone')} placeholder="Mobile number" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-heading/80 mb-1">Driver Name *</label>
                  <input className="input-field" value={form.driver_name} onChange={f('driver_name')} placeholder="Driver's name" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-heading/80 mb-1">Driver Phone *</label>
                  <input className="input-field" value={form.driver_phone} onChange={f('driver_phone')} placeholder="Driver's mobile" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-heading/80 mb-1">Commission % *</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    className="input-field"
                    value={form.commission_pct}
                    onChange={f('commission_pct')}
                    placeholder="6.29"
                    required
                  />
                  <p className="mt-1 text-xs text-heading/60">Default rate auto-applied to new trips for this truck.</p>
                </div>
              </div>

              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500 mt-2">Bank & Payment Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-heading/80 mb-1">Bank Account Number *</label>
                  <input className="input-field" value={form.bank_account} onChange={f('bank_account')} placeholder="Account number" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-heading/80 mb-1">IFSC Code *</label>
                  <input className="input-field" value={form.ifsc_code} onChange={f('ifsc_code')} placeholder="e.g. SBIN0001234" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-heading/80 mb-1">Beneficiary Name *</label>
                  <input className="input-field" value={form.beneficiary_name} onChange={f('beneficiary_name')} placeholder="Name as per bank" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-heading/80 mb-1">PAN Number *</label>
                  <input className="input-field" value={form.pan_number} onChange={f('pan_number')} placeholder="ABCDE1234F" required />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-heading/80 hover:bg-surface transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-600 disabled:opacity-60 transition-colors"
                >
                  {saving ? 'Saving…' : editing ? 'Update' : 'Add Truck Owner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
