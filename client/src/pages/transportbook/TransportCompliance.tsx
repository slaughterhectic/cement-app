import { useCallback, useEffect, useMemo, useState } from 'react';
import { ShieldCheck, Save } from 'lucide-react';
import { api } from '../../lib/api';
import { formatINR, formatDate } from '../../lib/format';
import { useToastStore } from '../../lib/store';

type GstrStatus = 'pending' | 'filed' | 'mismatch';
type ItcStatus = 'not_claimed' | 'claimed_by_party' | 'reconciled' | 'disputed';

interface InvoiceRow {
  id: number;
  invoice_number: string;
  invoice_date: string | null;
  invoice_amount: number;
  received_amount: number;
  status: string;
  gstr1_status: GstrStatus | null;
  gstr1_period: string | null;
  gstr3b_status: GstrStatus | null;
  gstr3b_period: string | null;
  itc_status: ItcStatus | null;
  itc_period: string | null;
  compliance_remarks: string | null;
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

const GSTR_OPTIONS: { value: GstrStatus; label: string; cls: string }[] = [
  { value: 'pending', label: 'Pending', cls: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' },
  { value: 'filed', label: 'Filed', cls: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' },
  { value: 'mismatch', label: 'Mismatch', cls: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' },
];

const ITC_OPTIONS: { value: ItcStatus; label: string; cls: string }[] = [
  { value: 'not_claimed', label: 'Not Claimed', cls: 'bg-surface text-heading/60' },
  { value: 'claimed_by_party', label: 'Claimed', cls: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' },
  { value: 'reconciled', label: 'Reconciled', cls: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' },
  { value: 'disputed', label: 'Disputed', cls: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' },
];

function classForGstr(s: GstrStatus | null | undefined): string {
  return GSTR_OPTIONS.find((o) => o.value === s)?.cls || GSTR_OPTIONS[0].cls;
}
function classForItc(s: ItcStatus | null | undefined): string {
  return ITC_OPTIONS.find((o) => o.value === s)?.cls || ITC_OPTIONS[0].cls;
}

export default function TransportCompliance() {
  const addToast = useToastStore((s) => s.addToast);
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [summary, setSummary] = useState<ComplianceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, Partial<InvoiceRow>>>({});
  const [periodFilter, setPeriodFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'mismatch' | 'disputed'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [invoices, complianceSummary] = await Promise.all([
        api.rlInvoices.list(),
        api.rlInvoices.complianceSummary(periodFilter || undefined),
      ]);
      setRows(invoices as InvoiceRow[]);
      setSummary(complianceSummary);
      setDrafts({});
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to load compliance data', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, periodFilter]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let list = rows;
    if (periodFilter) {
      list = list.filter(
        (r) => r.gstr1_period === periodFilter || r.gstr3b_period === periodFilter || r.itc_period === periodFilter
      );
    }
    if (statusFilter === 'pending') {
      list = list.filter((r) => (r.gstr1_status || 'pending') === 'pending' || (r.gstr3b_status || 'pending') === 'pending');
    } else if (statusFilter === 'mismatch') {
      list = list.filter((r) => r.gstr1_status === 'mismatch' || r.gstr3b_status === 'mismatch');
    } else if (statusFilter === 'disputed') {
      list = list.filter((r) => r.itc_status === 'disputed');
    }
    return list;
  }, [rows, periodFilter, statusFilter]);

  const setDraft = (id: number, patch: Partial<InvoiceRow>) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const effectiveRow = (r: InvoiceRow): InvoiceRow => ({ ...r, ...drafts[r.id] });

  const hasDraft = (id: number) => !!drafts[id] && Object.keys(drafts[id]).length > 0;

  const save = async (r: InvoiceRow) => {
    const draft = drafts[r.id];
    if (!draft) return;
    setSavingId(r.id);
    try {
      const updated = await api.rlInvoices.patchCompliance(r.id, {
        gstr1_status: draft.gstr1_status ?? r.gstr1_status,
        gstr1_period: draft.gstr1_period ?? r.gstr1_period,
        gstr3b_status: draft.gstr3b_status ?? r.gstr3b_status,
        gstr3b_period: draft.gstr3b_period ?? r.gstr3b_period,
        itc_status: draft.itc_status ?? r.itc_status,
        itc_period: draft.itc_period ?? r.itc_period,
        compliance_remarks: draft.compliance_remarks ?? r.compliance_remarks,
      });
      setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, ...updated } : x)));
      setDrafts((prev) => {
        const { [r.id]: _discard, ...rest } = prev;
        return rest;
      });
      addToast('Saved', 'success');
      // Refresh summary strip
      const s = await api.rlInvoices.complianceSummary(periodFilter || undefined);
      setSummary(s);
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-indigo-500" />
            Compliance Assurance
          </h1>
          <p className="text-sm text-heading/60 mt-1">
            Track GSTR-1, GSTR-3B, and ITC status per invoice for Rudra Logistics.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && summary.total > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="card p-4">
            <p className="text-xs text-heading/60 font-medium uppercase tracking-wider">Total Invoices{periodFilter ? ` in ${periodFilter}` : ''}</p>
            <p className="text-2xl font-bold text-heading mt-1">{summary.total}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-heading/60 font-medium uppercase tracking-wider">GSTR-1 Filed</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
              {summary.gstr1_filed}
              <span className="text-sm text-heading/50 ml-1">/ {summary.total}</span>
            </p>
            {summary.gstr1_mismatch > 0 && <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{summary.gstr1_mismatch} mismatch</p>}
          </div>
          <div className="card p-4">
            <p className="text-xs text-heading/60 font-medium uppercase tracking-wider">GSTR-3B Filed</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
              {summary.gstr3b_filed}
              <span className="text-sm text-heading/50 ml-1">/ {summary.total}</span>
            </p>
            {summary.gstr3b_mismatch > 0 && <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{summary.gstr3b_mismatch} mismatch</p>}
          </div>
          <div className="card p-4">
            <p className="text-xs text-heading/60 font-medium uppercase tracking-wider">ITC Claimed / Reconciled</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
              {summary.itc_claimed + summary.itc_reconciled}
              <span className="text-sm text-heading/50 ml-1">/ {summary.total}</span>
            </p>
            {summary.itc_disputed > 0 && <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{summary.itc_disputed} disputed</p>}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card flex flex-wrap items-center gap-4 p-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-heading/70 whitespace-nowrap">Period:</label>
          <input
            type="month"
            className="input-field py-1.5 text-sm"
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-heading/70 whitespace-nowrap">Status:</label>
          <select
            className="input-field py-1.5 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="all">All</option>
            <option value="pending">Any Pending</option>
            <option value="mismatch">GSTR Mismatch</option>
            <option value="disputed">ITC Disputed</option>
          </select>
        </div>
        {(periodFilter || statusFilter !== 'all') && (
          <button
            type="button"
            onClick={() => { setPeriodFilter(''); setStatusFilter('all'); }}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-card-border bg-indigo-50 dark:bg-indigo-900/30 text-left">
                <th className="px-3 py-3 font-medium text-indigo-700 dark:text-indigo-300">Invoice #</th>
                <th className="px-3 py-3 font-medium text-indigo-700 dark:text-indigo-300">Date</th>
                <th className="px-3 py-3 font-medium text-indigo-700 dark:text-indigo-300 text-right">Amount</th>
                <th className="px-3 py-3 font-medium text-indigo-700 dark:text-indigo-300">GSTR-1</th>
                <th className="px-3 py-3 font-medium text-indigo-700 dark:text-indigo-300">GSTR-1 Period</th>
                <th className="px-3 py-3 font-medium text-indigo-700 dark:text-indigo-300">GSTR-3B</th>
                <th className="px-3 py-3 font-medium text-indigo-700 dark:text-indigo-300">GSTR-3B Period</th>
                <th className="px-3 py-3 font-medium text-indigo-700 dark:text-indigo-300">ITC</th>
                <th className="px-3 py-3 font-medium text-indigo-700 dark:text-indigo-300">ITC Period</th>
                <th className="px-3 py-3 font-medium text-indigo-700 dark:text-indigo-300">Remarks</th>
                <th className="px-3 py-3 font-medium text-indigo-700 dark:text-indigo-300"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="px-4 py-8 text-center text-heading/50">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={11} className="px-4 py-8 text-center text-heading/50">No invoices match the current filters</td></tr>
              ) : (
                filtered.map((raw) => {
                  const r = effectiveRow(raw);
                  return (
                    <tr key={r.id} className="border-b border-card-border last:border-0 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/20 transition-colors">
                      <td className="px-3 py-2.5 font-medium text-indigo-600 dark:text-indigo-400">{r.invoice_number}</td>
                      <td className="px-3 py-2.5 text-heading/70">{r.invoice_date ? formatDate(r.invoice_date) : '—'}</td>
                      <td className="px-3 py-2.5 text-right text-heading/80">{formatINR(Number(r.invoice_amount))}</td>
                      <td className="px-3 py-2.5">
                        <select
                          className={`rounded-full px-2.5 py-1 text-xs font-medium border-0 focus:ring-2 focus:ring-indigo-400 ${classForGstr(r.gstr1_status)}`}
                          value={r.gstr1_status || 'pending'}
                          onChange={(e) => setDraft(r.id, { gstr1_status: e.target.value as GstrStatus })}
                        >
                          {GSTR_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2.5">
                        <input
                          type="month"
                          className="input-field py-1 text-xs w-32"
                          value={r.gstr1_period || ''}
                          onChange={(e) => setDraft(r.id, { gstr1_period: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <select
                          className={`rounded-full px-2.5 py-1 text-xs font-medium border-0 focus:ring-2 focus:ring-indigo-400 ${classForGstr(r.gstr3b_status)}`}
                          value={r.gstr3b_status || 'pending'}
                          onChange={(e) => setDraft(r.id, { gstr3b_status: e.target.value as GstrStatus })}
                        >
                          {GSTR_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2.5">
                        <input
                          type="month"
                          className="input-field py-1 text-xs w-32"
                          value={r.gstr3b_period || ''}
                          onChange={(e) => setDraft(r.id, { gstr3b_period: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <select
                          className={`rounded-full px-2.5 py-1 text-xs font-medium border-0 focus:ring-2 focus:ring-indigo-400 ${classForItc(r.itc_status)}`}
                          value={r.itc_status || 'not_claimed'}
                          onChange={(e) => setDraft(r.id, { itc_status: e.target.value as ItcStatus })}
                        >
                          {ITC_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2.5">
                        <input
                          type="month"
                          className="input-field py-1 text-xs w-32"
                          value={r.itc_period || ''}
                          onChange={(e) => setDraft(r.id, { itc_period: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <input
                          className="input-field py-1 text-xs w-40"
                          value={r.compliance_remarks || ''}
                          onChange={(e) => setDraft(r.id, { compliance_remarks: e.target.value })}
                          placeholder="Notes..."
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <button
                          type="button"
                          onClick={() => save(raw)}
                          disabled={!hasDraft(r.id) || savingId === r.id}
                          className="inline-flex items-center gap-1 rounded-lg bg-indigo-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          title={hasDraft(r.id) ? 'Save changes' : 'No changes to save'}
                        >
                          <Save className="h-3 w-3" />
                          {savingId === r.id ? '...' : 'Save'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
