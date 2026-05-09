import { formatDate, formatINR } from './format';

export type TransporterLedgerEntry = {
  date: string;
  entry_type: 'commission' | 'advance_diesel' | 'trip_diesel' | 'payment';
  payment_type?: 'paid' | 'received' | null;
  amount: number;
  truck_number: string | null;
  load_from: string | null;
  billed_destination: string | null;
  material_name: string | null;
  mode: string | null;
  bank_name: string | null;
  cash_handler: string | null;
  remarks: string | null;
  balance: number;
};

export type TransporterLedgerPdfOptions = {
  transporterName: string;
  phone?: string | null;
  totalReceivable: number;
  totalPaid: number;
  totalReceived: number;
  outstanding: number;
  entries: TransporterLedgerEntry[];
  withGst: boolean;
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

const TYPE_LABELS: Record<string, string> = {
  commission: 'Commission',
  advance_diesel: 'Trip Diesel',
  trip_diesel: 'Add. Diesel',
  payment: 'Payment',
};

function buildHtml(opts: TransporterLedgerPdfOptions): string {
  const { transporterName, phone, totalReceivable, totalPaid, totalReceived, outstanding, entries, withGst } = opts;

  const gstAmount = withGst ? totalReceivable * 0.18 : 0;
  const totalWithGst = totalReceivable + gstAmount;
  const outstandingWithGst = withGst ? totalWithGst - totalPaid - totalReceived : outstanding;

  const rowsHtml = entries
    .map((e, i) => {
      const isPayment = e.entry_type === 'payment';
      const isPaid = isPayment && e.payment_type === 'paid';
      const isReceived = isPayment && e.payment_type === 'received';
      const rowCls = i % 2 === 0 ? 'row-even' : 'row-odd';

      let typeLabel = TYPE_LABELS[e.entry_type] || e.entry_type;
      if (isPaid) typeLabel = 'Paid Out';
      if (isReceived) typeLabel = 'Received';

      let details = '';
      if (!isPayment) {
        const parts = [e.truck_number, e.load_from && e.billed_destination ? `${e.load_from} → ${e.billed_destination}` : (e.load_from || e.billed_destination), e.material_name].filter(Boolean);
        details = parts.join(' · ');
      } else {
        const payParts: string[] = [];
        if (e.mode) payParts.push(e.mode.charAt(0).toUpperCase() + e.mode.slice(1));
        if (e.mode === 'cash' && e.cash_handler) payParts.push(e.cash_handler);
        if (e.mode === 'bank' && e.bank_name) payParts.push(e.bank_name);
        if (e.remarks) payParts.push(e.remarks);
        details = payParts.join(' · ');
      }

      const receivedCol = !isPayment ? formatINR(e.amount) : (isReceived ? formatINR(e.amount) : '—');
      const paidCol = isPaid ? formatINR(e.amount) : '—';

      return `
        <tr class="${rowCls}${isPayment ? ' row-payment' : ''}">
          <td class="col-sno">${i + 1}</td>
          <td class="col-date">${esc(formatDate(e.date))}</td>
          <td class="col-type"><span class="type-badge type-${esc(e.entry_type)}${isPaid ? ' type-paid' : ''}${isReceived ? ' type-received' : ''}">${esc(typeLabel)}</span></td>
          <td class="col-details">${esc(details)}</td>
          <td class="col-received num">${esc(receivedCol)}</td>
          <td class="col-paid num">${esc(paidCol)}</td>
          <td class="col-balance num ${e.balance > 0 ? 'bal-positive' : 'bal-negative'}">${esc(formatINR(e.balance))}</td>
        </tr>`;
    })
    .join('');

  const gstSection = withGst ? `
    <div class="gst-section">
      <div class="gst-title">GST Calculation (18%)</div>
      <table class="gst-table">
        <tr><td>Base Receivable (Commission + Diesel)</td><td class="num">${esc(formatINR(totalReceivable))}</td></tr>
        <tr class="gst-row"><td>GST @ 18%</td><td class="num">${esc(formatINR(gstAmount))}</td></tr>
        <tr class="gst-total"><td>Total Receivable with GST</td><td class="num">${esc(formatINR(totalWithGst))}</td></tr>
        <tr><td>Less: Payments Made</td><td class="num neg">−${esc(formatINR(totalPaid + totalReceived))}</td></tr>
        <tr class="gst-outstanding"><td>Outstanding with GST</td><td class="num">${esc(formatINR(outstandingWithGst))}</td></tr>
      </table>
    </div>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${esc(transporterName)} — Transporter Ledger</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0; padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1f2937;
      font-size: 11px;
      background: #fff;
    }
    .container { padding: 4mm; }

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
      margin: 8px 0 10px; gap: 12px;
    }
    .party-name { font-size: 16px; font-weight: 700; color: #111827; }
    .party-meta { margin-top: 3px; font-size: 11px; color: #4b5563; }
    .gst-badge {
      display: inline-block; margin-top: 4px;
      padding: 2px 8px; border-radius: 999px;
      font-size: 10px; font-weight: 600;
      background: #dbeafe; color: #1e40af;
    }

    .outstanding-box {
      min-width: 180px; text-align: right;
      padding: 6px 10px; border: 1px solid #e5e7eb; border-radius: 6px;
      background: #f9fafb;
    }
    .outstanding-label { font-size: 10px; text-transform: uppercase; letter-spacing: .6px; color: #6b7280; }
    .outstanding-amount { font-size: 18px; font-weight: 700; margin-top: 2px; }
    .outstanding-amount.positive { color: #b91c1c; }
    .outstanding-amount.zero { color: #047857; }
    .outstanding-note { font-size: 10px; color: #6b7280; margin-top: 1px; }

    .kpi-strip {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;
      margin-bottom: 10px;
    }
    .kpi-card {
      border: 1px solid #e5e7eb; border-radius: 6px; padding: 6px 8px;
      background: #f9fafb; text-align: center;
    }
    .kpi-card .kpi-label { font-size: 9px; color: #6b7280; text-transform: uppercase; letter-spacing: .4px; }
    .kpi-card .kpi-value { font-size: 13px; font-weight: 700; color: #111827; margin-top: 2px; }
    .kpi-card.kpi-blue { background: #eff6ff; border-color: #bfdbfe; }
    .kpi-card.kpi-blue .kpi-label { color: #1d4ed8; }
    .kpi-card.kpi-green { background: #f0fdf4; border-color: #bbf7d0; }
    .kpi-card.kpi-green .kpi-label { color: #15803d; }
    .kpi-card.kpi-red { background: #fef2f2; border-color: #fecaca; }
    .kpi-card.kpi-red .kpi-label { color: #b91c1c; }
    .kpi-card.kpi-red .kpi-value { color: #b91c1c; }

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
    table.ledger td.num { text-align: right; white-space: nowrap; }
    table.ledger th.num { text-align: right; }
    .col-sno     { width: 4%; }
    .col-date    { width: 9%; white-space: nowrap; }
    .col-type    { width: 12%; }
    .col-details { width: 35%; }
    .col-received{ width: 13%; }
    .col-paid    { width: 13%; }
    .col-balance { width: 14%; font-weight: 600; }

    .type-badge {
      display: inline-block; padding: 2px 6px; border-radius: 4px;
      font-size: 10px; font-weight: 600;
    }
    .type-commission { background: #dbeafe; color: #1e40af; }
    .type-advance_diesel { background: #ffedd5; color: #c2410c; }
    .type-trip_diesel { background: #fef3c7; color: #b45309; }
    .type-payment.type-paid { background: #fee2e2; color: #b91c1c; }
    .type-payment.type-received { background: #dcfce7; color: #15803d; }
    .type-payment { background: #f0fdf4; color: #15803d; }

    tr.row-even td { background: #ffffff; }
    tr.row-odd td  { background: #fafafa; }
    .bal-positive { color: #b91c1c; }
    .bal-negative { color: #047857; }

    .totals-row td {
      border-top: 1.5px solid #111827 !important;
      background: #f9fafb !important;
      font-weight: 700;
      font-size: 11.5px;
    }

    .gst-section {
      margin-top: 14px; padding: 10px 12px;
      border: 1.5px solid #bfdbfe; border-radius: 8px;
      background: #eff6ff;
      max-width: 340px;
    }
    .gst-title { font-size: 11px; font-weight: 700; color: #1e40af; margin-bottom: 6px; text-transform: uppercase; letter-spacing: .4px; }
    .gst-table { width: 100%; border-collapse: collapse; font-size: 11px; }
    .gst-table td { padding: 3px 4px; }
    .gst-table td.num { text-align: right; font-weight: 600; }
    .gst-table td.neg { color: #b91c1c; }
    .gst-row td { color: #1d4ed8; }
    .gst-total td { border-top: 1px solid #bfdbfe; font-weight: 700; color: #1e40af; padding-top: 5px; }
    .gst-outstanding td { border-top: 2px solid #1d4ed8; font-weight: 700; font-size: 12px; color: #b91c1c; padding-top: 5px; }

    .footer {
      display: flex; justify-content: space-between; align-items: center;
      margin-top: 12px; padding-top: 8px;
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
        <div class="brand-subtitle">Innovation &amp; excellence</div>
      </div>
      <div class="doc-meta">
        <div class="doc-title">Transporter Ledger Statement${withGst ? ' (with GST)' : ''}</div>
        <div>Generated: ${esc(generatedAt())}</div>
      </div>
    </div>

    <div class="party-block">
      <div>
        <div class="party-name">${esc(transporterName)}</div>
        ${phone ? `<div class="party-meta">${esc(phone)}</div>` : ''}
        ${withGst ? `<div class="gst-badge">GST @ 18% Applied</div>` : ''}
      </div>
      <div class="outstanding-box">
        <div class="outstanding-label">Outstanding</div>
        <div class="outstanding-amount ${Math.abs(outstanding) > 0 || outstandingWithGst > 0 ? 'positive' : 'zero'}">${esc(formatINR(Math.abs(withGst ? outstandingWithGst : outstanding)))}</div>
        <div class="outstanding-note">${withGst ? 'Including 18% GST' : 'Base (excl. GST)'}</div>
      </div>
    </div>

    <div class="kpi-strip">
      <div class="kpi-card kpi-blue">
        <div class="kpi-label">Total Receivable${withGst ? ' (w/ GST)' : ''}</div>
        <div class="kpi-value">${esc(formatINR(withGst ? totalWithGst : totalReceivable))}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Paid Out</div>
        <div class="kpi-value">${esc(formatINR(totalPaid))}</div>
      </div>
      <div class="kpi-card kpi-green">
        <div class="kpi-label">Received Back</div>
        <div class="kpi-value">${esc(formatINR(totalReceived))}</div>
      </div>
      <div class="kpi-card kpi-red">
        <div class="kpi-label">Outstanding</div>
        <div class="kpi-value">${esc(formatINR(withGst ? outstandingWithGst : outstanding))}</div>
      </div>
    </div>

    <table class="ledger">
      <thead>
        <tr>
          <th class="col-sno">S.No</th>
          <th class="col-date">Date</th>
          <th class="col-type">Type</th>
          <th class="col-details">Details</th>
          <th class="col-received num">Received (Dr)</th>
          <th class="col-paid num">Paid (Cr)</th>
          <th class="col-balance num">Balance</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml || `<tr><td colspan="7" style="text-align:center;padding:20px;color:#6b7280;">No entries.</td></tr>`}
        <tr class="totals-row">
          <td colspan="4" style="text-align:right;">Totals</td>
          <td class="num">${esc(formatINR(totalReceivable))}</td>
          <td class="num">${esc(formatINR(totalPaid + totalReceived))}</td>
          <td class="num">${esc(formatINR(outstanding))}</td>
        </tr>
      </tbody>
    </table>

    ${gstSection}

    <div class="footer">
      <div>${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}</div>
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

export function openTransporterLedgerPdf(opts: TransporterLedgerPdfOptions): boolean {
  const html = buildHtml(opts);
  const win = window.open('', '_blank', 'width=1200,height=800');
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  return true;
}
