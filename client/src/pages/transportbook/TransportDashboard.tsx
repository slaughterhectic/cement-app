import { useCallback, useEffect, useState } from 'react';
import { Truck, FileText, IndianRupee, Users, TrendingUp, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatINR, formatDate } from '../../lib/format';
import { useToastStore } from '../../lib/store';

interface DashboardStats {
  tripsThisMonth: number;
  totalTrucks: number;
  pendingInvoiceAmount: number;
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
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const [trips, owners, invoices, partners, ewayData, complianceData] = await Promise.all([
        api.rlTrips.list({ month }),
        api.rlTruckOwners.list(),
        api.rlInvoices.list(),
        api.rlPartners.list(),
        api.rlTrips.ewayAlerts(),
        api.rlInvoices.complianceSummary(),
      ]);

      const pendingInvoiceAmount = invoices
        .filter((i: any) => i.status === 'pending' || i.status === 'partial')
        .reduce((s: number, i: any) => s + (Number(i.invoice_amount) - Number(i.received_amount)), 0);
      const doneInvoiceAmount = invoices
        .filter((i: any) => i.status === 'done')
        .reduce((s: number, i: any) => s + Number(i.invoice_amount), 0);

      setStats({
        tripsThisMonth: trips.length,
        totalTrucks: owners.length,
        pendingInvoiceAmount,
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
  }, [addToast]);

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
      <div>
        <h1 className="text-2xl font-bold text-heading">TransportBook Dashboard</h1>
        <p className="text-sm text-heading/60 mt-1">Rudra Logistics — ACC Cement Transport Overview</p>
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
          sub="from ACC"
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
              <span className="text-sm text-heading/70">Pending / Partial</span>
              <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">{formatINR(stats.pendingInvoiceAmount)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-heading/70">Received (Done)</span>
              <span className="text-sm font-semibold text-green-600 dark:text-green-400">{formatINR(stats.doneInvoiceAmount)}</span>
            </div>
            <div className="border-t border-card-border pt-2 flex justify-between items-center">
              <span className="text-sm font-medium text-heading/80">Total Invoiced</span>
              <span className="text-sm font-bold text-heading">{formatINR(stats.pendingInvoiceAmount + stats.doneInvoiceAmount)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
