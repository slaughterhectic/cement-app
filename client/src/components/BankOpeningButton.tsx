import { useEffect, useState } from 'react';
import { Landmark } from 'lucide-react';
import { api } from '../lib/api';
import { formatINR } from '../lib/format';
import { useToastStore } from '../lib/store';

type BankBalance = { bank_name: string; opening_balance: number };

/**
 * Opens a small modal to set or update a bank's opening balance.
 *
 * Cr / Dr toggle: Dr stores the amount as a positive opening (cash on hand at the
 * bank), Cr stores it as negative (overdraft / we owe the bank). The same
 * /capital/banks UPSERT endpoint is used; this component is just a UX wrapper that
 * feeds it the right sign and refreshes whichever parent page hosts it.
 */
export function BankOpeningButton({ onSaved, className }: { onSaved?: () => void; className?: string }) {
  const addToast = useToastStore((s) => s.addToast);
  const [open, setOpen] = useState(false);
  const [existing, setExisting] = useState<BankBalance[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    bank_name: '',
    type: 'dr' as 'dr' | 'cr',
    amount: '',
  });

  useEffect(() => {
    if (!open) return;
    setLoadingBanks(true);
    api.capital.banks()
      .then((rows: any[]) => setExisting(rows as BankBalance[]))
      .catch(() => {})
      .finally(() => setLoadingBanks(false));
  }, [open]);

  // If the user picks an existing bank, prefill its current opening so they can see
  // what's there before overwriting.
  useEffect(() => {
    if (!form.bank_name) return;
    const match = existing.find((b) => b.bank_name.toLowerCase() === form.bank_name.toLowerCase());
    if (match) {
      const ob = Number(match.opening_balance);
      setForm((p) => ({
        ...p,
        type: ob < 0 ? 'cr' : 'dr',
        amount: ob === 0 ? '' : String(Math.abs(ob)),
      }));
    }
  }, [form.bank_name, existing]);

  const reset = () => setForm({ bank_name: '', type: 'dr', amount: '' });
  const close = () => { setOpen(false); reset(); };

  const save = async () => {
    if (!form.bank_name.trim()) { addToast('Bank name is required', 'error'); return; }
    const amt = Number(form.amount);
    if (Number.isNaN(amt) || amt < 0) { addToast('Enter a valid amount (≥ 0)', 'error'); return; }
    setSaving(true);
    try {
      await api.capital.upsertBank({
        bank_name: form.bank_name.trim(),
        opening_balance: form.type === 'cr' ? -amt : amt,
      });
      addToast('Bank opening updated', 'success');
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
        className={className ?? 'inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700'}
      >
        <Landmark className="h-4 w-4" /> Bank Opening
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-xl">
            <h3 className="mb-1 text-base font-semibold text-heading">Set Bank Opening Balance</h3>
            <p className="mb-4 text-xs text-heading/60">Updates the bank's opening balance shown on Capital and used in the per-bank running balance. Cr = overdraft / we owe the bank.</p>

            {loadingBanks ? (
              <p className="py-4 text-center text-xs text-heading/60">Loading banks…</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-heading/70">Bank *</label>
                  <input
                    type="text"
                    list="bank-opening-options"
                    className="input-field w-full"
                    placeholder="Type or pick a bank"
                    value={form.bank_name}
                    onChange={(e) => setForm((p) => ({ ...p, bank_name: e.target.value }))}
                  />
                  <datalist id="bank-opening-options">
                    {existing.map((b) => (
                      <option key={b.bank_name} value={b.bank_name}>{`current: ${formatINR(Number(b.opening_balance))}`}</option>
                    ))}
                  </datalist>
                  <p className="mt-1 text-[11px] text-heading/50">Existing bank → updates its opening. New name → creates the bank.</p>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-heading/70">Type *</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, type: 'dr' }))}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${form.type === 'dr' ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-card-border bg-card text-heading/80 hover:bg-surface'}`}
                    >
                      Dr (in our favour)
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, type: 'cr' }))}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${form.type === 'cr' ? 'border-orange-500 bg-orange-500 text-white' : 'border-card-border bg-card text-heading/80 hover:bg-surface'}`}
                    >
                      Cr (overdraft)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-heading/70">Amount (₹) *</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    className="input-field w-full"
                    value={form.amount}
                    onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                  />
                  {form.amount && (
                    <p className="mt-1 text-[11px] text-heading/60">
                      Will set opening to {form.type === 'cr' ? '−' : ''}{formatINR(Number(form.amount) || 0)}.
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2 border-t border-card-border pt-4">
              <button type="button" onClick={close} className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-heading/80 hover:bg-surface">Cancel</button>
              <button type="button" onClick={save} disabled={saving} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                {saving ? 'Saving…' : 'Save Opening'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
