import { useCallback, useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Truck, FileText, IndianRupee, Users, TrendingUp, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatINR, formatDate } from '../../lib/format';
import { useToastStore } from '../../lib/store';

interface DashboardStats {
  tripsThisMonth: number;
  totalTrucks: number;
  pendingInvoiceAmount: number;
  pendingToBill: number;
  doneInvoiceAmount: number;
  partnerSummary: Array<{ name: string; balance: number }>;
}

interface EwayAlert {
  id: number;
  date: string;
  truck_number: string;
  owner_name: string;
  party_name: string;
  location: string | null;
  eway_bill_number: string | null;
  eway_bill_valid_until: string | null;
  eway_status: 'expired' | 'risk' | 'warning' | 'ok' | 'delivered' | 'none';
  eway_hours_left: number | null;
}

interface EwayData {
  atRisk: EwayAlert[];
  counts: { expired: number; risk: number; warning: number; ok: number };
}

interface ComplianceSummary {
  total: number;
  gstr1_filed: number;
  gstr1_mismatch: number;
  gstr3b_filed: number;
  gstr3b_mismatch: number;
  itc_claimed: number;
  itc_reconciled: number;
  itc_disputed: number;
}

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${color}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-heading/60">{label}</p>
        <p className="text-2xl font-bold text-heading truncate">{value}</p>
        {sub && <p className="text-xs text-heading/50 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function formatHoursLeft(h: number | null): string {
  if (h === null || h === undefined) return '—';
  if (h <= 0) return `expired ${Math.abs(Math.round(h))}h ago`;
  if (h < 1) return `${Math.round(h * 60)}m left`;
  if (h < 48) return `${h.toFixed(1)}h left`;
  return `${Math.round(h / 24)}d left`;
}

function ewayPill(status: EwayAlert['eway_status']): string {
  switch (status) {
    case 'expired': return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300';
    case 'risk':    return 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 animate-pulse';
    case 'warning': return 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300';
    default:        return 'bg-surface text-heading/60';
  }
}

export default function TransportDashboard() {
  const addToast = useToastStore((s) => s.addToast);
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [eway, setEway] = useState<EwayData | null>(null);
  const [compliance, setCompliance] = useState<ComplianceSummary | null>(null);
  const [bankSummary, setBankSummary] = useState<{ closing: number; credits: number; debits: number; opening: number; active_banks: number } | null>(null);
  const [growth, setGrowth] = useState<Array<{ month: string; trips: number; acc_amount: number; commission: number; bilty: number; qty: number }>>([]);
  const [monthlyPL, setMonthlyPL] = useState<Array<{ month: string; commission: number; expenses: number; net_pl: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const month = filterMonth || currentMonth;

      const [trips, owners, invoices, partners, ewayData, complianceData] = await Promise.all([
        api.rlTrips.list({ month }),
        api.rlTruckOwners.list(),
        api.rlInvoices.list(),
        api.rlPartners.list(),
        api.rlTrips.ewayAlerts(),
        api.rlInvoices.complianceSummary(),
      ]);
      // Billing summary is best-effort — if the new /billing-summary endpoint isn't on
      // the backend yet (pre-redeploy), keep the dashboard usable with zeros.
      const [accSummary, jkSummary] = await Promise.all([
        api.rlInvoices.billingSummary('acc').catch(() => ({ pending_to_invoice: 0 })),
        api.rlInvoices.billingSummary('jk').catch(() => ({ pending_to_invoice: 0 })),
      ]);
      // TransportBook-isolated bank closing — independent of CementBook/Finance.
      try { setBankSummary(await api.rlBanks.summary()); } catch (_) { setBankSummary(null); }
      // 12-month growth — best-effort.
      try { setGrowth(await api.rlTrips.monthlyGrowth(12)); } catch (_) { setGrowth([]); }
      // 12-month P&L — best-effort.
      try { setMonthlyPL(await api.rlTrips.monthlyPL(12)); } catch (_) { setMonthlyPL([]); }

      // "Pending Invoice Amount" combines the receivable that's already invoiced but unpaid
      // with the trip freight that hasn't been billed yet — both are money ACC/JK still owe us.
      // The previous version only looked at raised invoices, so 0 invoices = ₹0 pending even
      // when ₹37L+ of freight was sitting in Trip Log.
      const pendingPartialReceivable = invoices
        .filter((i: any) => i.status === 'pending' || i.status === 'partial')
        .reduce((s: number, i: any) => s + (Number(i.invoice_amount) - Number(i.received_amount)), 0);
      const pendingToBill = (accSummary.pending_to_invoice || 0) + (jkSummary.pending_to_invoice || 0);
      const pendingInvoiceAmount = pendingPartialReceivable + pendingToBill;
      const doneInvoiceAmount = invoices
        .filter((i: any) => i.status === 'done')
        .reduce((s: number, i: any) => s + Number(i.invoice_amount), 0);

      setStats({
        tripsThisMonth: trips.length,
        totalTrucks: owners.length,
        pendingInvoiceAmount,
        pendingToBill,
        doneInvoiceAmount,
        partnerSummary: partners.map((p: any) => ({ name: p.name, balance: Number(p.balance) })),
      });
      setEway(ewayData);
      setCompliance(complianceData);

      // One-shot in-session banner for critical E-Way issues
      const criticalCount = (ewayData.counts.expired || 0) + (ewayData.counts.risk || 0);
      if (criticalCount > 0 && !sessionStorage.getItem('eway_alert_shown')) {
        addToast(
          `${criticalCount} E-Way Bill${criticalCount === 1 ? '' : 's'} ${ewayData.counts.expired ? 'expired or ' : ''}expiring within 6 hours`,
          'error'
        );
        sessionStorage.setItem('eway_alert_shown', '1');
      }
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to load dashboard', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, filterMonth]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (!stats) return null;

  const criticalEway = (eway?.counts.expired || 0) + (eway?.counts.risk || 0);
  const totalAtRisk = criticalEway + (eway?.counts.warning || 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading">TransportBook Dashboard</h1>
          <p className="text-sm text-heading/60 mt-1">Rudra Logistics — ACC Cement Transport Overview</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <label className="font-medium text-heading/70">Month:</label>
          <input type="month" className="input-field py-1.5 text-sm" value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)} />
          {filterMonth && (
            <button type="button" onClick={() => setFilterMonth('')}
              className="rounded-md border border-card-border px-2 py-1.5 text-xs font-medium text-heading/70 hover:bg-surface">
              Current
            </button>
          )}
        </div>
      </div>

      {/* Critical E-Way Alert Banner */}
      {criticalEway > 0 && (
        <button
          type="button"
          onClick={() => navigate('/transportbook/trips')}
          className="card border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-left p-4 flex items-start gap-3 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
        >
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-red-700 dark:text-red-300">
              {criticalEway} E-Way Bill{criticalEway === 1 ? '' : 's'} need immediate attention
            </p>
            <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-0.5">
              {eway?.counts.expired ? `${eway.counts.expired} expired · ` : ''}
              {eway?.counts.risk ? `${eway.counts.risk} expiring within 6h · ` : ''}
              Click to review and extend validity before penalties apply.
            </p>
          </div>
        </button>
      )}

      {/* Top KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Trips This Month"
          value={String(stats.tripsThisMonth)}
          icon={FileText}
          color="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
        />
        <StatCard
          label="Registered Trucks"
          value={String(stats.totalTrucks)}
          sub="truck owners"
          icon={Truck}
          color="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
        />
        <StatCard
          label="Pending Invoice Amount"
          value={formatINR(stats.pendingInvoiceAmount)}
          sub={stats.pendingToBill > 0 ? `incl. ${formatINR(stats.pendingToBill)} yet to bill` : 'from ACC + JK'}
          icon={Clock}
          color="bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
        />
        <StatCard
          label="Received from ACC"
          value={formatINR(stats.doneInvoiceAmount)}
          sub="invoices cleared"
          icon={IndianRupee}
          color="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400"
        />
      </div>

      {/* Bank closing — TransportBook-isolated, separate from Finance. */}
      {bankSummary && (
        <div className="card p-4 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300">Bank closing balance · TransportBook</p>
            <p className="text-2xl font-bold text-heading mt-1">{formatINR(bankSummary.closing)}</p>
            <p className="text-xs text-heading/60 mt-0.5">
              Opening {formatINR(bankSummary.opening)} · Credits {formatINR(bankSummary.credits)} · Debits {formatINR(bankSummary.debits)} · {bankSummary.active_banks} bank{bankSummary.active_banks === 1 ? '' : 's'}
            </p>
          </div>
          <Link to="/transportbook/bank" className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">View bank statement →</Link>
        </div>
      )}

      {/* Month-wise growth (last 12 months) */}
      {growth.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="border-b border-card-border px-5 py-4 flex items-center justify-between">
            <h2 className="font-semibold text-heading">Month-wise growth · last 12 months</h2>
            <span className="text-xs text-heading/60">Trips count + ACC freight + Commission</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2">Trips per month</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={growth} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="trips" name="Trips" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2">ACC freight + Commission earned (₹)</p>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={growth} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: any) => formatINR(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="acc_amount" name="ACC Freight" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="commission" name="Commission" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Month-wise P&L */}
      {monthlyPL.filter((r) => r.commission > 0 || r.expenses > 0).length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="border-b border-card-border px-5 py-4 flex items-center justify-between">
            <h2 className="font-semibold text-heading">Month-wise P&amp;L</h2>
            <span className="text-xs text-heading/60">Commission earned − Expenses</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-card-border bg-indigo-50 dark:bg-indigo-900/30 text-right text-xs font-medium uppercase tracking-wider">
                  <th className="px-4 py-2 text-left text-indigo-700 dark:text-indigo-300">Month</th>
                  <th className="px-4 py-2 text-green-700 dark:text-green-300">Commission</th>
                  <th className="px-4 py-2 text-red-700 dark:text-red-300">Expenses</th>
                  <th className="px-4 py-2 text-indigo-700 dark:text-indigo-300">Net P&amp;L</th>
                </tr>
              </thead>
              <tbody>
                {[...monthlyPL].reverse().filter((r) => r.commission > 0 || r.expenses > 0).map((r) => (
                  <tr key={r.month} className="border-b border-card-border last:border-0 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/20">
                    <td className="px-4 py-2 font-medium text-heading">{r.month}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-green-700 dark:text-green-300">{formatINR(r.commission)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-red-700 dark:text-red-300">{formatINR(r.expenses)}</td>
                    <td className={`px-4 py-2 text-right tabular-nums font-bold ${r.net_pl >= 0 ? 'text-indigo-700 dark:text-indigo-300' : 'text-red-700 dark:text-red-300'}`}>
                      {formatINR(r.net_pl)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* E-Way Bill Monitoring */}
      <div className="card overflow-hidden p-0">
        <div className="border-b border-card-border px-5 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className={`h-5 w-5 ${criticalEway > 0 ? 'text-red-500' : 'text-indigo-500'}`} />
            <h2 className="font-semibold text-heading">E-Way Bill Monitor</h2>
          </div>
          <Link
            to="/transportbook/trips"
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            View all trips →
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
          <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 p-3">
            <p className="text-[11px] uppercase tracking-wider font-medium text-red-700 dark:text-red-300">Expired</p>
            <p className="text-2xl font-bold text-heading">{eway?.counts.expired ?? 0}</p>
          </div>
          <div className="rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/30 p-3">
            <p className="text-[11px] uppercase tracking-wider font-medium text-orange-700 dark:text-orange-300">&lt; 6h Left</p>
            <p className="text-2xl font-bold text-heading">{eway?.counts.risk ?? 0}</p>
          </div>
          <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30 p-3">
            <p className="text-[11px] uppercase tracking-wider font-medium text-amber-700 dark:text-amber-300">6–24h Left</p>
            <p className="text-2xl font-bold text-heading">{eway?.counts.warning ?? 0}</p>
          </div>
          <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/30 p-3">
            <p className="text-[11px] uppercase tracking-wider font-medium text-green-700 dark:text-green-300">Safe (&gt;24h)</p>
            <p className="text-2xl font-bold text-heading">{eway?.counts.ok ?? 0}</p>
          </div>
        </div>

        {totalAtRisk > 0 && eway && (
          <div className="overflow-x-auto border-t border-card-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface/60 text-left">
                  <th className="px-4 py-2 font-medium text-heading/70 text-xs uppercase tracking-wider">Status</th>
                  <th className="px-4 py-2 font-medium text-heading/70 text-xs uppercase tracking-wider">Date</th>
                  <th className="px-4 py-2 font-medium text-heading/70 text-xs uppercase tracking-wider">Truck</th>
                  <th className="px-4 py-2 font-medium text-heading/70 text-xs uppercase tracking-wider">Party</th>
                  <th className="px-4 py-2 font-medium text-heading/70 text-xs uppercase tracking-wider">Location</th>
                  <th className="px-4 py-2 font-medium text-heading/70 text-xs uppercase tracking-wider">E-Way #</th>
                  <th className="px-4 py-2 font-medium text-heading/70 text-xs uppercase tracking-wider">Valid Until</th>
                </tr>
              </thead>
              <tbody>
                {eway.atRisk.slice(0, 10).map((r) => (
                  <tr key={r.id} className="border-t border-card-border last:border-0 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/20 transition-colors cursor-pointer" onClick={() => navigate('/transportbook/trips')}>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${ewayPill(r.eway_status)}`}>
                        {r.eway_status === 'expired' ? 'Expired' : r.eway_status === 'risk' ? 'At Risk' : 'Warning'}
                      </span>
                      <div className="text-[10px] text-heading/50 mt-0.5">{formatHoursLeft(r.eway_hours_left)}</div>
                    </td>
                    <td className="px-4 py-2 text-heading/70 whitespace-nowrap">{formatDate(r.date)}</td>
                    <td className="px-4 py-2 font-medium text-indigo-600 dark:text-indigo-400">{r.truck_number}</td>
                    <td className="px-4 py-2 text-heading/80">{r.party_name}</td>
                    <td className="px-4 py-2 text-heading/70">{r.location || '—'}</td>
                    <td className="px-4 py-2 text-heading/60 font-mono text-xs">{r.eway_bill_number || '—'}</td>
                    <td className="px-4 py-2 text-heading/60 whitespace-nowrap">
                      {r.eway_bill_valid_until ? new Date(r.eway_bill_valid_until).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {eway.atRisk.length > 10 && (
              <div className="border-t border-card-border bg-surface/30 px-4 py-2 text-xs text-heading/60 text-center">
                +{eway.atRisk.length - 10} more at-risk trips — click any row to open Trip Log
              </div>
            )}
          </div>
        )}

        {totalAtRisk === 0 && (
          <div className="border-t border-card-border p-6 text-center text-sm text-heading/50">
            All active E-Way Bills are safe (&gt;24h remaining).
          </div>
        )}
      </div>

      {/* Compliance Summary */}
      {compliance && compliance.total > 0 && (
        <div className="card overflow-hidden p-0">
          <div className="border-b border-card-border px-5 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-indigo-500" />
              <h2 className="font-semibold text-heading">Compliance Assurance</h2>
            </div>
            <Link
              to="/transportbook/compliance"
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Manage statuses →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4">
            <div className="rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/30 p-3">
              <p className="text-[11px] uppercase tracking-wider font-medium text-indigo-700 dark:text-indigo-300">GSTR-1 Filed</p>
              <p className="text-xl font-bold text-heading">{compliance.gstr1_filed}<span className="text-sm text-heading/50"> / {compliance.total}</span></p>
              {compliance.gstr1_mismatch > 0 && <p className="text-[11px] text-red-600 dark:text-red-400 mt-0.5">{compliance.gstr1_mismatch} mismatch</p>}
            </div>
            <div className="rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/30 p-3">
              <p className="text-[11px] uppercase tracking-wider font-medium text-indigo-700 dark:text-indigo-300">GSTR-3B Filed</p>
              <p className="text-xl font-bold text-heading">{compliance.gstr3b_filed}<span className="text-sm text-heading/50"> / {compliance.total}</span></p>
              {compliance.gstr3b_mismatch > 0 && <p className="text-[11px] text-red-600 dark:text-red-400 mt-0.5">{compliance.gstr3b_mismatch} mismatch</p>}
            </div>
            <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/30 p-3">
              <p className="text-[11px] uppercase tracking-wider font-medium text-green-700 dark:text-green-300">ITC Claimed / Reconciled</p>
              <p className="text-xl font-bold text-heading">{compliance.itc_claimed + compliance.itc_reconciled}<span className="text-sm text-heading/50"> / {compliance.total}</span></p>
            </div>
            <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 p-3">
              <p className="text-[11px] uppercase tracking-wider font-medium text-red-700 dark:text-red-300">ITC Disputed</p>
              <p className="text-xl font-bold text-heading">{compliance.itc_disputed}</p>
            </div>
          </div>
        </div>
      )}

      {/* Partner Capital Summary */}
      <div className="card overflow-hidden p-0">
        <div className="border-b border-card-border px-5 py-4 flex items-center gap-3">
          <Users className="h-5 w-5 text-indigo-500" />
          <h2 className="font-semibold text-heading">Partner Capital Summary</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-card-border bg-indigo-50 dark:bg-indigo-900/30 text-left">
                <th className="px-4 py-3 font-medium text-indigo-700 dark:text-indigo-300">Partner</th>
                <th className="px-4 py-3 font-medium text-indigo-700 dark:text-indigo-300 text-right">Current Balance</th>
              </tr>
            </thead>
            <tbody>
              {stats.partnerSummary.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-center text-heading/50">No partners yet</td>
                </tr>
              ) : (
                stats.partnerSummary.map((p, i) => (
                  <tr key={i} className="border-b border-card-border last:border-0 hover:bg-indigo-50/40 dark:hover:bg-indigo-900/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-indigo-600 dark:text-indigo-400">{p.name}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${p.balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatINR(p.balance)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {stats.partnerSummary.length > 0 && (
              <tfoot>
                <tr className="bg-indigo-50 dark:bg-indigo-900/30 font-semibold border-t-2 border-indigo-200 dark:border-indigo-800">
                  <td className="px-4 py-3 text-indigo-700 dark:text-indigo-300">Total Capital</td>
                  <td className={`px-4 py-3 text-right ${stats.partnerSummary.reduce((s, p) => s + p.balance, 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatINR(stats.partnerSummary.reduce((s, p) => s + p.balance, 0))}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="h-5 w-5 text-indigo-500" />
            <h3 className="font-semibold text-heading">Business Model</h3>
          </div>
          <ul className="space-y-2 text-sm text-heading/70">
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-400 shrink-0" />
              ACC gives Rudra transport work orders
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-400 shrink-0" />
              Rudra keeps 5–6% commission on ACC freight
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-400 shrink-0" />
              Truck owners receive ACC freight minus commission, builty charges & advances
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-400 shrink-0" />
              Diesel and cash advances settled at billing time
            </li>
          </ul>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <IndianRupee className="h-5 w-5 text-indigo-500" />
            <h3 className="font-semibold text-heading">Invoice Summary</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-heading/70">Yet to Bill (from Trip Log)</span>
              <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">{formatINR(stats.pendingToBill)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-heading/70">Pending / Partial</span>
              <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">{formatINR(stats.pendingInvoiceAmount - stats.pendingToBill)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-heading/70">Received (Done)</span>
              <span className="text-sm font-semibold text-green-600 dark:text-green-400">{formatINR(stats.doneInvoiceAmount)}</span>
            </div>
            <div className="border-t border-card-border pt-2 flex justify-between items-center">
              <span className="text-sm font-medium text-heading/80">Total Receivable</span>
              <span className="text-sm font-bold text-heading">{formatINR(stats.pendingInvoiceAmount + stats.doneInvoiceAmount)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
