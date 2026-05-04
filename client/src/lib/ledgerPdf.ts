import { formatDate, formatINR } from './format';

export type LedgerPdfRow = {
  sno: string | number;
  date: string | null;
  particulars: string;
  cement_type?: string | null;
  destination?: string | null;
  qty: number;
  rate: number;
  debit: number;
  credit: number;
  balance: number;
};

export type LedgerPdfOptions = {
  title?: string;
  partyName: string;
  partyType?: string | null;
  partyPhone?: string | null;
  partyLocation?: string | null;
  partyDistrict?: string | null;
  isSupplier?: boolean;
  rows: LedgerPdfRow[];
  totals: {
    totalBags?: number;
    totalDebit: number;
    totalCredit: number;
    outstanding: number;
  };
  debitLabel?: string;
  creditLabel?: string;
  balanceLabel?: string;
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

function formatTypeLabel(type: string | null | undefined): string {
  if (!type) return '—';
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function generatedAt(): string {
  const d = new Date();
  return (
    d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  );
}

function buildHtml(opts: LedgerPdfOptions): string {
  const {
    title = 'Ledger Statement',
    partyName,
    partyType,
    partyPhone,
    partyLocation,
    partyDistrict,
    isSupplier = false,
    rows,
    totals,
    debitLabel = isSupplier ? 'Paid by Us' : 'Debit (Dr)',
    creditLabel = isSupplier ? 'Goods Received (Cr)' : 'Credit (Cr)',
    balanceLabel = 'Balance',
  } = opts;

  const locationLine = [partyLocation, partyDistrict].filter(Boolean).join(', ');
  const outstandingAbs = Math.abs(totals.outstanding);

  let outstandingLabel: string;
  if (totals.outstanding === 0) {
    outstandingLabel = 'Settled';
  } else if (isSupplier) {
    outstandingLabel = totals.outstanding > 0 ? 'We owe them (payable)' : 'They owe us (advance)';
  } else {
    outstandingLabel = totals.outstanding > 0 ? 'They owe us (receivable)' : 'We owe them (advance)';
  }

  const rowsHtml = rows
    .map((r, idx) => {
      const isOpeningRow = typeof r.sno === 'string' && r.sno === '—';
      const rowCls = isOpeningRow ? 'row-opening' : idx % 2 === 0 ? 'row-even' : 'row-odd';
      return `
        <tr class="${rowCls}">
          <td class="col-sno">${escapeHtml(r.sno)}</td>
          <td class="col-date">${r.date ? escapeHtml(formatDate(r.date)) : '—'}</td>
          <td class="col-particulars">${escapeHtml(r.particulars)}</td>
          <td class="col-type">${r.cement_type ? escapeHtml(r.cement_type) : '—'}</td>
          <td class="col-destination">${r.destination ? escapeHtml(r.destination) : '—'}</td>
          <td class="col-qty num">${r.qty > 0 ? escapeHtml(r.qty) : '—'}</td>
          <td class="col-rate num">${r.rate > 0 ? escapeHtml(formatINR(r.rate)) : '—'}</td>
          <td class="col-debit num">${r.debit > 0 ? escapeHtml(formatINR(r.debit)) : '—'}</td>
          <td class="col-credit num">${r.credit > 0 ? escapeHtml(formatINR(r.credit)) : '—'}</td>
          <td class="col-balance num">${escapeHtml(formatINR(r.balance))}</td>
        </tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(partyName)} — Ledger</title>
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
      border-bottom: 2px solid #111827;
      padding-bottom: 6px; margin-bottom: 10px;
    }
    .brand-name { font-size: 20px; font-weight: 700; letter-spacing: .3px; color: #111827; }
    .brand-subtitle { font-size: 11px; color: #6b7280; margin-top: 2px; }
    .doc-meta { text-align: right; font-size: 10px; color: #6b7280; }
    .doc-title { font-size: 13px; font-weight: 600; color: #111827; margin-bottom: 2px; }

    .party-block {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin: 10px 0 12px; gap: 12px;
    }
    .party-left { flex: 1; }
    .party-name { font-size: 16px; font-weight: 700; color: #111827; }
    .party-meta { margin-top: 3px; font-size: 11px; color: #4b5563; }
    .party-meta span + span::before { content: "  ·  "; color: #9ca3af; }
    .party-type {
      display: inline-block; margin-top: 4px;
      padding: 2px 8px; border-radius: 999px;
      font-size: 10px; font-weight: 600; text-transform: capitalize;
      background: #eef2ff; color: #3730a3;
    }

    .outstanding-box {
      min-width: 170px; text-align: right;
      padding: 6px 10px; border: 1px solid #e5e7eb; border-radius: 6px;
      background: #f9fafb;
    }
    .outstanding-label { font-size: 10px; text-transform: uppercase; letter-spacing: .6px; color: #6b7280; }
    .outstanding-amount { font-size: 18px; font-weight: 700; margin-top: 2px; }
    .outstanding-amount.positive { color: #b91c1c; }
    .outstanding-amount.negative { color: #047857; }
    .outstanding-amount.zero { color: #047857; }
    .outstanding-note { font-size: 10px; color: #6b7280; margin-top: 1px; }

    table.ledger {
      width: 100%; border-collapse: collapse; margin-top: 4px;
    }
    table.ledger thead th {
      background: #f3f4f6;
      border-bottom: 1.5px solid #111827;
      padding: 6px 8px;
      text-align: left;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: .4px;
      color: #374151;
      font-weight: 600;
    }
    table.ledger tbody td {
      padding: 5px 8px;
      border-bottom: 1px solid #e5e7eb;
      vertical-align: top;
    }
    table.ledger td.num, table.ledger th.num { text-align: right; white-space: nowrap; }
    table.ledger th.num { text-align: right; }
    .col-sno        { width: 4%; }
    .col-date       { width: 8%; white-space: nowrap; }
    .col-particulars{ width: 22%; }
    .col-type       { width: 8%; }
    .col-destination{ width: 12%; }
    .col-qty        { width: 6%; }
    .col-rate       { width: 8%; }
    .col-debit      { width: 10%; }
    .col-credit     { width: 10%; }
    .col-balance    { width: 12%; font-weight: 600; }

    tr.row-opening td { background: #fffbeb; font-weight: 600; }
    tr.row-even td    { background: #ffffff; }
    tr.row-odd td     { background: #fafafa; }

    .totals-row td {
      border-top: 1.5px solid #111827 !important;
      background: #f9fafb !important;
      font-weight: 700;
      font-size: 11.5px;
    }

    .footer {
      display: flex; justify-content: space-between; align-items: center;
      margin-top: 14px; padding-top: 8px;
      border-top: 1px solid #e5e7eb;
      font-size: 10px; color: #6b7280;
    }

    .actions {
      position: fixed; top: 10px; right: 10px; z-index: 1000;
      display: flex; gap: 8px;
    }
    .actions button {
      font: inherit; font-size: 12px;
      padding: 8px 14px; border-radius: 6px;
      border: 1px solid #d1d5db; background: #fff; color: #111827;
      cursor: pointer;
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
        <div class="brand-subtitle">Business ledger &amp; account statement</div>
      </div>
      <div class="doc-meta">
        <div class="doc-title">${escapeHtml(title)}</div>
        <div>Generated: ${escapeHtml(generatedAt())}</div>
      </div>
    </div>

    <div class="party-block">
      <div class="party-left">
        <div class="party-name">${escapeHtml(partyName)}</div>
        <div class="party-meta">
          ${locationLine ? `<span>${escapeHtml(locationLine)}</span>` : ''}
          ${partyPhone ? `<span>${escapeHtml(partyPhone)}</span>` : ''}
        </div>
        ${partyType ? `<div class="party-type">${escapeHtml(formatTypeLabel(partyType))}</div>` : ''}
      </div>
      <div class="outstanding-box">
        <div class="outstanding-label">Current Outstanding</div>
        <div class="outstanding-amount ${
          totals.outstanding > 0 ? 'positive' : totals.outstanding < 0 ? 'negative' : 'zero'
        }">${escapeHtml(formatINR(outstandingAbs))}</div>
        <div class="outstanding-note">${escapeHtml(outstandingLabel)}</div>
      </div>
    </div>

    <table class="ledger">
      <thead>
        <tr>
          <th class="col-sno">S.No</th>
          <th class="col-date">Date</th>
          <th class="col-particulars">Particulars</th>
          <th class="col-type">Type</th>
          <th class="col-destination">Destination</th>
          <th class="col-qty num">Qty</th>
          <th class="col-rate num">Rate</th>
          <th class="col-debit num">${escapeHtml(debitLabel)}</th>
          <th class="col-credit num">${escapeHtml(creditLabel)}</th>
          <th class="col-balance num">${escapeHtml(balanceLabel)}</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml || `<tr><td colspan="10" style="text-align:center; padding:24px; color:#6b7280;">No ledger entries.</td></tr>`}
        <tr class="totals-row">
          <td colspan="7" style="text-align:right;">Totals</td>
          <td class="num">${escapeHtml(formatINR(totals.totalDebit))}</td>
          <td class="num">${escapeHtml(formatINR(totals.totalCredit))}</td>
          <td class="num">${escapeHtml(formatINR(totals.outstanding))}</td>
        </tr>
      </tbody>
    </table>

    <div class="footer">
      <div>${rows.length} ${rows.length === 1 ? 'entry' : 'entries'}${totals.totalBags ? ` · ${totals.totalBags} bags` : ''}</div>
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

export function openLedgerPdf(opts: LedgerPdfOptions): boolean {
  const html = buildHtml(opts);
  const win = window.open('', '_blank', 'width=1200,height=800');
  if (!win) {
    // popup blocked
    return false;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  return true;
}
