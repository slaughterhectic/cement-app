import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Circle, Plus, Trash2, X, RotateCcw, MessageSquarePlus, Clock } from 'lucide-react';
import { api } from '../lib/api';
import { useToastStore, useAuthStore } from '../lib/store';

interface Request {
  id: number;
  title: string;
  message: string | null;
  status: 'pending' | 'completed';
  created_by: number;
  created_by_name: string;
  completed_by: number | null;
  completed_by_name: string | null;
  completed_at: string | null;
  admin_note: string | null;
  created_at: string;
}

function formatDateTime(ts: string) {
  const d = new Date(ts);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export default function Requests() {
  const addToast = useToastStore((s) => s.addToast);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const user = useAuthStore((s) => s.user);

  const [rows, setRows] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // New request modal
  const [newOpen, setNewOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [saving, setSaving] = useState(false);

  // Complete modal (admin)
  const [completeTarget, setCompleteTarget] = useState<Request | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [completing, setCompleting] = useState(false);

  // Detail view
  const [detail, setDetail] = useState<Request | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await api.requests.list());
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to load requests', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setSaving(true);
    try {
      await api.requests.create({ title: newTitle.trim(), message: newMessage.trim() || undefined });
      addToast('Request submitted', 'success');
      setNewOpen(false);
      setNewTitle('');
      setNewMessage('');
      load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed', 'error');
    } finally { setSaving(false); }
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completeTarget) return;
    setCompleting(true);
    try {
      await api.requests.complete(completeTarget.id, adminNote.trim() || undefined);
      addToast('Marked as completed', 'success');
      setCompleteTarget(null);
      setAdminNote('');
      load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed', 'error');
    } finally { setCompleting(false); }
  };

  const handleReopen = async (r: Request) => {
    try {
      await api.requests.reopen(r.id);
      addToast('Request reopened', 'success');
      load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed', 'error');
    }
  };

  const handleDelete = async (r: Request) => {
    if (!window.confirm(`Delete request "${r.title}"?`)) return;
    try {
      await api.requests.delete(r.id);
      addToast('Deleted', 'success');
      load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed', 'error');
    }
  };

  const filtered = rows.filter((r) => filter === 'all' || r.status === filter);
  const pendingCount = rows.filter((r) => r.status === 'pending').length;
  const completedCount = rows.filter((r) => r.status === 'completed').length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading">Requests</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isAdmin() ? 'Manage team requests' : 'Raise a request to admin'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setNewOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Request
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`card p-4 text-left transition-all ${filter === 'all' ? 'ring-2 ring-brand-500' : 'hover:shadow-md'}`}
        >
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Total</p>
          <p className="text-2xl font-bold text-heading mt-1">{rows.length}</p>
        </button>
        <button
          type="button"
          onClick={() => setFilter('pending')}
          className={`card p-4 text-left transition-all ${filter === 'pending' ? 'ring-2 ring-amber-400' : 'hover:shadow-md'}`}
        >
          <p className="text-xs font-medium uppercase tracking-wider text-amber-600">Pending</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{pendingCount}</p>
        </button>
        <button
          type="button"
          onClick={() => setFilter('completed')}
          className={`card p-4 text-left transition-all ${filter === 'completed' ? 'ring-2 ring-green-500' : 'hover:shadow-md'}`}
        >
          <p className="text-xs font-medium uppercase tracking-wider text-green-600">Completed</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{completedCount}</p>
        </button>
      </div>

      {/* List */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 flex flex-col items-center gap-3 text-center">
            <MessageSquarePlus className="h-10 w-10 text-gray-300" />
            <p className="text-gray-400">
              {filter !== 'all' ? `No ${filter} requests` : 'No requests yet'}
            </p>
            <button
              type="button"
              onClick={() => setNewOpen(true)}
              className="text-brand-500 hover:underline text-sm font-medium"
            >
              Raise a request
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-card-border">
            {filtered.map((r) => (
              <li
                key={r.id}
                className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => setDetail(r)}
              >
                {/* Status icon */}
                <div className="mt-0.5 shrink-0">
                  {r.status === 'completed' ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <Clock className="h-5 w-5 text-amber-500" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-heading text-sm">{r.title}</span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      r.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {r.status === 'completed' ? 'Completed' : 'Pending'}
                    </span>
                  </div>
                  {r.message && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{r.message}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-400">
                    <span>By {r.created_by_name}</span>
                    <span>·</span>
                    <span>{formatDateTime(r.created_at)}</span>
                    {r.status === 'completed' && r.completed_by_name && (
                      <>
                        <span>·</span>
                        <span className="text-green-600">Done by {r.completed_by_name}</span>
                      </>
                    )}
                  </div>
                  {r.admin_note && (
                    <p className="mt-1.5 text-xs text-gray-600 bg-gray-100 rounded px-2 py-1 italic">
                      Admin note: {r.admin_note}
                    </p>
                  )}
                </div>

                {/* Actions — stop propagation so row click doesn't fire */}
                {isAdmin() && (
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {r.status === 'pending' ? (
                      <button
                        type="button"
                        onClick={() => { setCompleteTarget(r); setAdminNote(''); }}
                        className="rounded-lg p-1.5 text-green-600 hover:bg-green-50 transition-colors"
                        title="Mark completed"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleReopen(r)}
                        className="rounded-lg p-1.5 text-amber-500 hover:bg-amber-50 transition-colors"
                        title="Reopen"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(r)}
                      className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* New Request Modal */}
      {newOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40">
          <div className="flex min-h-full items-center justify-center px-4 py-6">
            <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-card-border px-5 py-4">
                <h2 className="font-semibold text-heading">New Request</h2>
                <button type="button" onClick={() => setNewOpen(false)} className="rounded-lg p-1.5 hover:bg-gray-100">
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              <form onSubmit={handleCreate} className="p-5 flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
                  <input
                    autoFocus
                    className="input-field"
                    placeholder="Brief title for your request"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Details</label>
                  <textarea
                    className="input-field resize-none"
                    rows={4}
                    placeholder="Describe what you need or any additional context…"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-3 pt-1">
                  <button type="button" onClick={() => setNewOpen(false)} className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving || !newTitle.trim()} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60">
                    {saving ? 'Submitting…' : 'Submit Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Complete Modal (admin) */}
      {completeTarget && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40">
          <div className="flex min-h-full items-center justify-center px-4 py-6">
            <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-card-border px-5 py-4">
                <h2 className="font-semibold text-heading">Mark as Completed</h2>
                <button type="button" onClick={() => setCompleteTarget(null)} className="rounded-lg p-1.5 hover:bg-gray-100">
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              <form onSubmit={handleComplete} className="p-5 flex flex-col gap-4">
                <div className="rounded-lg bg-gray-50 border border-card-border p-3">
                  <p className="text-sm font-medium text-heading">{completeTarget.title}</p>
                  {completeTarget.message && (
                    <p className="text-xs text-gray-500 mt-1">{completeTarget.message}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">By {completeTarget.created_by_name} · {formatDateTime(completeTarget.created_at)}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Note to user (optional)</label>
                  <textarea
                    autoFocus
                    className="input-field resize-none"
                    rows={3}
                    placeholder="e.g. Done — please check the updated report"
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-3 pt-1">
                  <button type="button" onClick={() => setCompleteTarget(null)} className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={completing} className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60">
                    <CheckCircle2 className="h-4 w-4" />
                    {completing ? 'Saving…' : 'Mark Completed'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/30" onClick={() => setDetail(null)}>
          <div
            className="h-full w-full max-w-sm bg-white shadow-2xl flex flex-col overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-card-border px-5 py-4">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                detail.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {detail.status === 'completed'
                  ? <><CheckCircle2 className="h-3.5 w-3.5" /> Completed</>
                  : <><Clock className="h-3.5 w-3.5" /> Pending</>
                }
              </span>
              <button type="button" onClick={() => setDetail(null)} className="rounded-lg p-1.5 hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <h3 className="text-lg font-semibold text-heading">{detail.title}</h3>
              {detail.message && (
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{detail.message}</p>
              )}
              <div className="flex flex-col gap-1 text-xs text-gray-500 border-t border-card-border pt-4">
                <span>Raised by <strong>{detail.created_by_name}</strong></span>
                <span>On {formatDateTime(detail.created_at)}</span>
              </div>
              {detail.status === 'completed' && (
                <div className="rounded-lg bg-green-50 border border-green-200 p-4 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-green-700 text-xs font-semibold">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Completed by {detail.completed_by_name}
                  </div>
                  {detail.completed_at && (
                    <p className="text-xs text-green-600">{formatDateTime(detail.completed_at)}</p>
                  )}
                  {detail.admin_note && (
                    <p className="text-sm text-green-800 mt-1 italic">"{detail.admin_note}"</p>
                  )}
                </div>
              )}

              {/* Admin actions inside drawer */}
              {isAdmin() && (
                <div className="flex flex-col gap-2 pt-2 border-t border-card-border">
                  {detail.status === 'pending' ? (
                    <button
                      type="button"
                      onClick={() => { setCompleteTarget(detail); setDetail(null); setAdminNote(''); }}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 transition-colors"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Mark as Completed
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { handleReopen(detail); setDetail(null); }}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-300 px-4 py-2.5 text-sm font-medium text-amber-700 hover:bg-amber-50 transition-colors"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reopen
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { handleDelete(detail); setDetail(null); }}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Request
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
