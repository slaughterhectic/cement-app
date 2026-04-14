import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { formatINR, formatDate } from '../lib/format';
import { DataTable, type ColumnDef } from '../components/tables/DataTable';
import { useToastStore } from '../lib/store';
import { ArrowLeft, Plus, CreditCard, Trash2 } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import PaymentForm from '../components/forms/PaymentForm';

type LedgerEntry = {
  sno: number;
  date: string;
  particulars: string;
  qty: number;
  rate: number;
  debit: number;
  credit: number;
  balance: number;
  entry_type: string;
  id: number;
};

type Dealer = {
  id: number;
  name: string;
  phone: string | null;
  location: string | null;
  district: string | null;
  opening_balance: number;
};

type SubParty = {
  id: number;
  name: string;
  phone: string | null;
  location: string | null;
  type: string | null;
};

type LedgerTableRow = {
  rowKey: string;
  sno: string | number;
  date: string | null;
  particulars: string;
  qty: number;
  rate: number;
  debit: number;
  credit: number;
  balance: number;
};

export default function DealerDetail() {
  const { id } = useParams<{ id: string }>();
  const dealerId = id ? Number(id) : NaN;
  const addToast = useToastStore((s) => s.addToast);

  const [dealer, setDealer] = useState<Dealer | null>(null);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [subParties, setSubParties] = useState<SubParty[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [subPartyOpen, setSubPartyOpen] = useState(false);
  const [spForm, setSpForm] = useState({ name: '', phone: '', location: '', type: 'other' });
  const [spSaving, setSpSaving] = useState(false);

  const load = useCallback(async () => {
    if (!Number.isFinite(dealerId) || dealerId <= 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [ledgerRes, subs] = await Promise.all([
        api.dealers.ledger(dealerId),
        api.dealers.subParties(dealerId),
      ]);
      const { party, opening_balance, ledger } = ledgerRes as {
        party: Dealer;
        opening_balance: number;
        ledger: LedgerEntry[];
      };
      setDealer(party);
      setOpeningBalance(Number(opening_balance) || 0);
      setLedgerEntries(ledger ?? []);
      setSubParties((subs as SubParty[]) ?? []);
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to load dealer', 'error');
      setDealer(null);
      setLedgerEntries([]);
    } finally {
      setLoading(false);
    }
  }, [dealerId, addToast]);

  useEffect(() => { load(); }, [load]);

  const tableRows = useMemo<LedgerTableRow[]>(() => {
    const rows: LedgerTableRow[] = [];
    if (openingBalance > 0) {
      rows.push({
        rowKey: 'opening',
        sno: '—',
        date: null,
        particulars: 'Opening Balance',
        qty: 0, rate: 0,
        debit: openingBalance,
        credit: 0,
        balance: openingBalance,
      });
    }
    for (const e of ledgerEntries) {
      rows.push({
        rowKey: `${e.entry_type}-${e.id}`,
        sno: e.sno,
        date: e.date,
        particulars: e.particulars,
        qty: Number(e.qty) || 0,
        rate: Number(e.rate) || 0,
        debit: Number(e.debit) || 0,
        credit: Number(e.credit) || 0,
        balance: Number(e.balance) || 0,
      });
    }
    return rows;
  }, [openingBalance, ledgerEntries]);

  const outstanding = useMemo(() => {
    if (ledgerEntries.length === 0) return openingBalance;
    const last = ledgerEntries[ledgerEntries.length - 1];
    return Number(last?.balance) || 0;
  }, [ledgerEntries, openingBalance]);

  const summary = useMemo(() => {
    let totalCharged = openingBalance > 0 ? openingBalance : 0;
    let totalReceived = 0;
    for (const e of ledgerEntries) {
      totalCharged += Number(e.debit) || 0;
      totalReceived += Number(e.credit) || 0;
    }
    return { totalCharged, totalReceived };
  }, [ledgerEntries, openingBalance]);

  const handleDeleteSubParty = async (sp: SubParty) => {
    if (!window.confirm(`Delete sub-party "${sp.name}"? This cannot be undone.`)) return;
    try {
      await api.dealers.deleteSubParty(dealerId, sp.id);
      addToast('Sub-party deleted');
      load();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Could not delete sub-party', 'error');
    }
  };

  const handleAddSubParty = async () => {
    if (!spForm.name.trim()) { addToast('Name is required', 'error'); return; }
    setSpSaving(true);
    try {
      await api.dealers.addSubParty(dealerId, {
        name: spForm.name.trim(),
        phone: spForm.phone.trim() || null,
        location: spForm.location.trim() || null,
        type: spForm.type,
      });
      addToast('Sub-party added');
      setSubPartyOpen(false);
      setSpForm({ name: '', phone: '', location: '', type: 'other' });
      load();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to add sub-party', 'error');
    } finally {
      setSpSaving(false);
    }
  };

  const ledgerColumns = useMemo<ColumnDef<LedgerTableRow, any>[]>(() => [
    { accessorKey: 'sno', header: 'S.No', size: 60 },
    { accessorKey: 'date', header: 'Date', cell: ({ getValue }) => getValue() ? formatDate(String(getValue())) : '—' },
    { accessorKey: 'particulars', header: 'Particulars' },
    { accessorKey: 'qty', header: 'Qty', cell: ({ getValue }) => Number(getValue()) > 0 ? getValue() : '' },
    { accessorKey: 'rate', header: 'Rate', cell: ({ getValue }) => Number(getValue()) > 0 ? formatINR(Number(getValue())) : '' },
    { accessorKey: 'debit', header: 'Debit (₹)', cell: ({ getValue }) => Number(getValue()) > 0 ? <span className="text-red-600 font-medium">{formatINR(Number(getValue()))}</span> : '' },
    { accessorKey: 'credit', header: 'Credit (₹)', cell: ({ getValue }) => Number(getValue()) > 0 ? <span className="text-green-600 font-medium">{formatINR(Number(getValue()))}</span> : '' },
    { accessorKey: 'balance', header: 'Balance (₹)', cell: ({ getValue }) => {
      const v = Number(getValue());
      return <span className={`font-semibold ${v > 0 ? 'text-red-700' : v < 0 ? 'text-green-700' : 'text-gray-500'}`}>{formatINR(v)}</span>;
    }},
  ], []);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!dealer) {
    return (
      <div className="space-y-4">
        <Link to="/dealers" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-heading">
          <ArrowLeft className="h-4 w-4" /> Back to Dealers
        </Link>
        <p className="text-gray-500">Dealer not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/dealers" className="mb-2 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-heading">
            <ArrowLeft className="h-4 w-4" /> Back to Dealers
          </Link>
          <h1 className="text-2xl font-bold text-heading">{dealer.name}</h1>
          <div className="mt-1 flex flex-wrap gap-3 text-sm text-gray-500">
            {dealer.location && <span>{dealer.location}</span>}
            {dealer.district && <span>{dealer.district}</span>}
            {dealer.phone && <span>{dealer.phone}</span>}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setPaymentOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          <CreditCard className="h-4 w-4" /> Record Payment
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total Charged</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{formatINR(summary.totalCharged)}</p>
        </div>
        <div className="card">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total Received</p>
          <p className="mt-1 text-2xl font-bold text-green-700">{formatINR(summary.totalReceived)}</p>
        </div>
        <div className="card">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Outstanding</p>
          <p className={`mt-1 text-2xl font-bold ${outstanding > 0 ? 'text-red-700' : 'text-green-700'}`}>
            {formatINR(outstanding)}
          </p>
        </div>
      </div>

      {/* Sub-parties */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-heading">
            Sub-Parties {subParties.length > 0 ? `(${subParties.length})` : ''}
          </h2>
          <button
            type="button"
            onClick={() => setSubPartyOpen(true)}
            className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
        {subParties.length === 0 ? (
          <p className="text-sm text-gray-500">No sub-parties registered under this dealer yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Phone</th>
                  <th className="px-3 py-2">Location</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {subParties.map((sp) => (
                  <tr key={sp.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-heading">{sp.name}</td>
                    <td className="px-3 py-2">
                      {sp.type && (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium capitalize text-blue-700">
                          {sp.type.replace(/_/g, ' ')}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-600">{sp.phone ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-600">{sp.location ?? '—'}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteSubParty(sp)}
                        className="rounded p-1 text-red-500 hover:bg-red-50"
                        title="Delete sub-party"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ledger */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-heading">Ledger</h2>
        <DataTable<LedgerTableRow>
          data={tableRows}
          columns={ledgerColumns}
          isLoading={false}
          emptyMessage="No transactions yet."
          exportFileName={`dealer-${dealer.name.replace(/[^a-zA-Z0-9]/g, '_')}`}
          getRowId={(row) => row.rowKey as any}
          getRowClassName={(row) =>
            row.particulars === 'Opening Balance' ? 'bg-amber-50 font-medium' : undefined
          }
        />
      </div>

      {/* Add Sub-Party Modal */}
      <Modal isOpen={subPartyOpen} onClose={() => setSubPartyOpen(false)} title="Add Sub-Party">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-heading">Name *</label>
            <input className="input-field" value={spForm.name} onChange={(e) => setSpForm({ ...spForm, name: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-heading">Phone</label>
            <input className="input-field" maxLength={10} value={spForm.phone} onChange={(e) => setSpForm({ ...spForm, phone: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-heading">Location</label>
            <input className="input-field" value={spForm.location} onChange={(e) => setSpForm({ ...spForm, location: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-heading">Type</label>
            <select className="input-field" value={spForm.type} onChange={(e) => setSpForm({ ...spForm, type: e.target.value })}>
              <option value="contractor">Contractor</option>
              <option value="builder">Builder</option>
              <option value="institution">Institution</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setSubPartyOpen(false)} className="btn-secondary">Cancel</button>
            <button type="button" onClick={handleAddSubParty} disabled={spSaving} className="btn-primary disabled:opacity-50">
              {spSaving ? 'Adding...' : 'Add Sub-Party'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Payment Modal */}
      <PaymentForm
        isOpen={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        onSuccess={load}
        partyId={dealerId}
      />
    </div>
  );
}
