import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  ClipboardCheck,
  Trash2,
  X,
  XCircle,
  TrendingUp,
  ShoppingCart,
  CreditCard,
  Receipt,
} from 'lucide-react';
import { api } from '../lib/api';
import { useToastStore, useAuthStore } from '../lib/store';
import { formatDate, formatINR } from '../lib/format';

interface PendingEntry {
  id: number;
  entry_type: 'sale' | 'purchase' | 'payment' | 'expense';
  entry_data: Record<string, any>;
  status: 'pending' | 'approved' | 'rejected';
  created_by: number;
  created_by_name: string;
  reviewed_by: number | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  admin_note: string | null;
  created_at: string;
}

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

const TYPE_META: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  sale:     { label: 'Sale',     icon: TrendingUp,  color: 'text-blue-700',   bg: 'bg-blue-100' },
  purchase: { label: 'Purchase', icon: ShoppingCart, color: 'text-violet-700', bg: 'bg-violet-100' },
  payment:  { label: 'Payment',  icon: CreditCard,  color: 'text-green-700',  bg: 'bg-green-100' },
  expense:  { label: 'Expense',  icon: Receipt,     color: 'text-orange-700', bg: 'bg-orange-100' },
};

function formatDateTime(ts: string) {
  const d = new Date(ts);
  return (
    d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  );
}

function EntrySummary({ type, data }: { type: string; data: Record<string, any> }) {
  if (type === 'sale') {
    return (
      <div className="text-sm text-heading/80 space-y-0.5">
        <div><span className="text-heading/60">Party:</span> {data.party_name ?? `ID ${data.party_id}`}</div>
        <div><span className="text-heading/60">Brand:</span> {data.brand_name ?? `ID ${data.brand_id}`}{data.cement_type ? ` (${data.cement_type})` : ''}</div>
        <div><span className="text-heading/60">Bags:</span> {data.bags} @ {formatINR(data.sale_rate)} = <strong>{formatINR(data.bags * data.sale_rate)}</strong></div>
        {data.destination && <div><span className="text-heading/60">Destination:</span> {data.destination}</div>}
        {data.truck_number && <div><span className="text-heading/60">Truck:</span> {data.truck_number}</div>}
        {data.remarks && <div><span className="text-heading/60">Remarks:</span> {data.remarks}</div>}
      </div>
    );
  }
  if (type === 'purchase') {
    return (
      <div className="text-sm text-heading/80 space-y-0.5">
        <div><span className="text-heading/60">Supplier:</span> {data.supplier_name ?? `ID ${data.supplier_id}`}</div>
        <div><span className="text-heading/60">Brand:</span> {data.brand_name ?? `ID ${data.brand_id}`}{data.cement_type ? ` (${data.cement_type})` : ''}</div>
        <div><span className="text-heading/60">Bags:</span> {data.bags} @ {formatINR(data.purchase_rate)}{data.freight_rate ? ` + freight ${formatINR(data.freight_rate)}` : ''} = <strong>{formatINR(data.bags * (Number(data.purchase_rate) + Number(data.freight_rate || 0)))}</strong></div>
        {data.truck_number && <div><span className="text-heading/60">Truck:</span> {data.truck_number}</div>}
        {data.remarks && <div><span className="text-heading/60">Remarks:</span> {data.remarks}</div>}
      </div>
    );
  }
  if (type === 'payment') {
    return (
      <div className="text-sm text-heading/80 space-y-0.5">
        <div><span className="text-heading/60">Party:</span> {data.party_name ?? `ID ${data.party_id}`}</div>
        <div><span className="text-heading/60">Amount:</span> <strong>{formatINR(data.amount)}</strong> ({data.mode})</div>
        <div><span className="text-heading/60">Direction:</span> {data.direction === 'pay' ? 'Pay to supplier' : 'Receive from customer'}</div>
        {data.bank_name && <div><span className="text-heading/60">Bank:</span> {data.bank_name}</div>}
        {data.remarks && <div><span className="text-heading/60">Remarks:</span> {data.remarks}</div>}
      </div>
    );
  }
  if (type === 'expense') {
    return (
      <div className="text-sm text-heading/80 space-y-0.5">
        <div><span className="text-heading/60">Description:</span> {data.description}</div>
        <div><span className="text-heading/60">Amount:</span> <strong>{formatINR(data.amount)}</strong> ({data.mode})</div>
        {data.category && <div><span className="text-heading/60">Category:</span> {data.category}</div>}
        {data.bank_name && <div><span className="text-heading/60">Bank:</span> {data.bank_name}</div>}
      </div>
    );
  }
  return null;
}

export default function PendingApprovals({ source = 'cementbook' }: { source?: 'cementbook' | 'truckbook' }) {
  const addToast = useToastStore((s) => s.addToast);
  const isAdmin = useAuthStore((s) => s.isAdmin)();

  const [rows, setRows] = useState<PendingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('pending');

  // Approve / Reject modals
  const [actionTarget, setActionTarget] = useState<{ entry: PendingEntry; action: 'approve' | 'reject' } | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [actioning, setActioning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await api.pendingEntries.list(source));
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to load', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, source]);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionTarget) return;
    setActioning(true);
    try {
      if (actionTarget.action === 'approve') {
        await api.pendingEntries.approve(actionTarget.entry.id, adminNote.trim() || undefined);
        addToast('Entry approved and recorded', 'success');
      } else {
        await api.pendingEntries.reject(actionTarget.entry.id, adminNote.trim() || undefined);
        addToast('Entry rejected', 'success');
      }
      setActionTarget(null);
      setAdminNote('');
      load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed', 'error');
    } finally {
      setActioning(false);
    }
  };

  const handleDelete = async (entry: PendingEntry) => {
    if (!window.confirm(`Remove this pending ${entry.entry_type} entry?`)) return;
    try {
      await api.pendingEntries.delete(entry.id);
      addToast('Entry removed', 'success');
      load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed', 'error');
    }
  };

  const filtered = rows.filter((r) => filter === 'all' || r.status === filter);
  const pendingCount = rows.filter((r) => r.status === 'pending').length;
  const approvedCount = rows.filter((r) => r.status === 'approved').length;
  const rejectedCount = rows.filter((r) => r.status === 'rejected').length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-heading">Pending Approvals</h1>
        <p className="text-sm text-heading/60 mt-1">
          {isAdmin
            ? 'Review and approve entries submitted by users with non-today dates'
            : 'Track your entries that are awaiting admin approval'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {(
          [
            { key: 'all',      label: 'Total',    count: rows.length,    color: 'text-heading/70',   ring: 'ring-gray-400' },
            { key: 'pending',  label: 'Pending',  count: pendingCount,   color: 'text-amber-600',  ring: 'ring-amber-400' },
            { key: 'approved', label: 'Approved', count: approvedCount,  color: 'text-green-600',  ring: 'ring-green-500' },
            { key: 'rejected', label: 'Rejected', count: rejectedCount,  color: 'text-red-600',    ring: 'ring-red-400' },
          ] as const
        ).map(({ key, label, count, color, ring }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`card p-4 text-left transition-all ${filter === key ? `ring-2 ${ring}` : 'hover:shadow-md'}`}
          >
            <p className={`text-xs font-medium uppercase tracking-wider ${color}`}>{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{count}</p>
          </button>
        ))}
      </div>

      {/* List */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-heading/50 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 flex flex-col items-center gap-3 text-center">
            <ClipboardCheck className="h-10 w-10 text-gray-300" />
            <p className="text-heading/50">
              {filter === 'pending' ? 'No pending entries' : `No ${filter} entries`}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-card-border">
            {filtered.map((entry) => {
              const meta = TYPE_META[entry.entry_type] ?? TYPE_META.sale;
              const Icon = meta.icon;
              return (
                <li key={entry.id} className="px-5 py-4">
                  <div className="flex items-start gap-4">
                    {/* Type icon */}
                    <div className={`mt-0.5 shrink-0 rounded-lg p-2 ${meta.bg}`}>
                      <Icon className={`h-4 w-4 ${meta.color}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Top row */}
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${meta.bg} ${meta.color}`}>
                          {meta.label}
                        </span>
                        <span className="font-medium text-heading text-sm">
                          {formatDate(entry.entry_data.date)}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          entry.status === 'pending'
                            ? 'bg-amber-100 text-amber-700'
                            : entry.status === 'approved'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {entry.status === 'pending'  && <Clock className="h-3 w-3" />}
                          {entry.status === 'approved' && <CheckCircle2 className="h-3 w-3" />}
                          {entry.status === 'rejected' && <XCircle className="h-3 w-3" />}
                          {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                        </span>
                      </div>

                      {/* Entry details */}
                      <EntrySummary type={entry.entry_type} data={entry.entry_data} />

                      {/* Footer meta */}
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-heading/50">
                        <span>Submitted by <strong>{entry.created_by_name}</strong></span>
                        <span>·</span>
                        <span>{formatDateTime(entry.created_at)}</span>
                        {entry.status !== 'pending' && entry.reviewed_by_name && (
                          <>
                            <span>·</span>
                            <span className={entry.status === 'approved' ? 'text-green-600' : 'text-red-600'}>
                              {entry.status === 'approved' ? 'Approved' : 'Rejected'} by {entry.reviewed_by_name}
                            </span>
                          </>
                        )}
                      </div>
                      {entry.admin_note && (
                        <p className="mt-1.5 text-xs text-heading/70 bg-surface rounded px-2 py-1 italic">
                          Note: {entry.admin_note}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {isAdmin && entry.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            onClick={() => { setActionTarget({ entry, action: 'approve' }); setAdminNote(''); }}
                            className="rounded-lg p-1.5 text-green-600 hover:bg-green-50 transition-colors"
                            title="Approve"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => { setActionTarget({ entry, action: 'reject' }); setAdminNote(''); }}
                            className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 transition-colors"
                            title="Reject"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      {(isAdmin || entry.status === 'pending') && (
                        <button
                          type="button"
                          onClick={() => handleDelete(entry)}
                          className="rounded-lg p-1.5 text-heading/50 hover:bg-card-border/50 hover:text-red-400 transition-colors"
                          title="Remove"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Approve / Reject Modal */}
      {actionTarget && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40">
          <div className="flex min-h-full items-center justify-center px-4 py-6">
            <div className="w-full max-w-md rounded-xl bg-card shadow-2xl">
              <div className="flex items-center justify-between border-b border-card-border px-5 py-4">
                <h2 className="font-semibold text-heading">
                  {actionTarget.action === 'approve' ? 'Approve Entry' : 'Reject Entry'}
                </h2>
                <button type="button" onClick={() => setActionTarget(null)} className="rounded-lg p-1.5 hover:bg-card-border/50">
                  <X className="h-5 w-5 text-heading/60" />
                </button>
              </div>
              <form onSubmit={handleAction} className="p-5 flex flex-col gap-4">
                {/* Entry preview */}
                <div className="rounded-lg bg-surface border border-card-border p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${TYPE_META[actionTarget.entry.entry_type]?.bg} ${TYPE_META[actionTarget.entry.entry_type]?.color}`}>
                      {TYPE_META[actionTarget.entry.entry_type]?.label}
                    </span>
                    <span className="text-sm font-medium text-heading">{formatDate(actionTarget.entry.entry_data.date)}</span>
                  </div>
                  <EntrySummary type={actionTarget.entry.entry_type} data={actionTarget.entry.entry_data} />
                  <p className="text-xs text-heading/50 mt-2">By {actionTarget.entry.created_by_name} · {formatDateTime(actionTarget.entry.created_at)}</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-heading/70 mb-1">
                    Note to user (optional)
                  </label>
                  <textarea
                    autoFocus
                    className="input-field resize-none"
                    rows={2}
                    placeholder={actionTarget.action === 'approve' ? 'e.g. Approved — verified with records' : 'e.g. Date mismatch — please re-submit with correct date'}
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-1">
                  <button type="button" onClick={() => setActionTarget(null)} className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-heading/80 hover:bg-surface">
                    Cancel
                  </button>
                  {actionTarget.action === 'approve' ? (
                    <button
                      type="submit"
                      disabled={actioning}
                      className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {actioning ? 'Approving…' : 'Approve'}
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={actioning}
                      className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      <XCircle className="h-4 w-4" />
                      {actioning ? 'Rejecting…' : 'Reject'}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
