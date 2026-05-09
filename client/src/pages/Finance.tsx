import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Plus, Trash2, Calculator, ArrowUpRight, ArrowDownLeft, IndianRupee, ExternalLink } from 'lucide-react';
import { api } from '../lib/api';
import { formatINR, formatDate } from '../lib/format';
import { useAuthStore, useToastStore } from '../lib/store';
import { usePagination, PaginationBar } from '../components/tables/SimplePagination';
import { MonthPicker } from '../components/MonthPicker';

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

function RepaymentDial({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (v: number) => void }) {
  const lo = Math.max(0, min);
  const hi = Math.max(lo, max);
  const safeVal = Math.max(lo, Math.min(hi, value));
  const pct = hi > lo ? ((safeVal - lo) / (hi - lo)) * 100 : 0;
  const filledPct = hi > 0 ? (safeVal / hi) * 100 : 0;
  // SVG donut geometry
  const size = 140;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (filledPct / 100) * c;
  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-card-border/60" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          className="text-green-500 transition-[stroke-dasharray] duration-150"
        />
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          transform={`rotate(90 ${size / 2} ${size / 2})`}
          className="fill-heading text-sm font-semibold"
        >
          {filledPct.toFixed(0)}%
        </text>
      </svg>
      <input
        type="range"
        min={lo}
        max={hi}
        step={Math.max(1, Math.round((hi - lo) / 200) || 1)}
        value={safeVal}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-green-500"
        disabled={hi <= lo}
      />
      <div className="flex w-full items-center justify-between text-[11px] text-heading/60">
        <span>EMI {formatINR(lo)}</span>
        <span>{pct.toFixed(0)}% of range</span>
        <span>Total {formatINR(hi)}</span>
      </div>
    </div>
  );
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
          <label className="mb-1 block text-xs font-medium text-heading/70">Principal Amount (₹)</label>
          <input type="number" min={0} step={0.01} className="input-field w-full" placeholder="e.g. 500000" value={p} onChange={(e) => setP(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-heading/70">Annual Interest Rate (%)</label>
          <input type="number" min={0} step={0.1} className="input-field w-full" placeholder="e.g. 12" value={r} onChange={(e) => setR(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-heading/70">Tenure (months)</label>
          <input type="number" min={1} step={1} className="input-field w-full" placeholder="e.g. 60" value={n} onChange={(e) => setN(e.target.value)} />
        </div>
      </div>
      {emi !== null && (
        <div className="grid gap-3 sm:grid-cols-3 border-t border-card-border pt-4">
          <div className="rounded-lg border border-brand-100 bg-brand-50/80 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-brand-700">Monthly EMI</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-brand-800">{formatINR(emi)}</p>
          </div>
          <div className="rounded-lg border border-amber-100 bg-amber-50/80 dark:bg-amber-900/30 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300">Total Interest</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-amber-800 dark:text-amber-200">{formatINR(totalInterest ?? 0)}</p>
          </div>
          <div className="rounded-lg border border-card-border bg-surface p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-heading/70">Total Payable</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-heading/90">{formatINR(totalPayable ?? 0)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Party Loans Section ──────────────────────────────────────────────────────

interface PartyLoan {
  id: number;
  date: string;
  party_id: number;
  party_name: string;
  amount: number;
  mode: 'bank' | 'cash';
  bank_name: string | null;
  cash_handler: string | null;
  type: 'disbursement' | 'repayment';
  remarks: string | null;
}

function PartyLoansSection() {
  const addToast = useToastStore((s) => s.addToast);
  const isAdmin = useAuthStore((s) => s.isAdmin());
  const [partyLoans, setPartyLoans] = useState<PartyLoan[]>([]);
  const [parties, setParties] = useState<{ id: number; name: string }[]>([]);
  const [banks, setBanks] = useState<{ bank_name: string }[]>([]);
  const [handlers, setHandlers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    party_id: '',
    amount: '',
    mode: 'bank' as 'bank' | 'cash',
    bank_name: '',
    cash_handler: '',
    type: 'disbursement' as 'disbursement' | 'repayment',
    remarks: '',
  });
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const pg = usePagination(partyLoans, 15);

  const openEditEntry = (l: PartyLoan) => {
    setEditId(l.id);
    setForm({
      date: l.date,
      party_id: String(l.party_id),
      amount: String(l.amount),
      mode: l.mode,
      bank_name: l.bank_name ?? '',
      cash_handler: l.cash_handler ?? '',
      type: l.type,
      remarks: l.remarks ?? '',
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
    setForm({ date: new Date().toISOString().split('T')[0], party_id: '', amount: '', mode: 'bank', bank_name: '', cash_handler: '', type: 'disbursement', remarks: '' });
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [loans, pts, bks, hdl] = await Promise.all([
        api.partyLoans.list(),
        api.parties.list(),
        api.capital.banks(),
        api.imprest.handlers(),
      ]);
      setPartyLoans(loans as PartyLoan[]);
      setParties((pts as any[]).filter((p) => p.type !== 'supplier'));
      setBanks(bks as any[]);
      setHandlers((hdl as any[]).map((h: any) => h.handler_name));
    } catch {
      addToast('Failed to load party loans', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!form.date || !form.party_id || !form.amount) {
      addToast('Date, party and amount are required', 'error');
      return;
    }
    if (form.mode === 'cash' && !form.cash_handler) {
      addToast('Select a cash handler', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        date: form.date,
        party_id: Number(form.party_id),
        amount: parseFloat(form.amount),
        mode: form.mode,
        bank_name: form.mode === 'bank' ? form.bank_name || null : null,
        cash_handler: form.mode === 'cash' ? form.cash_handler || null : null,
        type: form.type,
        remarks: form.remarks.trim() || null,
      };
      if (editId != null) {
        await api.partyLoans.update(editId, payload);
        addToast('Updated', 'success');
      } else {
        await api.partyLoans.create(payload);
        addToast(form.type === 'disbursement' ? 'Loan disbursed' : 'Repayment recorded', 'success');
      }
      closeForm();
      load();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this loan entry?')) return;
    try {
      await api.partyLoans.delete(id);
      addToast('Deleted');
      load();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Delete failed', 'error');
    }
  };

  const totalDisbursed = partyLoans.filter((l) => l.type === 'disbursement').reduce((s, l) => s + l.amount, 0);
  const totalRepaid = partyLoans.filter((l) => l.type === 'repayment').reduce((s, l) => s + l.amount, 0);
  const netOutstanding = totalDisbursed - totalRepaid;

  // Per-party rollup
  const perParty = useMemo(() => {
    const map = new Map<number, { party_id: number; party_name: string; disbursed: number; repaid: number; lastDate: string }>();
    partyLoans.forEach((l) => {
      const cur = map.get(l.party_id) ?? { party_id: l.party_id, party_name: l.party_name, disbursed: 0, repaid: 0, lastDate: l.date };
      if (l.type === 'disbursement') cur.disbursed += l.amount; else cur.repaid += l.amount;
      if (l.date > cur.lastDate) cur.lastDate = l.date;
      map.set(l.party_id, cur);
    });
    return Array.from(map.values())
      .map((p) => ({ ...p, outstanding: p.disbursed - p.repaid }))
      .sort((a, b) => b.outstanding - a.outstanding);
  }, [partyLoans]);

  const openRepayFor = (party_id: number) => {
    setForm({
      date: new Date().toISOString().split('T')[0],
      party_id: String(party_id),
      amount: '',
      mode: 'bank',
      bank_name: '',
      cash_handler: '',
      type: 'repayment',
      remarks: '',
    });
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-heading">Party Loans (Given)</h2>
          <p className="text-xs text-heading/60 mt-0.5">Loans given to customers / dealers. Tracked in their ledger and affects capital.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" /> Add Entry
        </button>
      </div>

      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-900/30 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
            <ArrowUpRight className="h-4 w-4" /> Total Disbursed
          </div>
          <p className="mt-1 text-xl font-bold tabular-nums text-amber-800 dark:text-amber-200">{formatINR(totalDisbursed)}</p>
        </div>
        <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50/80 dark:bg-green-900/30 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-green-300">
            <ArrowDownLeft className="h-4 w-4" /> Total Repaid
          </div>
          <p className="mt-1 text-xl font-bold tabular-nums text-green-800 dark:text-green-200">{formatINR(totalRepaid)}</p>
        </div>
        <div className={`rounded-xl border p-4 ${netOutstanding > 0 ? 'border-red-200 dark:border-red-800 bg-red-50/80 dark:bg-red-900/30' : 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-900/30'}`}>
          <p className={`text-xs font-semibold uppercase tracking-wide ${netOutstanding > 0 ? 'text-red-700 dark:text-red-300' : 'text-emerald-700 dark:text-emerald-300'}`}>Net Outstanding</p>
          <p className={`mt-1 text-xl font-bold tabular-nums ${netOutstanding > 0 ? 'text-red-800 dark:text-red-200' : 'text-emerald-800 dark:text-emerald-200'}`}>{formatINR(netOutstanding)}</p>
        </div>
      </div>

      {/* Per-party rollup */}
      {perParty.length > 0 && (
        <div className="card overflow-hidden p-0">
          <div className="border-b border-card-border bg-surface px-4 py-2">
            <h3 className="text-sm font-semibold text-heading">By Party</h3>
            <p className="text-[11px] text-heading/60">Click "Record Repayment" to log a payment received from that party.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-surface text-left text-xs font-medium uppercase tracking-wide text-heading/60">
                  <th className="px-4 py-3">Party</th>
                  <th className="px-4 py-3 text-right">Disbursed (₹)</th>
                  <th className="px-4 py-3 text-right">Repaid (₹)</th>
                  <th className="px-4 py-3 text-right">Outstanding (₹)</th>
                  <th className="px-4 py-3">Last Activity</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border">
                {perParty.map((p) => {
                  const pct = p.disbursed > 0 ? (p.repaid / p.disbursed) * 100 : 0;
                  return (
                    <tr key={p.party_id} className="hover:bg-surface">
                      <td className="px-4 py-3 font-medium">
                        <Link to={`/parties/${p.party_id}`} className="inline-flex items-center gap-1 text-brand-600 hover:underline">
                          {p.party_name} <ExternalLink className="h-3 w-3 opacity-60" />
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-amber-700 dark:text-amber-300">{formatINR(p.disbursed)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <span className="font-semibold text-green-700 dark:text-green-300">{formatINR(p.repaid)}</span>
                        <p className="mt-0.5 text-[10px] text-heading/60">{pct.toFixed(0)}% of disbursed</p>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <span className={p.outstanding > 0 ? 'font-semibold text-red-700 dark:text-red-300' : 'text-emerald-600 dark:text-emerald-400'}>
                          {formatINR(p.outstanding)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-heading/70">{formatDate(p.lastDate)}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => openRepayFor(p.party_id)}
                          className="inline-flex items-center gap-1 rounded bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700"
                        >
                          <ArrowDownLeft className="h-3 w-3" /> Record Repayment
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden p-0">
        {loading ? (
          <p className="px-4 py-8 text-center text-sm text-heading/60">Loading…</p>
        ) : partyLoans.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-heading/60">No party loans recorded yet.</p>
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-surface text-left text-xs font-medium uppercase tracking-wide text-heading/60">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Party</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Amount (₹)</th>
                  <th className="px-4 py-3">Mode</th>
                  <th className="px-4 py-3">Remarks</th>
                  {isAdmin && <th className="px-4 py-3"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border">
                {pg.pageData.map((l) => (
                  <tr key={l.id} className="hover:bg-surface">
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(l.date)}</td>
                    <td className="px-4 py-3 font-medium text-heading">{l.party_name}</td>
                    <td className="px-4 py-3">
                      {l.type === 'disbursement' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/40 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200">
                          <ArrowUpRight className="h-3 w-3" /> Disbursed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/40 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:text-green-200">
                          <ArrowDownLeft className="h-3 w-3" /> Repaid
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">
                      <span className={l.type === 'disbursement' ? 'text-amber-700 dark:text-amber-300' : 'text-green-700 dark:text-green-300'}>
                        {formatINR(l.amount)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-heading/70 capitalize">
                      {l.mode}
                      {l.mode === 'bank' && l.bank_name ? ` — ${l.bank_name}` : ''}
                      {l.mode === 'cash' && l.cash_handler ? ` — ${l.cash_handler}` : ''}
                    </td>
                    <td className="px-4 py-3 text-heading/70 max-w-[150px] truncate">{l.remarks || '—'}</td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => openEditEntry(l)} className="rounded p-1.5 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/30" title="Edit">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => handleDelete(l.id)} className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30" title="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationBar pg={pg} />
          </>
        )}
      </div>

      {/* Add Entry Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-card p-6 shadow-xl">
            <h3 className="mb-4 text-base font-semibold text-heading">{editId != null ? 'Edit Party Loan Entry' : 'Add Party Loan Entry'}</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-heading/70">Date *</label>
                <input type="date" className="input-field w-full" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-heading/70">Type *</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, type: 'disbursement' }))}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${form.type === 'disbursement' ? 'border-amber-400 bg-amber-500 text-white' : 'border-card-border bg-card text-heading/80 hover:bg-surface'}`}
                  >
                    Disbursement
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, type: 'repayment' }))}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${form.type === 'repayment' ? 'border-green-400 bg-green-500 text-white' : 'border-card-border bg-card text-heading/80 hover:bg-surface'}`}
                  >
                    Repayment
                  </button>
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-heading/70">Party *</label>
                <select className="input-field w-full" value={form.party_id} onChange={(e) => setForm((p) => ({ ...p, party_id: e.target.value }))}>
                  <option value="">Select party</option>
                  {parties.map((p) => (
                    <option key={p.id} value={p.id}>{(p as any).name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-heading/70">Amount (₹) *</label>
                <input type="number" min={0} step={0.01} className="input-field w-full" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-heading/70">Mode *</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setForm((p) => ({ ...p, mode: 'bank' }))}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${form.mode === 'bank' ? 'border-brand-500 bg-brand-500 text-white' : 'border-card-border bg-card text-heading/80 hover:bg-surface'}`}>
                    Bank
                  </button>
                  <button type="button" onClick={() => setForm((p) => ({ ...p, mode: 'cash' }))}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${form.mode === 'cash' ? 'border-brand-500 bg-brand-500 text-white' : 'border-card-border bg-card text-heading/80 hover:bg-surface'}`}>
                    Cash
                  </button>
                </div>
              </div>
              {form.mode === 'bank' ? (
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-heading/70">Bank</label>
                  <select className="input-field w-full" value={form.bank_name} onChange={(e) => setForm((p) => ({ ...p, bank_name: e.target.value }))}>
                    <option value="">Select bank</option>
                    {banks.map((b) => <option key={b.bank_name} value={b.bank_name}>{b.bank_name}</option>)}
                  </select>
                </div>
              ) : (
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-heading/70">Cash Handler *</label>
                  <select className="input-field w-full" value={form.cash_handler} onChange={(e) => setForm((p) => ({ ...p, cash_handler: e.target.value }))}>
                    <option value="">Select handler</option>
                    {handlers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              )}
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-heading/70">Remarks</label>
                <input type="text" className="input-field w-full" value={form.remarks} onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))} />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2 border-t border-card-border pt-4">
              <button type="button" onClick={closeForm} className="btn-secondary">Cancel</button>
              <button type="button" onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Business Loans Section ───────────────────────────────────────────────────

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
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const isAdmin = useAuthStore((s) => s.isAdmin());
  const [loans, setLoans] = useState<Loan[]>([]);
  const [repaymentSummary, setRepaymentSummary] = useState<Record<number, { count: number; total: number }>>({});
  const [partyLoanNet, setPartyLoanNet] = useState(0);
  const [banks, setBanks] = useState<{ bank_name: string }[]>([]);
  const [cashHandlers, setCashHandlers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [paidThisMonth, setPaidThisMonth] = useState<{ total_paid: number; count: number } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editLoan, setEditLoan] = useState<Loan | null>(null);
  const [form, setForm] = useState(emptyForm);

  // Repayment modal
  const [repayLoan, setRepayLoan] = useState<Loan | null>(null);
  const [repayForm, setRepayForm] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    mode: 'bank' as 'bank' | 'cash',
    bank_name: '',
    cash_handler: '',
    remarks: '',
  });
  const [repaySaving, setRepaySaving] = useState(false);
  const [repayHistory, setRepayHistory] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, summary, partyLoans, bks, handlers] = await Promise.all([
        api.loans.list(),
        api.loanRepayments.summary(),
        api.partyLoans.list(),
        api.capital.banks(),
        api.imprest.handlers(),
      ]);
      setLoans(r as Loan[]);
      const map: Record<number, { count: number; total: number }> = {};
      summary.forEach((s) => { map[s.loan_id] = { count: s.count, total: Number(s.total_repaid) }; });
      setRepaymentSummary(map);
      const net = (partyLoans as any[]).reduce((acc, l) => acc + (l.type === 'disbursement' ? l.amount : -l.amount), 0);
      setPartyLoanNet(net);
      setBanks(bks as any[]);
      setCashHandlers((handlers as any[]).map((h: any) => h.handler_name));
    } catch {
      addToast('Failed to load loans', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const openRepay = async (loan: Loan) => {
    setRepayLoan(loan);
    setRepayForm({
      date: new Date().toISOString().split('T')[0],
      amount: loan.emi_amount != null ? String(loan.emi_amount) : '',
      mode: 'bank',
      bank_name: '',
      cash_handler: '',
      remarks: '',
    });
    try {
      const history = await api.loanRepayments.list(loan.id);
      setRepayHistory(history);
    } catch { setRepayHistory([]); }
  };

  const closeRepay = () => {
    setRepayLoan(null);
    setRepayHistory([]);
  };

  const saveRepayment = async () => {
    if (!repayLoan) return;
    const amt = parseFloat(repayForm.amount);
    if (!repayForm.date || !(amt > 0)) {
      addToast('Date and amount > 0 are required', 'error');
      return;
    }
    if (repayForm.mode === 'cash' && !repayForm.cash_handler) {
      addToast('Select a cash handler', 'error');
      return;
    }
    setRepaySaving(true);
    try {
      await api.loanRepayments.create({
        loan_id: repayLoan.id,
        date: repayForm.date,
        amount: amt,
        mode: repayForm.mode,
        bank_name: repayForm.mode === 'bank' ? repayForm.bank_name || null : null,
        cash_handler: repayForm.mode === 'cash' ? repayForm.cash_handler || null : null,
        remarks: repayForm.remarks.trim() || null,
      });
      addToast('Repayment recorded', 'success');
      closeRepay();
      load();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally {
      setRepaySaving(false);
    }
  };

  const deleteRepayment = async (id: number) => {
    if (!window.confirm('Delete this repayment? Outstanding will be restored.')) return;
    try {
      await api.loanRepayments.delete(id);
      addToast('Repayment deleted', 'success');
      if (repayLoan) {
        const history = await api.loanRepayments.list(repayLoan.id);
        setRepayHistory(history);
      }
      load();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Delete failed', 'error');
    }
  };

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!filterMonth) { setPaidThisMonth(null); return; }
    api.loanRepayments.monthlyPaid(filterMonth).then(setPaidThisMonth).catch(() => {});
  }, [filterMonth]);

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
  const loanPg = usePagination(loans, 20);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-heading">Finance &amp; Loans</h1>
        <p className="mt-1 text-sm text-heading/60">Track principal debt, EMI obligations, and interest.</p>
      </header>

      {/* Month filter */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm font-medium text-heading/70 whitespace-nowrap">Month:</label>
        <MonthPicker value={filterMonth} onChange={setFilterMonth} />
        {filterMonth && (
          <button
            type="button"
            onClick={() => setFilterMonth('')}
            className="text-sm text-brand-600 hover:underline font-medium whitespace-nowrap"
          >
            All time
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50/80 dark:bg-red-900/30 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-300">Total Loan Principal</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-red-800 dark:text-red-200">{formatINR(totalPrincipal)}</p>
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{loans.length} loan{loans.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50/80 dark:bg-orange-900/30 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-700 dark:text-orange-300">Outstanding Principal</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-orange-800 dark:text-orange-200">{formatINR(totalOutstanding)}</p>
          <p className="mt-1 text-xs text-orange-600 dark:text-orange-400">Remaining to be repaid</p>
        </div>
        <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-900/30 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">Monthly EMI Obligation</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-blue-800 dark:text-blue-200">{formatINR(totalMonthlyEMI)}</p>
          <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">Sum of all EMIs</p>
        </div>
        <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50/80 dark:bg-green-900/30 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-green-300">
            EMI Paid {filterMonth ? `— ${new Date(filterMonth + '-01').toLocaleString('en-IN', { month: 'short', year: 'numeric' })}` : '— All time'}
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-green-800 dark:text-green-200">
            {paidThisMonth != null ? formatINR(paidThisMonth.total_paid) : filterMonth ? '…' : '—'}
          </p>
          <p className="mt-1 text-xs text-green-600 dark:text-green-400">
            {paidThisMonth ? `${paidThisMonth.count} payment${paidThisMonth.count !== 1 ? 's' : ''}` : 'Actual EMI repayments'}
          </p>
        </div>
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-900/30 p-5">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
            <IndianRupee className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-wide">Loans Given (Outstanding)</p>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums text-amber-800 dark:text-amber-200">{formatINR(partyLoanNet)}</p>
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">Net of party disbursements − repayments</p>
        </div>
      </div>

      {/* EMI Calculator */}
      <EMICalculator />

      {/* Loans table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-heading">Loan register</h2>
            <p className="text-xs text-heading/60 mt-0.5">Double-click a row (or click the Repaid amount) to open the repayment ledger and delete past payments.</p>
          </div>
          <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700">
            <Plus className="h-4 w-4" /> Add Loan
          </button>
        </div>

        <div className="card overflow-hidden p-0">
          {loading ? (
            <p className="px-4 py-8 text-center text-sm text-heading/60">Loading…</p>
          ) : loans.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-heading/60">No loans recorded yet. Click "Add Loan" to start.</p>
          ) : (
            <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-surface text-left text-xs font-medium uppercase tracking-wide text-heading/60">
                    <th className="px-4 py-3">Lender</th>
                    <th className="px-4 py-3 text-right">Principal (₹)</th>
                    <th className="px-4 py-3 text-right">Outstanding (₹)</th>
                    <th className="px-4 py-3 text-right">Repaid (₹)</th>
                    <th className="px-4 py-3 text-right">Rate (%)</th>
                    <th className="px-4 py-3 text-right">EMI (₹/mo)</th>
                    <th className="px-4 py-3">Start Date</th>
                    <th className="px-4 py-3 text-right">Tenure (mo)</th>
                    <th className="px-4 py-3">Remarks</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border">
                  {loanPg.pageData.map((loan) => {
                    const outstanding = loan.outstanding_principal ?? loan.principal;
                    const repaidInfo = repaymentSummary[loan.id];
                    const repaidTotal = repaidInfo?.total ?? 0;
                    const repaidCount = repaidInfo?.count ?? 0;
                    const repaidPct = loan.principal > 0 ? (repaidTotal / loan.principal) * 100 : 0;
                    const pct = loan.principal > 0 ? (outstanding / loan.principal) * 100 : 0;
                    return (
                      <tr
                        key={loan.id}
                        className="cursor-pointer hover:bg-surface"
                        onDoubleClick={() => openRepay(loan)}
                        title="Double-click to view repayment history"
                      >
                        <td className="px-4 py-3 font-medium text-heading">{loan.lender_name}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatINR(loan.principal)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          <span className={outstanding > 0 ? 'font-semibold text-red-700 dark:text-red-300' : 'text-green-600 dark:text-green-400'}>
                            {formatINR(outstanding)}
                          </span>
                          <div className="mt-1 h-1.5 w-full rounded-full bg-card-border/60">
                            <div className="h-1.5 rounded-full bg-red-400" style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {repaidCount > 0 ? (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); openRepay(loan); }}
                              className="ml-auto block text-right hover:underline"
                              title="View / delete repayments"
                            >
                              <span className="font-semibold text-green-700 dark:text-green-300">{formatINR(repaidTotal)}</span>
                              <p className="mt-0.5 text-[10px] text-heading/60">{repaidCount} payment{repaidCount === 1 ? '' : 's'} • {repaidPct.toFixed(0)}% · view</p>
                            </button>
                          ) : (
                            <>
                              <span className="font-semibold text-green-700 dark:text-green-300">{formatINR(repaidTotal)}</span>
                              <p className="mt-0.5 text-[10px] text-heading/60">No payments yet</p>
                            </>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{loan.interest_rate.toFixed(2)}%</td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium text-blue-700 dark:text-blue-300">
                          {loan.emi_amount != null ? formatINR(loan.emi_amount) : '—'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{formatDate(loan.start_date)}</td>
                        <td className="px-4 py-3 text-right">{loan.tenure_months ?? '—'}</td>
                        <td className="px-4 py-3 max-w-[150px] truncate text-heading/70">{loan.remarks || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openRepay(loan)}
                              className="inline-flex items-center gap-1 rounded bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700"
                              title="Record repayment"
                            >
                              <ArrowDownLeft className="h-3 w-3" /> Repay
                            </button>
                            <button type="button" onClick={() => openEdit(loan)} className="rounded p-1.5 text-brand-600 hover:bg-brand-50"><Pencil className="h-3.5 w-3.5" /></button>
                            {hasPermission('delete_loans') && (
                              <button type="button" onClick={() => handleDelete(loan.id)} className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"><Trash2 className="h-3.5 w-3.5" /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <PaginationBar pg={loanPg} />
            </>
          )}
        </div>
      </div>

      {/* Party Loans Section */}
      <PartyLoansSection />

      {/* Add/Edit form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-card p-6 shadow-xl overflow-y-auto max-h-[90vh]">
            <h3 className="mb-5 text-base font-semibold text-heading">{editLoan ? 'Edit Loan' : 'Add Loan'}</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-heading/70">Lender Name *</label>
                <input type="text" className="input-field w-full" placeholder="e.g. HDFC Bank, Kotak" value={form.lender_name} onChange={(e) => setForm((p) => ({ ...p, lender_name: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-heading/70">Principal Amount (₹) *</label>
                <input type="number" min={0} step={0.01} className="input-field w-full" value={form.principal} onChange={(e) => setForm((p) => ({ ...p, principal: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-heading/70">Outstanding Principal (₹)</label>
                <input type="number" min={0} step={0.01} className="input-field w-full" placeholder="Defaults to principal if empty" value={form.outstanding_principal} onChange={(e) => setForm((p) => ({ ...p, outstanding_principal: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-heading/70">Annual Interest Rate (%) *</label>
                <input type="number" min={0} step={0.1} className="input-field w-full" placeholder="e.g. 12.5" value={form.interest_rate} onChange={(e) => setForm((p) => ({ ...p, interest_rate: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-heading/70">Tenure (months)</label>
                <input type="number" min={1} step={1} className="input-field w-full" placeholder="e.g. 60" value={form.tenure_months} onChange={(e) => setForm((p) => ({ ...p, tenure_months: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-heading/70">EMI Amount (₹/month)</label>
                <input type="number" min={0} step={0.01} className="input-field w-full" placeholder="Auto-calculated if empty" value={form.emi_amount} onChange={(e) => setForm((p) => ({ ...p, emi_amount: e.target.value }))} />
                {form.principal && form.interest_rate && form.tenure_months && !form.emi_amount && (
                  <p className="mt-1 text-xs text-brand-600">
                    Computed EMI: {formatINR(calcEMI(parseFloat(form.principal) || 0, parseFloat(form.interest_rate) || 0, parseInt(form.tenure_months) || 1))}
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-heading/70">Start Date *</label>
                <input type="date" className="input-field w-full" value={form.start_date} onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-heading/70">Remarks</label>
                <textarea rows={2} className="input-field w-full resize-y" value={form.remarks} onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))} />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2 border-t border-card-border pt-4">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-heading/80 hover:bg-surface">Cancel</button>
              <button type="button" onClick={handleSave} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Repayment modal */}
      {repayLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-card p-6 shadow-xl overflow-y-auto max-h-[90vh]">
            <h3 className="mb-1 text-base font-semibold text-heading">Record Repayment</h3>
            <p className="mb-4 text-xs text-heading/60">
              {repayLoan.lender_name} • Outstanding {formatINR(repayLoan.outstanding_principal ?? repayLoan.principal)}
            </p>
            {(() => {
              const outstandingAmt = Number(repayLoan.outstanding_principal ?? repayLoan.principal) || 0;
              const minAmt = Math.min(Number(repayLoan.emi_amount) || 0, outstandingAmt);
              const maxAmt = outstandingAmt;
              const currentAmt = Number(repayForm.amount) || 0;
              return (
                <div className="mb-5 rounded-lg border border-card-border bg-surface/50 p-4">
                  <p className="mb-3 text-xs font-medium text-heading/70">Drag the dial — min one EMI ({formatINR(minAmt)}), max full outstanding ({formatINR(maxAmt)}).</p>
                  <RepaymentDial
                    value={currentAmt}
                    min={minAmt}
                    max={maxAmt}
                    onChange={(v) => setRepayForm((p) => ({ ...p, amount: String(v) }))}
                  />
                </div>
              );
            })()}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-heading/70">Date *</label>
                <input type="date" className="input-field w-full" value={repayForm.date} onChange={(e) => setRepayForm((p) => ({ ...p, date: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-heading/70">Amount (₹) *</label>
                <input type="number" min={0} step={0.01} className="input-field w-full" value={repayForm.amount} onChange={(e) => setRepayForm((p) => ({ ...p, amount: e.target.value }))} />
                <p className="mt-1 text-[11px] text-heading/50">Reduces outstanding principal and debits cash/bank.</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-heading/70">Mode *</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setRepayForm((p) => ({ ...p, mode: 'bank' }))}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${repayForm.mode === 'bank' ? 'border-brand-500 bg-brand-500 text-white' : 'border-card-border bg-card text-heading/80 hover:bg-surface'}`}>
                    Bank
                  </button>
                  <button type="button" onClick={() => setRepayForm((p) => ({ ...p, mode: 'cash' }))}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${repayForm.mode === 'cash' ? 'border-brand-500 bg-brand-500 text-white' : 'border-card-border bg-card text-heading/80 hover:bg-surface'}`}>
                    Cash
                  </button>
                </div>
              </div>
              {repayForm.mode === 'bank' ? (
                <div>
                  <label className="mb-1 block text-xs font-medium text-heading/70">Bank</label>
                  <select className="input-field w-full" value={repayForm.bank_name} onChange={(e) => setRepayForm((p) => ({ ...p, bank_name: e.target.value }))}>
                    <option value="">Select bank</option>
                    {banks.map((b) => <option key={b.bank_name} value={b.bank_name}>{b.bank_name}</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="mb-1 block text-xs font-medium text-heading/70">Cash Handler *</label>
                  <select className="input-field w-full" value={repayForm.cash_handler} onChange={(e) => setRepayForm((p) => ({ ...p, cash_handler: e.target.value }))}>
                    <option value="">Select handler</option>
                    {cashHandlers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              )}
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-heading/70">Remarks</label>
                <input type="text" className="input-field w-full" value={repayForm.remarks} onChange={(e) => setRepayForm((p) => ({ ...p, remarks: e.target.value }))} />
              </div>
            </div>

            {repayHistory.length > 0 && (
              <div className="mt-5 border-t border-card-border pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-heading/70">Repayment History ({repayHistory.length})</p>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-card-border">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="bg-surface text-left text-heading/60">
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2 text-right">Amount</th>
                        <th className="px-3 py-2">Mode</th>
                        <th className="px-3 py-2">Remarks</th>
                        {isAdmin && <th className="px-3 py-2"></th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-card-border">
                      {repayHistory.map((r) => (
                        <tr key={r.id}>
                          <td className="px-3 py-2 whitespace-nowrap">{formatDate(r.date)}</td>
                          <td className="px-3 py-2 text-right tabular-nums font-medium text-green-700 dark:text-green-300">{formatINR(r.amount)}</td>
                          <td className="px-3 py-2 capitalize">{r.mode}{r.bank_name ? ` — ${r.bank_name}` : ''}</td>
                          <td className="px-3 py-2 text-heading/70">{r.remarks || '—'}</td>
                          {isAdmin && (
                            <td className="px-3 py-2">
                              <button type="button" onClick={() => deleteRepayment(r.id)} className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2 border-t border-card-border pt-4">
              <button type="button" onClick={closeRepay} className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-heading/80 hover:bg-surface">Close</button>
              <button type="button" onClick={saveRepayment} disabled={repaySaving} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
                {repaySaving ? 'Saving…' : 'Save Repayment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
