import { useCallback, useEffect, useState } from 'react';
import { Wallet, User, TrendingDown, TrendingUp, Calendar } from 'lucide-react';
import { MonthPicker } from '../../components/MonthPicker';
import { api } from '../../lib/api';
import { formatINR, formatDate } from '../../lib/format';
import { useToastStore } from '../../lib/store';

interface CashTxn {
  id: number;
  date: string;
  handler_name: string;
  particulars: string;
  narration: string | null;
  debit: number;
  credit: number;
  source_table: string;
  source_id: number;
}

interface HandlerSummary {
  handler_name: string;
  opening_balance: number;
  total_credit: number;
  total_debit: number;
  txn_count: number;
  balance: number;
}

function sourceLabel(src: string): string {
  if (src === 'rl_expenses') return 'Expense';
  if (src === 'rl_diesel_credit') return 'Diesel Payment';
  return src;
}

export default function TransportCash() {
  const addToast = useToastStore((s) => s.addToast);
  const [data, setData] = useState<{ transactions: CashTxn[]; handlers: string[]; summary: HandlerSummary[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterHandler, setFilterHandler] = useState('');
  const [filterMonth, setFilterMonth] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterHandler) params.handler = filterHandler;
      if (filterMonth)   params.month = filterMonth;
      const res = await api.rlCashHandler.get(Object.keys(params).length > 0 ? params : undefined);
      setData(res);
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to load cash handler data', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, filterHandler, filterMonth]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading">Cash Handler</h1>
          <p className="text-sm text-heading/60 mt-1">TransportBook cash flows via imprest handlers</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="font-medium text-heading/70">Month:</label>
          <MonthPicker value={filterMonth} onChange={setFilterMonth} />
          {filterMonth && (
            <button type="button" onClick={() => setFilterMonth('')}
              className="rounded-md border border-card-border px-2 py-1.5 text-xs font-medium text-heading/70 hover:bg-surface">
              All months
            </button>
          )}
          {data && data.handlers.length > 0 && (
            <>
              <label className="font-medium text-heading/70 ml-2">Handler:</label>
              <select
                value={filterHandler}
                onChange={(e) => setFilterHandler(e.target.value)}
                className="rounded-lg border border-card-border bg-card px-3 py-1.5 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All handlers</option>
                {data.handlers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      {/* Handler Summary Cards */}
      {data && data.summary.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.summary.map((h) => (
            <div key={h.handler_name}
              className={`card p-4 cursor-pointer transition-shadow hover:shadow-md ${filterHandler === h.handler_name ? 'ring-2 ring-indigo-500' : ''}`}
              onClick={() => setFilterHandler(filterHandler === h.handler_name ? '' : h.handler_name)}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                  <User className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-heading truncate">{h.handler_name}</p>
                  <p className="text-xs text-heading/50">{h.txn_count} transaction{h.txn_count === 1 ? '' : 's'}</p>
                </div>
                <div className={`text-right ${h.balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  <p className="text-xs text-heading/50">Balance</p>
                  <p className="text-base font-bold">{formatINR(h.balance)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md bg-green-50 dark:bg-green-900/30 p-2">
                  <p className="text-green-700 dark:text-green-400 font-medium">Cash Received</p>
                  <p className="text-green-700 dark:text-green-300 font-bold mt-0.5">{formatINR(h.total_credit)}</p>
                </div>
                <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-2">
                  <p className="text-red-700 dark:text-red-400 font-medium">Cash Paid Out</p>
                  <p className="text-red-700 dark:text-red-300 font-bold mt-0.5">{formatINR(h.total_debit)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && data && data.summary.length === 0 && (
        <div className="card p-12 text-center">
          <Wallet className="h-12 w-12 text-heading/20 mx-auto mb-3" />
          <p className="text-heading/60 font-medium">No cash transactions yet</p>
          <p className="text-sm text-heading/40 mt-1">
            Cash transactions from transport expenses and diesel payments will appear here.
          </p>
        </div>
      )}

      {/* Transaction Table */}
      {data && data.transactions.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="border-b border-card-border px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-indigo-500" />
              <h2 className="font-semibold text-heading">
                Cash Transactions
                {filterHandler && <span className="ml-1 text-indigo-600 dark:text-indigo-400">— {filterHandler}</span>}
                {filterMonth && <span className="ml-1 text-heading/50">— {filterMonth}</span>}
              </h2>
            </div>
            <span className="text-xs text-heading/50">{data.transactions.length} entries</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-card-border bg-surface/60 text-left">
                  <th className="px-4 py-2 text-xs font-medium text-heading/60 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-2 text-xs font-medium text-heading/60 uppercase tracking-wider">Handler</th>
                  <th className="px-4 py-2 text-xs font-medium text-heading/60 uppercase tracking-wider">Particulars</th>
                  <th className="px-4 py-2 text-xs font-medium text-heading/60 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-2 text-xs font-medium text-heading/60 uppercase tracking-wider text-right">Paid Out (Dr)</th>
                  <th className="px-4 py-2 text-xs font-medium text-heading/60 uppercase tracking-wider text-right">Received (Cr)</th>
                </tr>
              </thead>
              <tbody>
                {data.transactions.map((t) => (
                  <tr key={t.id} className="border-b border-card-border last:border-0 hover:bg-surface/50 transition-colors">
                    <td className="px-4 py-2 text-heading/70 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 text-heading/40 shrink-0" />
                        {formatDate(t.date)}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 text-xs font-medium">
                        <User className="h-2.5 w-2.5" />
                        {t.handler_name}
                      </span>
                    </td>
                    <td className="px-4 py-2 max-w-xs">
                      <p className="text-heading font-medium truncate">{t.particulars}</p>
                      {t.narration && <p className="text-xs text-heading/50 truncate">{t.narration}</p>}
                    </td>
                    <td className="px-4 py-2">
                      <span className="text-xs rounded-full px-2 py-0.5 bg-surface text-heading/60">
                        {sourceLabel(t.source_table)}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {t.debit > 0 ? (
                        <span className="flex items-center justify-end gap-1 text-red-600 dark:text-red-400 font-medium">
                          <TrendingDown className="h-3 w-3" />
                          {formatINR(t.debit)}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {t.credit > 0 ? (
                        <span className="flex items-center justify-end gap-1 text-green-600 dark:text-green-400 font-medium">
                          <TrendingUp className="h-3 w-3" />
                          {formatINR(t.credit)}
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              {data.transactions.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-card-border bg-surface/60 font-semibold">
                    <td colSpan={4} className="px-4 py-2 text-xs text-heading/60 uppercase">Totals</td>
                    <td className="px-4 py-2 text-right tabular-nums text-red-600 dark:text-red-400">
                      {formatINR(data.transactions.reduce((s, t) => s + t.debit, 0))}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-green-600 dark:text-green-400">
                      {formatINR(data.transactions.reduce((s, t) => s + t.credit, 0))}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="h-7 w-7 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      )}
    </div>
  );
}
