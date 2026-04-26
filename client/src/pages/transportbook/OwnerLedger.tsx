import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, FileDown, Plus, Trash2, X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatINR, formatDate } from '../../lib/format';
import { useToastStore } from '../../lib/store';
import { openTransportLedgerPdf } from '../../lib/transportLedgerPdf';

interface Entry {
  id: number | string;
  kind?: 'trip' | 'gps_rent';
  date: string;
  builty_number?: string | null;
  do_number?: string | null;
  truck_number?: string;
  party_name?: string;
  location?: string | null;
  dch_type?: string | null;
  material_type?: string | null;
  qty?: number;
  acc_freight_rate?: number;
  commission_pct?: number;
  diesel_advance?: number;
  cash_advance?: number;
  acc_amount?: number;
  commission_amount?: number;
  builty_charge?: number;
  handling_charge?: number;
  final_payment?: number;
  period?: string;
  amount?: number;
  remarks?: string | null;
}

interface AdvanceEntry {
  id: number;
  date: string;
  amount: number;
  remarks: string | null;
}

interface TruckInfo {
  id: number;
  truck_number: string;
  driver_name: string | null;
  driver_phone: string | null;
  is_active: number;
}

interface LedgerData {
  owner: {
    name: string;
    owner_phone: string | null;
    bank_account: string | null;
    ifsc_code: string | null;
    beneficiary_name: string | null;
    pan_number: string | null;
    trucks: TruckInfo[];
  };
  ledger: Entry[];
  advances: AdvanceEntry[];
  summary: {
    totalTrips: number;
    totalQty: number;
    totalAccAmount: number;
    totalCommission: number;
    totalBuiltyCharge: number;
    totalHandlingCharge: number;
    totalDieselAdvance: number;
    totalCashAdvance: number;
    totalFinalPayment: number;
    totalGpsRent: number;
    totalAdvancePaid: number;
    netOwed: number;
  };
}

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function OwnerLedger() {
  const { name } = useParams<{ name: string }>();
  const ownerName = decodeURIComponent(name || '');
  const navigate = useNavigate();
  const addToast = useToastStore((s) => s.addToast);
  const [data, setData] = useState<LedgerData | null>(null);
  const [loading, setLoading] = useState(true);

  // Advance modal state
  const [advanceModalOpen, setAdvanceModalOpen] = useState(false);
  const [advanceForm, setAdvanceForm] = useState({ date: todayISO(), amount: '', remarks: '' });
  const [advanceSaving, setAdvanceSaving] = useState(false);

  const load = useCallback(async () => {
    if (!ownerName) return;
    setLoading(true);
    try {
      const d = await api.rlOwners.ledger(ownerName);
      setData(d);
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to load ledger', 'error');
    } finally {
      setLoading(false);
    }
  }, [ownerName, addToast]);

  useEffect(() => { load(); }, [load]);

  const handleDownloadPdf = () => {
    if (!data) return;
    const ok = openTransportLedgerPdf({
      ownerName: data.owner.name,
      phone: data.owner.owner_phone,
      bankAccount: data.owner.bank_account,
      ifsc: data.owner.ifsc_code,
      beneficiary: data.owner.beneficiary_name,
      pan: data.owner.pan_number,
      trucks: data.owner.trucks.map((t) => ({ truck_number: t.truck_number, driver_name: t.driver_name })),
      rows: data.ledger.map((r) => ({
        kind: (r.kind || 'trip') as 'trip' | 'gps_rent',
        date: r.date,
        builty_number: r.builty_number,
        do_number: r.do_number,
        truck_number: r.truck_number,
        party_name: r.party_name,
        location: r.location,
        dch_type: r.dch_type,
        material_type: r.material_type,
        qty: r.qty,
        acc_freight_rate: r.acc_freight_rate,
        acc_amount: r.acc_amount,
        commission_amount: r.commission_amount,
        builty_charge: r.builty_charge,
        diesel_advance: r.diesel_advance,
        cash_advance: r.cash_advance,
        final_payment: r.final_payment,
        period: r.period,
        amount: r.amount,
      })),
      summary: data.summary,
    });
    if (!ok) addToast('Please allow popups to download the ledger PDF', 'error');
  };

  const openAdvanceModal = () => {
    setAdvanceForm({ date: todayISO(), amount: '', remarks: '' });
    setAdvanceModalOpen(true);
  };

  const handleAdvanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(advanceForm.amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      addToast('Amount must be positive', 'error');
      return;
    }
    setAdvanceSaving(true);
    try {
      await api.rlOwnerAdvances.create({
        owner_name: ownerName,
        date: advanceForm.date,
        amount: amt,
        remarks: advanceForm.remarks.trim() || undefined,
      });
      addToast('Advance recorded', 'success');
      setAdvanceModalOpen(false);
      await load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to save advance', 'error');
    } finally {
      setAdvanceSaving(false);
    }
  };

  const handleAdvanceDelete = async (id: number) => {
    if (!confirm('Delete this advance entry?')) return;
    try {
      await api.rlOwnerAdvances.delete(id);
      addToast('Advance deleted', 'success');
      await load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to delete advance', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (!data) return null;

  const { owner, ledger, advances, summary } = data;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          type="button"
          onClick={() => navigate('/transportbook/owners')}
          className="mt-1 rounded-lg border border-card-border p-2 hover:bg-surface transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-heading/60" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-heading">{owner.name}</h1>
          <p className="text-sm text-heading/60 mt-0.5">
            Owner Ledger — {owner.trucks.length} truck{owner.trucks.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={handleDownloadPdf}
          className="inline-flex items-center gap-2 rounded-lg border border-card-border bg-card px-4 py-2 text-sm font-medium text-heading/80 hover:bg-surface transition-colors"
        >
          <FileDown className="h-4 w-4" />
          Download PDF
        </button>
      </div>

      {/* Owner Details Card */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-4">Owner Details</h2>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-3 lg:grid-cols-4">
          <div>
            <p className="text-heading/60">Trucks</p>
            <div className="flex flex-wrap gap-1 mt-0.5">
              {owner.trucks.map((t) => (
                <span
                  key={t.id}
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    t.is_active
                      ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                      : 'bg-surface text-heading/50 line-through'
                  }`}
                >
                  {t.truck_number}
                </span>
              ))}
            </div>
          </div>
          {owner.owner_phone && (
            <div>
              <p className="text-heading/60">Phone</p>
              <p className="font-medium text-heading">{owner.owner_phone}</p>
            </div>
          )}
          {owner.bank_account && (
            <div>
              <p className="text-heading/60">Bank Account</p>
              <p className="font-medium text-heading font-mono text-xs">{owner.bank_account}</p>
            </div>
          )}
          {owner.ifsc_code && (
            <div>
              <p className="text-heading/60">IFSC</p>
              <p className="font-medium text-heading">{owner.ifsc_code}</p>
            </div>
          )}
          {owner.beneficiary_name && (
            <div>
              <p className="text-heading/60">Beneficiary</p>
              <p className="font-medium text-heading">{owner.beneficiary_name}</p>
            </div>
          )}
          {owner.pan_number && (
            <div>
              <p className="text-heading/60">PAN</p>
              <p className="font-medium text-heading">{owner.pan_number}</p>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="card p-4 bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800">
          <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium uppercase tracking-wider">Total Trips</p>
          <p className="text-2xl font-bold text-heading">{summary.totalTrips}</p>
          <p className="text-xs text-heading/60 mt-0.5">{summary.totalQty.toFixed(2)} tons</p>
        </div>
        <div className="card p-4 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800">
          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium uppercase tracking-wider">ACC Freight Earned</p>
          <p className="text-xl font-bold text-heading">{formatINR(summary.totalAccAmount)}</p>
        </div>
        <div className="card p-4 bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800">
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium uppercase tracking-wider">Commission + Bilty</p>
          <p className="text-xl font-bold text-heading">{formatINR(summary.totalCommission + summary.totalBuiltyCharge)}</p>
          <p className="text-xs text-amber-500 mt-0.5">Comm {formatINR(summary.totalCommission)} · Bilty {formatINR(summary.totalBuiltyCharge)}</p>
        </div>
        <div className="card p-4 bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800">
          <p className="text-xs text-green-600 dark:text-green-400 font-medium uppercase tracking-wider">Net Payable to Owner</p>
          <p className="text-xl font-bold text-heading">{formatINR(summary.netOwed)}</p>
          <p className="text-xs text-heading/60 mt-0.5">
            {summary.totalGpsRent || summary.totalAdvancePaid
              ? [
                  summary.totalGpsRent ? `GPS ${formatINR(summary.totalGpsRent)}` : null,
                  summary.totalAdvancePaid ? `Advance ${formatINR(summary.totalAdvancePaid)}` : null,
                ].filter(Boolean).join(' · ')
              : 'After all deductions'}
          </p>
        </div>
      </div>

      {/* Advance Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-xs text-heading/60 font-medium uppercase tracking-wider">Total Diesel Advances</p>
          <p className="text-xl font-bold text-red-600 dark:text-red-400">{formatINR(summary.totalDieselAdvance)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-heading/60 font-medium uppercase tracking-wider">Total Cash Advances</p>
          <p className="text-xl font-bold text-red-600 dark:text-red-400">{formatINR(summary.totalCashAdvance)}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-heading/60 font-medium uppercase tracking-wider">Advance Paid</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400">{formatINR(summary.totalAdvancePaid)}</p>
              <p className="text-xs text-heading/60 mt-0.5">{advances.length} entr{advances.length === 1 ? 'y' : 'ies'}</p>
            </div>
            <button
              type="button"
              onClick={openAdvanceModal}
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-600 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Advances List */}
      {advances.length > 0 && (
        <div className="card overflow-hidden p-0">
          <div className="border-b border-card-border px-5 py-4">
            <h2 className="font-semibold text-heading">Advance Payments</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-card-border bg-indigo-50 dark:bg-indigo-900/30 text-left">
                  <th className="px-4 py-2.5 font-medium text-indigo-700 dark:text-indigo-300">Date</th>
                  <th className="px-4 py-2.5 font-medium text-indigo-700 dark:text-indigo-300 text-right">Amount</th>
                  <th className="px-4 py-2.5 font-medium text-indigo-700 dark:text-indigo-300">Remarks</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {advances.map((a) => (
                  <tr key={a.id} className="border-b border-card-border last:border-0">
                    <td className="px-4 py-2 whitespace-nowrap text-heading/80">{formatDate(a.date)}</td>
                    <td className="px-4 py-2 text-right font-medium text-red-600 dark:text-red-400">{formatINR(a.amount)}</td>
                    <td className="px-4 py-2 text-heading/70">{a.remarks || '—'}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => handleAdvanceDelete(a.id)}
                        className="inline-flex items-center justify-center rounded-md p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        title="Delete advance"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Trip Table */}
      <div className="card overflow-hidden p-0">
        <div className="border-b border-card-border px-5 py-4">
          <h2 className="font-semibold text-heading">Ledger Entries</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-card-border bg-indigo-50 dark:bg-indigo-900/30 text-left">
                <th className="px-3 py-3 font-medium text-indigo-700 dark:text-indigo-300 whitespace-nowrap">Date</th>
                <th className="px-3 py-3 font-medium text-indigo-700 dark:text-indigo-300">Builty#</th>
                <th className="px-3 py-3 font-medium text-indigo-700 dark:text-indigo-300">DO#</th>
                <th className="px-3 py-3 font-medium text-indigo-700 dark:text-indigo-300">Truck</th>
                <th className="px-3 py-3 font-medium text-indigo-700 dark:text-indigo-300">Party</th>
                <th className="px-3 py-3 font-medium text-indigo-700 dark:text-indigo-300">DCH</th>
                <th className="px-3 py-3 font-medium text-indigo-700 dark:text-indigo-300 text-right">Qty (T)</th>
                <th className="px-3 py-3 font-medium text-indigo-700 dark:text-indigo-300 text-right">Rate</th>
                <th className="px-3 py-3 font-medium text-indigo-700 dark:text-indigo-300 text-right">ACC Amt</th>
                <th className="px-3 py-3 font-medium text-indigo-700 dark:text-indigo-300 text-right">Comm</th>
                <th className="px-3 py-3 font-medium text-indigo-700 dark:text-indigo-300 text-right">Bilty</th>
                <th className="px-3 py-3 font-medium text-indigo-700 dark:text-indigo-300 text-right">Diesel</th>
                <th className="px-3 py-3 font-medium text-indigo-700 dark:text-indigo-300 text-right">Cash</th>
                <th className="px-3 py-3 font-medium text-indigo-700 dark:text-indigo-300 text-right">Final</th>
              </tr>
            </thead>
            <tbody>
              {ledger.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-4 py-8 text-center text-heading/50">No entries found for this owner</td>
                </tr>
              ) : (
                ledger.map((row) => {
                  if (row.kind === 'gps_rent') {
                    return (
                      <tr key={String(row.id)} className="border-b border-card-border last:border-0 bg-slate-50/70 dark:bg-slate-900/30">
                        <td className="px-3 py-2.5 whitespace-nowrap text-heading/70">{formatDate(row.date)}</td>
                        <td className="px-3 py-2.5 text-heading/60" colSpan={4}>
                          <span className="rounded-full bg-slate-200 dark:bg-slate-700 px-2 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-300">GPS Rent</span>
                          <span className="ml-2 text-xs text-heading/60">{row.period}</span>
                          {row.truck_number && <span className="ml-2 text-xs text-heading/50">({row.truck_number})</span>}
                        </td>
                        <td className="px-3 py-2.5" colSpan={8} />
                        <td className="px-3 py-2.5 text-right font-semibold text-red-600 dark:text-red-400">−{formatINR(Number(row.amount || 0))}</td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={String(row.id)} className="border-b border-card-border last:border-0 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/30 transition-colors">
                      <td className="px-3 py-2.5 whitespace-nowrap text-heading/70">{formatDate(row.date)}</td>
                      <td className="px-3 py-2.5 text-heading/70">{row.builty_number || '—'}</td>
                      <td className="px-3 py-2.5 text-heading/70">{row.do_number || '—'}</td>
                      <td className="px-3 py-2.5 font-medium text-indigo-600 dark:text-indigo-400">{row.truck_number}</td>
                      <td className="px-3 py-2.5 text-heading/90">
                        <div>{row.party_name}</div>
                        {row.location && <div className="text-xs text-heading/50">{row.location}</div>}
                      </td>
                      <td className="px-3 py-2.5">
                        {row.dch_type ? (
                          <span className="rounded-full bg-indigo-100 dark:bg-indigo-900/40 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300">{row.dch_type}</span>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right">{Number(row.qty || 0).toFixed(2)}</td>
                      <td className="px-3 py-2.5 text-right">{formatINR(Number(row.acc_freight_rate || 0))}</td>
                      <td className="px-3 py-2.5 text-right font-medium">{formatINR(Number(row.acc_amount || 0))}</td>
                      <td className="px-3 py-2.5 text-right text-amber-600 dark:text-amber-400">{formatINR(Number(row.commission_amount || 0))}</td>
                      <td className="px-3 py-2.5 text-right text-amber-600 dark:text-amber-400">{formatINR(Number(row.builty_charge || 0))}</td>
                      <td className="px-3 py-2.5 text-right text-red-600 dark:text-red-400">{formatINR(Number(row.diesel_advance || 0))}</td>
                      <td className="px-3 py-2.5 text-right text-red-600 dark:text-red-400">{formatINR(Number(row.cash_advance || 0))}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-green-600 dark:text-green-400">{formatINR(Number(row.final_payment || 0))}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {ledger.length > 0 && (
              <tfoot>
                <tr className="bg-indigo-50 dark:bg-indigo-900/30 font-semibold border-t-2 border-indigo-200 dark:border-indigo-800">
                  <td className="px-3 py-3 text-indigo-700 dark:text-indigo-300" colSpan={6}>Total</td>
                  <td className="px-3 py-3 text-right">{summary.totalQty.toFixed(2)}</td>
                  <td className="px-3 py-3 text-right">—</td>
                  <td className="px-3 py-3 text-right">{formatINR(summary.totalAccAmount)}</td>
                  <td className="px-3 py-3 text-right text-amber-600 dark:text-amber-400">{formatINR(summary.totalCommission)}</td>
                  <td className="px-3 py-3 text-right text-amber-600 dark:text-amber-400">{formatINR(summary.totalBuiltyCharge)}</td>
                  <td className="px-3 py-3 text-right text-red-600 dark:text-red-400">{formatINR(summary.totalDieselAdvance)}</td>
                  <td className="px-3 py-3 text-right text-red-600 dark:text-red-400">{formatINR(summary.totalCashAdvance)}</td>
                  <td className="px-3 py-3 text-right text-green-600 dark:text-green-400">{formatINR(summary.totalFinalPayment)}</td>
                </tr>
                {summary.totalGpsRent ? (
                  <tr className="bg-slate-50 dark:bg-slate-900/30 font-medium border-t border-slate-200 dark:border-slate-800 text-sm">
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-400" colSpan={13}>
                      Less: GPS Rent (auto-debited monthly, across all trucks)
                    </td>
                    <td className="px-3 py-2 text-right text-red-600 dark:text-red-400">−{formatINR(summary.totalGpsRent)}</td>
                  </tr>
                ) : null}
                {summary.totalAdvancePaid ? (
                  <tr className="bg-slate-50 dark:bg-slate-900/30 font-medium border-t border-slate-200 dark:border-slate-800 text-sm">
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-400" colSpan={13}>
                      Less: Advance Paid ({advances.length} entr{advances.length === 1 ? 'y' : 'ies'})
                    </td>
                    <td className="px-3 py-2 text-right text-red-600 dark:text-red-400">−{formatINR(summary.totalAdvancePaid)}</td>
                  </tr>
                ) : null}
                <tr className="bg-green-50 dark:bg-green-900/30 font-bold border-t-2 border-green-200 dark:border-green-800">
                  <td className="px-3 py-3 text-green-700 dark:text-green-300" colSpan={13}>Final Payment</td>
                  <td className="px-3 py-3 text-right text-green-700 dark:text-green-300">{formatINR(summary.netOwed)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Add Advance Modal */}
      {advanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-card-border px-5 py-4">
              <h2 className="font-semibold text-heading">Add Advance for {ownerName}</h2>
              <button type="button" onClick={() => setAdvanceModalOpen(false)} className="rounded-lg p-1.5 hover:bg-card-border/50 transition-colors">
                <X className="h-5 w-5 text-heading/60" />
              </button>
            </div>
            <form onSubmit={handleAdvanceSubmit} className="p-5 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-heading/80 mb-1">Date *</label>
                <input
                  type="date"
                  className="input-field"
                  value={advanceForm.date}
                  onChange={(e) => setAdvanceForm((prev) => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-heading/80 mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="input-field"
                  value={advanceForm.amount}
                  onChange={(e) => setAdvanceForm((prev) => ({ ...prev, amount: e.target.value }))}
                  placeholder="0"
                  required
                />
                <p className="mt-1 text-xs text-heading/60">
                  Will be deducted from the owner's net payable.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-heading/80 mb-1">Remarks</label>
                <textarea
                  className="input-field resize-none"
                  rows={2}
                  value={advanceForm.remarks}
                  onChange={(e) => setAdvanceForm((prev) => ({ ...prev, remarks: e.target.value }))}
                  placeholder="Optional notes (e.g. paid via UPI, against UP72AT4909 trip)"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAdvanceModalOpen(false)}
                  className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-heading/80 hover:bg-surface transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={advanceSaving}
                  className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-600 disabled:opacity-60 transition-colors"
                >
                  {advanceSaving ? 'Saving…' : 'Save Advance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
