import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatINR, formatDate } from '../../lib/format';
import { useToastStore } from '../../lib/store';

interface TripEntry {
  id: number | string;
  kind?: 'trip' | 'gps_rent';
  date: string;
  builty_number?: string | null;
  do_number?: string | null;
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
  running_total: number;
  remarks?: string | null;
  // gps_rent-only fields
  period?: string;
  amount?: number;
}

interface LedgerData {
  owner: {
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
  };
  ledger: TripEntry[];
  summary: {
    totalTrips: number;
    totalAccAmount: number;
    totalCommission: number;
    totalBuiltyCharge: number;
    totalHandlingCharge?: number;
    totalDieselAdvance: number;
    totalCashAdvance: number;
    totalFinalPayment: number;
    totalGpsRent?: number;
    netOwed?: number;
  };
}

export default function TruckOwnerLedger() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const addToast = useToastStore((s) => s.addToast);
  const [data, setData] = useState<LedgerData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const d = await api.rlTruckOwners.ledger(Number(id));
      setData(d);
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to load ledger', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, addToast]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (!data) return null;

  const { owner, ledger, summary } = data;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          type="button"
          onClick={() => navigate('/transportbook/trucks')}
          className="mt-1 rounded-lg border border-card-border p-2 hover:bg-surface transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-heading/60" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-heading">{owner.truck_number}</h1>
          <p className="text-sm text-heading/60 mt-0.5">{owner.owner_name} — Truck Owner Ledger</p>
        </div>
      </div>

      {/* Owner Details Card */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-4">Owner Details</h2>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-3 lg:grid-cols-4">
          <div>
            <p className="text-heading/60">Owner Name</p>
            <p className="font-medium text-heading">{owner.owner_name}</p>
          </div>
          {owner.owner_phone && (
            <div>
              <p className="text-heading/60">Owner Phone</p>
              <p className="font-medium text-heading">{owner.owner_phone}</p>
            </div>
          )}
          {owner.driver_name && (
            <div>
              <p className="text-heading/60">Driver</p>
              <p className="font-medium text-heading">{owner.driver_name} {owner.driver_phone ? `(${owner.driver_phone})` : ''}</p>
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
        <div className="card p-4 bg-indigo-50 border-indigo-200">
          <p className="text-xs text-indigo-600 font-medium uppercase tracking-wider">Total Trips</p>
          <p className="text-2xl font-bold text-heading">{summary.totalTrips}</p>
        </div>
        <div className="card p-4 bg-blue-50 border-blue-200">
          <p className="text-xs text-blue-600 font-medium uppercase tracking-wider">ACC Freight Earned</p>
          <p className="text-xl font-bold text-heading">{formatINR(summary.totalAccAmount)}</p>
        </div>
        <div className="card p-4 bg-amber-50 border-amber-200">
          <p className="text-xs text-amber-600 font-medium uppercase tracking-wider">Commission (Rudra)</p>
          <p className="text-xl font-bold text-heading">{formatINR(summary.totalCommission)}</p>
          <p className="text-xs text-amber-500 mt-0.5">+ Builty {formatINR(summary.totalBuiltyCharge)}</p>
        </div>
        <div className="card p-4 bg-green-50 border-green-200">
          <p className="text-xs text-green-600 font-medium uppercase tracking-wider">Total Payable to Truck</p>
          <p className="text-xl font-bold text-heading">{formatINR(summary.netOwed ?? summary.totalFinalPayment)}</p>
          <p className="text-xs text-heading/60 mt-0.5">
            {summary.totalGpsRent ? `Less GPS rent ${formatINR(summary.totalGpsRent)}` : 'After deductions'}
          </p>
        </div>
      </div>

      {/* Advance Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card p-4">
          <p className="text-xs text-heading/60 font-medium uppercase tracking-wider">Total Diesel Advances</p>
          <p className="text-xl font-bold text-red-600">{formatINR(summary.totalDieselAdvance)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-heading/60 font-medium uppercase tracking-wider">Total Cash Advances</p>
          <p className="text-xl font-bold text-red-600">{formatINR(summary.totalCashAdvance)}</p>
        </div>
      </div>

      {/* Trip Table */}
      <div className="card overflow-hidden p-0">
        <div className="border-b border-card-border px-5 py-4">
          <h2 className="font-semibold text-heading">Trip Details</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-card-border bg-indigo-50 text-left">
                <th className="px-3 py-3 font-medium text-indigo-700 whitespace-nowrap">Date</th>
                <th className="px-3 py-3 font-medium text-indigo-700">Builty#</th>
                <th className="px-3 py-3 font-medium text-indigo-700">DO#</th>
                <th className="px-3 py-3 font-medium text-indigo-700">Party</th>
                <th className="px-3 py-3 font-medium text-indigo-700">Location</th>
                <th className="px-3 py-3 font-medium text-indigo-700">DCH</th>
                <th className="px-3 py-3 font-medium text-indigo-700">Material</th>
                <th className="px-3 py-3 font-medium text-indigo-700 text-right">Qty (T)</th>
                <th className="px-3 py-3 font-medium text-indigo-700 text-right">Rate</th>
                <th className="px-3 py-3 font-medium text-indigo-700 text-right">ACC Amt</th>
                <th className="px-3 py-3 font-medium text-indigo-700 text-right">Comm %</th>
                <th className="px-3 py-3 font-medium text-indigo-700 text-right">Comm Amt</th>
                <th className="px-3 py-3 font-medium text-indigo-700 text-right">Builty</th>
                <th className="px-3 py-3 font-medium text-indigo-700 text-right">Diesel Adv</th>
                <th className="px-3 py-3 font-medium text-indigo-700 text-right">Cash Adv</th>
                <th className="px-3 py-3 font-medium text-indigo-700 text-right">Final Pay</th>
                <th className="px-3 py-3 font-medium text-indigo-700 text-right">Running</th>
              </tr>
            </thead>
            <tbody>
              {ledger.length === 0 ? (
                <tr>
                  <td colSpan={17} className="px-4 py-8 text-center text-heading/50">No entries found for this truck owner</td>
                </tr>
              ) : (
                ledger.map((row) => {
                  if (row.kind === 'gps_rent') {
                    return (
                      <tr key={String(row.id)} className="border-b border-card-border last:border-0 bg-slate-50/70">
                        <td className="px-3 py-2.5 whitespace-nowrap text-heading/70">{formatDate(row.date)}</td>
                        <td className="px-3 py-2.5 text-heading/50" colSpan={5}>
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">GPS Rent</span>
                          <span className="ml-2 text-xs text-heading/60">{row.period}</span>
                        </td>
                        <td className="px-3 py-2.5 text-heading/50" colSpan={9} />
                        <td className="px-3 py-2.5 text-right font-semibold text-red-600">−{formatINR(Number(row.amount || 0))}</td>
                        <td className="px-3 py-2.5 text-right font-semibold text-indigo-600">{formatINR(row.running_total)}</td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={String(row.id)} className="border-b border-card-border last:border-0 hover:bg-indigo-50/30 transition-colors">
                      <td className="px-3 py-2.5 whitespace-nowrap text-heading/70">{formatDate(row.date)}</td>
                      <td className="px-3 py-2.5 text-heading/70">{row.builty_number || '—'}</td>
                      <td className="px-3 py-2.5 text-heading/70">{row.do_number || '—'}</td>
                      <td className="px-3 py-2.5 font-medium text-gray-800">{row.party_name}</td>
                      <td className="px-3 py-2.5 text-heading/70">{row.location || '—'}</td>
                      <td className="px-3 py-2.5">
                        {row.dch_type ? (
                          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">{row.dch_type}</span>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2.5">
                        {row.material_type ? (
                          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">{row.material_type}</span>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right">{Number(row.qty || 0).toFixed(2)}</td>
                      <td className="px-3 py-2.5 text-right">{formatINR(Number(row.acc_freight_rate || 0))}</td>
                      <td className="px-3 py-2.5 text-right font-medium">{formatINR(Number(row.acc_amount || 0))}</td>
                      <td className="px-3 py-2.5 text-right text-heading/70">{row.commission_pct}%</td>
                      <td className="px-3 py-2.5 text-right text-amber-600">{formatINR(Number(row.commission_amount || 0))}</td>
                      <td className="px-3 py-2.5 text-right text-amber-600">{formatINR(Number(row.builty_charge || 0))}</td>
                      <td className="px-3 py-2.5 text-right text-red-600">{formatINR(Number(row.diesel_advance || 0))}</td>
                      <td className="px-3 py-2.5 text-right text-red-600">{formatINR(Number(row.cash_advance || 0))}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-green-600">{formatINR(Number(row.final_payment || 0))}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-indigo-600">{formatINR(row.running_total)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {ledger.length > 0 && (
              <tfoot>
                <tr className="bg-indigo-50 font-semibold border-t-2 border-indigo-200">
                  <td className="px-3 py-3 text-indigo-700" colSpan={7}>Total</td>
                  <td className="px-3 py-3 text-right">
                    {ledger.filter((r) => r.kind !== 'gps_rent').reduce((s, r) => s + Number(r.qty || 0), 0).toFixed(2)}
                  </td>
                  <td className="px-3 py-3 text-right">—</td>
                  <td className="px-3 py-3 text-right">{formatINR(summary.totalAccAmount)}</td>
                  <td className="px-3 py-3 text-right">—</td>
                  <td className="px-3 py-3 text-right text-amber-600">{formatINR(summary.totalCommission)}</td>
                  <td className="px-3 py-3 text-right text-amber-600">{formatINR(summary.totalBuiltyCharge)}</td>
                  <td className="px-3 py-3 text-right text-red-600">{formatINR(summary.totalDieselAdvance)}</td>
                  <td className="px-3 py-3 text-right text-red-600">{formatINR(summary.totalCashAdvance)}</td>
                  <td className="px-3 py-3 text-right text-green-600">{formatINR(summary.totalFinalPayment)}</td>
                  <td className="px-3 py-3 text-right text-indigo-600">—</td>
                </tr>
                {summary.totalGpsRent ? (
                  <tr className="bg-slate-50 font-medium border-t border-slate-200 text-sm">
                    <td className="px-3 py-2 text-slate-600" colSpan={15}>
                      GPS Rent (auto-debited monthly)
                    </td>
                    <td className="px-3 py-2 text-right text-red-600">−{formatINR(summary.totalGpsRent)}</td>
                    <td className="px-3 py-2 text-right text-indigo-700">{formatINR(summary.netOwed ?? summary.totalFinalPayment)}</td>
                  </tr>
                ) : null}
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
