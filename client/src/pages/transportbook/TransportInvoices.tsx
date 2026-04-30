import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
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
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const [searchParams, setSearchParams] = useSearchParams();
  const company: Company = searchParams.get('company') === 'jk' ? 'jk' : 'acc';
  const setCompany = (c: Company) => setSearchParams(c === 'acc' ? {} : { company: c });

  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<InvoiceRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

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
  }, [addToast, company]);

  const heading = useMemo(() => company === 'jk' ? 'JK Billing' : 'ACC Billing', [company]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm, company });
    setModalOpen(true);
  };

  const openEdit = (row: InvoiceRow) => {
    setEditing(row);
    setForm({
      invoice_number: row.invoice_number,
      invoice_date: row.invoice_date || '',
      invoice_amount: String(row.invoice_amount || ''),
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
      const invAmt = Number(form.invoice_amount) || 0;
      const recAmt = Number(form.received_amount) || 0;
      const tdsAmt = Number(form.tds_amount) || 0;
      const payload = {
        invoice_number: form.invoice_number.trim(),
        invoice_date: form.invoice_date || null,
        invoice_amount: invAmt,
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

  const totals = rows.reduce(
    (acc, r) => ({
      invoice_amount: acc.invoice_amount + Number(r.invoice_amount),
      received_amount: acc.received_amount + Number(r.received_amount),
      tds_amount: acc.tds_amount + Number(r.tds_amount),
      pending: acc.pending + Math.max(0, Number(r.invoice_amount) - Number(r.received_amount)),
    }),
    { invoice_amount: 0, received_amount: 0, tds_amount: 0, pending: 0 }
  );

  // Compute live TDS hint in modal
  const liveTds = Number(form.invoice_amount) * 0.02;

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
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <p className="text-heading/50 mb-3">No invoices yet</p>
                    <button type="button" onClick={openAdd} className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm font-medium">Add your first invoice</button>
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
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
                            onClick={() => openEdit(row)}
                            className="rounded p-1.5 text-heading/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 hover:text-indigo-600 dark:text-indigo-400 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          {isAdmin() && (
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
                  <input type="number" min="0" step="0.01" className="input-field" value={form.invoice_amount} onChange={f('invoice_amount')} placeholder="0" />
                  {form.invoice_amount && (
                    <p className="text-xs text-heading/50 mt-1">TDS hint (2%): {formatINR(liveTds)}</p>
                  )}
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
                  <label className="block text-sm font-medium text-heading/80 mb-1">TDS Amount (₹)</label>
                  <input type="number" min="0" step="0.01" className="input-field" value={form.tds_amount} onChange={f('tds_amount')} placeholder="0" />
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
    </div>
  );
}
