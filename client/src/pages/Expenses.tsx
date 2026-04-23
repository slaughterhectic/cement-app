import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { ColumnDef } from '../components/tables/DataTable';
import { DataTable } from '../components/tables/DataTable';
import { ExpenseForm } from '../components/forms/ExpenseForm';
import { api } from '../lib/api';
import { formatDate, formatINR } from '../lib/format';
import { useAuthStore, useToastStore } from '../lib/store';

export type ExpenseRow = {
  id: number;
  date: string;
  amount: number;
  category: string | null;
  description: string;
  bank_name: string | null;
  mode: string;
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

function categoryBadge(category: string | null) {
  const c = category?.trim() || '—';
  if (c === '—') return c;
  return (
    <span className="inline-flex rounded-full bg-amber-50 dark:bg-amber-900/30 px-2.5 py-0.5 text-xs font-medium text-amber-900 dark:text-amber-100">
      {c}
    </span>
  );
}

export default function Expenses() {
  const addToast = useToastStore((s) => s.addToast);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [monthTotal, setMonthTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = (await api.expenses.list()) as { data: ExpenseRow[]; monthTotal: number };
      setRows(Array.isArray(res.data) ? res.data : []);
      setMonthTotal(typeof res.monthTotal === 'number' ? res.monthTotal : 0);
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to load expenses', 'error');
      setRows([]);
      setMonthTotal(0);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = useCallback(
    (row: ExpenseRow) => {
      if (!window.confirm(`Delete expense “${row.description}” (${formatINR(row.amount)})?`)) return;
      api.expenses
        .delete(row.id)
        .then(() => {
          addToast('Expense deleted', 'success');
          load();
        })
        .catch((e) => addToast(e instanceof Error ? e.message : 'Delete failed', 'error'));
    },
    [addToast, load]
  );

  const columns = useMemo<ColumnDef<ExpenseRow>[]>(
    () => [
      {
        accessorKey: 'date',
        header: 'Date',
        cell: ({ getValue }) => formatDate(String(getValue())),
      },
      { accessorKey: 'description', header: 'Description' },
      {
        accessorKey: 'category',
        header: 'Category',
        cell: ({ getValue }) => categoryBadge((getValue() as string | null) ?? null),
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
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          hasPermission('delete_expenses') ? (
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading">Expenses</h1>
          <p className="mt-2 text-lg text-heading/80">
            This month:{' '}
            <span className="font-semibold text-heading">{formatINR(monthTotal)}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" />
          Add Expense
        </button>
      </div>

      <DataTable<ExpenseRow>
        data={rows}
        columns={columns}
        isLoading={loading}
        emptyMessage="No expenses yet."
        emptyAction={{ label: 'Add Expense', onClick: () => setModalOpen(true) }}
        exportFileName="expenses"
        canDelete={hasPermission('delete_expenses')}
        canDownload={hasPermission('download')}
      />

      <ExpenseForm isOpen={modalOpen} onClose={() => setModalOpen(false)} onSuccess={load} />
    </div>
  );
}
