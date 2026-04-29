import { useEffect, useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { api } from '../lib/api';
import { formatINR } from '../lib/format';
import { useToastStore } from '../lib/store';

type BankRow = { bank_name: string; balance: number };

export function BankTransferButton({ onSaved, className }: { onSaved?: () => void; className?: string }) {
  const addToast = useToastStore((s) => s.addToast);
  const [open, setOpen] = useState(false);
  const [banks, setBanks] = useState<BankRow[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    from_bank: '',
    to_bank: '',
    amount: '',
    remarks: '',
  });

  useEffect(() => {
    if (!open) return;
    setLoadingBanks(true);
    // Capital summary returns each bank's running balance — same source the
    // standalone Capital page uses, so the cap stays consistent.
    api.capital.summary()
      .then((s: any) => setBanks((s?.banks ?? []) as BankRow[]))
      .catch(() => addToast('Failed to load bank balances', 'error'))
      .finally(() => setLoadingBanks(false));
  }, [open, addToast]);

  const reset = () => {
    setForm({ date: new Date().toISOString().split('T')[0], from_bank: '', to_bank: '', amount: '', remarks: '' });
  };

  const close = () => { setOpen(false); reset(); };

  const sourceBal = banks.find((b) => b.bank_name === form.from_bank)?.balance ?? 0;
  const amt = Number(form.amount) || 0;
  const overLimit = !!form.from_bank && amt > sourceBal;

  const save = async () => {
    if (!form.date || !form.from_bank || !form.to_bank || !form.amount) {
      addToast('All fields are required', 'error');
      return;
    }
    if (form.from_bank === form.to_bank) {
      addToast('From and To bank must be different', 'error');
      return;
    }
    if (!(amt > 0)) { addToast('Amount must be > 0', 'error'); return; }
    if (amt > sourceBal) {
      addToast(`Cannot transfer more than ${form.from_bank} balance (${formatINR(sourceBal)})`, 'error');
      return;
    }
    setSaving(true);
    try {
      await api.bankTransfers.create({
        date: form.date,
        from_bank: form.from_bank,
        to_bank: form.to_bank,
        amount: amt,
        remarks: form.remarks.trim() || null,
      });
      addToast('Bank transfer recorded', 'success');
      close();
      onSaved?.();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className ?? 'inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700'}
      >
        <ArrowLeftRight className="h-4 w-4" /> Transfer Between Banks
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-card p-6 shadow-xl">
            <h3 className="mb-1 text-base font-semibold text-heading">Transfer Between Banks</h3>
            <p className="mb-4 text-xs text-heading/60">Records an outflow on the source bank and a matching inflow on the destination — total bank balance is unchanged.</p>
            {loadingBanks ? (
              <p className="py-6 text-center text-xs text-heading/60">Loading banks…</p>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-heading/70">Date *</label>
                    <input type="date" className="input-field w-full" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-heading/70">Amount (₹) *</label>
                    <input
                      type="number"
                      min={0}
                      max={form.from_bank ? sourceBal : undefined}
                      step={0.01}
                      className={`input-field w-full ${overLimit ? 'border-red-500 focus:ring-red-500' : ''}`}
                      value={form.amount}
                      onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                    />
                    {form.from_bank ? (
                      overLimit ? (
                        <p className="mt-1 text-[11px] text-red-600">Exceeds available balance ({formatINR(sourceBal)}).</p>
                      ) : (
                        <p className="mt-1 text-[11px] text-heading/50">Max available in {form.from_bank}: {formatINR(sourceBal)}</p>
                      )
                    ) : (
                      <p className="mt-1 text-[11px] text-heading/50">Pick a source bank to see the available balance.</p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-heading/70">From Bank *</label>
                    <select className="input-field w-full" value={form.from_bank} onChange={(e) => setForm((p) => ({ ...p, from_bank: e.target.value }))}>
                      <option value="">Select source bank</option>
                      {banks.map((b) => <option key={b.bank_name} value={b.bank_name}>{b.bank_name} — {formatINR(b.balance)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-heading/70">To Bank *</label>
                    <select className="input-field w-full" value={form.to_bank} onChange={(e) => setForm((p) => ({ ...p, to_bank: e.target.value }))}>
                      <option value="">Select destination bank</option>
                      {banks.filter((b) => b.bank_name !== form.from_bank).map((b) => (
                        <option key={b.bank_name} value={b.bank_name}>{b.bank_name} — {formatINR(b.balance)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-heading/70">Remarks</label>
                    <input type="text" className="input-field w-full" value={form.remarks} onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))} />
                  </div>
                </div>
                <div className="mt-5 flex justify-end gap-2 border-t border-card-border pt-4">
                  <button type="button" onClick={close} className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-heading/80 hover:bg-surface">Cancel</button>
                  <button type="button" onClick={save} disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                    {saving ? 'Saving…' : 'Save Transfer'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
