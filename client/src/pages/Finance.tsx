import { useEffect, useState, useCallback, useMemo } from 'react';
import { Pencil, Plus, Trash2, Calculator } from 'lucide-react';
import { api } from '../lib/api';
import { formatINR, formatDate } from '../lib/format';
import { useToastStore } from '../lib/store';

interface Loan {
  id: number;
  lender_name: string;
  principal: number;
  interest_rate: number;
  emi_amount: number | null;
  start_date: string;
  tenure_months: number | null;
  outstanding_principal: number | null;
  remarks: string | null;
}

function calcEMI(principal: number, annualRate: number, months: number): number {
  if (annualRate === 0) return months > 0 ? principal / months : 0;
  const r = annualRate / 12 / 100;
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

function EMICalculator() {
  const [p, setP] = useState('');
  const [r, setR] = useState('');
  const [n, setN] = useState('');

  const emi = useMemo(() => {
    const principal = parseFloat(p);
    const rate = parseFloat(r);
    const months = parseInt(n);
    if (!principal || !rate || !months || months <= 0) return null;
    return calcEMI(principal, rate, months);
  }, [p, r, n]);

  const totalPayable = emi && parseInt(n) > 0 ? emi * parseInt(n) : null;
  const totalInterest = totalPayable !== null ? totalPayable - parseFloat(p || '0') : null;

  return (
    <div className="card p-5 space-y-4">
      <h3 className="text-base font-semibold text-heading flex items-center gap-2">
        <Calculator className="h-5 w-5 text-brand-500" />
        EMI Calculator
      </h3>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Principal Amount (₹)</label>
          <input type="number" min={0} step={1000} className="input-field w-full" placeholder="e.g. 500000" value={p} onChange={(e) => setP(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Annual Interest Rate (%)</label>
          <input type="number" min={0} step={0.1} className="input-field w-full" placeholder="e.g. 12" value={r} onChange={(e) => setR(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Tenure (months)</label>
          <input type="number" min={1} step={1} className="input-field w-full" placeholder="e.g. 60" value={n} onChange={(e) => setN(e.target.value)} />
        </div>
      </div>
      {emi !== null && (
        <div className="grid gap-3 sm:grid-cols-3 border-t border-card-border pt-4">
          <div className="rounded-lg border border-brand-100 bg-brand-50/80 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-brand-700">Monthly EMI</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-brand-800">{formatINR(emi)}</p>
          </div>
          <div className="rounded-lg border border-amber-100 bg-amber-50/80 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-amber-700">Total Interest</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-amber-800">{formatINR(totalInterest ?? 0)}</p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-600">Total Payable</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-gray-800">{formatINR(totalPayable ?? 0)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

const emptyForm = {
  lender_name: '',
  principal: '',
  interest_rate: '',
  emi_amount: '',
  start_date: new Date().toISOString().split('T')[0],
  tenure_months: '',
  outstanding_principal: '',
  remarks: '',
};

export default function Finance() {
  const addToast = useToastStore((s) => s.addToast);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editLoan, setEditLoan] = useState<Loan | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.loans.list();
      setLoans(r as Loan[]);
    } catch {
      addToast('Failed to load loans', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditLoan(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (loan: Loan) => {
    setEditLoan(loan);
    setForm({
      lender_name: loan.lender_name,
      principal: String(loan.principal),
      interest_rate: String(loan.interest_rate),
      emi_amount: loan.emi_amount != null ? String(loan.emi_amount) : '',
      start_date: loan.start_date,
      tenure_months: loan.tenure_months != null ? String(loan.tenure_months) : '',
      outstanding_principal: loan.outstanding_principal != null ? String(loan.outstanding_principal) : '',
      remarks: loan.remarks ?? '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    const principal = parseFloat(form.principal);
    const interest_rate = parseFloat(form.interest_rate);
    if (!form.lender_name || !principal || Number.isNaN(interest_rate) || !form.start_date) {
      addToast('Lender name, principal, interest rate and start date are required', 'error');
      return;
    }

    // Auto-compute EMI if tenure provided
    const tenure = parseInt(form.tenure_months);
    let emiAmt = parseFloat(form.emi_amount) || null;
    if (!emiAmt && tenure > 0) {
      emiAmt = calcEMI(principal, interest_rate, tenure);
    }

    const payload = {
      lender_name: form.lender_name.trim(),
      principal,
      interest_rate,
      emi_amount: emiAmt,
      start_date: form.start_date,
      tenure_months: tenure > 0 ? tenure : null,
      outstanding_principal: parseFloat(form.outstanding_principal) || principal,
      remarks: form.remarks.trim() || null,
    };

    try {
      if (editLoan) {
        await api.loans.update(editLoan.id, payload);
        addToast('Loan updated', 'success');
      } else {
        await api.loans.create(payload);
        addToast('Loan added', 'success');
      }
      setShowForm(false);
      load();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Save failed', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this loan entry?')) return;
    try {
      await api.loans.delete(id);
      addToast('Deleted', 'success');
      load();
    } catch {
      addToast('Delete failed', 'error');
    }
  };

  const totalPrincipal = loans.reduce((s, l) => s + l.principal, 0);
  const totalOutstanding = loans.reduce((s, l) => s + (l.outstanding_principal ?? l.principal), 0);
  const totalMonthlyEMI = loans.reduce((s, l) => s + (l.emi_amount ?? 0), 0);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-heading">Finance &amp; Loans</h1>
        <p className="mt-1 text-sm text-heading/60">Track principal debt, EMI obligations, and interest.</p>
      </header>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-red-200 bg-red-50/80 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Total Loan Principal</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-red-800">{formatINR(totalPrincipal)}</p>
          <p className="mt-1 text-xs text-red-600">{loans.length} loan{loans.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="rounded-xl border border-orange-200 bg-orange-50/80 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">Outstanding Principal</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-orange-800">{formatINR(totalOutstanding)}</p>
          <p className="mt-1 text-xs text-orange-600">Remaining to be repaid</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Monthly EMI Obligation</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-blue-800">{formatINR(totalMonthlyEMI)}</p>
          <p className="mt-1 text-xs text-blue-600">Sum of all EMIs</p>
        </div>
      </div>

      {/* EMI Calculator */}
      <EMICalculator />

      {/* Loans table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-heading">Loan register</h2>
          <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700">
            <Plus className="h-4 w-4" /> Add Loan
          </button>
        </div>

        <div className="card overflow-hidden p-0">
          {loading ? (
            <p className="px-4 py-8 text-center text-sm text-gray-500">Loading…</p>
          ) : loans.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-gray-500">No loans recorded yet. Click "Add Loan" to start.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-3">Lender</th>
                    <th className="px-4 py-3 text-right">Principal (₹)</th>
                    <th className="px-4 py-3 text-right">Outstanding (₹)</th>
                    <th className="px-4 py-3 text-right">Rate (%)</th>
                    <th className="px-4 py-3 text-right">EMI (₹/mo)</th>
                    <th className="px-4 py-3">Start Date</th>
                    <th className="px-4 py-3 text-right">Tenure (mo)</th>
                    <th className="px-4 py-3">Remarks</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loans.map((loan) => {
                    const outstanding = loan.outstanding_principal ?? loan.principal;
                    const pct = loan.principal > 0 ? (outstanding / loan.principal) * 100 : 0;
                    return (
                      <tr key={loan.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-heading">{loan.lender_name}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatINR(loan.principal)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          <span className={outstanding > 0 ? 'font-semibold text-red-700' : 'text-green-600'}>
                            {formatINR(outstanding)}
                          </span>
                          <div className="mt-1 h-1.5 w-full rounded-full bg-gray-200">
                            <div className="h-1.5 rounded-full bg-red-400" style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{loan.interest_rate.toFixed(2)}%</td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium text-blue-700">
                          {loan.emi_amount != null ? formatINR(loan.emi_amount) : '—'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{formatDate(loan.start_date)}</td>
                        <td className="px-4 py-3 text-right">{loan.tenure_months ?? '—'}</td>
                        <td className="px-4 py-3 max-w-[150px] truncate text-gray-600">{loan.remarks || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => openEdit(loan)} className="rounded p-1.5 text-brand-600 hover:bg-brand-50"><Pencil className="h-3.5 w-3.5" /></button>
                            <button type="button" onClick={() => handleDelete(loan.id)} className="rounded p-1.5 text-red-500 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl overflow-y-auto max-h-[90vh]">
            <h3 className="mb-5 text-base font-semibold text-heading">{editLoan ? 'Edit Loan' : 'Add Loan'}</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-600">Lender Name *</label>
                <input type="text" className="input-field w-full" placeholder="e.g. HDFC Bank, Kotak" value={form.lender_name} onChange={(e) => setForm((p) => ({ ...p, lender_name: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Principal Amount (₹) *</label>
                <input type="number" min={0} step={1000} className="input-field w-full" value={form.principal} onChange={(e) => setForm((p) => ({ ...p, principal: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Outstanding Principal (₹)</label>
                <input type="number" min={0} step={1000} className="input-field w-full" placeholder="Defaults to principal if empty" value={form.outstanding_principal} onChange={(e) => setForm((p) => ({ ...p, outstanding_principal: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Annual Interest Rate (%) *</label>
                <input type="number" min={0} step={0.1} className="input-field w-full" placeholder="e.g. 12.5" value={form.interest_rate} onChange={(e) => setForm((p) => ({ ...p, interest_rate: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Tenure (months)</label>
                <input type="number" min={1} step={1} className="input-field w-full" placeholder="e.g. 60" value={form.tenure_months} onChange={(e) => setForm((p) => ({ ...p, tenure_months: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">EMI Amount (₹/month)</label>
                <input type="number" min={0} step={100} className="input-field w-full" placeholder="Auto-calculated if empty" value={form.emi_amount} onChange={(e) => setForm((p) => ({ ...p, emi_amount: e.target.value }))} />
                {form.principal && form.interest_rate && form.tenure_months && !form.emi_amount && (
                  <p className="mt-1 text-xs text-brand-600">
                    Computed EMI: {formatINR(calcEMI(parseFloat(form.principal) || 0, parseFloat(form.interest_rate) || 0, parseInt(form.tenure_months) || 1))}
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Start Date *</label>
                <input type="date" className="input-field w-full" value={form.start_date} onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-600">Remarks</label>
                <textarea rows={2} className="input-field w-full resize-y" value={form.remarks} onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))} />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2 border-t border-card-border pt-4">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="button" onClick={handleSave} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
