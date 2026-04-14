import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, X, Users, TrendingUp, TrendingDown } from 'lucide-react';
import { api } from '../../lib/api';
import { formatINR, formatDate } from '../../lib/format';
import { useToastStore, useAuthStore } from '../../lib/store';

interface DriverRow {
  id: number;
  name: string;
  phone: string | null;
  license_number: string | null;
  is_active: number;
  trip_count: number;
  total_earned: number;
  total_paid: number;
  outstanding: number;
}

interface LedgerEntry {
  id: number;
  date: string;
  entry_type: 'trip' | 'payment';
  amount: number;
  truck_number: string | null;
  load_from: string | null;
  billed_destination: string | null;
  material_name: string | null;
  mode: string | null;
  bank_name: string | null;
  remarks: string | null;
  balance: number;
}

interface LedgerData {
  driver: DriverRow;
  ledger: LedgerEntry[];
  totalEarned: number;
  totalPaid: number;
  outstanding: number;
}

const emptyPayForm = {
  date: new Date().toISOString().split('T')[0],
  amount: '',
  mode: 'cash' as 'cash' | 'bank',
  bank_name: '',
  remarks: '',
};

export default function DriverLedger() {
  const addToast = useToastStore((s) => s.addToast);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [ledger, setLedger] = useState<LedgerData | null>(null);
  const [loadingDrivers, setLoadingDrivers] = useState(true);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [payForm, setPayForm] = useState(emptyPayForm);
  const [saving, setSaving] = useState(false);
  const [addPayOpen, setAddPayOpen] = useState(false);
  // Driver management modal
  const [driverModalOpen, setDriverModalOpen] = useState(false);
  const [driverForm, setDriverForm] = useState({ name: '', phone: '', license_number: '' });
  const [driverSaving, setDriverSaving] = useState(false);

  const loadDrivers = useCallback(async () => {
    setLoadingDrivers(true);
    try {
      const data = await api.drivers.list();
      setDrivers(data);
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to load drivers', 'error');
    } finally {
      setLoadingDrivers(false);
    }
  }, [addToast]);

  const loadLedger = useCallback(async (id: number) => {
    setLoadingLedger(true);
    try {
      const data = await api.drivers.ledger(id);
      setLedger(data);
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to load ledger', 'error');
    } finally {
      setLoadingLedger(false);
    }
  }, [addToast]);

  useEffect(() => { loadDrivers(); }, [loadDrivers]);

  useEffect(() => {
    if (selectedId) loadLedger(selectedId);
    else setLedger(null);
  }, [selectedId, loadLedger]);

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !payForm.amount) { addToast('Amount is required', 'error'); return; }
    setSaving(true);
    try {
      await api.driverPayments.create({
        date: payForm.date,
        driver_id: selectedId,
        amount: Number(payForm.amount),
        mode: payForm.mode,
        bank_name: payForm.bank_name || null,
        remarks: payForm.remarks || null,
      });
      addToast('Payment recorded', 'success');
      setPayForm(emptyPayForm);
      setAddPayOpen(false);
      loadLedger(selectedId);
      loadDrivers();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePayment = async (id: number) => {
    if (!window.confirm('Delete this payment?')) return;
    try {
      await api.driverPayments.delete(id);
      addToast('Payment deleted', 'success');
      if (selectedId) { loadLedger(selectedId); loadDrivers(); }
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Delete failed', 'error');
    }
  };

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverForm.name.trim()) { addToast('Name is required', 'error'); return; }
    setDriverSaving(true);
    try {
      await api.drivers.create({
        name: driverForm.name.trim(),
        phone: driverForm.phone || null,
        license_number: driverForm.license_number || null,
      });
      addToast('Driver added', 'success');
      setDriverModalOpen(false);
      setDriverForm({ name: '', phone: '', license_number: '' });
      loadDrivers();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally {
      setDriverSaving(false);
    }
  };

  const handleDeleteDriver = async (id: number, name: string) => {
    if (!window.confirm(`Delete driver "${name}"?`)) return;
    try {
      await api.drivers.delete(id);
      addToast('Driver deleted', 'success');
      if (selectedId === id) setSelectedId(null);
      loadDrivers();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Delete failed', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading">Driver Ledger</h1>
          <p className="text-sm text-gray-500 mt-1">Track driver earnings and payments</p>
        </div>
        <button
          type="button"
          onClick={() => setDriverModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-orange-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Driver
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Left panel: drivers list */}
        <div className="card overflow-hidden p-0">
          <div className="border-b border-card-border px-4 py-3 bg-orange-50">
            <p className="font-medium text-orange-700 text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Drivers ({drivers.length})
            </p>
          </div>
          <div className="divide-y divide-card-border">
            {loadingDrivers ? (
              <div className="px-4 py-8 text-center text-gray-400 text-sm">Loading...</div>
            ) : drivers.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400 text-sm">No drivers yet</div>
            ) : (
              drivers.map((d) => (
                <div
                  key={d.id}
                  onClick={() => setSelectedId(d.id === selectedId ? null : d.id)}
                  className={`cursor-pointer px-4 py-3 transition-colors ${
                    selectedId === d.id ? 'bg-orange-50 border-l-4 border-l-orange-500' : 'hover:bg-gray-50 border-l-4 border-l-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-heading truncate">{d.name}</p>
                      {d.phone && <p className="text-xs text-gray-400">{d.phone}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-xs font-semibold ${Number(d.outstanding) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatINR(Number(d.outstanding))}
                      </p>
                      <p className="text-xs text-gray-400">{d.trip_count} trips</p>
                    </div>
                  </div>
                  {isAdmin() && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDeleteDriver(d.id, d.name); }}
                      className="mt-1 text-xs text-red-500 hover:underline"
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right panel: ledger */}
        <div className="flex flex-col gap-4">
          {!selectedId ? (
            <div className="card flex flex-col items-center justify-center py-20 text-center">
              <Users className="h-12 w-12 text-orange-200 mb-3" />
              <p className="text-gray-400">Select a driver to view their ledger</p>
            </div>
          ) : loadingLedger ? (
            <div className="card flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
            </div>
          ) : ledger ? (
            <>
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="card p-4 text-center bg-blue-50 border-blue-200">
                  <p className="text-xs text-blue-600 font-medium">Total Earned</p>
                  <p className="text-lg font-bold text-heading">{formatINR(ledger.totalEarned)}</p>
                </div>
                <div className="card p-4 text-center bg-green-50 border-green-200">
                  <p className="text-xs text-green-600 font-medium">Total Paid</p>
                  <p className="text-lg font-bold text-heading">{formatINR(ledger.totalPaid)}</p>
                </div>
                <div className={`card p-4 text-center ${ledger.outstanding > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                  <p className={`text-xs font-medium ${ledger.outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>Outstanding</p>
                  <p className={`text-lg font-bold ${ledger.outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatINR(ledger.outstanding)}</p>
                </div>
              </div>

              {/* Add Payment */}
              <div className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-medium text-sm text-heading">Record Payment for {ledger.driver.name}</p>
                  <button
                    type="button"
                    onClick={() => setAddPayOpen(!addPayOpen)}
                    className="inline-flex items-center gap-1 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-600 transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    Add Payment
                  </button>
                </div>
                {addPayOpen && (
                  <form onSubmit={handleAddPayment} className="mt-3 pt-3 border-t border-card-border">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                        <input type="date" className="input-field" value={payForm.date}
                          onChange={(e) => setPayForm((p) => ({ ...p, date: e.target.value }))} required />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Amount (₹) *</label>
                        <input type="number" min="0" step="0.01" className="input-field" value={payForm.amount}
                          onChange={(e) => setPayForm((p) => ({ ...p, amount: e.target.value }))} placeholder="0" required />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Mode</label>
                        <select className="input-field" value={payForm.mode}
                          onChange={(e) => setPayForm((p) => ({ ...p, mode: e.target.value as 'cash' | 'bank' }))}>
                          <option value="cash">Cash</option>
                          <option value="bank">Bank</option>
                        </select>
                      </div>
                      {payForm.mode === 'bank' && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Bank Name</label>
                          <input className="input-field" value={payForm.bank_name}
                            onChange={(e) => setPayForm((p) => ({ ...p, bank_name: e.target.value }))} placeholder="Bank" />
                        </div>
                      )}
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Remarks</label>
                        <input className="input-field" value={payForm.remarks}
                          onChange={(e) => setPayForm((p) => ({ ...p, remarks: e.target.value }))} placeholder="Optional" />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-3">
                      <button type="button" onClick={() => setAddPayOpen(false)} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
                      <button type="submit" disabled={saving} className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-60 transition-colors">
                        {saving ? 'Saving…' : 'Record Payment'}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Ledger Table */}
              <div className="card overflow-hidden p-0">
                <div className="border-b border-card-border px-4 py-3 bg-orange-50">
                  <p className="font-medium text-orange-700 text-sm">Ledger — {ledger.driver.name}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-card-border bg-gray-50 text-left">
                        <th className="px-4 py-2.5 font-medium text-gray-600">Date</th>
                        <th className="px-4 py-2.5 font-medium text-gray-600">Type</th>
                        <th className="px-4 py-2.5 font-medium text-gray-600">Details</th>
                        <th className="px-4 py-2.5 font-medium text-gray-600 text-right">Earned</th>
                        <th className="px-4 py-2.5 font-medium text-gray-600 text-right">Paid</th>
                        <th className="px-4 py-2.5 font-medium text-gray-600 text-right">Balance</th>
                        <th className="px-4 py-2.5 font-medium text-gray-600">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledger.ledger.length === 0 ? (
                        <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No entries yet</td></tr>
                      ) : (
                        ledger.ledger.map((entry, idx) => (
                          <tr key={`${entry.entry_type}-${entry.id}-${idx}`}
                            className={`border-b border-card-border last:border-0 ${entry.entry_type === 'trip' ? 'hover:bg-blue-50/40' : 'hover:bg-green-50/40'} transition-colors`}
                          >
                            <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(entry.date)}</td>
                            <td className="px-4 py-2.5">
                              {entry.entry_type === 'trip' ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                                  <TrendingUp className="h-3 w-3" /> Trip
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                                  <TrendingDown className="h-3 w-3" /> Payment
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-gray-500 text-xs max-w-[180px]">
                              {entry.entry_type === 'trip' ? (
                                <span>
                                  {entry.truck_number}
                                  {entry.load_from && entry.billed_destination && ` · ${entry.load_from} → ${entry.billed_destination}`}
                                  {entry.material_name && ` · ${entry.material_name}`}
                                </span>
                              ) : (
                                <span>
                                  {entry.mode && <span className="capitalize">{entry.mode}</span>}
                                  {entry.bank_name && ` · ${entry.bank_name}`}
                                  {entry.remarks && ` · ${entry.remarks}`}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-right font-medium text-blue-700">
                              {entry.entry_type === 'trip' ? formatINR(Number(entry.amount)) : '—'}
                            </td>
                            <td className="px-4 py-2.5 text-right font-medium text-green-700">
                              {entry.entry_type === 'payment' ? formatINR(Number(entry.amount)) : '—'}
                            </td>
                            <td className={`px-4 py-2.5 text-right font-semibold ${Number(entry.balance) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {formatINR(Number(entry.balance))}
                            </td>
                            <td className="px-4 py-2.5">
                              {entry.entry_type === 'payment' && isAdmin() && (
                                <button
                                  type="button"
                                  onClick={() => handleDeletePayment(entry.id)}
                                  className="rounded p-1 text-red-500 hover:bg-red-50 transition-colors"
                                  title="Delete payment"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Add Driver Modal */}
      {driverModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-card-border px-5 py-4">
              <h2 className="font-semibold text-heading">Add Driver</h2>
              <button type="button" onClick={() => setDriverModalOpen(false)} className="rounded-lg p-1.5 hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleAddDriver} className="p-5 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input className="input-field" value={driverForm.name}
                  onChange={(e) => setDriverForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Driver name" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input className="input-field" value={driverForm.phone}
                  onChange={(e) => setDriverForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="Phone number" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
                <input className="input-field" value={driverForm.license_number}
                  onChange={(e) => setDriverForm((p) => ({ ...p, license_number: e.target.value }))}
                  placeholder="DL number" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setDriverModalOpen(false)} className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={driverSaving} className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-60 transition-colors">
                  {driverSaving ? 'Saving…' : 'Add Driver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
