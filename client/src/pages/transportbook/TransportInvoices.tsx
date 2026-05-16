import { MonthPicker } from '../../components/MonthPicker';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Pencil, Trash2, X, CreditCard } from 'lucide-react';
import { api } from '../../lib/api';
import { formatINR, formatDate } from '../../lib/format';
import { useToastStore, useAuthStore } from '../../lib/store';

type Company = 'acc' | 'jk';

interface InvoiceRow {
  id: number;
  invoice_number: string;
  invoice_date: string | null;
  invoice_amount: number;
  payment_receive_date: string | null;
  received_amount: number;
  tds_amount: number;
  status: 'pending' | 'done' | 'partial';
  remarks: string | null;
  company: Company;
}

const emptyForm = {
  invoice_number: '',
  invoice_date: '',
  invoice_amount: '',
  basic_amount: '',
  gst_amount: '',
  misc_amount: '',
  misc_remarks: '',
  payment_receive_date: '',
  received_amount: '',
  tds_amount: '',
  remarks: '',
  company: 'acc' as Company,
};

function computeStatus(invoiceAmount: number, receivedAmount: number): 'pending' | 'done' | 'partial' {
  if (invoiceAmount > 0 && receivedAmount >= invoiceAmount * 0.98) return 'done';
  if (receivedAmount > 0) return 'partial';
  return 'pending';
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'done') return (
    <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/40 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:text-green-300">Done</span>
  );
  if (status === 'partial') return (
    <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/40 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">Partial</span>
  );
  return (
    <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/40 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">Pending</span>
  );
}

export default function TransportInvoices() {
  const addToast = useToastStore((s) => s.addToast);
  const canEditTransport = useAuthStore((s) => s.canEditTransport);
  const [searchParams, setSearchParams] = useSearchParams();
  const company: Company = searchParams.get('company') === 'jk' ? 'jk' : 'acc';
  const setCompany = (c: Company) => setSearchParams(c === 'acc' ? {} : { company: c });

  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [monthFilter, setMonthFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'partial' | 'done'>('all');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<InvoiceRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [billing, setBilling] = useState<{ trip_acc_total: number; invoiced: number; pending_to_invoice: number } | null>(null);
  const [pmtTarget, setPmtTarget] = useState<InvoiceRow | null>(null);
  const [pmtList, setPmtList] = useState<Array<{ id: number; date: string; amount: number; mode: string; bank_name: string | null; reference: string | null; remarks: string | null }>>([]);
  const [pmtLoading, setPmtLoading] = useState(false);
  const [pmtForm, setPmtForm] = useState({ date: new Date().toISOString().split('T')[0], amount: '', mode: 'bank' as 'bank' | 'cash', bank_name: '', reference: '', remarks: '' });
  const [pmtSaving, setPmtSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.rlInvoices.list(company);
      setRows(data);
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to load invoices', 'error');
    } finally {
      setLoading(false);
    }
    // Receivable strip is best-effort — if /billing-summary or the rl_trips.company column
    // isn't deployed yet on the backend, just hide the strip instead of breaking the page.
    try {
      const summary = await api.rlInvoices.billingSummary(company, monthFilter || undefined);
      setBilling({
        trip_acc_total: summary.trip_acc_total,
        invoiced: summary.invoiced,
        pending_to_invoice: summary.pending_to_invoice,
      });
    } catch (_) {
      setBilling(null);
    }
  }, [addToast, company, monthFilter]);

  const heading = useMemo(() => company === 'jk' ? 'JK Billing' : 'ACC Billing', [company]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm, company });
    setModalOpen(true);
  };

  const openPayments = async (row: InvoiceRow) => {
    setPmtTarget(row);
    setPmtForm({ date: new Date().toISOString().split('T')[0], amount: '', mode: 'bank', bank_name: '', reference: '', remarks: '' });
    setPmtLoading(true);
    try { setPmtList(await api.rlInvoices.payments(row.id)); }
    catch (e) { addToast(e instanceof Error ? e.message : 'Failed to load payments', 'error'); }
    finally { setPmtLoading(false); }
  };

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pmtTarget || !pmtForm.amount) return;
    if (pmtForm.mode === 'bank' && !pmtForm.bank_name.trim()) { addToast('Bank name required for bank payments', 'error'); return; }
    setPmtSaving(true);
    try {
      const result = await api.rlInvoices.addPayment(pmtTarget.id, {
        date: pmtForm.date,
        amount: Number(pmtForm.amount),
        mode: pmtForm.mode,
        bank_name: pmtForm.mode === 'bank' ? pmtForm.bank_name.trim() : null,
        reference: pmtForm.reference.trim() || null,
        remarks: pmtForm.remarks.trim() || null,
      });
      if ((result as any).pending) addToast('Payment sent for admin approval', 'info');
      else addToast('Payment recorded', 'success');
      setPmtForm({ date: new Date().toISOString().split('T')[0], amount: '', mode: 'bank', bank_name: '', reference: '', remarks: '' });
      // Refresh payment list + invoice list (received_amount changed).
      setPmtList(await api.rlInvoices.payments(pmtTarget.id));
      load();
    } catch (e) { addToast(e instanceof Error ? e.message : 'Save failed', 'error'); }
    finally { setPmtSaving(false); }
  };

  const deletePayment = async (pid: number) => {
    if (!pmtTarget) return;
    if (!window.confirm('Delete this payment?')) return;
    try {
      await api.rlInvoices.deletePayment(pmtTarget.id, pid);
      addToast('Payment deleted', 'success');
      setPmtList(await api.rlInvoices.payments(pmtTarget.id));
      load();
    } catch (e) { addToast(e instanceof Error ? e.message : 'Delete failed', 'error'); }
  };

  const openEdit = (row: InvoiceRow) => {
    setEditing(row);
    setForm({
      invoice_number: row.invoice_number,
      invoice_date: row.invoice_date || '',
      invoice_amount: String(row.invoice_amount || ''),
      basic_amount: (row as any).basic_amount != null ? String((row as any).basic_amount) : '',
      gst_amount: (row as any).gst_amount != null ? String((row as any).gst_amount) : '',
      misc_amount: (row as any).misc_amount ? String((row as any).misc_amount) : '',
      misc_remarks: (row as any).misc_remarks || '',
      payment_receive_date: row.payment_receive_date || '',
      received_amount: String(row.received_amount || ''),
      tds_amount: String(row.tds_amount || ''),
      remarks: row.remarks || '',
      company: row.company,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.invoice_number.trim()) { addToast('Invoice number is required', 'error'); return; }
    setSaving(true);
    try {
      const basicAmt = Number(form.basic_amount) || 0;
      const gstAmt = Number(form.gst_amount) || 0;
      const miscAmt = Number(form.misc_amount) || 0;
      const haveBifurcation = basicAmt > 0 || gstAmt > 0 || miscAmt > 0;
      const invAmt = haveBifurcation ? (basicAmt + gstAmt + miscAmt) : (Number(form.invoice_amount) || 0);
      const recAmt = Number(form.received_amount) || 0;
      const tdsAmt = Number(form.tds_amount) || 0;
      const payload = {
        invoice_number: form.invoice_number.trim(),
        invoice_date: form.invoice_date || null,
        invoice_amount: invAmt,
        basic_amount: haveBifurcation ? basicAmt : null,
        gst_amount: haveBifurcation ? gstAmt : null,
        misc_amount: miscAmt,
        misc_remarks: form.misc_remarks || null,
        payment_receive_date: form.payment_receive_date || null,
        received_amount: recAmt,
        tds_amount: tdsAmt,
        status: computeStatus(invAmt, recAmt),
        remarks: form.remarks || null,
        // New rows take the form's company (defaulted to the active tab); edits respect
        // the dropdown so a row can be moved between ACC and JK.
        company: form.company,
      };
      if (editing) {
        await api.rlInvoices.update(editing.id, payload);
        addToast('Invoice updated', 'success');
      } else {
        await api.rlInvoices.create(payload);
        addToast('Invoice added', 'success');
      }
      setModalOpen(false);
      load();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: InvoiceRow) => {
    if (!window.confirm(`Delete invoice "${row.invoice_number}"?`)) return;
    try {
      await api.rlInvoices.delete(row.id);
      addToast('Invoice deleted', 'success');
      load();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Delete failed', 'error');
    }
  };

  const f = (field: keyof typeof emptyForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  // Apply month + status filters and sort ASC by invoice date (oldest → newest).
  const visibleRows = useMemo(() => {
    return [...rows]
      .filter((r) => {
        if (monthFilter && !(r.invoice_date || '').startsWith(monthFilter)) return false;
        if (statusFilter !== 'all' && r.status !== statusFilter) return false;
        return true;
      })
      .sort((a, b) => {
        const da = a.invoice_date || '';
        const db = b.invoice_date || '';
        return da.localeCompare(db) || a.id - b.id;
      });
  }, [rows, monthFilter, statusFilter]);

  const totals = visibleRows.reduce(
    (acc, r) => ({
      invoice_amount: acc.invoice_amount + Number(r.invoice_amount),
      received_amount: acc.received_amount + Number(r.received_amount),
      tds_amount: acc.tds_amount + Number(r.tds_amount),
      pending: acc.pending + Math.max(0, Number(r.invoice_amount) - Number(r.received_amount)),
    }),
    { invoice_amount: 0, received_amount: 0, tds_amount: 0, pending: 0 }
  );

  // Compute live TDS hint in modal — 2% of base (basic + misc + invoice). When the
  // bifurcation is present, base = basic; otherwise base = invoice_amount.
  const tdsBase = (Number(form.basic_amount) || 0) > 0
    ? Number(form.basic_amount)
    : Number(form.invoice_amount) || 0;
  const liveTds = tdsBase * 0.02;

  // Auto-fill TDS as the user types — 2% of the base. Lets admins override by typing
  // a different value afterwards (we only sync when the user hasn't manually edited it).
  const [tdsAutoFilled, setTdsAutoFilled] = useState(true);
  useEffect(() => {
    if (!modalOpen) return;
    if (!tdsAutoFilled) return;
    const expected = liveTds.toFixed(2);
    if (form.tds_amount !== expected && (Number(form.tds_amount) || 0) === 0) {
      setForm((p) => ({ ...p, tds_amount: expected === '0.00' ? '' : expected }));
    } else if (Number(form.tds_amount).toFixed(2) !== expected && expected !== '0.00') {
      setForm((p) => ({ ...p, tds_amount: expected }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpen, tdsAutoFilled, liveTds]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-heading">{heading}</h1>
          <div className="inline-flex rounded-lg border border-card-border bg-card p-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => setCompany('acc')}
              className={`rounded-md px-3 py-1.5 ${company === 'acc' ? 'bg-indigo-500 text-white shadow-sm' : 'text-heading/70 hover:bg-surface'}`}
            >
              ACC Billing
            </button>
            <button
              type="button"
              onClick={() => setCompany('jk')}
              className={`rounded-md px-3 py-1.5 ${company === 'jk' ? 'bg-emerald-500 text-white shadow-sm' : 'text-heading/70 hover:bg-surface'}`}
            >
              JK Billing
            </button>
          </div>
          <p className="text-sm text-heading/60">{rows.length} invoice{rows.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors ${company === 'jk' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-indigo-500 hover:bg-indigo-600'}`}
        >
          <Plus className="h-4 w-4" />
          Add Invoice
        </button>
      </div>

      {/* Receivable Strip — auto-shifted from Trip Log so the team can see what's still
          to be billed (per company) before the invoice is even raised. */}
      {billing && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className={`card p-4 text-center ${company === 'jk' ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800' : 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800'}`}>
            <p className={`text-xs font-medium uppercase tracking-wider ${company === 'jk' ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}`}>Trip {company.toUpperCase()} Receivable</p>
            <p className="text-xl font-bold text-heading">{formatINR(billing.trip_acc_total)}</p>
            <p className="text-[10px] text-heading/50 mt-0.5">from Trip Log ({company.toUpperCase()} trips{monthFilter ? ` · ${monthFilter}` : ' · all time'})</p>
          </div>
          <div className="card p-4 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-center">
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium uppercase tracking-wider">Already Invoiced</p>
            <p className="text-xl font-bold text-heading">{formatINR(billing.invoiced)}</p>
            <p className="text-[10px] text-heading/50 mt-0.5">across {rows.length} bill{rows.length === 1 ? '' : 's'}</p>
          </div>
          <div className="card p-4 bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-center">
            <p className="text-xs text-amber-700 dark:text-amber-300 font-medium uppercase tracking-wider">Bills Ready (yet to invoice)</p>
            <p className="text-xl font-bold text-heading">{formatINR(billing.pending_to_invoice)}</p>
            <p className="text-[10px] text-heading/50 mt-0.5">
              {billing.invoiced > billing.trip_acc_total
                ? 'invoiced ≥ trip total — nothing pending here'
                : 'trip total − invoiced'}
            </p>
            {billing.invoiced > billing.trip_acc_total && (
              <p className="mt-1 rounded-md bg-amber-100 dark:bg-amber-900/50 px-2 py-1 text-[10px] text-amber-800 dark:text-amber-200">
                Invoiced ({formatINR(billing.invoiced)}) exceeds Trip {company.toUpperCase()} ({formatINR(billing.trip_acc_total)}) — usually means past trips were billed; no new bills pending.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {rows.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="card p-4 bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 text-center">
            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium uppercase tracking-wider">Total Invoiced</p>
            <p className="text-xl font-bold text-heading">{formatINR(totals.invoice_amount)}</p>
          </div>
          <div className="card p-4 bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-center">
            <p className="text-xs text-green-600 dark:text-green-400 font-medium uppercase tracking-wider">Total Received</p>
            <p className="text-xl font-bold text-heading">{formatINR(totals.received_amount)}</p>
          </div>
          <div className="card p-4 bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-center">
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium uppercase tracking-wider">Total TDS</p>
            <p className="text-xl font-bold text-heading">{formatINR(totals.tds_amount)}</p>
          </div>
          <div className="card p-4 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-center">
            <p className="text-xs text-red-600 dark:text-red-400 font-medium uppercase tracking-wider">Total Pending</p>
            <p className="text-xl font-bold text-heading">{formatINR(totals.pending)}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card flex flex-wrap items-center gap-3 p-3">
        <label className="text-sm font-medium text-heading/70">Month:</label>
        <MonthPicker value={monthFilter} onChange={setMonthFilter} />
        {(() => {
          const now = new Date();
          const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          const mtd = ym(now);
          const prev = new Date(now); prev.setMonth(prev.getMonth() - 1);
          const prevMonth = ym(prev);
          return (
            <div className="flex items-center gap-1 text-xs">
              <button type="button" onClick={() => setMonthFilter(mtd)} className={`rounded-md px-2 py-1 font-medium transition-colors ${monthFilter === mtd ? 'bg-indigo-500 text-white' : 'border border-card-border text-heading/70 hover:bg-surface'}`}>MTD</button>
              <button type="button" onClick={() => setMonthFilter(prevMonth)} className={`rounded-md px-2 py-1 font-medium transition-colors ${monthFilter === prevMonth ? 'bg-indigo-500 text-white' : 'border border-card-border text-heading/70 hover:bg-surface'}`}>Prev</button>
              <button type="button" onClick={() => setMonthFilter('2025-04')} className={`rounded-md px-2 py-1 font-medium transition-colors ${monthFilter && monthFilter < '2026-01' ? 'bg-amber-500 text-white' : 'border border-card-border text-heading/70 hover:bg-surface'}`}>FY 25-26</button>
              <button type="button" onClick={() => setMonthFilter('')} className={`rounded-md px-2 py-1 font-medium transition-colors ${!monthFilter ? 'bg-indigo-500 text-white' : 'border border-card-border text-heading/70 hover:bg-surface'}`}>All</button>
            </div>
          );
        })()}
        <label className="text-sm font-medium text-heading/70 ml-2">Status:</label>
        <div className="flex items-center gap-1 rounded-lg border border-card-border bg-surface p-0.5 text-xs">
          {(['all', 'pending', 'partial', 'done'] as const).map((s) => (
            <button key={s} type="button" onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-md font-medium capitalize transition-colors ${statusFilter === s ? 'bg-indigo-500 text-white' : 'text-heading/70 hover:bg-card-border/40'}`}>
              {s}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-heading/60">{visibleRows.length} of {rows.length} · oldest → newest</span>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-card-border bg-indigo-50 dark:bg-indigo-900/30 text-left">
                <th className="px-4 py-3 font-medium text-indigo-700 dark:text-indigo-300">Invoice No.</th>
                <th className="px-4 py-3 font-medium text-indigo-700 dark:text-indigo-300">Invoice Date</th>
                <th className="px-4 py-3 font-medium text-indigo-700 dark:text-indigo-300 text-right">Invoice Amt</th>
                <th className="px-4 py-3 font-medium text-indigo-700 dark:text-indigo-300">Received Date</th>
                <th className="px-4 py-3 font-medium text-indigo-700 dark:text-indigo-300 text-right">Received Amt</th>
                <th className="px-4 py-3 font-medium text-indigo-700 dark:text-indigo-300 text-right">TDS (2%)</th>
                <th className="px-4 py-3 font-medium text-indigo-700 dark:text-indigo-300 text-right">Pending</th>
                <th className="px-4 py-3 font-medium text-indigo-700 dark:text-indigo-300">Status</th>
                <th className="px-4 py-3 font-medium text-indigo-700 dark:text-indigo-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-heading/50">Loading...</td></tr>
              ) : visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <p className="text-heading/50 mb-3">No invoices yet</p>
                    <button type="button" onClick={openAdd} className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm font-medium">Add your first invoice</button>
                  </td>
                </tr>
              ) : (
                visibleRows.map((row) => {
                  const pending = Math.max(0, Number(row.invoice_amount) - Number(row.received_amount));
                  return (
                    <tr key={row.id} className="border-b border-card-border last:border-0 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-indigo-600 dark:text-indigo-400">{row.invoice_number}</td>
                      <td className="px-4 py-3 text-heading/70">{row.invoice_date ? formatDate(row.invoice_date) : '—'}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatINR(Number(row.invoice_amount))}</td>
                      <td className="px-4 py-3 text-heading/70">{row.payment_receive_date ? formatDate(row.payment_receive_date) : '—'}</td>
                      <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">{formatINR(Number(row.received_amount))}</td>
                      <td className="px-4 py-3 text-right text-amber-600 dark:text-amber-400">{formatINR(Number(row.tds_amount))}</td>
                      <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">{pending > 0 ? formatINR(pending) : '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openPayments(row)}
                            className="inline-flex items-center gap-1 rounded-md border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                            title="Add / view payments"
                          >
                            <CreditCard className="h-3 w-3" /> Pmt
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(row)}
                            className="rounded p-1.5 text-heading/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 hover:text-indigo-600 dark:text-indigo-400 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          {canEditTransport() && (
                            <button
                              type="button"
                              onClick={() => handleDelete(row)}
                              className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="bg-indigo-50 dark:bg-indigo-900/30 font-semibold border-t-2 border-indigo-200 dark:border-indigo-800">
                  <td className="px-4 py-3 text-indigo-700 dark:text-indigo-300" colSpan={2}>Total ({rows.length})</td>
                  <td className="px-4 py-3 text-right">{formatINR(totals.invoice_amount)}</td>
                  <td className="px-4 py-3">—</td>
                  <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">{formatINR(totals.received_amount)}</td>
                  <td className="px-4 py-3 text-right text-amber-600 dark:text-amber-400">{formatINR(totals.tds_amount)}</td>
                  <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">{formatINR(totals.pending)}</td>
                  <td className="px-4 py-3" colSpan={2}>—</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-xl bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-card-border px-5 py-4">
              <h2 className="font-semibold text-heading">{editing ? 'Edit Invoice' : 'Add Invoice'}</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg p-1.5 hover:bg-card-border/50 transition-colors">
                <X className="h-5 w-5 text-heading/60" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-heading/80 mb-1">Billing Company *</label>
                  <div className="inline-flex w-full rounded-lg border border-card-border bg-card p-1 text-sm">
                    <button
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, company: 'acc' }))}
                      className={`flex-1 rounded-md px-3 py-1.5 font-medium ${form.company === 'acc' ? 'bg-indigo-500 text-white shadow-sm' : 'text-heading/70 hover:bg-surface'}`}
                    >
                      ACC
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, company: 'jk' }))}
                      className={`flex-1 rounded-md px-3 py-1.5 font-medium ${form.company === 'jk' ? 'bg-emerald-500 text-white shadow-sm' : 'text-heading/70 hover:bg-surface'}`}
                    >
                      JK
                    </button>
                  </div>
                  {editing && form.company !== editing.company && (
                    <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">Moving this invoice from {editing.company.toUpperCase()} to {form.company.toUpperCase()} on save.</p>
                  )}
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-heading/80 mb-1">Invoice Number *</label>
                  <input className="input-field" value={form.invoice_number} onChange={f('invoice_number')} placeholder="e.g. ACC/2024/001" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-heading/80 mb-1">Invoice Date</label>
                  <input type="date" className="input-field" value={form.invoice_date} onChange={f('invoice_date')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-heading/80 mb-1">Invoice Amount (₹)</label>
                  <input type="number" min="0" step="0.01" className="input-field" value={form.invoice_amount} onChange={f('invoice_amount')} placeholder="0 — or use bifurcation below" />
                  {form.invoice_amount && (
                    <p className="text-xs text-heading/50 mt-1">TDS hint (2%): {formatINR(liveTds)}</p>
                  )}
                </div>

                {/* Optional bifurcation — when filled, the total invoice amount is computed from these. */}
                <div className="col-span-2 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300 mb-2">
                    Bifurcation (optional — overrides Invoice Amount when filled)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-heading/70 mb-1">Basic Amount (₹)</label>
                      <input type="number" min="0" step="0.01" className="input-field" value={form.basic_amount} onChange={f('basic_amount')} placeholder="0" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-heading/70 mb-1">GST Amount (₹)</label>
                      <input type="number" min="0" step="0.01" className="input-field" value={form.gst_amount} onChange={f('gst_amount')} placeholder="0" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-heading/70 mb-1">Miscellaneous (₹)</label>
                      <input type="number" min="0" step="0.01" className="input-field" value={form.misc_amount} onChange={f('misc_amount')} placeholder="0" />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-xs font-medium text-heading/70 mb-1">Misc Remarks</label>
                      <input className="input-field" value={form.misc_remarks} onChange={f('misc_remarks')} placeholder="What's the miscellaneous charge for?" />
                    </div>
                    {(Number(form.basic_amount) > 0 || Number(form.gst_amount) > 0 || Number(form.misc_amount) > 0) && (
                      <div className="sm:col-span-3 text-xs text-heading/70">
                        Total: <span className="font-bold text-emerald-700 dark:text-emerald-300">{formatINR((Number(form.basic_amount) || 0) + (Number(form.gst_amount) || 0) + (Number(form.misc_amount) || 0))}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-heading/80 mb-1">Payment Received Date</label>
                  <input type="date" className="input-field" value={form.payment_receive_date} onChange={f('payment_receive_date')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-heading/80 mb-1">Received Amount (₹)</label>
                  <input type="number" min="0" step="0.01" className="input-field" value={form.received_amount} onChange={f('received_amount')} placeholder="0" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-heading/80 mb-1">
                    TDS Amount (₹) <span className="text-[11px] font-normal text-heading/50">— auto 2% of base</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" min="0" step="0.01"
                      className="input-field flex-1"
                      value={form.tds_amount}
                      onChange={(e) => { setTdsAutoFilled(false); setForm((p) => ({ ...p, tds_amount: e.target.value })); }}
                      placeholder="0"
                    />
                    {!tdsAutoFilled && (
                      <button type="button"
                        onClick={() => { setTdsAutoFilled(true); setForm((p) => ({ ...p, tds_amount: liveTds > 0 ? liveTds.toFixed(2) : '' })); }}
                        className="rounded-md border border-card-border bg-card px-2 py-1 text-xs text-heading/70 hover:bg-surface">
                        Reset to 2%
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-heading/50">
                    {tdsAutoFilled
                      ? `Auto-calculated as 2% of ${(Number(form.basic_amount) || 0) > 0 ? 'Basic Amount' : 'Invoice Amount'}.`
                      : 'Manually overridden — click Reset to 2% to re-enable auto-calc.'}
                  </p>
                </div>
                {form.invoice_amount && form.received_amount && (
                  <div className="col-span-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 px-3 py-2 text-xs">
                    <span className="text-heading/60">Auto Status: </span>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                      {computeStatus(Number(form.invoice_amount), Number(form.received_amount))}
                    </span>
                  </div>
                )}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-heading/80 mb-1">Remarks</label>
                  <textarea className="input-field resize-none" rows={2} value={form.remarks} onChange={f('remarks')} placeholder="Optional notes" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-heading/80 hover:bg-surface transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-600 disabled:opacity-60 transition-colors"
                >
                  {saving ? 'Saving…' : editing ? 'Update' : 'Add Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {pmtTarget && (() => {
        const totalPaid = pmtList.reduce((s, p) => s + Number(p.amount || 0), 0);
        const pendingNow = Math.max(0, Number(pmtTarget.invoice_amount) - totalPaid);
        return (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40">
            <div className="flex min-h-full items-start justify-center px-4 py-6">
              <div className="w-full max-w-2xl rounded-xl bg-card shadow-2xl">
                <div className="flex items-center justify-between border-b border-card-border px-5 py-4">
                  <div>
                    <h2 className="font-semibold text-heading">Payments — {pmtTarget.invoice_number}</h2>
                    <p className="mt-0.5 text-xs text-heading/60">
                      Invoice {formatINR(Number(pmtTarget.invoice_amount))} · Received {formatINR(totalPaid)} · Pending {formatINR(pendingNow)}
                    </p>
                  </div>
                  <button type="button" onClick={() => setPmtTarget(null)} className="rounded-lg p-1.5 hover:bg-card-border/50"><X className="h-5 w-5 text-heading/60" /></button>
                </div>

                {/* Existing payments */}
                <div className="px-5 pt-4">
                  {pmtLoading ? (
                    <p className="py-6 text-center text-xs text-heading/60">Loading payments…</p>
                  ) : pmtList.length === 0 ? (
                    <p className="py-4 text-center text-xs text-heading/60">No payments recorded yet.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-card-border">
                      <table className="w-full text-xs">
                        <thead className="bg-surface">
                          <tr className="text-left">
                            <th className="px-3 py-2 font-medium text-heading/70">Date</th>
                            <th className="px-3 py-2 font-medium text-heading/70 text-right">Amount</th>
                            <th className="px-3 py-2 font-medium text-heading/70">Mode</th>
                            <th className="px-3 py-2 font-medium text-heading/70">Reference</th>
                            <th className="px-3 py-2 font-medium text-heading/70">Remarks</th>
                            <th className="px-3 py-2 font-medium text-heading/70"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-card-border">
                          {pmtList.map((p) => (
                            <tr key={p.id} className="hover:bg-surface/60">
                              <td className="px-3 py-1.5 whitespace-nowrap">{formatDate(p.date)}</td>
                              <td className="px-3 py-1.5 text-right tabular-nums font-semibold text-green-700 dark:text-green-300">{formatINR(Number(p.amount))}</td>
                              <td className="px-3 py-1.5 text-heading/70">{p.mode === 'bank' ? `Bank — ${p.bank_name || ''}`.trim() : 'Cash'}</td>
                              <td className="px-3 py-1.5 text-heading/70">{p.reference || '—'}</td>
                              <td className="px-3 py-1.5 text-heading/70">{p.remarks || '—'}</td>
                              <td className="px-3 py-1.5 text-right">
                                {canEditTransport() && (
                                  <button type="button" onClick={() => deletePayment(p.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Add new payment */}
                <form onSubmit={submitPayment} className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-card-border mt-4">
                  <p className="sm:col-span-2 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Record new payment</p>
                  <div>
                    <label className="block text-xs font-medium text-heading/70 mb-1">Date *</label>
                    <input type="date" className="input-field" value={pmtForm.date} onChange={(e) => setPmtForm({ ...pmtForm, date: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-heading/70 mb-1">Amount (₹) *</label>
                    <input type="number" min="0" step="0.01" className="input-field" value={pmtForm.amount} onChange={(e) => setPmtForm({ ...pmtForm, amount: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-heading/70 mb-1">Mode *</label>
                    <div className="flex items-center gap-1 rounded-lg border border-card-border bg-surface p-0.5 text-sm">
                      {(['bank', 'cash'] as const).map((m) => (
                        <button key={m} type="button" onClick={() => setPmtForm({ ...pmtForm, mode: m })}
                          className={`flex-1 px-3 py-1.5 rounded-md font-medium capitalize ${pmtForm.mode === m ? 'bg-indigo-500 text-white' : 'text-heading/70 hover:bg-card-border/40'}`}>
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                  {pmtForm.mode === 'bank' && (
                    <div>
                      <label className="block text-xs font-medium text-heading/70 mb-1">Bank name *</label>
                      <input className="input-field" value={pmtForm.bank_name} onChange={(e) => setPmtForm({ ...pmtForm, bank_name: e.target.value })} placeholder="e.g. KOTAK ARMTECH" required />
                    </div>
                  )}
                  <div className={pmtForm.mode === 'bank' ? '' : 'sm:col-span-2'}>
                    <label className="block text-xs font-medium text-heading/70 mb-1">Reference / UTR</label>
                    <input className="input-field" value={pmtForm.reference} onChange={(e) => setPmtForm({ ...pmtForm, reference: e.target.value })} placeholder="Optional" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-heading/70 mb-1">Remarks</label>
                    <input className="input-field" value={pmtForm.remarks} onChange={(e) => setPmtForm({ ...pmtForm, remarks: e.target.value })} placeholder="Optional" />
                  </div>
                  <div className="sm:col-span-2 flex justify-end gap-2 pt-1">
                    <button type="button" onClick={() => setPmtTarget(null)} className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-heading/80 hover:bg-surface">Close</button>
                    <button type="submit" disabled={pmtSaving} className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600 disabled:opacity-60">
                      {pmtSaving ? 'Saving…' : 'Add Payment'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
