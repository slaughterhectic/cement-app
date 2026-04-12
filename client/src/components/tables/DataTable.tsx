import { useEffect, useMemo, useRef, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  type RowSelectionState,
  type PaginationState,
  type Row,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown, ChevronsUpDown, Download, Trash2, Eye, Search } from 'lucide-react';
import * as XLSX from 'xlsx';

export type { ColumnDef };

const DEFAULT_PAGE_SIZE = 20;

function globalFilterFn<T>(row: Row<T>, _columnId: string, filterValue: string): boolean {
  const q = String(filterValue).toLowerCase().trim();
  if (!q) return true;
  return row
    .getVisibleCells()
    .some((cell) => {
      if (cell.column.id === 'select') return false;
      const v = cell.getValue();
      return v != null && String(v).toLowerCase().includes(q);
    });
}

export type DataTableProps<T> = {
  data: T[];
  columns: ColumnDef<T, any>[];
  isLoading?: boolean;
  emptyMessage?: string;
  emptyAction?: { label: string; onClick: () => void };
  enableSelection?: boolean;
  onDeleteSelected?: (ids: number[]) => void;
  /** Used when `enableSelection` is true to resolve numeric ids for delete/export. Defaults to `(row) => (row as { id: number }).id`. */
  getRowId?: (row: T) => number;
  pageSize?: number;
  exportFileName?: string;
  /** Optional extra CSS classes per row. When provided, overrides the default alternating row background. */
  getRowClassName?: (row: T) => string | undefined;
  canDelete?: boolean;
  canDownload?: boolean;
  initialColumnVisibility?: VisibilityState;
};

export function DataTable<T>({
  data,
  columns,
  isLoading = false,
  emptyMessage = 'No rows to display.',
  emptyAction,
  enableSelection = false,
  onDeleteSelected,
  getRowId: getRowIdProp,
  pageSize: pageSizeProp = DEFAULT_PAGE_SIZE,
  exportFileName = 'export',
  getRowClassName,
  canDelete = true,
  canDownload = true,
  initialColumnVisibility = {},
}: DataTableProps<T>) {
  const getRowId = getRowIdProp ?? ((row: T) => (row as { id: number }).id);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(initialColumnVisibility);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: pageSizeProp,
  });
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false);
  const columnsMenuRef = useRef<HTMLDivElement>(null);
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPagination((p) => ({ ...p, pageSize: pageSizeProp }));
  }, [pageSizeProp]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (columnsMenuRef.current && !columnsMenuRef.current.contains(e.target as Node)) {
        setColumnsMenuOpen(false);
      }
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  const tableColumns = useMemo<ColumnDef<T, any>[]>(() => {
    if (!enableSelection) return columns;

    const selectCol: ColumnDef<T, any> = {
      id: 'select',
      size: 48,
      enableSorting: false,
      enableHiding: false,
      header: ({ table }) => (
        <input
          ref={headerCheckboxRef}
          type="checkbox"
          className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          aria-label="Select all on page"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onChange={row.getToggleSelectedHandler()}
          aria-label="Select row"
        />
      ),
    };

    return [selectCol, ...columns];
  }, [columns, enableSelection]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      globalFilter,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn,
    getRowId: (row) => String(getRowId(row)),
    enableRowSelection: enableSelection,
  });

  useEffect(() => {
    const el = headerCheckboxRef.current;
    if (!el) return;
    el.indeterminate = table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected();
  }, [table, rowSelection]);

  const filteredCount = table.getFilteredRowModel().rows.length;
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const start = filteredCount === 0 ? 0 : pageIndex * pageSize + 1;
  const end = Math.min((pageIndex + 1) * pageSize, filteredCount);

  const selectedIds = table.getFilteredSelectedRowModel().rows.map((r) => getRowId(r.original));

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    onDeleteSelected?.(selectedIds);
    setRowSelection({});
  };

  const handleExportExcel = () => {
    const rows = table.getFilteredRowModel().rows.map((r) => {
      const obj: Record<string, unknown> = {};
      r.getVisibleCells().forEach((cell) => {
        if (cell.column.id === 'select') return;
        const col = cell.column;
        const h = col.columnDef.header;
        const key =
          typeof h === 'string' && h.length > 0
            ? h
            : String((col.columnDef as { accessorKey?: string }).accessorKey ?? col.id);
        obj[key] = cell.getValue();
      });
      return obj;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    const base = exportFileName.replace(/\.xlsx$/i, '');
    XLSX.writeFile(wb, `${base}.xlsx`);
  };

  const toggleableColumns = table.getAllColumns().filter((c) => c.getCanHide());

  const showEmpty = !isLoading && filteredCount === 0;
  const skeletonRows = 8;

  return (
    <div className="rounded-lg border border-card-border bg-white">
      <div className="flex flex-wrap items-center gap-3 border-b border-card-border px-4 py-3">
        <div className="relative min-w-[200px] flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={globalFilter}
            onChange={(e) => {
              setGlobalFilter(e.target.value);
              table.setPageIndex(0);
            }}
            placeholder="Search…"
            className="w-full rounded-md border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none ring-brand-500 placeholder:text-gray-400 focus:border-brand-400 focus:ring-2"
            aria-label="Search table"
          />
        </div>

        <div className="relative" ref={columnsMenuRef}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setColumnsMenuOpen((o) => !o);
            }}
            className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <Eye className="h-4 w-4" />
            Columns
          </button>
          {columnsMenuOpen && (
            <div className="absolute right-0 z-20 mt-1 w-52 rounded-md border border-card-border bg-white py-1 shadow-lg">
              {toggleableColumns.map((column) => (
                <label
                  key={column.id}
                  className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300"
                    checked={column.getIsVisible()}
                    onChange={column.getToggleVisibilityHandler()}
                  />
                  <span className="truncate">
                    {typeof column.columnDef.header === 'string'
                      ? column.columnDef.header
                      : column.id}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {canDownload && (
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            Export Excel
          </button>
        )}

        {enableSelection && canDelete && (
          <button
            type="button"
            onClick={handleDeleteSelected}
            disabled={selectedIds.length === 0 || !onDeleteSelected}
            className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 shadow-sm hover:bg-red-50 disabled:pointer-events-none disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" />
            Delete selected
            {selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
          </button>
        )}

        <span className="ml-auto text-sm text-gray-600">
          <span className="font-medium text-gray-900">{filteredCount}</span>
          {filteredCount === 1 ? ' row' : ' rows'}
          {data.length !== filteredCount && (
            <span className="text-gray-400"> (filtered from {data.length})</span>
          )}
        </span>
      </div>

      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="min-w-[640px] divide-y divide-gray-100 px-4 py-3" role="status" aria-label="Loading">
            {Array.from({ length: skeletonRows }, (_, i) => (
              <div
                key={i}
                className="flex gap-4 py-3"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="h-4 flex-1 animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
              </div>
            ))}
          </div>
        ) : showEmpty ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 px-4 py-12 text-center">
            <p className="text-sm text-gray-600">{emptyMessage}</p>
            {emptyAction && (
              <button
                type="button"
                onClick={emptyAction.onClick}
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                {emptyAction.label}
              </button>
            )}
          </div>
        ) : (
          <table className="min-w-full border-collapse">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const sorted = header.column.getIsSorted();
                    return (
                      <th
                        key={header.id}
                        colSpan={header.colSpan}
                        className={`sticky top-0 z-10 whitespace-nowrap bg-gray-50 px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 ${
                          canSort ? 'cursor-pointer select-none hover:bg-gray-100' : ''
                        }`}
                        onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                        onKeyDown={
                          canSort
                            ? (e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  header.column.getToggleSortingHandler()?.(e);
                                }
                              }
                            : undefined
                        }
                        tabIndex={canSort ? 0 : undefined}
                        role={canSort ? 'button' : undefined}
                        aria-sort={
                          sorted === 'asc'
                            ? 'ascending'
                            : sorted === 'desc'
                              ? 'descending'
                              : canSort
                                ? 'none'
                                : undefined
                        }
                      >
                        <div className="inline-flex items-center gap-1">
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort && (
                            <span className="text-gray-400">
                              {sorted === 'asc' ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : sorted === 'desc' ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronsUpDown className="h-4 w-4 opacity-50" />
                              )}
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row, index) => {
                const customCls = getRowClassName ? getRowClassName(row.original) : undefined;
                const bgCls = customCls ?? (index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50');
                return (
                <tr
                  key={row.id}
                  className={`border-b border-gray-100 transition-colors ${bgCls} hover:brightness-95`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-sm text-gray-900">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {!isLoading && !showEmpty && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-card-border px-4 py-3">
          <p className="text-sm text-gray-600">
            Showing{' '}
            <span className="font-medium text-gray-900">
              {start}-{end}
            </span>{' '}
            of <span className="font-medium text-gray-900">{filteredCount}</span>
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              Rows per page
              <select
                className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900"
                value={pageSize}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  table.setPageSize(next);
                  table.setPageIndex(0);
                }}
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {pageIndex + 1} of {table.getPageCount() || 1}
              </span>
              <button
                type="button"
                className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
