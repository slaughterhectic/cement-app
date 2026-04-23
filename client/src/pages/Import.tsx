import { useState, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { api } from '../lib/api';
import { useToastStore } from '../lib/store';
import { Upload, FileSpreadsheet, Check, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';

type FileTypeOption = 'auto' | 'sale_ledger' | 'daily_sale' | 'godown';

interface ParseSheet {
  name: string;
  headers: unknown[];
  preview: unknown[][];
  totalRows: number;
}

interface ParseResult {
  type: 'sale_ledger' | 'daily_sale' | 'godown';
  sheets: ParseSheet[];
  totalSheets: number;
}

interface SheetData {
  name: string;
  rows: Record<string, unknown>[];
}

const FILE_TYPE_OPTIONS: { value: FileTypeOption; label: string }[] = [
  { value: 'sale_ledger', label: 'Sale Ledger' },
  { value: 'daily_sale', label: 'Daily Sale Report' },
  { value: 'godown', label: 'Godown Stock' },
  { value: 'auto', label: 'Auto-detect' },
];

const SALE_LEDGER_TARGETS: { key: string; label: string; synonyms: string[] }[] = [
  { key: 'date', label: 'Date', synonyms: ['voucher date', 'dt', 'txn date'] },
  { key: 'debit', label: 'Debit', synonyms: ['dr', 'debit amount'] },
  { key: 'credit', label: 'Credit', synonyms: ['cr', 'credit amount'] },
  { key: 'particulars', label: 'Particulars', synonyms: ['narration', 'description', 'details'] },
  { key: 'qty', label: 'Quantity', synonyms: ['quantity', 'bags', 'qty'] },
  { key: 'rate', label: 'Rate', synonyms: ['sale rate', 'price'] },
];

const DAILY_SALE_TARGETS: { key: string; label: string; synonyms: string[] }[] = [
  { key: 'date', label: 'Date', synonyms: ['voucher date', 'bill date'] },
  { key: 'sale_to', label: 'Sale To', synonyms: ['party', 'customer', 'dealer'] },
  { key: 'cement_name', label: 'Cement Name', synonyms: ['brand', 'cement'] },
  { key: 'cement_type', label: 'Cement Type', synonyms: ['type', 'grade'] },
  { key: 'quantity', label: 'Quantity', synonyms: ['bags', 'qty'] },
  { key: 'sale_rate', label: 'Sale Rate', synonyms: ['rate', 'price'] },
  { key: 'destination', label: 'Destination', synonyms: [] },
  { key: 'truck_number', label: 'Truck Number', synonyms: ['truck', 'vehicle'] },
];

function normalizeHeader(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[_-]+/g, ' ');
}

function autoMap(
  headers: string[],
  targets: { key: string; synonyms: string[] }[],
): Record<string, string> {
  const mapping: Record<string, string> = {};
  const headerStrs = headers.map((h) => String(h));
  const normList = headerStrs.map((h) => normalizeHeader(h));

  for (const t of targets) {
    const candidates = [t.key, ...t.synonyms].map(normalizeHeader);
    let idx = -1;
    for (const c of candidates) {
      idx = normList.findIndex((h) => h === c);
      if (idx >= 0) break;
    }
    if (idx < 0) {
      for (const c of candidates) {
        idx = normList.findIndex((h) => h.includes(c) || c.includes(h));
        if (idx >= 0) break;
      }
    }
    if (idx >= 0) mapping[t.key] = headerStrs[idx];
  }
  return mapping;
}

function workbookToSheetData(wb: XLSX.WorkBook): SheetData[] {
  return wb.SheetNames.map((name) => {
    const sheet = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false });
    return { name, rows };
  });
}

const STEPS = [
  { n: 1, title: 'File upload' },
  { n: 2, title: 'Preview' },
  { n: 3, title: 'Column mapping' },
  { n: 4, title: 'Import' },
];

export default function Import() {
  const addToast = useToastStore((s) => s.addToast);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [fileType, setFileType] = useState<FileTypeOption>('auto');
  const [file, setFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [fullSheets, setFullSheets] = useState<SheetData[]>([]);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [selectedSheetIdx, setSelectedSheetIdx] = useState(0);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importDone, setImportDone] = useState<{
    sales: number;
    parties: number;
    payments: number;
    purchases: number;
  } | null>(null);

  const resetFlow = useCallback(() => {
    setStep(1);
    setFile(null);
    setWorkbook(null);
    setFullSheets([]);
    setParseResult(null);
    setParseError(null);
    setSelectedSheetIdx(0);
    setColumnMapping({});
    setImporting(false);
    setImportProgress(0);
    setImportDone(null);
  }, []);

  const processFile = useCallback(
    async (f: File) => {
      setParseError(null);
      setImportDone(null);
      setFile(f);
      try {
        const buf = await f.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        setWorkbook(wb);
        setFullSheets(workbookToSheetData(wb));
        const parsed = (await api.import.parse(f, fileType)) as ParseResult;
        setParseResult(parsed);
        setSelectedSheetIdx(0);
        setStep(2);
      } catch (e) {
        setFile(null);
        setWorkbook(null);
        setFullSheets([]);
        setParseResult(null);
        const msg = e instanceof Error ? e.message : 'Parse failed';
        setParseError(msg);
        addToast(msg, 'error');
      }
    },
    [fileType, addToast],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const f = e.dataTransfer.files?.[0];
      if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))) void processFile(f);
      else if (f) addToast('Please upload an Excel file (.xlsx or .xls).', 'error');
    },
    [processFile, addToast],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const activeSheet = parseResult?.sheets[selectedSheetIdx];
  const headerCells: string[] = (activeSheet?.headers ?? []).map((h) => String(h));

  const targets =
    parseResult?.type === 'sale_ledger'
      ? SALE_LEDGER_TARGETS
      : parseResult?.type === 'daily_sale'
        ? DAILY_SALE_TARGETS
        : [];

  const previewRows = activeSheet?.preview ?? [];
  const previewHeaderRow = previewRows[0] as unknown[] | undefined;
  const previewBody = previewRows.length > 1 ? previewRows.slice(1, 11) : [];

  const totalRowsAllSheets =
    parseResult?.sheets.reduce((acc, s) => acc + (s.totalRows ?? 0), 0) ?? 0;

  const runImport = async () => {
    if (!parseResult || !workbook) return;
    if (parseResult.type === 'godown') {
      addToast('Godown stock import is not supported by the server yet.', 'error');
      return;
    }
    setImporting(true);
    setImportProgress(10);
    setImportDone(null);
    const tick = window.setInterval(() => {
      setImportProgress((p) => (p >= 90 ? p : p + 8));
    }, 200);
    try {
      const data = fullSheets.map((s) => ({ name: s.name, rows: s.rows }));
      const res = (await api.import.execute({
        type: parseResult.type,
        data,
        columnMapping,
      })) as { success?: boolean; imported?: { sales: number; parties: number; payments: number; purchases: number } };
      setImportProgress(100);
      if (res.imported) setImportDone(res.imported);
      addToast('Import completed.', 'success');
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Import failed', 'error');
    } finally {
      clearInterval(tick);
      setImporting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-heading">Excel import</h1>
        <p className="mt-1 text-sm text-heading/60">Upload a ledger or daily sale file, map columns, and import.</p>
      </header>

      <nav aria-label="Progress">
        <ol className="flex flex-wrap items-center gap-2">
          {STEPS.map((s) => {
            const active = step === s.n;
            const done = step > s.n;
            return (
              <li key={s.n} className="flex items-center gap-2">
                {s.n > 1 && <span className="hidden text-gray-300 sm:inline">—</span>}
                <div
                  className={[
                    'flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium',
                    done
                      ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200'
                      : active
                        ? 'border-brand-400 bg-brand-50 text-brand-800'
                        : 'border-card-border bg-card text-heading/60',
                  ].join(' ')}
                >
                  {done ? (
                    <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-card text-xs font-bold text-current">
                      {s.n}
                    </span>
                  )}
                  <span>
                    Step {s.n}/4 · {s.title}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </nav>

      {step === 1 && (
        <section className="space-y-6">
          <div>
            <label className="text-sm font-medium text-heading/80">File type</label>
            <select
              value={fileType}
              onChange={(e) => setFileType(e.target.value as FileTypeOption)}
              className="mt-1 block w-full max-w-md rounded-md border border-card-border bg-card px-3 py-2 text-sm outline-none ring-brand-500 focus:border-brand-400 focus:ring-2"
            >
              {FILE_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void processFile(f);
              e.target.value = '';
            }}
          />

          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
            }}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-card-border bg-surface/80 px-6 py-16 text-center transition-colors hover:border-brand-400 hover:bg-brand-50/30"
          >
            <Upload className="mb-3 h-10 w-10 text-heading/50" />
            <p className="text-sm font-medium text-heading/80">Drop your Excel file here or click to browse</p>
            <p className="mt-1 text-xs text-heading/60">.xlsx or .xls</p>
          </div>

          {parseError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 px-4 py-3 text-sm text-red-800 dark:text-red-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {parseError}
            </div>
          )}

          {file && (
            <p className="text-sm text-heading/70">
              Selected: <span className="font-medium text-heading">{file.name}</span>
            </p>
          )}
        </section>
      )}

      {step === 2 && parseResult && (
        <section className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-card-border bg-card p-4 shadow-sm">
              <p className="text-xs font-medium uppercase text-heading/60">Detected type</p>
              <p className="mt-1 font-semibold capitalize text-heading">
                {parseResult.type.replace(/_/g, ' ')}
              </p>
            </div>
            <div className="rounded-lg border border-card-border bg-card p-4 shadow-sm">
              <p className="text-xs font-medium uppercase text-heading/60">Sheets</p>
              <p className="mt-1 font-semibold text-heading">{parseResult.totalSheets}</p>
            </div>
            <div className="rounded-lg border border-card-border bg-card p-4 shadow-sm">
              <p className="text-xs font-medium uppercase text-heading/60">Total rows (approx.)</p>
              <p className="mt-1 font-semibold text-heading">{totalRowsAllSheets}</p>
            </div>
          </div>

          {parseResult.sheets.length > 1 && (
            <div>
              <label className="text-sm font-medium text-heading/80">Preview sheet</label>
              <select
                value={selectedSheetIdx}
                onChange={(e) => setSelectedSheetIdx(Number(e.target.value))}
                className="mt-1 block w-full max-w-md rounded-md border border-card-border bg-card px-3 py-2 text-sm"
              >
                {parseResult.sheets.map((s, i) => (
                  <option key={s.name} value={i}>
                    {s.name} ({s.totalRows} rows)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="overflow-hidden rounded-lg border border-card-border bg-card shadow-sm">
            <div className="border-b border-card-border px-4 py-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-heading">
                <FileSpreadsheet className="h-4 w-4" />
                Preview (first 10 data rows)
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-surface">
                    {(previewHeaderRow ?? headerCells).map((cell, i) => (
                      <th key={i} className="whitespace-nowrap border-b border-card-border px-3 py-2 text-left font-medium text-heading/70">
                        {String(cell ?? `Col ${i + 1}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewBody.length === 0 ? (
                    <tr>
                      <td colSpan={Math.max(1, (previewHeaderRow ?? headerCells).length)} className="px-3 py-8 text-center text-heading/60">
                        No preview rows.
                      </td>
                    </tr>
                  ) : (
                    previewBody.map((row, ri) => (
                      <tr key={ri} className={ri % 2 === 0 ? 'bg-card' : 'bg-surface/50'}>
                        {(row as unknown[]).map((cell, ci) => (
                          <td key={ci} className="border-b border-card-border px-3 py-2 text-gray-800">
                            {cell === '' || cell == null ? '—' : String(cell)}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                resetFlow();
              }}
              className="inline-flex items-center gap-2 rounded-md border border-card-border bg-card px-4 py-2 text-sm font-medium text-heading/80 hover:bg-surface"
            >
              <ArrowLeft className="h-4 w-4" />
              Start over
            </button>
            <button
              type="button"
              onClick={() => {
                if (!parseResult) return;
                const headers =
                  parseResult.sheets[selectedSheetIdx]?.headers.map((h) => String(h)) ?? [];
                const tdefs =
                  parseResult.type === 'sale_ledger'
                    ? SALE_LEDGER_TARGETS
                    : parseResult.type === 'daily_sale'
                      ? DAILY_SALE_TARGETS
                      : [];
                setColumnMapping(
                  autoMap(
                    headers,
                    tdefs.map((t) => ({ key: t.key, synonyms: t.synonyms })),
                  ),
                );
                setStep(3);
              }}
              className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      )}

      {step === 3 && parseResult && (
        <section className="space-y-6">
          {parseResult.type === 'godown' ? (
            <p className="text-sm text-heading/70">
              Godown stock files do not require column mapping on this screen. You can continue to import when supported.
            </p>
          ) : (
            <div className="rounded-lg border border-card-border bg-card shadow-sm">
              <div className="border-b border-card-border px-4 py-3">
                <h2 className="text-sm font-semibold text-heading">Map columns</h2>
                <p className="mt-1 text-xs text-heading/60">
                  Match each database field to a column from your sheet (auto-filled when names match).
                </p>
              </div>
              <ul className="divide-y divide-card-border">
                {targets.map((t) => (
                  <li key={t.key} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm font-medium text-gray-800">{t.label}</span>
                    <select
                      value={columnMapping[t.key] ?? ''}
                      onChange={(e) =>
                        setColumnMapping((m) => ({
                          ...m,
                          [t.key]: e.target.value,
                        }))
                      }
                      className="w-full rounded-md border border-card-border bg-card px-3 py-2 text-sm sm:max-w-xs"
                    >
                      <option value="">— Not mapped —</option>
                      {headerCells.map((h) => (
                        <option key={`${t.key}-${h}`} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 rounded-md border border-card-border bg-card px-4 py-2 text-sm font-medium text-heading/80 hover:bg-surface"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      )}

      {step === 4 && parseResult && (
        <section className="space-y-6">
          <div className="rounded-lg border border-card-border bg-card p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-heading">Run import</h2>
            <p className="mt-2 text-sm text-heading/70">
              Type: <span className="font-medium text-heading">{parseResult.type.replace(/_/g, ' ')}</span>
              {file && (
                <>
                  {' '}
                  · File: <span className="font-medium text-heading">{file.name}</span>
                </>
              )}
            </p>

            {importing && (
              <div className="mt-4">
                <div className="h-2 w-full overflow-hidden rounded-full bg-card-border/60">
                  <div
                    className="h-full bg-brand-500 transition-all duration-200 ease-out"
                    style={{ width: `${importProgress}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-heading/60">Importing…</p>
              </div>
            )}

            {importDone && !importing && (
              <div className="mt-4 rounded-md border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 px-4 py-3 text-sm text-emerald-900 dark:text-emerald-100">
                <p className="font-medium">Import summary</p>
                <p className="mt-1">
                  Imported{' '}
                  <strong>{importDone.sales}</strong> sales, <strong>{importDone.parties}</strong> parties,{' '}
                  <strong>{importDone.payments}</strong> payments
                  {importDone.purchases > 0 && (
                    <>
                      , <strong>{importDone.purchases}</strong> purchases
                    </>
                  )}
                  .
                </p>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={importing}
                className="inline-flex items-center gap-2 rounded-md border border-card-border bg-card px-4 py-2 text-sm font-medium text-heading/80 hover:bg-surface disabled:opacity-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                type="button"
                onClick={() => void runImport()}
                disabled={importing || parseResult.type === 'godown'}
                className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:pointer-events-none disabled:opacity-50"
              >
                {importing ? 'Importing…' : 'Import'}
              </button>
              {!importing && (
                <button
                  type="button"
                  onClick={resetFlow}
                  className="inline-flex items-center gap-2 rounded-md border border-card-border bg-card px-4 py-2 text-sm font-medium text-heading/80 hover:bg-surface"
                >
                  New file
                </button>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
