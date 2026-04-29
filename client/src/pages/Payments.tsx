import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { ColumnDef } from '../components/tables/DataTable';
import { DataTable } from '../components/tables/DataTable';
import PaymentForm from '../components/forms/PaymentForm';
import { BankTransferButton } from '../components/BankTransferButton';
import { api } from '../lib/api';
import { formatDate, formatINR } from '../lib/format';
import { useAuthStore, useToastStore } from '../lib/store';

export type PaymentRow = {
  id: number;
  date: string;
  party_id: number;
  party_name: string;
  party_type: string | null;
  amount: number;
  mode: string;
  bank_name: string | null;
  remarks: string | null;
  direction: string | null;
};

function modeBadge(mode: string) {
  const m = String(mode).toLowerCase();
  if (m === 'cash') {
    return (
      <span className="inline-flex rounded-full bg-slate-100 dark:bg-slate-900/40 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-300">
        cash
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:text-emerald-200">
      bank
    </span>
  );
}

export default function Payments() {
  const addToast = useToastStore((s) => s.addToast);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.payments.list();
      const list = Array.isArray(res) ? res : [];
      setRows(list as PaymentRow[]);
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to load payments', 'error');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = useCallback(
    (row: PaymentRow) => {
      if (
        !window.confirm(
          `Delete payment of ${formatINR(row.amount)} for ${row.party_name} on ${formatDate(row.date)}?`
        )
      )
        return;
      api.payments
        .delete(row.id)
        .then(() => {
          addToast('Payment deleted', 'success');
          load();
        })
        .catch((e) => addToast(e instanceof Error ? e.message : 'Delete failed', 'error'));
    },
    [addToast, load]
  );

  const columns = useMemo<ColumnDef<PaymentRow>[]>(
    () => [
      {
        accessorKey: 'date',
        header: 'Date',
        cell: ({ getValue }) => formatDate(String(getValue())),
      },
      { accessorKey: 'party_name', header: 'Party Name' },
      {
        id: 'direction',
        header: 'Type',
        cell: ({ row }) => {
          const { direction } = row.original;
          // Always use the actual direction field — applies to both suppliers and non-suppliers
          const isPaidOut = direction === 'pay';
          return isPaidOut ? (
            <span className="inline-flex rounded-full bg-orange-100 dark:bg-orange-900/40 px-2.5 py-0.5 text-xs font-semibold text-orange-700 dark:text-orange-300">
              Paid Out
            </span>
          ) : (
            <span className="inline-flex rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              Received
            </span>
          );
        },
      },
      {
        accessorKey: 'amount',
        header: 'Amount',
        cell: ({ getValue }) => formatINR(Number(getValue())),
      },
      {
        accessorKey: 'mode',
        header: 'Mode',
        cell: ({ getValue }) => modeBadge(String(getValue() ?? '')),
      },
      {
        accessorKey: 'bank_name',
        header: 'Bank',
        cell: ({ getValue }) => getValue() ?? '—',
      },
      {
        accessorKey: 'remarks',
        header: 'Remarks',
        cell: ({ getValue }) => (getValue() ? String(getValue()) : '—'),
      },
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          hasPermission('delete_payments') ? (
            <button
              type="button"
              className="rounded p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
              aria-label="Delete"
              onClick={() => handleDelete(row.original)}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null
        ),
      },
    ],
    [handleDelete]
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-heading">Payments</h1>
        <div className="flex items-center gap-2">
          <BankTransferButton onSaved={load} />
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" />
            Record Payment
          </button>
        </div>
      </div>

      <DataTable<PaymentRow>
        data={rows}
        columns={columns}
        isLoading={loading}
        emptyMessage="No payments yet."
        emptyAction={{ label: 'Record Payment', onClick: () => setModalOpen(true) }}
        exportFileName="payments"
        canDelete={hasPermission('delete_payments')}
        canDownload={hasPermission('download')}
      />

      <PaymentForm
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={load}
      />
    </div>
  );
}
