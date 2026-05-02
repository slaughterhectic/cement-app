import { useEffect, useState, useCallback, useMemo, Fragment } from 'react';
import { Plus, Trash2, Pencil, Package, TrendingUp, ChevronDown, ChevronRight, PlusCircle } from 'lucide-react';
import { api } from '../lib/api';
import { formatINR, formatDate } from '../lib/format';
import { useAuthStore, useToastStore } from '../lib/store';
import { usePagination, PaginationBar } from '../components/tables/SimplePagination';

interface Asset {
  id: number;
  date: string;
  name: string;
  type: string | null;
  amount: number;
  mode: 'bank' | 'cash';
  bank_name: string | null;
  cash_handler: string | null;
  remarks: string | null;
  topups_total: number;
  topups_count: number;
}

interface AssetTopup {
  id: number;
  asset_id: number;
  date: string;
  amount: number;
  mode: 'bank' | 'cash';
  bank_name: string | null;
  cash_handler: string | null;
  remarks: string | null;
}

const ASSET_TYPES = ['Property', 'Vehicle', 'Equipment', 'Furniture', 'Electronics', 'Financial', 'Other'];

export default function Assets() {
  const addToast = useToastStore((s) => s.addToast);
  const isAdmin = useAuthStore((s) => s.isAdmin());
  const [assets, setAssets] = useState<Asset[]>([]);
  const [banks, setBanks] = useState<{ bank_name: string }[]>([]);
  const [handlers, setHandlers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const emptyForm = {
    date: new Date().toISOString().split('T')[0],
    name: '',
    type: '',
    amount: '',
    mode: 'bank' as 'bank' | 'cash',
    bank_name: '',
    cash_handler: '',
    remarks: '',
  };
  const [form, setForm] = useState(emptyForm);
  const pg = usePagination(assets, 20);

  // Top-up state
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [topups, setTopups] = useState<Record<number, AssetTopup[]>>({});
  const [topupsLoading, setTopupsLoading] = useState<Record<number, boolean>>({});
  const [topupModal, setTopupModal] = useState<{ asset: Asset; topupId: number | null } | null>(null);
  const emptyTopup = {
    date: new Date().toISOString().split('T')[0],
    amount: '',
    mode: 'bank' as 'bank' | 'cash',
    bank_name: '',
    cash_handler: '',
    remarks: '',
  };
  const [topupForm, setTopupForm] = useState(emptyTopup);
  const [topupSaving, setTopupSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, bks, hdl] = await Promise.all([
        api.assets.list(),
        api.capital.banks(),
        api.imprest.handlers(),
      ]);
      setAssets(a);
      setBanks(bks as any[]);
      setHandlers((hdl as any[]).map((h: any) => h.handler_name));
    } catch {
      addToast('Failed to load assets', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  const loadTopups = useCallback(async (assetId: number) => {
    setTopupsLoading((p) => ({ ...p, [assetId]: true }));
    try {
      const rows = await api.assets.topups.list(assetId);
      setTopups((p) => ({ ...p, [assetId]: rows }));
    } catch {
      addToast('Failed to load top-ups', 'error');
    } finally {
      setTopupsLoading((p) => ({ ...p, [assetId]: false }));
    }
  }, [addToast]);

  const toggleExpand = (assetId: number) => {
    if (expandedId === assetId) {
      setExpandedId(null);
    } else {
      setExpandedId(assetId);
      if (!topups[assetId]) loadTopups(assetId);
    }
  };

  const openEdit = (a: Asset) => {
    setEditId(a.id);
    setForm({
      date: a.date,
      name: a.name,
      type: a.type ?? '',
      amount: String(a.amount),
      mode: a.mode,
      bank_name: a.bank_name ?? '',
      cash_handler: a.cash_handler ?? '',
      remarks: a.remarks ?? '',
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    if (!form.date || !form.name || !form.amount) {
      addToast('Date, name and amount are required', 'error');
      return;
    }
    if (form.mode === 'cash' && !form.cash_handler) {
      addToast('Select a cash handler', 'error');
      return;
    }
    const amt = parseFloat(form.amount);
    if (!(amt > 0)) { addToast('Amount must be > 0', 'error'); return; }

    setSaving(true);
    try {
      const payload = {
        date: form.date,
        name: form.name.trim(),
        type: form.type || null,
        amount: amt,
        mode: form.mode,
        bank_name: form.mode === 'bank' ? form.bank_name || null : null,
        cash_handler: form.mode === 'cash' ? form.cash_handler || null : null,
        remarks: form.remarks.trim() || null,
      };
      if (editId != null) {
        await api.assets.update(editId, payload);
        addToast('Asset updated', 'success');
      } else {
        await api.assets.create(payload);
        addToast('Asset recorded', 'success');
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
    if (!window.confirm('Delete this asset entry? All linked top-ups will also be removed and cash/bank balances will be restored.')) return;
    try {
      await api.assets.delete(id);
      addToast('Deleted', 'success');
      load();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Delete failed', 'error');
    }
  };

  // ---- Top-up modal ----

  const openTopupAdd = (asset: Asset) => {
    setTopupModal({ asset, topupId: null });
    setTopupForm(emptyTopup);
  };

  const openTopupEdit = (asset: Asset, t: AssetTopup) => {
    setTopupModal({ asset, topupId: t.id });
    setTopupForm({
      date: t.date,
      amount: String(t.amount),
      mode: t.mode,
      bank_name: t.bank_name ?? '',
      cash_handler: t.cash_handler ?? '',
      remarks: t.remarks ?? '',
    });
  };

  const closeTopup = () => {
    setTopupModal(null);
    setTopupForm(emptyTopup);
  };

  const handleTopupSave = async () => {
    if (!topupModal) return;
    if (!topupForm.date || !topupForm.amount) {
      addToast('Date and amount are required', 'error');
      return;
    }
    if (topupForm.mode === 'cash' && !topupForm.cash_handler) {
      addToast('Select a cash handler', 'error');
      return;
    }
    const amt = parseFloat(topupForm.amount);
    if (!(amt > 0)) { addToast('Amount must be > 0', 'error'); return; }

    setTopupSaving(true);
    try {
      const payload = {
        date: topupForm.date,
        amount: amt,
        mode: topupForm.mode,
        bank_name: topupForm.mode === 'bank' ? topupForm.bank_name || null : null,
        cash_handler: topupForm.mode === 'cash' ? topupForm.cash_handler || null : null,
        remarks: topupForm.remarks.trim() || null,
      };
      if (topupModal.topupId != null) {
        await api.assets.topups.update(topupModal.asset.id, topupModal.topupId, payload);
        addToast('Top-up updated', 'success');
      } else {
        await api.assets.topups.create(topupModal.asset.id, payload);
        addToast('Top-up added', 'success');
      }
      closeTopup();
      await Promise.all([load(), loadTopups(topupModal.asset.id)]);
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally {
      setTopupSaving(false);
    }
  };

  const handleTopupDelete = async (assetId: number, topupId: number) => {
    if (!window.confirm('Delete this top-up? Cash/bank balance will be restored.')) return;
    try {
      await api.assets.topups.delete(assetId, topupId);
      addToast('Top-up deleted', 'success');
      await Promise.all([load(), loadTopups(assetId)]);
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Delete failed', 'error');
    }
  };

  const totalValue = assets.reduce((s, a) => s + a.amount + (a.topups_total || 0), 0);
  const byType = useMemo(() => {
    const map = new Map<string, { type: string; count: number; total: number }>();
    assets.forEach((a) => {
      const t = a.type || 'Other';
      const cur = map.get(t) ?? { type: t, count: 0, total: 0 };
      cur.count += 1;
      cur.total += a.amount + (a.topups_total || 0);
      map.set(t, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [assets]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-heading">Assets</h1>
        <p className="mt-1 text-sm text-heading/60">Investments in property, vehicles, equipment and more. Each entry debits the chosen bank or cash handler. Use Top-Up to add later spend to an existing asset.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50/80 dark:bg-purple-900/30 p-5">
          <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
            <TrendingUp className="h-5 w-5" />
            <p className="text-xs font-semibold uppercase tracking-wide">Total Asset Value</p>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums text-purple-800 dark:text-purple-200">{formatINR(totalValue)}</p>
          <p className="mt-1 text-xs text-purple-600 dark:text-purple-400">Across {assets.length} item{assets.length === 1 ? '' : 's'}</p>
        </div>
        <div className="rounded-xl border border-card-border bg-card p-5">
          <div className="flex items-center gap-2 text-heading/70">
            <Package className="h-5 w-5" />
            <p className="text-xs font-semibold uppercase tracking-wide">By Type</p>
          </div>
          <div className="mt-2 space-y-1">
            {byType.length === 0 ? (
              <p className="text-xs text-heading/50">No assets yet.</p>
            ) : byType.slice(0, 4).map((t) => (
              <div key={t.type} className="flex items-center justify-between text-xs">
                <span className="text-heading/80">{t.type} <span className="text-heading/50">({t.count})</span></span>
                <span className="font-semibold tabular-nums text-heading">{formatINR(t.total)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-card-border bg-card p-5 flex items-center justify-center">
          <button
            type="button"
            onClick={() => { setEditId(null); setForm(emptyForm); setShowForm(true); }}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" /> Record New Asset
          </button>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="border-b border-card-border bg-surface px-4 py-2">
          <h2 className="text-sm font-semibold text-heading">Asset register</h2>
        </div>
        {loading ? (
          <p className="px-4 py-8 text-center text-sm text-heading/60">Loading…</p>
        ) : assets.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-heading/60">No assets recorded yet. Click "Record New Asset" to start.</p>
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-surface text-left text-xs font-medium uppercase tracking-wide text-heading/60">
                  <th className="px-2 py-3 w-8"></th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Total Value (₹)</th>
                  <th className="px-4 py-3">Paid From</th>
                  <th className="px-4 py-3">Remarks</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border">
                {pg.pageData.map((a) => {
                  const total = a.amount + (a.topups_total || 0);
                  const isExpanded = expandedId === a.id;
                  const hasTopups = (a.topups_count || 0) > 0;
                  return (
                  <Fragment key={a.id}>
                  <tr className="hover:bg-surface">
                    <td className="px-2 py-3">
                      <button
                        type="button"
                        onClick={() => toggleExpand(a.id)}
                        className="rounded p-1 text-heading/50 hover:bg-surface hover:text-heading"
                        title={isExpanded ? 'Hide top-ups' : 'Show top-ups'}
                      >
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(a.date)}</td>
                    <td className="px-4 py-3 font-medium text-heading">{a.name}</td>
                    <td className="px-4 py-3">
                      {a.type ? (
                        <span className="inline-flex items-center rounded-full bg-purple-100 dark:bg-purple-900/40 px-2.5 py-0.5 text-xs font-medium text-purple-800 dark:text-purple-200">
                          {a.type}
                        </span>
                      ) : <span className="text-heading/40">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-purple-700 dark:text-purple-300">
                      {formatINR(total)}
                      {hasTopups && (
                        <div className="text-[10px] font-normal text-heading/50 mt-0.5">
                          {formatINR(a.amount)} base + {a.topups_count} top-up{a.topups_count === 1 ? '' : 's'}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-heading/70 capitalize">
                      {a.mode === 'bank' ? `Bank — ${a.bank_name || '—'}` : `Cash — ${a.cash_handler || '—'}`}
                    </td>
                    <td className="px-4 py-3 text-heading/70 max-w-[200px] truncate">{a.remarks || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => openTopupAdd(a)} className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30" title="Add top-up">
                          <PlusCircle className="h-3.5 w-3.5" />
                        </button>
                        {isAdmin && (
                          <>
                            <button type="button" onClick={() => openEdit(a)} className="rounded p-1.5 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/30" title="Edit">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button type="button" onClick={() => handleDelete(a.id)} className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30" title="Delete">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="bg-surface/40">
                      <td></td>
                      <td colSpan={7} className="px-4 py-3">
                        <div className="rounded-lg border border-card-border bg-card p-3">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-xs font-semibold uppercase tracking-wide text-heading/70">Top-ups for {a.name}</h4>
                            <button
                              type="button"
                              onClick={() => openTopupAdd(a)}
                              className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                            >
                              <Plus className="h-3 w-3" /> Add Top-Up
                            </button>
                          </div>
                          {topupsLoading[a.id] ? (
                            <p className="text-xs text-heading/60 py-2">Loading…</p>
                          ) : (topups[a.id] || []).length === 0 ? (
                            <p className="text-xs text-heading/50 py-2">No top-ups yet for this asset.</p>
                          ) : (
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-left text-heading/50">
                                  <th className="py-1.5 pr-3">Date</th>
                                  <th className="py-1.5 pr-3 text-right">Amount</th>
                                  <th className="py-1.5 pr-3">Paid From</th>
                                  <th className="py-1.5 pr-3">Remarks</th>
                                  <th className="py-1.5"></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-card-border">
                                {(topups[a.id] || []).map((t) => (
                                  <tr key={t.id}>
                                    <td className="py-1.5 pr-3 whitespace-nowrap">{formatDate(t.date)}</td>
                                    <td className="py-1.5 pr-3 text-right tabular-nums font-medium text-purple-700 dark:text-purple-300">{formatINR(t.amount)}</td>
                                    <td className="py-1.5 pr-3 text-heading/70">
                                      {t.mode === 'bank' ? `Bank — ${t.bank_name || '—'}` : `Cash — ${t.cash_handler || '—'}`}
                                    </td>
                                    <td className="py-1.5 pr-3 text-heading/70 max-w-[200px] truncate">{t.remarks || '—'}</td>
                                    <td className="py-1.5">
                                      <div className="flex items-center gap-1 justify-end">
                                        <button type="button" onClick={() => openTopupEdit(a, t)} className="rounded p-1 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/30" title="Edit">
                                          <Pencil className="h-3 w-3" />
                                        </button>
                                        {isAdmin && (
                                          <button type="button" onClick={() => handleTopupDelete(a.id, t.id)} className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30" title="Delete">
                                            <Trash2 className="h-3 w-3" />
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <PaginationBar pg={pg} />
          </>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-card p-6 shadow-xl overflow-y-auto max-h-[90vh]">
            <h3 className="mb-1 text-base font-semibold text-heading">{editId != null ? 'Edit Asset' : 'Record New Asset'}</h3>
            <p className="mb-4 text-xs text-heading/60">{editId != null ? 'Changes re-sync the cash/bank debit automatically.' : 'Amount will be deducted from the chosen bank or cash handler.'}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-heading/70">Date *</label>
                <input type="date" className="input-field w-full" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-heading/70">Asset Name *</label>
                <input type="text" className="input-field w-full" placeholder="e.g. Office Building, Pickup Truck" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-heading/70">Type</label>
                <select className="input-field w-full" value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
                  <option value="">Select type</option>
                  {ASSET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-heading/70">Amount (₹) *</label>
                <input type="number" min={0} step={0.01} className="input-field w-full" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-heading/70">Payment Type *</label>
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
                <div>
                  <label className="mb-1 block text-xs font-medium text-heading/70">Bank *</label>
                  <select className="input-field w-full" value={form.bank_name} onChange={(e) => setForm((p) => ({ ...p, bank_name: e.target.value }))}>
                    <option value="">Select bank</option>
                    {banks.map((b) => <option key={b.bank_name} value={b.bank_name}>{b.bank_name}</option>)}
                  </select>
                </div>
              ) : (
                <div>
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
              <button type="button" onClick={closeForm} className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-heading/80 hover:bg-surface">Cancel</button>
              <button type="button" onClick={handleSave} disabled={saving} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
                {saving ? 'Saving…' : editId != null ? 'Update Asset' : 'Save Asset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {topupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-xl bg-card p-6 shadow-xl overflow-y-auto max-h-[90vh]">
            <h3 className="mb-1 text-base font-semibold text-heading">
              {topupModal.topupId != null ? 'Edit Top-Up' : 'Add Top-Up'} — {topupModal.asset.name}
            </h3>
            <p className="mb-4 text-xs text-heading/60">
              Records additional spend toward this asset. Amount will be deducted from the chosen bank or cash handler and added to the asset's total value.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-heading/70">Date *</label>
                <input type="date" className="input-field w-full" value={topupForm.date} onChange={(e) => setTopupForm((p) => ({ ...p, date: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-heading/70">Amount (₹) *</label>
                <input type="number" min={0} step={0.01} className="input-field w-full" value={topupForm.amount} onChange={(e) => setTopupForm((p) => ({ ...p, amount: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-heading/70">Payment Type *</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setTopupForm((p) => ({ ...p, mode: 'bank' }))}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${topupForm.mode === 'bank' ? 'border-brand-500 bg-brand-500 text-white' : 'border-card-border bg-card text-heading/80 hover:bg-surface'}`}>
                    Bank
                  </button>
                  <button type="button" onClick={() => setTopupForm((p) => ({ ...p, mode: 'cash' }))}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${topupForm.mode === 'cash' ? 'border-brand-500 bg-brand-500 text-white' : 'border-card-border bg-card text-heading/80 hover:bg-surface'}`}>
                    Cash
                  </button>
                </div>
              </div>
              {topupForm.mode === 'bank' ? (
                <div>
                  <label className="mb-1 block text-xs font-medium text-heading/70">Bank *</label>
                  <select className="input-field w-full" value={topupForm.bank_name} onChange={(e) => setTopupForm((p) => ({ ...p, bank_name: e.target.value }))}>
                    <option value="">Select bank</option>
                    {banks.map((b) => <option key={b.bank_name} value={b.bank_name}>{b.bank_name}</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="mb-1 block text-xs font-medium text-heading/70">Cash Handler *</label>
                  <select className="input-field w-full" value={topupForm.cash_handler} onChange={(e) => setTopupForm((p) => ({ ...p, cash_handler: e.target.value }))}>
                    <option value="">Select handler</option>
                    {handlers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              )}
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-heading/70">Remarks</label>
                <input type="text" className="input-field w-full" placeholder="e.g. accessories, repair, upgrade" value={topupForm.remarks} onChange={(e) => setTopupForm((p) => ({ ...p, remarks: e.target.value }))} />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2 border-t border-card-border pt-4">
              <button type="button" onClick={closeTopup} className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-heading/80 hover:bg-surface">Cancel</button>
              <button type="button" onClick={handleTopupSave} disabled={topupSaving} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                {topupSaving ? 'Saving…' : topupModal.topupId != null ? 'Update Top-Up' : 'Save Top-Up'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
