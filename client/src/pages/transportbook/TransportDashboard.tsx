import { MonthPicker } from '../../components/MonthPicker';
import { useCallback, useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  Truck, FileText, IndianRupee, Users, TrendingUp, Clock,
  AlertTriangle, ShieldCheck, Landmark, ChevronDown, ChevronUp, Building2,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatINR, formatDate } from '../../lib/format';
import { useToastStore } from '../../lib/store';

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

function SplitKpiCard({ label, accValue, jkValue, totalValue, color, icon: Icon, onDrillDown }: {
  label: string;
  accValue: string;
  jkValue: string;
  totalValue?: string;
  color: string;
  icon: React.ElementType;
  onDrillDown?: () => void;
}) {
  return (
    <div className={`card p-4 flex flex-col gap-2 ${onDrillDown ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onDrillDown}>
      <div className="flex items-center gap-2">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-xs font-semibold text-heading/70 uppercase tracking-wider flex-1">{label}</span>
        {totalValue && <span className="text-sm font-bold text-heading">{totalValue}</span>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-indigo-50 dark:bg-indigo-900/30 p-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-0.5">ACC</p>
          <p className="text-base font-bold text-heading truncate">{accValue}</p>
        </div>
        <div className="rounded-lg bg-violet-50 dark:bg-violet-900/30 p-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400 mb-0.5">JK</p>
          <p className="text-base font-bold text-heading truncate">{jkValue}</p>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, icon: Icon, color, onClick }: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={`card flex items-center gap-4 p-5 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
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

function CompanyBillingRow({ company, data, label }: {
  company: 'acc' | 'jk';
  data: { trip_acc_total: number; invoiced: number; received: number; pending_to_invoice: number; pending_payment: number };
  label: string;
}) {
  const dotColor = company === 'acc' ? 'bg-indigo-500' : 'bg-violet-500';
  const accent   = company === 'acc' ? 'text-indigo-600 dark:text-indigo-400' : 'text-violet-600 dark:text-violet-400';
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div>
        <p className="text-xs text-heading/50">Total Billed</p>
        <p className={`text-sm font-bold ${accent}`}>{formatINR(data.invoiced)}</p>
      </div>
      <div>
        <p className="text-xs text-heading/50">Received</p>
        <p className="text-sm font-bold text-green-600 dark:text-green-400">{formatINR(data.received)}</p>
      </div>
      <div>
        <p className="text-xs text-heading/50">Pending Payment</p>
        <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{formatINR(data.pending_payment)}</p>
      </div>
      <div>
        <p className="text-xs text-heading/50">Yet to Invoice</p>
        <p className="text-sm font-bold text-red-600 dark:text-red-400">{formatINR(data.pending_to_invoice)}</p>
      </div>
    </div>
  );
}

export default function TransportDashboard() {
  const addToast = useToastStore((s) => s.addToast);
  const navigate = useNavigate();

  const [kpis, setKpis] = useState<any>(null);
  const [eway, setEway] = useState<EwayData | null>(null);
  const [compliance, setCompliance] = useState<ComplianceSummary | null>(null);
  const [growth, setGrowth] = useState<Array<{ month: string; trips: number; acc_amount: number; commission: number }>>([]);
  const [monthlyPL, setMonthlyPL] = useState<Array<{ month: string; commission: number; expenses: number; net_pl: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState('');
  const [showDieselDrill, setShowDieselDrill] = useState(false);
  const [showCapitalDrill, setShowCapitalDrill] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const month = filterMonth || currentMonth;

      const [dashData, ewayData, complianceData] = await Promise.all([
        api.rlDashboard.get(month),
        api.rlTrips.ewayAlerts(),
        api.rlInvoices.complianceSummary(),
      ]);

      setKpis(dashData);
      setEway(ewayData);
      setCompliance(complianceData);

      try { setGrowth(await api.rlTrips.monthlyGrowth(12)); } catch (_) { setGrowth([]); }
      try { setMonthlyPL(await api.rlTrips.monthlyPL(12)); } catch (_) { setMonthlyPL([]); }

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

  if (!kpis) return null;

  const criticalEway = (eway?.counts.expired || 0) + (eway?.counts.risk || 0);
  const totalAtRisk = criticalEway + (eway?.counts.warning || 0);
  const accMonth = kpis.acc?.month;
  const jkMonth  = kpis.jk?.month;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading">TransportBook Dashboard</h1>
          <p className="text-sm text-heading/60 mt-1">Rudra Logistics — Month-wise financial overview</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <label className="font-medium text-heading/70">Month:</label>
          <MonthPicker value={filterMonth} onChange={setFilterMonth} />
          {filterMonth && (
            <button type="button" onClick={() => setFilterMonth('')}
              className="rounded-md border border-card-border px-2 py-1.5 text-xs font-medium text-heading/70 hover:bg-surface">
              Current
            </button>
          )}
        </div>
      </div>

      {/* E-Way Alert Banner */}
      {criticalEway > 0 && (
        <button type="button" onClick={() => navigate('/transportbook/trips')}
          className="card border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-left p-4 flex items-start gap-3 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
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

      {/* ── Section: Trips ── */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-heading/50 mb-3">
          Trips — {kpis.month}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SplitKpiCard
            label="Trips This Month"
            accValue={String(kpis.trips.month.acc)}
            jkValue={String(kpis.trips.month.jk)}
            totalValue={String(kpis.trips.month.total)}
            icon={FileText}
            color="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
            onDrillDown={() => navigate('/transportbook/trips')}
          />
          <SplitKpiCard
            label="All-time Trips"
            accValue={String(kpis.trips.all_time.acc)}
            jkValue={String(kpis.trips.all_time.jk)}
            totalValue={String(kpis.trips.all_time.total)}
            icon={Truck}
            color="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
          />
          <SplitKpiCard
            label="Month Freight (₹)"
            accValue={formatINR(kpis.trips.month_freight.acc)}
            jkValue={formatINR(kpis.trips.month_freight.jk)}
            icon={IndianRupee}
            color="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
          />
          <SplitKpiCard
            label="Month Commission"
            accValue={formatINR(kpis.trips.month_commission.acc)}
            jkValue={formatINR(kpis.trips.month_commission.jk)}
            totalValue={formatINR(kpis.trips.month_commission.acc + kpis.trips.month_commission.jk)}
            icon={TrendingUp}
            color="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
          />
        </div>
      </div>

      {/* ── Section: ACC & JK Billing ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* ACC */}
        <div className="card p-0 overflow-hidden">
          <div className="border-b border-card-border px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
              <h2 className="font-semibold text-heading">ACC Billing</h2>
              <span className="text-xs text-heading/50">— {kpis.month}</span>
            </div>
            <Link to="/transportbook/invoices" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">Manage →</Link>
          </div>
          <div className="p-4 space-y-4">
            <CompanyBillingRow company="acc" data={accMonth} label="ACC" />
            <div className="border-t border-card-border pt-3">
              <p className="text-xs font-semibold text-heading/50 uppercase tracking-wider mb-2">All-time</p>
              <CompanyBillingRow company="acc" data={kpis.acc.all_time} label="ACC" />
            </div>
          </div>
        </div>

        {/* JK */}
        <div className="card p-0 overflow-hidden">
          <div className="border-b border-card-border px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
              <h2 className="font-semibold text-heading">JK Billing</h2>
              <span className="text-xs text-heading/50">— {kpis.month}</span>
            </div>
            <Link to="/transportbook/invoices?company=jk" className="text-xs text-violet-600 dark:text-violet-400 hover:underline">Manage →</Link>
          </div>
          <div className="p-4 space-y-4">
            <CompanyBillingRow company="jk" data={jkMonth} label="JK" />
            <div className="border-t border-card-border pt-3">
              <p className="text-xs font-semibold text-heading/50 uppercase tracking-wider mb-2">All-time</p>
              <CompanyBillingRow company="jk" data={kpis.jk.all_time} label="JK" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Section: Business Health KPIs ── */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-heading/50 mb-3">Business Health</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Bank Balance"
            value={formatINR(kpis.bank.closing)}
            sub={`${kpis.bank.active_banks} bank${kpis.bank.active_banks === 1 ? '' : 's'} · Cr ${formatINR(kpis.bank.credits)}`}
            icon={Landmark}
            color="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
            onClick={() => navigate('/transportbook/bank')}
          />
          <KpiCard
            label="This Month Profit"
            value={formatINR(kpis.this_month.profit)}
            sub={`Revenue ${formatINR(kpis.this_month.commission)} − Exp ${formatINR(kpis.this_month.expenses)}`}
            icon={TrendingUp}
            color={kpis.this_month.profit >= 0
              ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400'
              : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'}
          />
          <KpiCard
            label="Total Capital"
            value={formatINR(kpis.capital.total)}
            sub={`${kpis.capital.partners.length} partner${kpis.capital.partners.length === 1 ? '' : 's'}`}
            icon={Users}
            color="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
            onClick={() => setShowCapitalDrill((v) => !v)}
          />
          <KpiCard
            label="Total Pending Invoice"
            value={formatINR((accMonth?.pending_payment || 0) + (jkMonth?.pending_payment || 0))}
            sub={`ACC ${formatINR(accMonth?.pending_payment || 0)} + JK ${formatINR(jkMonth?.pending_payment || 0)}`}
            icon={Clock}
            color="bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
          />
        </div>
      </div>

      {/* Capital drill-down */}
      {showCapitalDrill && kpis.capital.partners.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="border-b border-card-border px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-500" />
              <h2 className="font-semibold text-heading">Partner Capital Breakdown</h2>
            </div>
            <button type="button" onClick={() => setShowCapitalDrill(false)}>
              <ChevronUp className="h-4 w-4 text-heading/50" />
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-card-border bg-indigo-50 dark:bg-indigo-900/30 text-left">
                <th className="px-4 py-2 text-xs font-medium text-indigo-700 dark:text-indigo-300">Partner</th>
                <th className="px-4 py-2 text-xs font-medium text-indigo-700 dark:text-indigo-300 text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {kpis.capital.partners.map((p: any, i: number) => (
                <tr key={i} className="border-b border-card-border last:border-0 hover:bg-surface/50">
                  <td className="px-4 py-2 font-medium text-heading">{p.name}</td>
                  <td className={`px-4 py-2 text-right font-semibold ${p.balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatINR(p.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-indigo-50 dark:bg-indigo-900/30 border-t-2 border-indigo-200 dark:border-indigo-800 font-semibold">
                <td className="px-4 py-2 text-indigo-700 dark:text-indigo-300">Total Capital</td>
                <td className={`px-4 py-2 text-right ${kpis.capital.total >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatINR(kpis.capital.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* ── Section: Outstanding ── */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-heading/50 mb-3">Outstanding Balances</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-heading/60">Diesel Net Balance</p>
              <button type="button" onClick={() => setShowDieselDrill((v) => !v)}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                Details {showDieselDrill ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            </div>
            <p className={`text-2xl font-bold ${kpis.outstanding.diesel.net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatINR(kpis.outstanding.diesel.net)}
            </p>
            <p className="text-xs text-heading/50 mt-1">
              {kpis.outstanding.diesel.net >= 0 ? 'We have credit with diesel parties' : 'We owe diesel parties'}
            </p>
          </div>

          <div className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-heading/60 mb-3">Truck Owner Outstanding</p>
            <p className={`text-2xl font-bold ${kpis.outstanding.truck.net >= 0 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>
              {formatINR(Math.abs(kpis.outstanding.truck.net))}
            </p>
            <p className="text-xs text-heading/50 mt-1">
              {kpis.outstanding.truck.net >= 0 ? 'Still owed to truck owners' : 'Truck owners have received more than earned'}
            </p>
            <div className="mt-2 text-xs text-heading/50 space-y-0.5">
              <div className="flex justify-between"><span>Payable from trips</span><span>{formatINR(kpis.outstanding.truck.payable)}</span></div>
              <div className="flex justify-between"><span>Advances paid</span><span className="text-green-600">−{formatINR(kpis.outstanding.truck.advances_paid)}</span></div>
              {kpis.outstanding.truck.gps_rent > 0 && (
                <div className="flex justify-between"><span>GPS rent</span><span className="text-red-500">−{formatINR(kpis.outstanding.truck.gps_rent)}</span></div>
              )}
            </div>
          </div>

          <div className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-heading/60 mb-3">ACC Pending Invoice</p>
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{formatINR(accMonth?.pending_payment || 0)}</p>
            <p className="text-xs text-heading/50 mt-1">Invoiced but not received</p>
            <div className="mt-2 text-xs text-heading/50 space-y-0.5">
              <div className="flex justify-between"><span>Yet to invoice</span><span>{formatINR(accMonth?.pending_to_invoice || 0)}</span></div>
              <div className="flex justify-between"><span>Invoiced total</span><span>{formatINR(accMonth?.invoiced || 0)}</span></div>
            </div>
          </div>

          <div className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-heading/60 mb-3">JK Pending Invoice</p>
            <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">{formatINR(jkMonth?.pending_payment || 0)}</p>
            <p className="text-xs text-heading/50 mt-1">Invoiced but not received</p>
            <div className="mt-2 text-xs text-heading/50 space-y-0.5">
              <div className="flex justify-between"><span>Yet to invoice</span><span>{formatINR(jkMonth?.pending_to_invoice || 0)}</span></div>
              <div className="flex justify-between"><span>Invoiced total</span><span>{formatINR(jkMonth?.invoiced || 0)}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Diesel drill-down */}
      {showDieselDrill && kpis.outstanding.diesel.parties.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="border-b border-card-border px-5 py-3 flex items-center justify-between">
            <h2 className="font-semibold text-heading text-sm">Diesel Party Balances</h2>
            <Link to="/transportbook/diesel" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">Manage →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-card-border bg-surface/60 text-left">
                  <th className="px-4 py-2 text-xs font-medium text-heading/60 uppercase">Party</th>
                  <th className="px-4 py-2 text-xs font-medium text-heading/60 uppercase text-right">Balance</th>
                  <th className="px-4 py-2 text-xs font-medium text-heading/60 uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {kpis.outstanding.diesel.parties.map((p: any) => (
                  <tr key={p.id} className="border-b border-card-border last:border-0 hover:bg-surface/50">
                    <td className="px-4 py-2 font-medium text-heading">{p.name}</td>
                    <td className={`px-4 py-2 text-right font-semibold tabular-nums ${p.balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatINR(p.balance)}
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {p.balance > 0
                        ? <span className="rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-2 py-0.5">Credit with party</span>
                        : p.balance < 0
                        ? <span className="rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-2 py-0.5">We owe party</span>
                        : <span className="rounded-full bg-surface text-heading/50 px-2 py-0.5">Settled</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Bank Balance Card ── */}
      <div className="card p-4 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300">Bank Closing Balance · TransportBook</p>
            <p className="text-2xl font-bold text-heading mt-0.5">{formatINR(kpis.bank.closing)}</p>
            <p className="text-xs text-heading/60 mt-0.5">
              Opening {formatINR(kpis.bank.opening)} · Credits {formatINR(kpis.bank.credits)} · Debits {formatINR(kpis.bank.debits)} · {kpis.bank.active_banks} bank{kpis.bank.active_banks === 1 ? '' : 's'}
            </p>
          </div>
        </div>
        <Link to="/transportbook/bank" className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">View bank statement →</Link>
      </div>

      {/* ── Month-wise Growth Charts ── */}
      {growth.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="border-b border-card-border px-5 py-4 flex items-center justify-between">
            <h2 className="font-semibold text-heading">Month-wise Growth · last 12 months</h2>
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

      {/* ── Month-wise P&L table ── */}
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

      {/* ── E-Way Bill Monitor ── */}
      <div className="card overflow-hidden p-0">
        <div className="border-b border-card-border px-5 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className={`h-5 w-5 ${criticalEway > 0 ? 'text-red-500' : 'text-indigo-500'}`} />
            <h2 className="font-semibold text-heading">E-Way Bill Monitor</h2>
          </div>
          <Link to="/transportbook/trips" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">View all trips →</Link>
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
                  <tr key={r.id} className="border-t border-card-border last:border-0 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/20 transition-colors cursor-pointer"
                    onClick={() => navigate('/transportbook/trips')}>
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

      {/* ── Compliance ── */}
      {compliance && compliance.total > 0 && (
        <div className="card overflow-hidden p-0">
          <div className="border-b border-card-border px-5 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-indigo-500" />
              <h2 className="font-semibold text-heading">Compliance Assurance</h2>
            </div>
            <Link to="/transportbook/compliance" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">Manage →</Link>
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
    </div>
  );
}
