import { useCallback, useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Wallet, X } from 'lucide-react';
import { api } from '../lib/api';
import { formatINR } from '../lib/format';
import { useToastStore } from '../lib/store';

interface FirmWallet {
  id: number;
  name: string;
  purchases_total: number;
  cash_in: number;
  cash_out: number;
  net: number;
}

interface LedgerRow {
  id: number;
  date: string;
  particulars: string;
  mode: string;
  bank_name: string | null;
  cash_handler: string | null;
  remarks: string | null;
  inflow: number;
  outflow: number;
  balance: number;
}

export default function FirmWallets() {
  const addToast = useToastStore((s) => s.addToast);
  const [wallets, setWallets] = useState<FirmWallet[]>([]);
  const [unassigned, setUnassigned] = useState({ total: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [ledgerFirm, setLedgerFirm] = useState<FirmWallet | null>(null);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.firmWallets.list();
      setWallets(res.wallets);
      setUnassigned({ total: res.unassigned_inflow, count: res.unassigned_count });
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to load wallets', 'error');
    } finally { setLoading(false); }
  }, [addToast]);
  useEffect(() => { load(); }, [load]);

  const openLedger = async (w: FirmWallet) => {
    setLedgerFirm(w);
    setLedgerLoading(true);
    try {
      const res = await api.firmWallets.ledger(w.id);
      setLedger(res.ledger);
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to load ledger', 'error');
      setLedger([]);
    } finally { setLedgerLoading(false); }
  };

  const totalIn = wallets.reduce((s, w) => s + w.cash_in, 0);
  const totalOut = wallets.reduce((s, w) => s + w.cash_out, 0);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-heading">Firm Wallets</h1>
        <p className="mt-1 text-sm text-heading/60">
          One wallet per supplier firm. Cash out = payments made to the firm; cash in = receipts attributed to sales of that firm's stock (tag them on the Payment form). Purchases are shown for reference.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-900/30 p-5">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
            <ArrowDownLeft className="h-5 w-5" />
            <p className="text-xs font-semibold uppercase tracking-wide">Total Cash In (attributed)</p>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums text-emerald-800 dark:text-emerald-200">{formatINR(totalIn)}</p>
        </div>
        <div className="rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50/80 dark:bg-orange-900/30 p-5">
          <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
            <ArrowUpRight className="h-5 w-5" />
            <p className="text-xs font-semibold uppercase tracking-wide">Total Cash Out</p>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums text-orange-800 dark:text-orange-200">{formatINR(totalOut)}</p>
        </div>
        <div className="rounded-xl border border-card-border bg-card p-5">
          <div className="flex items-center gap-2 text-heading/70">
            <Wallet className="h-5 w-5" />
            <p className="text-xs font-semibold uppercase tracking-wide">Unassigned Receipts</p>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums text-heading">{formatINR(unassigned.total)}</p>
          <p className="mt-1 text-xs text-heading/50">{unassigned.count} receipt{unassigned.count === 1 ? '' : 's'} without a firm wallet tag</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-card-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-card-border text-left text-xs uppercase tracking-wide text-heading/50">
              <th className="px-4 py-3">Firm</th>
              <th className="px-4 py-3 text-right">Purchases (ref)</th>
              <th className="px-4 py-3 text-right">Cash In</th>
              <th className="px-4 py-3 text-right">Cash Out</th>
              <th className="px-4 py-3 text-right">Net Flow</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-heading/50">Loading…</td></tr>
            ) : wallets.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-heading/50">No supplier firms yet — add a party with type "supplier".</td></tr>
            ) : wallets.map((w) => (
              <tr
                key={w.id}
                className="cursor-pointer border-b border-card-border/60 last:border-0 hover:bg-surface"
                onClick={() => openLedger(w)}
              >
                <td className="px-4 py-3 font-medium text-heading">{w.name}</td>
                <td className="px-4 py-3 text-right tabular-nums text-heading/60">{formatINR(w.purchases_total)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-emerald-700 dark:text-emerald-400">{formatINR(w.cash_in)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-orange-700 dark:text-orange-400">{formatINR(w.cash_out)}</td>
                <td className={`px-4 py-3 text-right font-semibold tabular-nums ${w.net >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-outstanding'}`}>
                  {formatINR(w.net)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {ledgerFirm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={() => setLedgerFirm(null)}>
          <div className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-xl bg-card shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-card-border px-5 py-4">
              <h2 className="text-lg font-semibold text-heading">{ledgerFirm.name} — Wallet Ledger</h2>
              <button type="button" onClick={() => setLedgerFirm(null)} className="rounded-lg p-1.5 text-heading/60 hover:bg-surface">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[65vh] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-card-border text-left text-xs uppercase tracking-wide text-heading/50">
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5">Particulars</th>
                    <th className="px-4 py-2.5">Mode</th>
                    <th className="px-4 py-2.5 text-right">In</th>
                    <th className="px-4 py-2.5 text-right">Out</th>
                    <th className="px-4 py-2.5 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerLoading ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-heading/50">Loading…</td></tr>
                  ) : ledger.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-heading/50">No cash movement for this firm yet.</td></tr>
                  ) : ledger.map((r) => (
                    <tr key={r.id} className="border-b border-card-border/60 last:border-0">
                      <td className="whitespace-nowrap px-4 py-2.5 text-heading/70">{r.date}</td>
                      <td className="px-4 py-2.5 text-heading">
                        {r.particulars}
                        {r.remarks && <span className="block text-xs text-heading/50">{r.remarks}</span>}
                      </td>
                      <td className="px-4 py-2.5 capitalize text-heading/60">{r.mode}{r.bank_name ? ` — ${r.bank_name}` : r.cash_handler ? ` — ${r.cash_handler}` : ''}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-emerald-700 dark:text-emerald-400">{r.inflow > 0 ? formatINR(r.inflow) : '—'}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-orange-700 dark:text-orange-400">{r.outflow > 0 ? formatINR(r.outflow) : '—'}</td>
                      <td className={`px-4 py-2.5 text-right font-medium tabular-nums ${r.balance >= 0 ? 'text-heading' : 'text-outstanding'}`}>{formatINR(r.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
