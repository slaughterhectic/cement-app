import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { api } from '../lib/api';
import { formatINR, formatDate } from '../lib/format';
import { DataTable, type ColumnDef } from '../components/tables/DataTable';
import { useToastStore } from '../lib/store';
import { ArrowLeft, Plus, CreditCard } from 'lucide-react';
import SaleForm from '../components/forms/SaleForm';
import PaymentForm from '../components/forms/PaymentForm';
import PurchaseForm from '../components/forms/PurchaseForm';

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

type Party = {
  id: number;
  name: string;
  phone: string | null;
  location: string | null;
  district: string | null;
  type: string | null;
  opening_balance: number;
  parent_id: number | null;
};

export type LedgerTableRow = {
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

function typeBadgeClass(type: string | null | undefined): string {
  switch (type) {
    case 'dealer':
      return 'bg-blue-100 text-blue-800';
    case 'contractor':
      return 'bg-emerald-100 text-emerald-800';
    case 'builder':
      return 'bg-amber-100 text-amber-800';
    case 'institution':
      return 'bg-purple-100 text-purple-800';
    case 'damage_buyer':
      return 'bg-orange-100 text-orange-800';
    case 'supplier':
      return 'bg-indigo-100 text-indigo-800';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function formatTypeLabel(type: string | null | undefined): string {
  if (!type) return '—';
  return type.replace(/_/g, ' ');
}

function safeExportBaseName(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, '_').trim() || 'party';
}

export default function PartyLedger() {
  const { id } = useParams<{ id: string }>();
  const partyId = id ? Number(id) : NaN;
  const addToast = useToastStore((s) => s.addToast);

  const [party, setParty] = useState<Party | null>(null);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saleOpen, setSaleOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [purchaseOpen, setPurchaseOpen] = useState(false);

  const load = useCallback(async () => {
    if (!Number.isFinite(partyId) || partyId <= 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = (await api.parties.ledger(partyId)) as {
        party: Party;
        opening_balance: number;
        ledger: LedgerEntry[];
      };
      setParty(res.party);
      setOpeningBalance(Number(res.opening_balance) || 0);
      setLedgerEntries(res.ledger ?? []);
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to load ledger', 'error');
      setParty(null);
      setLedgerEntries([]);
    } finally {
      setLoading(false);
    }
  }, [partyId, addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const tableRows = useMemo<LedgerTableRow[]>(() => {
    const isSupplierParty = party?.type === 'supplier';
    const rows: LedgerTableRow[] = [];
    if (openingBalance !== 0) {
      rows.push({
        rowKey: 'opening',
        sno: '—',
        date: null,
        // For suppliers: opening = advance already paid by us → DEBIT, balance starts negative
        // For non-suppliers: opening > 0 = they owe us → DEBIT; < 0 = we owe them → CREDIT
        particulars: isSupplierParty ? 'Opening Balance (Advance Paid)' : 'Opening Balance',
        qty: 0,
        rate: 0,
        debit: isSupplierParty ? openingBalance : (openingBalance > 0 ? openingBalance : 0),
        credit: isSupplierParty ? 0 : (openingBalance < 0 ? Math.abs(openingBalance) : 0),
        balance: isSupplierParty ? -openingBalance : openingBalance,
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
  }, [openingBalance, ledgerEntries, party?.type]);

  const outstanding = useMemo(() => {
    if (ledgerEntries.length === 0) {
      // Supplier: no transactions → they owe us the advance (negative = they owe us)
      return party?.type === 'supplier' ? -(openingBalance) : openingBalance;
    }
    const last = ledgerEntries[ledgerEntries.length - 1];
    return Number(last?.balance) || 0;
  }, [ledgerEntries, openingBalance, party?.type]);

  const summary = useMemo(() => {
    const isSupplierParty = party?.type === 'supplier';
    let totalBags = 0;
    let totalCharged = 0;
    let totalReceived = 0;
    if (isSupplierParty) {
      // Supplier: opening = advance paid by us → goes into debit (totalCharged = total paid out)
      if (openingBalance > 0) totalCharged += openingBalance;
    } else {
      if (openingBalance > 0) totalCharged += openingBalance;
      else if (openingBalance < 0) totalReceived += Math.abs(openingBalance);
    }
    for (const e of ledgerEntries) {
      const qty = Number(e.qty) || 0;
      const debit = Number(e.debit) || 0;
      const credit = Number(e.credit) || 0;
      if (qty > 0) totalBags += qty;
      totalCharged += debit;
      totalReceived += credit;
    }
    return { totalBags, totalCharged, totalReceived, outstanding };
  }, [ledgerEntries, openingBalance, party?.type]);

  const isSupplier = party?.type === 'supplier';

  const columns = useMemo<ColumnDef<LedgerTableRow, any>[]>(
    () => [
      { accessorKey: 'sno', header: 'S.No' },
      {
        accessorKey: 'date',
        header: 'Date',
        cell: ({ getValue }) => {
          const d = getValue() as string | null;
          return d ? formatDate(d) : '—';
        },
      },
      { accessorKey: 'particulars', header: 'Particulars' },
      {
        accessorKey: 'qty',
        header: 'Qty',
        cell: ({ getValue }) => {
          const q = Number(getValue()) || 0;
          return q > 0 ? `${q} bags` : '—';
        },
      },
      {
        accessorKey: 'rate',
        header: 'Rate',
        cell: ({ getValue }) => {
          const r = Number(getValue()) || 0;
          return r > 0 ? formatINR(r) : '—';
        },
      },
      {
        accessorKey: 'debit',
        // For supplier: debit = payment we made to them (reduces what we owe)
        // For customer: debit = sale charged to them (increases what they owe)
        header: isSupplier ? 'Paid by Us' : 'Charged (Dr)',
        cell: ({ getValue }) => {
          const n = Number(getValue()) || 0;
          if (n <= 0) return '—';
          return (
            <span className={`font-medium ${isSupplier ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatINR(n)}
            </span>
          );
        },
      },
      {
        accessorKey: 'credit',
        // For supplier: credit = goods purchased from them (increases what we owe)
        // For customer: credit = payment received from them (reduces what they owe)
        header: isSupplier ? 'Goods Received (Cr)' : 'Received (Cr)',
        cell: ({ getValue }) => {
          const n = Number(getValue()) || 0;
          if (n <= 0) return '—';
          return (
            <span className={`font-medium ${isSupplier ? 'text-orange-600' : 'text-emerald-600'}`}>
              {formatINR(n)}
            </span>
          );
        },
      },
      {
        accessorKey: 'balance',
        header: isSupplier ? 'Balance' : 'Balance (They Owe)',
        cell: ({ getValue }) => {
          const n = Number(getValue()) || 0;
          let cls: string;
          if (isSupplier) {
            // positive = we owe them (orange/payable), negative = they owe us (green/profit)
            cls = n > 0 ? 'font-semibold text-orange-600' : n < 0 ? 'font-semibold text-profit' : 'font-medium text-gray-400';
          } else {
            cls = n > 0 ? 'font-semibold text-outstanding' : n < 0 ? 'font-semibold text-profit' : 'font-medium text-gray-400';
          }
          const display = isSupplier && n < 0 ? `(${formatINR(Math.abs(n))})` : formatINR(n);
          return <span className={cls}>{display}</span>;
        },
      },
    ],
    [isSupplier]
  );

  const exportName = party ? `${safeExportBaseName(party.name)}_ledger` : 'ledger';

  const onSaleSuccess = () => {
    load();
  };

  const onPaymentSuccess = () => {
    setPaymentOpen(false);
    load();
    addToast('Payment recorded');
  };

  if (!Number.isFinite(partyId) || partyId <= 0) {
    return (
      <div className="text-heading">
        <p className="text-gray-600">Invalid party.</p>
        <Link to="/parties" className="mt-2 inline-block text-brand-600 hover:underline">
          Back to parties
        </Link>
      </div>
    );
  }

  // Sub-parties belong to a dealer — redirect to their dealer's page
  if (!loading && party?.parent_id) {
    return <Navigate to={`/dealers/${party.parent_id}`} replace />;
  }

  if (!loading && !party) {
    return (
      <div className="text-heading">
        <p className="text-gray-600">Party not found.</p>
        <Link to="/parties" className="mt-2 inline-block text-brand-600 hover:underline">
          Back to parties
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        to="/parties"
        className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Parties
      </Link>

      <div className="card space-y-4">
        {loading && !party ? (
          <div className="animate-pulse space-y-3">
            <div className="h-8 w-48 rounded bg-gray-200" />
            <div className="h-4 w-full max-w-md rounded bg-gray-200" />
          </div>
        ) : party ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-heading">{party.name}</h1>
                <p className="mt-1 text-sm text-gray-600">
                  {[party.location, party.district].filter(Boolean).join(', ') || '—'}
                  {party.phone ? ` · ${party.phone}` : ''}
                </p>
                <span
                  className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${typeBadgeClass(
                    party.type
                  )}`}
                >
                  {formatTypeLabel(party.type)}
                </span>
              </div>
              <div className="text-right">
                {outstanding > 0 ? (
                  <div>
                    <p className={`text-2xl font-bold ${party?.type === 'supplier' ? 'text-orange-600' : 'text-outstanding'}`}>
                      {formatINR(outstanding)}
                    </p>
                    <p className={`text-sm font-semibold mt-0.5 ${party?.type === 'supplier' ? 'text-orange-500' : 'text-outstanding/80'}`}>
                      {party?.type === 'supplier' ? 'We owe them (payable)' : 'They owe us (receivable)'}
                    </p>
                  </div>
                ) : outstanding < 0 ? (
                  <div>
                    <p className="text-2xl font-bold text-profit">{formatINR(Math.abs(outstanding))}</p>
                    <p className="text-sm font-semibold mt-0.5 text-profit/80">
                      {party?.type === 'supplier' ? 'They owe us (overpaid advance)' : 'We owe them (advance)'}
                    </p>
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-profit">Settled</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {party?.type === 'supplier' ? (
                <button
                  type="button"
                  onClick={() => setPurchaseOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  <Plus className="h-4 w-4" />
                  Record Purchase
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setSaleOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  <Plus className="h-4 w-4" />
                  Record Sale
                </button>
              )}
              <button
                type="button"
                onClick={() => setPaymentOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <CreditCard className="h-4 w-4" />
                {party?.type === 'supplier' ? 'Record Payment (to supplier)' : 'Record Payment'}
              </button>
            </div>
          </>
        ) : null}
      </div>

      <DataTable<LedgerTableRow>
        data={tableRows}
        columns={columns}
        isLoading={loading}
        emptyMessage="No ledger entries yet."
        exportFileName={exportName}
        getRowId={(row) => {
          if (row.rowKey === 'opening') return -1;
          const [kind, idStr] = row.rowKey.split('-');
          const id = Number(idStr);
          if (!Number.isFinite(id)) return row.rowKey.length + 3_000_000;
          if (kind === 'sale') return 1_000_000 + id;
          if (kind === 'purchase') return 3_000_000 + id;
          return 2_000_000 + id;
        }}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            {party?.type === 'supplier' ? 'Total Bags Purchased' : 'Total Bags Sold'}
          </p>
          <p className="mt-1 text-xl font-semibold text-heading">{summary.totalBags}</p>
        </div>
        <div className="card">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            {party?.type === 'supplier' ? 'Total Purchases' : 'Total Charged'}
          </p>
          {/* For suppliers: purchases go into credit column (totalReceived); for non-suppliers: totalCharged */}
          <p className="mt-1 text-xl font-semibold text-heading">
            {formatINR(party?.type === 'supplier' ? summary.totalReceived : summary.totalCharged)}
          </p>
        </div>
        <div className="card">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            {party?.type === 'supplier' ? 'Total Paid (incl. advance)' : 'Total Received'}
          </p>
          {/* For suppliers: payments + opening advance go into debit column (totalCharged); for non-suppliers: totalReceived */}
          <p className="mt-1 text-xl font-semibold text-emerald-700">
            {formatINR(party?.type === 'supplier' ? summary.totalCharged : summary.totalReceived)}
          </p>
        </div>
        <div className="card">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            {party?.type === 'supplier' ? 'Payable Balance' : 'Outstanding Balance'}
          </p>
          <p
            className={`mt-1 text-xl font-semibold ${summary.outstanding > 0 ? 'text-outstanding' : 'text-profit'}`}
          >
            {formatINR(summary.outstanding)}
          </p>
        </div>
      </div>

      <SaleForm
        isOpen={saleOpen}
        onClose={() => setSaleOpen(false)}
        onSuccess={onSaleSuccess}
        defaultPartyId={partyId}
      />
      <PaymentForm
        isOpen={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        onSuccess={onPaymentSuccess}
        partyId={partyId}
        direction={party?.type === 'supplier' ? 'pay' : 'receive'}
      />
      <PurchaseForm
        isOpen={purchaseOpen}
        onClose={() => setPurchaseOpen(false)}
        onSuccess={() => { setPurchaseOpen(false); load(); addToast('Purchase recorded'); }}
      />
    </div>
  );
}
