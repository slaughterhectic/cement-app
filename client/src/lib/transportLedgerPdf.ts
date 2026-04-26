import { formatDate, formatINR } from './format';

export type TransportLedgerRow = {
  kind: 'trip' | 'gps_rent';
  date: string;
  builty_number?: string | null;
  do_number?: string | null;
  truck_number?: string | null;
  party_name?: string | null;
  location?: string | null;
  dch_type?: string | null;
  material_type?: string | null;
  qty?: number;
  acc_freight_rate?: number;
  acc_amount?: number;
  commission_amount?: number;
  builty_charge?: number;
  diesel_advance?: number;
  cash_advance?: number;
  final_payment?: number;
  period?: string | null;
  amount?: number;
};

export type TransportLedgerPdfOptions = {
  ownerName: string;
  phone?: string | null;
  bankAccount?: string | null;
  ifsc?: string | null;
  beneficiary?: string | null;
  pan?: string | null;
  trucks: { truck_number: string; driver_name?: string | null }[];
  rows: TransportLedgerRow[];
  summary: {
    totalTrips: number;
    totalQty: number;
    totalAccAmount: number;
    totalCommission: number;
    totalBuiltyCharge: number;
    totalDieselAdvance: number;
    totalCashAdvance: number;
    totalFinalPayment: number;
    totalGpsRent: number;
    totalAdvancePaid?: number;
    netOwed: number;
  };
};

function esc(s: string | number | null | undefined): string {
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

function buildHtml(opts: TransportLedgerPdfOptions): string {
  const { ownerName, phone, bankAccount, ifsc, beneficiary, pan, trucks, rows, summary } = opts;
  const netLabel = summary.netOwed >= 0 ? 'Payable to Owner' : 'Owner Owes Us';
  const netClass = summary.netOwed >= 0 ? 'positive' : 'negative';

  const trucksLine = trucks.map((t) => t.truck_number).join(', ');

  const rowsHtml = rows
    .map((r, idx) => {
      const rowCls = idx % 2 === 0 ? 'row-even' : 'row-odd';
      if (r.kind === 'gps_rent') {
        return `
          <tr class="${rowCls} row-gps">
            <td>${esc(formatDate(r.date))}</td>
            <td colspan="7">GPS Rent — ${esc(r.period || '')}${r.truck_number ? ` · ${esc(r.truck_number)}` : ''}</td>
            <td class="num">—</td>
            <td class="num">—</td>
            <td class="num">—</td>
            <td class="num">—</td>
            <td class="num neg">−${esc(formatINR(Number(r.amount || 0)))}</td>
          </tr>`;
      }
      return `
        <tr class="${rowCls}">
          <td>${esc(formatDate(r.date))}</td>
          <td>${esc(r.builty_number || '—')}</td>
          <td>${esc(r.do_number || '—')}</td>
          <td>${esc(r.truck_number || '—')}</td>
          <td>${esc(r.party_name || '—')}${r.location ? ` · ${esc(r.location)}` : ''}</td>
          <td>${esc(r.dch_type || '—')}</td>
          <td class="num">${Number(r.qty || 0).toFixed(2)}</td>
          <td class="num">${esc(formatINR(Number(r.acc_freight_rate || 0)))}</td>
          <td class="num">${esc(formatINR(Number(r.acc_amount || 0)))}</td>
          <td class="num">${esc(formatINR(Number(r.commission_amount || 0)))}</td>
          <td class="num">${esc(formatINR(Number(r.builty_charge || 0)))}</td>
          <td class="num">${esc(formatINR(Number(r.diesel_advance || 0) + Number(r.cash_advance || 0)))}</td>
          <td class="num">${esc(formatINR(Number(r.final_payment || 0)))}</td>
        </tr>`;
    })
    .join('');

  const totalAdvancePaid = Number(summary.totalAdvancePaid || 0);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${esc(ownerName)} — Ledger</title>
  <style>
    @page { size: A4 landscape; margin: 8mm; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0; padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1f2937;
      font-size: 10px;
      background: #fff;
    }
    .container { padding: 4mm 2mm; }
    .brand-bar {
      display: flex; justify-content: space-between; align-items: flex-end;
      border-bottom: 2px solid #111827;
      padding-bottom: 6px; margin-bottom: 8px;
    }
    .brand-name { font-size: 18px; font-weight: 700; color: #111827; }
    .brand-subtitle { font-size: 10px; color: #6b7280; margin-top: 2px; }
    .doc-meta { text-align: right; font-size: 9px; color: #6b7280; }
    .doc-title { font-size: 12px; font-weight: 600; color: #111827; margin-bottom: 2px; }

    .party-block {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin: 8px 0 10px; gap: 12px;
    }
    .party-left { flex: 1; }
    .party-name { font-size: 15px; font-weight: 700; color: #111827; }
    .party-meta { margin-top: 3px; font-size: 10px; color: #4b5563; line-height: 1.5; }
    .party-meta .k { color: #9ca3af; margin-right: 4px; }

    .outstanding-box {
      min-width: 180px; text-align: right;
      padding: 6px 10px; border: 1px solid #e5e7eb; border-radius: 6px;
      background: #f9fafb;
    }
    .outstanding-label { font-size: 9px; text-transform: uppercase; letter-spacing: .6px; color: #6b7280; }
    .outstanding-amount { font-size: 17px; font-weight: 700; margin-top: 2px; }
    .outstanding-amount.positive { color: #047857; }
    .outstanding-amount.negative { color: #b91c1c; }

    table.ledger {
      width: 100%; border-collapse: collapse; margin-top: 4px;
      table-layout: fixed;
    }
    table.ledger thead th {
      background: #f3f4f6;
      border-bottom: 1.5px solid #111827;
      padding: 5px 4px;
      text-align: left;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: .3px;
      color: #374151;
      font-weight: 600;
    }
    table.ledger tbody td {
      padding: 4px;
      border-bottom: 1px solid #e5e7eb;
      vertical-align: top;
      word-wrap: break-word;
    }
    table.ledger td.num, table.ledger th.num { text-align: right; white-space: nowrap; }
    tr.row-even td { background: #ffffff; }
    tr.row-odd td  { background: #fafafa; }
    tr.row-gps td  { background: #fffbeb !important; font-style: italic; color: #4b5563; }
    .neg { color: #b91c1c; }
    .balance { font-weight: 700; color: #1e40af; }

    tfoot td {
      border-top: 1.5px solid #111827 !important;
      background: #eef2ff !important;
      font-weight: 700;
      font-size: 10.5px;
      padding: 6px 4px;
    }
    tfoot tr.final-row td {
      background: #ecfdf5 !important;
      color: #047857 !important;
      border-top: 1.5px solid #047857 !important;
      font-size: 11px;
    }

    .summary-grid {
      display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px;
      margin: 10px 0;
    }
    .summary-grid .card {
      border: 1px solid #e5e7eb; border-radius: 6px; padding: 6px 8px;
      background: #f9fafb;
    }
    .summary-grid .card .label { font-size: 8.5px; color: #6b7280; text-transform: uppercase; letter-spacing: .4px; }
    .summary-grid .card .value { font-size: 12px; font-weight: 700; color: #111827; margin-top: 2px; }

    .footer {
      display: flex; justify-content: space-between;
      margin-top: 12px; padding-top: 6px;
      border-top: 1px solid #e5e7eb;
      font-size: 9px; color: #6b7280;
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

    col.c-date    { width: 7%; }
    col.c-builty  { width: 7%; }
    col.c-do      { width: 8%; }
    col.c-truck   { width: 8%; }
    col.c-party   { width: 16%; }
    col.c-dch     { width: 5%; }
    col.c-qty     { width: 5%; }
    col.c-rate    { width: 6%; }
    col.c-acc     { width: 8%; }
    col.c-comm    { width: 6%; }
    col.c-bilty   { width: 5%; }
    col.c-adv     { width: 8%; }
    col.c-final   { width: 11%; }
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
        <div class="brand-name">Rudra Logistics</div>
        <div class="brand-subtitle">Truck Owner Ledger Statement</div>
      </div>
      <div class="doc-meta">
        <div class="doc-title">Owner Ledger</div>
        <div>Generated: ${esc(generatedAt())}</div>
      </div>
    </div>

    <div class="party-block">
      <div class="party-left">
        <div class="party-name">${esc(ownerName)}</div>
        <div class="party-meta">
          <div><span class="k">Trucks:</span> ${esc(trucksLine || '—')}</div>
          ${phone ? `<div><span class="k">Phone:</span> ${esc(phone)}</div>` : ''}
          ${bankAccount ? `<div><span class="k">A/C:</span> ${esc(bankAccount)}${ifsc ? ` · IFSC ${esc(ifsc)}` : ''}</div>` : ''}
          ${beneficiary ? `<div><span class="k">Beneficiary:</span> ${esc(beneficiary)}</div>` : ''}
          ${pan ? `<div><span class="k">PAN:</span> ${esc(pan)}</div>` : ''}
        </div>
      </div>
      <div class="outstanding-box">
        <div class="outstanding-label">${esc(netLabel)}</div>
        <div class="outstanding-amount ${netClass}">${esc(formatINR(Math.abs(summary.netOwed)))}</div>
      </div>
    </div>

    <div class="summary-grid">
      <div class="card"><div class="label">Trips</div><div class="value">${summary.totalTrips}</div></div>
      <div class="card"><div class="label">Total Qty (T)</div><div class="value">${summary.totalQty.toFixed(2)}</div></div>
      <div class="card"><div class="label">ACC Earned</div><div class="value">${esc(formatINR(summary.totalAccAmount))}</div></div>
      <div class="card"><div class="label">Commission</div><div class="value">${esc(formatINR(summary.totalCommission))}</div></div>
      <div class="card"><div class="label">Bilty</div><div class="value">${esc(formatINR(summary.totalBuiltyCharge))}</div></div>
      <div class="card"><div class="label">Diesel Adv</div><div class="value">${esc(formatINR(summary.totalDieselAdvance))}</div></div>
      <div class="card"><div class="label">Cash Adv</div><div class="value">${esc(formatINR(summary.totalCashAdvance))}</div></div>
      <div class="card"><div class="label">GPS Rent</div><div class="value">${esc(formatINR(summary.totalGpsRent))}</div></div>
      <div class="card"><div class="label">Advance Paid</div><div class="value">${esc(formatINR(totalAdvancePaid))}</div></div>
      <div class="card"><div class="label">Final Payment</div><div class="value">${esc(formatINR(summary.netOwed))}</div></div>
    </div>

    <table class="ledger">
      <colgroup>
        <col class="c-date" /><col class="c-builty" /><col class="c-do" />
        <col class="c-truck" /><col class="c-party" /><col class="c-dch" />
        <col class="c-qty" /><col class="c-rate" /><col class="c-acc" />
        <col class="c-comm" /><col class="c-bilty" /><col class="c-adv" />
        <col class="c-final" />
      </colgroup>
      <thead>
        <tr>
          <th>Date</th><th>Builty#</th><th>DO#</th><th>Truck</th>
          <th>Party / Location</th><th>DCH</th>
          <th class="num">Qty (T)</th><th class="num">Rate</th><th class="num">ACC Amt</th>
          <th class="num">Comm</th><th class="num">Bilty</th><th class="num">Adv</th>
          <th class="num">Final</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml || `<tr><td colspan="13" style="text-align:center;padding:20px;color:#6b7280;">No entries.</td></tr>`}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="6">Totals</td>
          <td class="num">${summary.totalQty.toFixed(2)}</td>
          <td class="num">—</td>
          <td class="num">${esc(formatINR(summary.totalAccAmount))}</td>
          <td class="num">${esc(formatINR(summary.totalCommission))}</td>
          <td class="num">${esc(formatINR(summary.totalBuiltyCharge))}</td>
          <td class="num">${esc(formatINR(summary.totalDieselAdvance + summary.totalCashAdvance))}</td>
          <td class="num">${esc(formatINR(summary.totalFinalPayment))}</td>
        </tr>
        ${summary.totalGpsRent > 0 ? `
        <tr>
          <td colspan="12" style="text-align:right;">Less: GPS Rent (auto-debited)</td>
          <td class="num neg">−${esc(formatINR(summary.totalGpsRent))}</td>
        </tr>` : ''}
        ${totalAdvancePaid > 0 ? `
        <tr>
          <td colspan="12" style="text-align:right;">Less: Advance Paid</td>
          <td class="num neg">−${esc(formatINR(totalAdvancePaid))}</td>
        </tr>` : ''}
        <tr class="final-row">
          <td colspan="12" style="text-align:right;">Final Payment</td>
          <td class="num balance">${esc(formatINR(summary.netOwed))}</td>
        </tr>
      </tfoot>
    </table>

    <div class="footer">
      <div>${rows.length} ${rows.length === 1 ? 'entry' : 'entries'}</div>
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

export function openTransportLedgerPdf(opts: TransportLedgerPdfOptions): boolean {
  const html = buildHtml(opts);
  const win = window.open('', '_blank', 'width=1400,height=900');
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  return true;
}
