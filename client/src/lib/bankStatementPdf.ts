import { formatDate, formatINR } from './format';

export type BankStatementRow = {
  date: string;
  particulars: string;
  counterparty: string | null;
  inflow: number;
  outflow: number;
};

export type BankStatementOptions = {
  bankName: string;
  opening: number;
  totalReceived: number;
  totalPaid: number;
  closingBalance: number;
  rows: BankStatementRow[];
};

function escapeHtml(s: string | number | null | undefined): string {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function generatedAt(): string {
  const d = new Date();
  return (
    d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  );
}

function buildHtml(opts: BankStatementOptions): string {
  const { bankName, opening, totalReceived, totalPaid, closingBalance, rows } = opts;

  // Server returns rows newest-first. Sort oldest-first so the running balance matches the
  // bank's natural order, then flip back when rendering so the PDF still reads top-down.
  const ordered = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  let running = opening;
  const withBalance = ordered.map((r) => {
    running = running + Number(r.inflow || 0) - Number(r.outflow || 0);
    return { ...r, balance: running };
  });
  const display = withBalance.slice().reverse();

  const rowsHtml = display
    .map((r, idx) => `
      <tr class="${idx % 2 === 0 ? 'row-even' : 'row-odd'}">
        <td class="col-date">${escapeHtml(formatDate(r.date))}</td>
        <td class="col-particulars">${escapeHtml(r.particulars)}</td>
        <td class="col-counter">${escapeHtml(r.counterparty || '—')}</td>
        <td class="col-in num">${r.inflow > 0 ? escapeHtml(formatINR(r.inflow)) : '—'}</td>
        <td class="col-out num">${r.outflow > 0 ? escapeHtml(formatINR(r.outflow)) : '—'}</td>
        <td class="col-balance num">${escapeHtml(formatINR(r.balance))}</td>
      </tr>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(bankName)} — Bank Statement</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0; padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1f2937;
      font-size: 11px;
      background: #fff;
    }
    .container { padding: 6mm 4mm; }
    .brand-bar {
      display: flex; justify-content: space-between; align-items: flex-end;
      border-bottom: 2px solid #111827; padding-bottom: 6px; margin-bottom: 10px;
    }
    .brand-name { font-size: 20px; font-weight: 700; color: #111827; }
    .brand-subtitle { font-size: 11px; color: #6b7280; margin-top: 2px; }
    .doc-meta { text-align: right; font-size: 10px; color: #6b7280; }
    .doc-title { font-size: 13px; font-weight: 600; color: #111827; margin-bottom: 2px; }

    .summary-grid {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;
      margin: 10px 0 14px;
    }
    .summary-card {
      padding: 6px 10px; border: 1px solid #e5e7eb; border-radius: 6px; background: #f9fafb;
    }
    .summary-card .lbl { font-size: 10px; text-transform: uppercase; letter-spacing: .5px; color: #6b7280; }
    .summary-card .val { font-size: 16px; font-weight: 700; margin-top: 2px; color: #111827; }
    .summary-card .val.in { color: #047857; }
    .summary-card .val.out { color: #b91c1c; }
    .summary-card .val.bal.positive { color: #1d4ed8; }
    .summary-card .val.bal.negative { color: #b91c1c; }

    .bank-name { font-size: 16px; font-weight: 700; color: #111827; }

    table.ledger { width: 100%; border-collapse: collapse; margin-top: 4px; }
    table.ledger thead th {
      background: #f3f4f6; border-bottom: 1.5px solid #111827;
      padding: 6px 8px; text-align: left;
      font-size: 10px; text-transform: uppercase; letter-spacing: .4px;
      color: #374151; font-weight: 600;
    }
    table.ledger tbody td {
      padding: 5px 8px; border-bottom: 1px solid #e5e7eb; vertical-align: top;
    }
    table.ledger td.num, table.ledger th.num { text-align: right; white-space: nowrap; }
    .col-date { width: 10%; white-space: nowrap; }
    .col-particulars { width: 22%; }
    .col-counter { width: 30%; }
    .col-in, .col-out { width: 12%; }
    .col-balance { width: 14%; font-weight: 600; }
    tr.row-even td { background: #ffffff; }
    tr.row-odd td  { background: #fafafa; }
    .totals-row td {
      border-top: 1.5px solid #111827 !important;
      background: #f9fafb !important;
      font-weight: 700; font-size: 11.5px;
    }
    .footer {
      display: flex; justify-content: space-between; align-items: center;
      margin-top: 14px; padding-top: 8px; border-top: 1px solid #e5e7eb;
      font-size: 10px; color: #6b7280;
    }
    .actions {
      position: fixed; top: 10px; right: 10px; z-index: 1000;
      display: flex; gap: 8px;
    }
    .actions button {
      font: inherit; font-size: 12px; padding: 8px 14px; border-radius: 6px;
      border: 1px solid #d1d5db; background: #fff; color: #111827; cursor: pointer;
    }
    .actions button.primary { background: #1d4ed8; color: #fff; border-color: #1d4ed8; }
    @media print {
      .actions { display: none !important; }
      .container { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="actions">
    <button type="button" class="primary" onclick="window.print()">Save as PDF / Print</button>
    <button type="button" onclick="window.close()">Close</button>
  </div>

  <div class="container">
    <div class="brand-bar">
      <div>
        <div class="brand-name">armtech</div>
        <div class="brand-subtitle">Bank statement &amp; transaction history</div>
      </div>
      <div class="doc-meta">
        <div class="doc-title">${escapeHtml(bankName)} — Statement</div>
        <div>Generated: ${escapeHtml(generatedAt())}</div>
      </div>
    </div>

    <div class="bank-name">${escapeHtml(bankName)}</div>

    <div class="summary-grid">
      <div class="summary-card">
        <div class="lbl">Opening Balance</div>
        <div class="val">${escapeHtml(formatINR(opening))}</div>
      </div>
      <div class="summary-card">
        <div class="lbl">Total Received</div>
        <div class="val in">${escapeHtml(formatINR(totalReceived))}</div>
      </div>
      <div class="summary-card">
        <div class="lbl">Total Paid Out</div>
        <div class="val out">${escapeHtml(formatINR(totalPaid))}</div>
      </div>
      <div class="summary-card">
        <div class="lbl">Closing Balance</div>
        <div class="val bal ${closingBalance >= 0 ? 'positive' : 'negative'}">${escapeHtml(formatINR(closingBalance))}</div>
      </div>
    </div>

    <table class="ledger">
      <thead>
        <tr>
          <th class="col-date">Date</th>
          <th class="col-particulars">Particulars</th>
          <th class="col-counter">Counterparty</th>
          <th class="col-in num">In (₹)</th>
          <th class="col-out num">Out (₹)</th>
          <th class="col-balance num">Balance (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml || `<tr><td colspan="6" style="text-align:center; padding:24px; color:#6b7280;">No transactions.</td></tr>`}
        <tr class="totals-row">
          <td colspan="3" style="text-align:right;">Totals</td>
          <td class="num">${escapeHtml(formatINR(totalReceived))}</td>
          <td class="num">${escapeHtml(formatINR(totalPaid))}</td>
          <td class="num">${escapeHtml(formatINR(closingBalance))}</td>
        </tr>
      </tbody>
    </table>

    <div class="footer">
      <div>${rows.length} ${rows.length === 1 ? 'transaction' : 'transactions'}${rows.length === 500 ? ' (latest 500)' : ''}</div>
      <div>This statement is computer-generated and does not require a signature.</div>
    </div>
  </div>

  <script>
    window.addEventListener('load', function () {
      setTimeout(function () { try { window.print(); } catch (e) {} }, 250);
    });
  </script>
</body>
</html>`;
}

export function openBankStatementPdf(opts: BankStatementOptions): boolean {
  const html = buildHtml(opts);
  const win = window.open('', '_blank', 'width=1200,height=800');
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  return true;
}
