import { useCallback, useEffect, useState } from 'react';
import { Truck, FileText, IndianRupee, Users, TrendingUp, Clock } from 'lucide-react';
import { api } from '../../lib/api';
import { formatINR } from '../../lib/format';
import { useToastStore } from '../../lib/store';

interface DashboardStats {
  tripsThisMonth: number;
  totalTrucks: number;
  pendingInvoiceAmount: number;
  doneInvoiceAmount: number;
  partnerSummary: Array<{ name: string; balance: number }>;
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

export default function TransportDashboard() {
  const addToast = useToastStore((s) => s.addToast);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const [trips, owners, invoices, partners] = await Promise.all([
        api.rlTrips.list({ month }),
        api.rlTruckOwners.list(),
        api.rlInvoices.list(),
        api.rlPartners.list(),
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-heading">TransportBook Dashboard</h1>
        <p className="text-sm text-heading/60 mt-1">Rudra Logistics — ACC Cement Transport Overview</p>
      </div>

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
