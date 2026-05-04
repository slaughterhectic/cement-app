import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { formatINR, formatDate } from '../lib/format';
import { DataTable, type ColumnDef } from '../components/tables/DataTable';
import Modal from '../components/ui/Modal';
import { useToastStore, useAuthStore } from '../lib/store';
import { ArrowLeft, Plus, CreditCard, Trash2, FileDown } from 'lucide-react';
import { openLedgerPdf } from '../lib/ledgerPdf';

type LedgerEntry = {
  source_id?: number;
  date: string;
  entry_type: 'freight' | 'payment';
  payment_type?: 'paid' | 'received';
  amount: number;
  particulars: string;
  qty?: number;
  rate?: number;
  mode: string | null;
  bank_name: string | null;
  cash_handler?: string | null;
  remarks: string | null;
  balance: number;
};

type FreightParty = {
  id: number;
  name: string;
  phone: string | null;
  is_active: number;
  opening_balance: number;
};

type LedgerData = {
  freight_party: FreightParty;
  ledger: LedgerEntry[];
  totalFreight: number;
  totalPaid: number;
  totalReceived: number;
  outstanding: number;
};

type LedgerTableRow = {
  rowKey: string;
  source_id: number | null;
  sno: string | number;
  date: string | null;
  type_label: string;
  particulars: string;
  qty: number;
  rate: number;
  debit: number;
  credit: number;
  balance: number;
  isPayment: boolean;
};

const emptyPayForm = {
  date: new Date().toISOString().split('T')[0],
  amount: '',
  payment_type: 'paid' as 'paid' | 'received',
  mode: 'cash' as 'cash' | 'bank',
  bank_name: '',
  cash_handler: '',
  remarks: '',
};

export default function FreightPartyLedger() {
  const { id } = useParams<{ id: string }>();
  const fpId = id ? Number(id) : NaN;
  const addToast = useToastStore((s) => s.addToast);
  const isAdmin = useAuthStore((s) => s.isAdmin);

  const [data, setData] = useState<LedgerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [payForm, setPayForm] = useState(emptyPayForm);
  const [saving, setSaving] = useState(false);
  const [banks, setBanks] = useState<{ id: number; bank_name: string }[]>([]);
  const [cashHandlers, setCashHandlers] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (!Number.isFinite(fpId) || fpId <= 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = (await api.freightParties.ledger(fpId)) as LedgerData;
      setData(res);
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to load ledger', 'error');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [fpId, addToast]);

  useEffect(() => {
    load();
    api.capital.banks().then(setBanks).catch(() => {});
    api.imprest.handlers().then((rows: any[]) => setCashHandlers(rows.map((r) => r.handler_name))).catch(() => {});
  }, [load]);

  const tableRows = useMemo<LedgerTableRow[]>(() => {
    if (!data) return [];
    const rows: LedgerTableRow[] = [];
    const opening = Number(data.freight_party.opening_balance) || 0;
    if (opening !== 0) {
      // Opening = we owe them (debit on our books = freight owed)
      rows.push({
        rowKey: 'opening',
        source_id: null,
        sno: '—',
        date: null,
        type_label: 'Opening',
        particulars: 'Opening Balance',
        qty: 0,
        rate: 0,
        debit: opening > 0 ? opening : 0,
        credit: opening < 0 ? Math.abs(opening) : 0,
        balance: opening,
        isPayment: false,
      });
    }
    data.ledger.forEach((e, idx) => {
      const isPayment = e.entry_type === 'payment';
      const debit = isPayment ? 0 : Number(e.amount) || 0;
      const credit = isPayment ? Number(e.amount) || 0 : 0;
      const typeLabel = isPayment
        ? `Payment${e.payment_type === 'received' ? ' (Cr)' : ' (Dr)'}`
        : 'Freight';
      rows.push({
        rowKey: `${e.entry_type}-${e.source_id ?? idx}`,
        source_id: e.source_id ?? null,
        sno: idx + 1,
        date: e.date,
        type_label: typeLabel,
        particulars: e.particulars,
        qty: Number(e.qty) || 0,
        rate: Number(e.rate) || 0,
        debit,
        credit,
        balance: Number(e.balance) || 0,
        isPayment,
      });
    });
    return rows;
  }, [data]);

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fpId || !payForm.amount) {
      addToast('Amount required', 'error');
      return;
    }
    if (payForm.mode === 'cash' && !payForm.cash_handler) {
      addToast('Select a cash handler', 'error');
      return;
    }
    if (payForm.mode === 'bank' && !payForm.bank_name) {
      addToast('Select a bank', 'error');
      return;
    }
    setSaving(true);
    try {
      const result = await api.freightParties.addPayment(fpId, {
        date: payForm.date,
        amount: Number(payForm.amount),
        payment_type: payForm.payment_type,
        mode: payForm.mode,
        bank_name: payForm.mode === 'bank' ? payForm.bank_name || null : null,
        cash_handler: payForm.mode === 'cash' ? payForm.cash_handler || null : null,
        remarks: payForm.remarks || null,
      });
      if ((result as any).pending) addToast('Entry sent for admin approval', 'info');
      else addToast('Payment recorded', 'success');
      setPayForm(emptyPayForm);
      setPaymentOpen(false);
      load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePayment = async (row: LedgerTableRow) => {
    if (!row.source_id || !data) return;
    if (!window.confirm('Delete this payment?')) return;
    try {
      await api.freightParties.deletePayment(data.freight_party.id, row.source_id);
      addToast('Payment deleted', 'success');
      load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed', 'error');
    }
  };

  const columns = useMemo<ColumnDef<LedgerTableRow, any>[]>(
    () => [
      { accessorKey: 'sno', header: 'S.No' },
      {
        accessorKey: 'date',
        header: 'Date',
        cell: ({ getValue }) => {
          const d = getValue() as string | null;
          return d ? formatDate(d) : '—';
        },
      },
      {
        accessorKey: 'type_label',
        header: 'Type',
        cell: ({ row }) => {
          const v = row.original.type_label;
          const cls = row.original.isPayment
            ? 'text-emerald-700 dark:text-emerald-300'
            : 'text-orange-700 dark:text-orange-300';
          return <span className={`font-medium ${cls}`}>{v}</span>;
        },
      },
      { accessorKey: 'particulars', header: 'Particulars' },
      {
        accessorKey: 'qty',
        header: 'Qty',
        cell: ({ getValue }) => {
          const q = Number(getValue()) || 0;
          return q > 0 ? `${q} bags` : '—';
        },
      },
      {
        accessorKey: 'rate',
        header: 'Rate',
        cell: ({ getValue }) => {
          const r = Number(getValue()) || 0;
          return r > 0 ? formatINR(r) : '—';
        },
      },
      {
        accessorKey: 'debit',
        header: 'Charged (Dr)',
        cell: ({ getValue }) => {
          const n = Number(getValue()) || 0;
          if (n <= 0) return '—';
          return <span className="font-medium text-red-600 dark:text-red-400">{formatINR(n)}</span>;
        },
      },
      {
        accessorKey: 'credit',
        header: 'Paid / Received (Cr)',
        cell: ({ getValue }) => {
          const n = Number(getValue()) || 0;
          if (n <= 0) return '—';
          return <span className="font-medium text-emerald-600 dark:text-emerald-400">{formatINR(n)}</span>;
        },
      },
      {
        accessorKey: 'balance',
        header: 'Balance (We Owe)',
        cell: ({ getValue }) => {
          const n = Number(getValue()) || 0;
          const cls = n > 0
            ? 'font-semibold text-orange-600 dark:text-orange-400'
            : n < 0
              ? 'font-semibold text-profit'
              : 'font-medium text-heading/50';
          return <span className={cls}>{formatINR(n)}</span>;
        },
      },
      {
        id: 'actions',
        header: 'Action',
        enableSorting: false,
        cell: ({ row }) =>
          row.original.isPayment && row.original.source_id && isAdmin() ? (
            <button
              type="button"
              onClick={() => handleDeletePayment(row.original)}
              className="inline-flex items-center gap-1 rounded-md border border-red-200 dark:border-red-800 bg-card px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : (
            <span className="text-heading/30">—</span>
          ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, isAdmin]
  );

  if (!Number.isFinite(fpId) || fpId <= 0) {
    return (
      <div className="text-heading">
        <p className="text-heading/70">Invalid freight party.</p>
        <Link to="/freight-parties" className="mt-2 inline-block text-brand-600 hover:underline">
          Back to freight parties
        </Link>
      </div>
    );
  }

  if (!loading && !data) {
    return (
      <div className="text-heading">
        <p className="text-heading/70">Freight party not found.</p>
        <Link to="/freight-parties" className="mt-2 inline-block text-brand-600 hover:underline">
          Back to freight parties
        </Link>
      </div>
    );
  }

  const fp = data?.freight_party;
  const outstanding = Number(data?.outstanding) || 0;

  const handleDownloadPdf = useCallback(() => {
    if (!fp || !data) return;
    const ok = openLedgerPdf({
      title: 'Freight Ledger Statement',
      partyName: fp.name,
      partyType: 'Freight party',
      partyPhone: fp.phone,
      isSupplier: true,
      rows: tableRows.map((r) => ({
        sno: r.sno,
        date: r.date,
        particulars: r.particulars,
        qty: r.qty,
        rate: r.rate,
        debit: r.debit,
        credit: r.credit,
        balance: r.balance,
      })),
      totals: {
        totalDebit: data.totalFreight,
        totalCredit: data.totalPaid + data.totalReceived,
        outstanding,
      },
      debitLabel: 'Freight (Dr)',
      creditLabel: 'Paid / Received (Cr)',
      balanceLabel: 'Balance (We Owe)',
    });
    if (!ok) addToast('Please allow popups to download the ledger PDF', 'error');
  }, [fp, data, tableRows, outstanding, addToast]);

  return (
    <div className="space-y-6">
      <Link
        to="/freight-parties"
        className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Freight Parties
      </Link>

      <div className="card space-y-4">
        {loading && !fp ? (
          <div className="animate-pulse space-y-3">
            <div className="h-8 w-48 rounded bg-card-border/60" />
            <div className="h-4 w-full max-w-md rounded bg-card-border/60" />
          </div>
        ) : fp ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-heading">{fp.name}</h1>
                <p className="mt-1 text-sm text-heading/70">{fp.phone || '—'}</p>
                <span className="mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200">
                  Freight party
                </span>
              </div>
              <div className="text-right">
                {outstanding > 0 ? (
                  <div>
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{formatINR(outstanding)}</p>
                    <p className="text-sm font-semibold mt-0.5 text-orange-500">We owe them (payable)</p>
                  </div>
                ) : outstanding < 0 ? (
                  <div>
                    <p className="text-2xl font-bold text-profit">{formatINR(Math.abs(outstanding))}</p>
                    <p className="text-sm font-semibold mt-0.5 text-profit/80">They owe us (advance)</p>
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-profit">Settled</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setPaymentOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <CreditCard className="h-4 w-4" />
                Record Payment
              </button>
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="inline-flex items-center gap-2 rounded-lg border border-card-border bg-card px-4 py-2 text-sm font-medium text-heading/80 hover:bg-surface"
              >
                <FileDown className="h-4 w-4" />
                Download PDF
              </button>
            </div>
          </>
        ) : null}
      </div>

      <DataTable<LedgerTableRow>
        data={tableRows}
        columns={columns}
        isLoading={loading}
        emptyMessage="No ledger entries yet."
        exportFileName={fp ? `${fp.name}_freight_ledger` : 'freight_ledger'}
        getRowId={(row) =>
          row.rowKey === 'opening'
            ? -1
            : row.source_id != null
              ? (row.isPayment ? 2_000_000 + row.source_id : 1_000_000 + row.source_id)
              : (typeof row.sno === 'number' ? row.sno : 0) + 3_000_000
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <p className="text-xs font-medium uppercase tracking-wide text-heading/60">Total Freight</p>
          <p className="mt-1 text-xl font-semibold text-heading">{formatINR(data?.totalFreight ?? 0)}</p>
        </div>
        <div className="card">
          <p className="text-xs font-medium uppercase tracking-wide text-heading/60">Paid Out</p>
          <p className="mt-1 text-xl font-semibold text-emerald-700 dark:text-emerald-300">
            {formatINR(data?.totalPaid ?? 0)}
          </p>
        </div>
        <div className="card">
          <p className="text-xs font-medium uppercase tracking-wide text-heading/60">Received Back</p>
          <p className="mt-1 text-xl font-semibold text-blue-700 dark:text-blue-300">
            {formatINR(data?.totalReceived ?? 0)}
          </p>
        </div>
        <div className="card">
          <p className="text-xs font-medium uppercase tracking-wide text-heading/60">Outstanding</p>
          <p className={`mt-1 text-xl font-semibold ${outstanding > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-profit'}`}>
            {formatINR(outstanding)}
          </p>
        </div>
      </div>

      <Modal isOpen={paymentOpen} onClose={() => setPaymentOpen(false)} title="Record Payment" size="lg">
        <form onSubmit={handleAddPayment} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-heading">Date *</label>
              <input
                type="date"
                className="input-field"
                value={payForm.date}
                onChange={(e) => setPayForm({ ...payForm, date: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-heading">Amount *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="input-field"
                value={payForm.amount}
                onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-heading">Direction</label>
              <div className="flex items-center gap-1 rounded-lg border border-card-border bg-surface p-0.5 text-sm">
                {(['paid', 'received'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setPayForm({ ...payForm, payment_type: v })}
                    className={`flex-1 px-3 py-1 rounded-md font-medium capitalize transition-colors ${
                      payForm.payment_type === v ? 'bg-brand-500 text-white' : 'text-heading/70 hover:bg-card-border/40'
                    }`}
                  >
                    {v === 'paid' ? 'Paid (Dr)' : 'Received (Cr)'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-heading">Mode</label>
              <div className="flex items-center gap-1 rounded-lg border border-card-border bg-surface p-0.5 text-sm">
                {(['cash', 'bank'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPayForm({ ...payForm, mode: m })}
                    className={`flex-1 px-3 py-1 rounded-md font-medium capitalize transition-colors ${
                      payForm.mode === m ? 'bg-brand-500 text-white' : 'text-heading/70 hover:bg-card-border/40'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            {payForm.mode === 'cash' ? (
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-heading">Cash handler *</label>
                <select
                  className="input-field"
                  value={payForm.cash_handler}
                  onChange={(e) => setPayForm({ ...payForm, cash_handler: e.target.value })}
                  required
                >
                  <option value="">Select handler</option>
                  {cashHandlers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ) : (
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-heading">Bank *</label>
                <select
                  className="input-field"
                  value={payForm.bank_name}
                  onChange={(e) => setPayForm({ ...payForm, bank_name: e.target.value })}
                  required
                >
                  <option value="">Select bank</option>
                  {banks.map((b) => <option key={b.id} value={b.bank_name}>{b.bank_name}</option>)}
                </select>
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-heading">Remarks</label>
              <input
                type="text"
                className="input-field"
                value={payForm.remarks}
                onChange={(e) => setPayForm({ ...payForm, remarks: e.target.value })}
                placeholder="Optional"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-card-border pt-4">
            <button
              type="button"
              onClick={() => setPaymentOpen(false)}
              className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-heading/80 hover:bg-surface"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save Payment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
