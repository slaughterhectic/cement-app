import { useCallback, useEffect, useState } from 'react';
import { Eye, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useToastStore } from '../../lib/store';

interface TruckInfo {
  id: number;
  truck_number: string;
  driver_name: string | null;
  is_active: number;
}

interface OwnerRow {
  name: string;
  truck_count: number;
  active_truck_count: number;
  trip_count: number;
  owner_phone: string | null;
  bank_account: string | null;
  ifsc_code: string | null;
  beneficiary_name: string | null;
  pan_number: string | null;
  trucks: TruckInfo[];
}

function maskAccount(account: string | null): string {
  if (!account) return '—';
  if (account.length <= 4) return account;
  return '*'.repeat(account.length - 4) + account.slice(-4);
}

export default function TransportOwners() {
  const navigate = useNavigate();
  const addToast = useToastStore((s) => s.addToast);
  const [rows, setRows] = useState<OwnerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.rlOwners.list();
      setRows(data);
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to load owners', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  const filtered = search.trim()
    ? rows.filter((r) => {
        const q = search.trim().toLowerCase();
        return (
          r.name.toLowerCase().includes(q) ||
          r.trucks.some((t) => t.truck_number.toLowerCase().includes(q))
        );
      })
    : rows;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading">Owners</h1>
          <p className="text-sm text-heading/60 mt-1">
            {rows.length} owner{rows.length !== 1 ? 's' : ''} — click to view their aggregated ledger
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/transportbook/trucks')}
          className="inline-flex items-center gap-2 rounded-lg border border-indigo-300 bg-card px-4 py-2.5 text-sm font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
        >
          <Truck className="h-4 w-4" />
          Manage Trucks
        </button>
      </div>

      <div className="card p-4">
        <input
          className="input-field"
          placeholder="Search by owner name or truck number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-card-border bg-indigo-50 dark:bg-indigo-900/30 text-left">
                <th className="px-4 py-3 font-medium text-indigo-700 dark:text-indigo-300">Owner Name</th>
                <th className="px-4 py-3 font-medium text-indigo-700 dark:text-indigo-300">Trucks</th>
                <th className="px-4 py-3 font-medium text-indigo-700 dark:text-indigo-300">Phone</th>
                <th className="px-4 py-3 font-medium text-indigo-700 dark:text-indigo-300">Bank A/C</th>
                <th className="px-4 py-3 font-medium text-indigo-700 dark:text-indigo-300">PAN</th>
                <th className="px-4 py-3 font-medium text-indigo-700 dark:text-indigo-300 text-right">Trips</th>
                <th className="px-4 py-3 font-medium text-indigo-700 dark:text-indigo-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-heading/50">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-heading/50">
                  {rows.length === 0 ? 'No owners yet. Add trucks first.' : 'No owners match your search.'}
                </td></tr>
              ) : (
                filtered.map((row) => (
                  <tr
                    key={row.name}
                    className="border-b border-card-border last:border-0 hover:bg-indigo-50/40 dark:hover:bg-indigo-900/30 transition-colors cursor-pointer"
                    onClick={() => navigate(`/transportbook/owners/${encodeURIComponent(row.name)}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-indigo-600 dark:text-indigo-400">{row.name}</div>
                      {row.beneficiary_name && row.beneficiary_name !== row.name && (
                        <div className="text-xs text-heading/60">Beneficiary: {row.beneficiary_name}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {row.trucks.map((t) => (
                          <span
                            key={t.id}
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              t.is_active
                                ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                                : 'bg-surface text-heading/50 line-through'
                            }`}
                            title={t.driver_name || ''}
                          >
                            {t.truck_number}
                          </span>
                        ))}
                      </div>
                      <div className="text-xs text-heading/50 mt-1">
                        {row.active_truck_count}/{row.truck_count} active
                      </div>
                    </td>
                    <td className="px-4 py-3 text-heading/70">{row.owner_phone || '—'}</td>
                    <td className="px-4 py-3 text-heading/70 font-mono text-xs">{maskAccount(row.bank_account)}</td>
                    <td className="px-4 py-3 text-heading/70">{row.pan_number || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                        {row.trip_count}
                      </span>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => navigate(`/transportbook/owners/${encodeURIComponent(row.name)}`)}
                        className="inline-flex items-center gap-1 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 transition-colors"
                        title="View Ledger"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Ledger
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
