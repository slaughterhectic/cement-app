import { Fragment, useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, X, ChevronDown, ChevronRight, Pencil, UserPlus } from 'lucide-react';
import { api } from '../../lib/api';
import { formatINR, formatDate } from '../../lib/format';
import { useToastStore, useAuthStore } from '../../lib/store';

interface PartnerRow {
  id: number;
  name: string;
  opening_capital: number;
  total_capital: number;
  total_profit: number;
  total_withdrawals: number;
  balance: number;
}

interface Transaction {
  id: number;
  date: string;
  partner_id: number;
  type: 'capital' | 'withdrawal' | 'profit';
  amount: number;
  remarks: string | null;
}

const TXN_TYPE_LABELS: Record<string, string> = {
  capital: 'Capital Deposit',
  profit: 'Profit',
  withdrawal: 'Withdrawal',
};

const TXN_TYPE_COLORS: Record<string, string> = {
  capital: 'text-blue-600 dark:text-blue-400',
  profit: 'text-green-600 dark:text-green-400',
  withdrawal: 'text-red-600 dark:text-red-400',
};

const emptyTxnForm = {
  partner_id: '',
  date: new Date().toISOString().split('T')[0],
  type: 'capital' as 'capital' | 'withdrawal' | 'profit',
  amount: '',
  remarks: '',
};

const emptyPartnerForm = {
  name: '',
  opening_capital: '',
};

export default function TransportPartners() {
  const addToast = useToastStore((s) => s.addToast);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [txnModalOpen, setTxnModalOpen] = useState(false);
  const [txnForm, setTxnForm] = useState(emptyTxnForm);
  const [saving, setSaving] = useState(false);
  const [expandedPartner, setExpandedPartner] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Record<number, Transaction[]>>({});
  const [loadingTxns, setLoadingTxns] = useState<Record<number, boolean>>({});
  const [partnerModalOpen, setPartnerModalOpen] = useState(false);
  const [partnerForm, setPartnerForm] = useState(emptyPartnerForm);
  const [editingPartner, setEditingPartner] = useState<PartnerRow | null>(null);
  const [savingPartner, setSavingPartner] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.rlPartners.list();
      setPartners(data);
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to load partners', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  const loadTransactions = async (partnerId: number) => {
    if (transactions[partnerId]) return;
    setLoadingTxns((prev) => ({ ...prev, [partnerId]: true }));
    try {
      const data = await api.rlPartners.transactions(partnerId);
      setTransactions((prev) => ({ ...prev, [partnerId]: data }));
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to load transactions', 'error');
    } finally {
      setLoadingTxns((prev) => ({ ...prev, [partnerId]: false }));
    }
  };

  const toggleExpand = async (partnerId: number) => {
    if (expandedPartner === partnerId) {
      setExpandedPartner(null);
    } else {
      setExpandedPartner(partnerId);
      await loadTransactions(partnerId);
    }
  };

  const openAddTxn = (partnerId?: number) => {
    setTxnForm({
      ...emptyTxnForm,
      partner_id: partnerId ? String(partnerId) : '',
    });
    setTxnModalOpen(true);
  };

  const handleTxnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txnForm.partner_id) { addToast('Select a partner', 'error'); return; }
    if (!txnForm.amount || Number(txnForm.amount) <= 0) { addToast('Enter a valid amount', 'error'); return; }
    setSaving(true);
    try {
      await api.rlPartners.addTransaction(Number(txnForm.partner_id), {
        date: txnForm.date,
        type: txnForm.type,
        amount: Number(txnForm.amount),
        remarks: txnForm.remarks || null,
      });
      addToast('Transaction added', 'success');
      setTxnModalOpen(false);
      // Invalidate cached transactions for this partner
      setTransactions((prev) => {
        const updated = { ...prev };
        delete updated[Number(txnForm.partner_id)];
        return updated;
      });
      load();
      // Reload if expanded
      if (expandedPartner === Number(txnForm.partner_id)) {
        await loadTransactions(Number(txnForm.partner_id));
      }
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openAddPartner = () => {
    setEditingPartner(null);
    setPartnerForm(emptyPartnerForm);
    setPartnerModalOpen(true);
  };

  const openEditPartner = (partner: PartnerRow) => {
    setEditingPartner(partner);
    setPartnerForm({
      name: partner.name,
      opening_capital: String(partner.opening_capital || ''),
    });
    setPartnerModalOpen(true);
  };

  const handlePartnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerForm.name.trim()) { addToast('Partner name is required', 'error'); return; }
    setSavingPartner(true);
    try {
      const payload = {
        name: partnerForm.name.trim(),
        opening_capital: Number(partnerForm.opening_capital) || 0,
      };
      if (editingPartner) {
        await api.rlPartners.update(editingPartner.id, payload);
        addToast('Partner updated', 'success');
      } else {
        await api.rlPartners.create(payload);
        addToast('Partner added', 'success');
      }
      setPartnerModalOpen(false);
      load();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally {
      setSavingPartner(false);
    }
  };

  const handleDeletePartner = async (partner: PartnerRow) => {
    if (!window.confirm(`Delete partner "${partner.name}"? This cannot be undone.`)) return;
    try {
      await api.rlPartners.delete(partner.id);
      addToast('Partner deleted', 'success');
      load();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Delete failed', 'error');
    }
  };

  const handleDeleteTxn = async (partnerId: number, txId: number) => {
    if (!window.confirm('Delete this transaction?')) return;
    try {
      await api.rlPartners.deleteTransaction(partnerId, txId);
      addToast('Transaction deleted', 'success');
      setTransactions((prev) => ({
        ...prev,
        [partnerId]: (prev[partnerId] || []).filter((t) => t.id !== txId),
      }));
      load();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Delete failed', 'error');
    }
  };

  const totalBalance = partners.reduce((s, p) => s + p.balance, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading">Partners</h1>
          <p className="text-sm text-heading/60 mt-1">Capital tracking for Rudra Logistics partners</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openAddPartner}
            className="inline-flex items-center gap-2 rounded-lg border border-indigo-300 bg-card px-4 py-2.5 text-sm font-medium text-indigo-700 dark:text-indigo-300 shadow-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            Add Partner
          </button>
          <button
            type="button"
            onClick={() => openAddTxn()}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Transaction
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {partners.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="card p-4 bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 text-center">
            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium uppercase tracking-wider">Partners</p>
            <p className="text-2xl font-bold text-heading">{partners.length}</p>
          </div>
          <div className="card p-4 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-center">
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium uppercase tracking-wider">Total Capital</p>
            <p className="text-xl font-bold text-heading">{formatINR(partners.reduce((s, p) => s + p.opening_capital + p.total_capital, 0))}</p>
          </div>
          <div className="card p-4 bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-center">
            <p className="text-xs text-green-600 dark:text-green-400 font-medium uppercase tracking-wider">Total Profit</p>
            <p className="text-xl font-bold text-heading">{formatINR(partners.reduce((s, p) => s + p.total_profit, 0))}</p>
          </div>
          <div className={`card p-4 border text-center ${totalBalance >= 0 ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800'}`}>
            <p className={`text-xs font-medium uppercase tracking-wider ${totalBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>Total Balance</p>
            <p className="text-xl font-bold text-heading">{formatINR(totalBalance)}</p>
          </div>
        </div>
      )}

      {/* Partner Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-card-border bg-indigo-50 dark:bg-indigo-900/30 text-left">
                <th className="px-4 py-3 font-medium text-indigo-700 dark:text-indigo-300 w-8"></th>
                <th className="px-4 py-3 font-medium text-indigo-700 dark:text-indigo-300">Partner</th>
                <th className="px-4 py-3 font-medium text-indigo-700 dark:text-indigo-300 text-right">Opening Capital</th>
                <th className="px-4 py-3 font-medium text-indigo-700 dark:text-indigo-300 text-right">Deposits</th>
                <th className="px-4 py-3 font-medium text-indigo-700 dark:text-indigo-300 text-right">Profit</th>
                <th className="px-4 py-3 font-medium text-indigo-700 dark:text-indigo-300 text-right">Withdrawals</th>
                <th className="px-4 py-3 font-medium text-indigo-700 dark:text-indigo-300 text-right">Balance</th>
                <th className="px-4 py-3 font-medium text-indigo-700 dark:text-indigo-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-heading/50">Loading...</td></tr>
              ) : partners.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-heading/50">No partners found</td></tr>
              ) : (
                partners.map((partner) => (
                  <Fragment key={partner.id}>
                    <tr
                      className="border-b border-card-border hover:bg-indigo-50/30 dark:hover:bg-indigo-900/30 transition-colors cursor-pointer"
                      onClick={() => toggleExpand(partner.id)}
                    >
                      <td className="px-4 py-3">
                        {expandedPartner === partner.id
                          ? <ChevronDown className="h-4 w-4 text-indigo-500" />
                          : <ChevronRight className="h-4 w-4 text-heading/50" />
                        }
                      </td>
                      <td className="px-4 py-3 font-medium text-indigo-600 dark:text-indigo-400">{partner.name}</td>
                      <td className="px-4 py-3 text-right text-heading/70">{formatINR(partner.opening_capital)}</td>
                      <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400">{formatINR(partner.total_capital)}</td>
                      <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">{formatINR(partner.total_profit)}</td>
                      <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">{formatINR(partner.total_withdrawals)}</td>
                      <td className={`px-4 py-3 text-right font-bold ${partner.balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatINR(partner.balance)}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openAddTxn(partner.id)}
                            className="inline-flex items-center gap-1 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 transition-colors"
                            title="Add transaction"
                          >
                            <Plus className="h-3 w-3" />
                            Txn
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditPartner(partner)}
                            className="rounded p-1.5 text-heading/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 hover:text-indigo-600 dark:text-indigo-400 transition-colors"
                            title="Edit partner"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          {isAdmin() && (
                            <button
                              type="button"
                              onClick={() => handleDeletePartner(partner)}
                              className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                              title="Delete partner"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedPartner === partner.id && (
                      <tr className="border-b border-card-border bg-surface">
                        <td colSpan={8} className="px-6 py-4">
                          {loadingTxns[partner.id] ? (
                            <p className="text-sm text-heading/50 text-center py-4">Loading transactions...</p>
                          ) : !transactions[partner.id] || transactions[partner.id].length === 0 ? (
                            <p className="text-sm text-heading/50 text-center py-4">No transactions yet</p>
                          ) : (
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-left border-b border-card-border">
                                  <th className="pb-2 font-medium text-heading/60">Date</th>
                                  <th className="pb-2 font-medium text-heading/60">Type</th>
                                  <th className="pb-2 font-medium text-heading/60 text-right">Amount</th>
                                  <th className="pb-2 font-medium text-heading/60">Remarks</th>
                                  {isAdmin() && <th className="pb-2 font-medium text-heading/60"></th>}
                                </tr>
                              </thead>
                              <tbody>
                                {transactions[partner.id].map((txn) => (
                                  <tr key={txn.id} className="border-b border-card-border last:border-0">
                                    <td className="py-1.5 text-heading/70">{formatDate(txn.date)}</td>
                                    <td className={`py-1.5 font-medium ${TXN_TYPE_COLORS[txn.type]}`}>
                                      {TXN_TYPE_LABELS[txn.type]}
                                    </td>
                                    <td className={`py-1.5 text-right font-semibold ${TXN_TYPE_COLORS[txn.type]}`}>
                                      {txn.type === 'withdrawal' ? '−' : '+'}{formatINR(txn.amount)}
                                    </td>
                                    <td className="py-1.5 text-heading/60">{txn.remarks || '—'}</td>
                                    {isAdmin() && (
                                      <td className="py-1.5 text-right">
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteTxn(partner.id, txn.id)}
                                          className="rounded p-1 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:text-red-400 transition-colors"
                                          title="Delete"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </td>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
            {partners.length > 0 && (
              <tfoot>
                <tr className="bg-indigo-50 dark:bg-indigo-900/30 font-semibold border-t-2 border-indigo-200 dark:border-indigo-800">
                  <td colSpan={2} className="px-4 py-3 text-indigo-700 dark:text-indigo-300">Total</td>
                  <td className="px-4 py-3 text-right">{formatINR(partners.reduce((s, p) => s + p.opening_capital, 0))}</td>
                  <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400">{formatINR(partners.reduce((s, p) => s + p.total_capital, 0))}</td>
                  <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">{formatINR(partners.reduce((s, p) => s + p.total_profit, 0))}</td>
                  <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">{formatINR(partners.reduce((s, p) => s + p.total_withdrawals, 0))}</td>
                  <td className={`px-4 py-3 text-right ${totalBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{formatINR(totalBalance)}</td>
                  <td className="px-4 py-3">—</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Add Transaction Modal */}
      {txnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-card-border px-5 py-4">
              <h2 className="font-semibold text-heading">Add Transaction</h2>
              <button type="button" onClick={() => setTxnModalOpen(false)} className="rounded-lg p-1.5 hover:bg-card-border/50 transition-colors">
                <X className="h-5 w-5 text-heading/60" />
              </button>
            </div>
            <form onSubmit={handleTxnSubmit} className="p-5 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-heading/80 mb-1">Partner *</label>
                <select
                  className="input-field"
                  value={txnForm.partner_id}
                  onChange={(e) => setTxnForm((prev) => ({ ...prev, partner_id: e.target.value }))}
                  required
                >
                  <option value="">Select partner</option>
                  {partners.map((p) => (
                    <option key={p.id} value={String(p.id)}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-heading/80 mb-1">Date *</label>
                <input
                  type="date"
                  className="input-field"
                  value={txnForm.date}
                  onChange={(e) => setTxnForm((prev) => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-heading/80 mb-1">Type *</label>
                <select
                  className="input-field"
                  value={txnForm.type}
                  onChange={(e) => setTxnForm((prev) => ({ ...prev, type: e.target.value as any }))}
                  required
                >
                  <option value="capital">Capital Deposit</option>
                  <option value="profit">Profit</option>
                  <option value="withdrawal">Withdrawal</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-heading/80 mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="input-field"
                  value={txnForm.amount}
                  onChange={(e) => setTxnForm((prev) => ({ ...prev, amount: e.target.value }))}
                  placeholder="0"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-heading/80 mb-1">Remarks</label>
                <textarea
                  className="input-field resize-none"
                  rows={2}
                  value={txnForm.remarks}
                  onChange={(e) => setTxnForm((prev) => ({ ...prev, remarks: e.target.value }))}
                  placeholder="Optional notes"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setTxnModalOpen(false)}
                  className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-heading/80 hover:bg-surface transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-600 disabled:opacity-60 transition-colors"
                >
                  {saving ? 'Saving…' : 'Add Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Partner Modal */}
      {partnerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-card-border px-5 py-4">
              <h2 className="font-semibold text-heading">{editingPartner ? 'Edit Partner' : 'Add Partner'}</h2>
              <button type="button" onClick={() => setPartnerModalOpen(false)} className="rounded-lg p-1.5 hover:bg-card-border/50 transition-colors">
                <X className="h-5 w-5 text-heading/60" />
              </button>
            </div>
            <form onSubmit={handlePartnerSubmit} className="p-5 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-heading/80 mb-1">Partner Name *</label>
                <input
                  className="input-field"
                  value={partnerForm.name}
                  onChange={(e) => setPartnerForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Shubham"
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-heading/80 mb-1">Opening Capital (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="input-field"
                  value={partnerForm.opening_capital}
                  onChange={(e) => setPartnerForm((prev) => ({ ...prev, opening_capital: e.target.value }))}
                  placeholder="0"
                />
                <p className="mt-1 text-xs text-heading/60">
                  Capital contributed before tracking started. Later contributions should be added as "Capital Deposit" transactions.
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPartnerModalOpen(false)}
                  className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-heading/80 hover:bg-surface transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPartner}
                  className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-600 disabled:opacity-60 transition-colors"
                >
                  {savingPartner ? 'Saving…' : editingPartner ? 'Update Partner' : 'Add Partner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
