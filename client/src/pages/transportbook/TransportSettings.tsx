import { useEffect, useState } from 'react';
import { Truck, Lock } from 'lucide-react';
import { api } from '../../lib/api';
import { useToastStore, useAuthStore } from '../../lib/store';

const TRANSPORT_FIELDS: { key: string; label: string; help: string }[] = [
  {
    key: 'handling_non_trade_per_mt',
    label: 'Non-Trade Handling (₹ / MT)',
    help: 'Added to the party bill when Material Type is Non-Trade.',
  },
  {
    key: 'handling_sow_per_mt',
    label: 'SOW Handling (₹ / MT)',
    help: 'Added to the party bill when Material Type is SOW.',
  },
  {
    key: 'bilty_per_mt',
    label: 'Bilty Charge (₹ / MT)',
    help: 'Deducted from the truck owner\'s final payment on every trip.',
  },
  {
    key: 'gps_rent_monthly',
    label: 'GPS Rent (₹ / month)',
    help: 'Auto-debited on the 1st of each month from every active truck owner\'s ledger.',
  },
];

export default function TransportSettings() {
  const addToast = useToastStore((s) => s.addToast);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canEdit = isAdmin() || hasPermission('manage_transport_rates');

  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const data = await api.settings.list();
      setValues(data);
    } catch (e: any) {
      addToast(e.message || 'Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (key: string) => {
    const v = values[key];
    if (v === undefined || v === '' || Number.isNaN(Number(v)) || Number(v) < 0) {
      addToast('Enter a valid non-negative number', 'error');
      return;
    }
    setSaving(key);
    try {
      await api.settings.update(key, Number(v));
      addToast('Saved', 'success');
    } catch (e: any) {
      addToast(e.message || 'Save failed', 'error');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-heading">Transport Rates</h1>
        <p className="mt-1 text-sm text-heading/60">
          Global per-MT and per-month rates used in Trip calculations and GPS rent auto-debit.
        </p>
      </div>

      <div className="card">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Truck className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-heading">Charges & Fees</h2>
            <p className="mt-1 text-sm text-heading/60">
              These rates flow into every trip in the Trip Log and into the monthly GPS rent debits across all active trucks.
            </p>
            {!canEdit && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                <Lock className="h-3.5 w-3.5" />
                You have read-only access. Ask an admin to grant "Manage Transport Rates" to edit.
              </div>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-sm text-heading/50">Loading...</div>
      ) : (
        <div className="card divide-y divide-card-border p-0">
          {TRANSPORT_FIELDS.map((f) => (
            <div key={f.key} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <label className="block text-sm font-medium text-heading">{f.label}</label>
                <p className="mt-0.5 text-xs text-heading/60">{f.help}</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="input-field w-32 disabled:opacity-60 disabled:cursor-not-allowed"
                  value={values[f.key] ?? ''}
                  onChange={(e) => setValues((p) => ({ ...p, [f.key]: e.target.value }))}
                  disabled={!canEdit}
                />
                <button
                  type="button"
                  onClick={() => handleSave(f.key)}
                  disabled={!canEdit || saving === f.key}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving === f.key ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
