import { Router } from 'express';
import { getAll, getOne } from '../db/database';
import { friendlyError } from '../lib/userError';

const router = Router();

// Firm wallets — one wallet per supplier firm (CementBook only).
// Cash basis: inflow = receipts tagged to the firm (wallet_supplier_id) + refunds received
// from the firm itself; outflow = payments made to the firm + tagged pay-outs.
// Purchases total is shown as an accrual reference column, not part of the cash balance.

router.get('/', async (_req, res) => {
  try {
    const wallets = await getAll(`
      SELECT p.id, p.name,
        COALESCE((SELECT SUM(pu.purchase_amount) FROM purchases pu WHERE pu.supplier_id = p.id), 0) AS purchases_total,
        COALESCE((SELECT SUM(pm.amount) FROM payments pm
                  WHERE pm.direction = 'pay'
                    AND (pm.party_id = p.id OR (pm.wallet_supplier_id = p.id AND pm.party_id <> p.id))), 0) AS cash_out,
        COALESCE((SELECT SUM(pm.amount) FROM payments pm
                  WHERE (pm.direction = 'receive' OR pm.direction IS NULL)
                    AND (pm.party_id = p.id OR (pm.wallet_supplier_id = p.id AND pm.party_id <> p.id))), 0) AS cash_in
      FROM parties p
      WHERE p.type = 'supplier'
      ORDER BY p.name
    `);
    // Receipts from customers not attributed to any firm wallet
    const unassigned = await getOne(`
      SELECT COALESCE(SUM(pm.amount), 0) AS total, COUNT(*)::int AS count
      FROM payments pm JOIN parties p ON pm.party_id = p.id
      WHERE (pm.direction = 'receive' OR pm.direction IS NULL)
        AND pm.wallet_supplier_id IS NULL
        AND p.type <> 'supplier'
    `);
    res.json({
      wallets: wallets.map((w: any) => ({
        ...w,
        purchases_total: Number(w.purchases_total),
        cash_in: Number(w.cash_in),
        cash_out: Number(w.cash_out),
        net: Number(w.cash_in) - Number(w.cash_out),
      })),
      unassigned_inflow: Number(unassigned?.total || 0),
      unassigned_count: Number(unassigned?.count || 0),
    });
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

router.get('/:id/ledger', async (req, res) => {
  try {
    const firm = await getOne(`SELECT id, name, type FROM parties WHERE id=$1`, [req.params.id]);
    if (!firm || firm.type !== 'supplier') return res.status(404).json({ error: 'Firm wallet not found' });

    const rows = await getAll(`
      SELECT pm.id, pm.date, pm.amount, pm.mode, pm.bank_name, pm.cash_handler, pm.remarks,
             COALESCE(pm.direction, 'receive') AS direction,
             p.name AS party_name, (pm.party_id = $1) AS is_direct
      FROM payments pm JOIN parties p ON pm.party_id = p.id
      WHERE pm.party_id = $1 OR (pm.wallet_supplier_id = $1 AND pm.party_id <> $1)
      ORDER BY pm.date ASC, pm.id ASC
    `, [firm.id]);

    let balance = 0;
    const ledger = rows.map((r: any) => {
      const inflow = r.direction === 'receive' ? Number(r.amount) : 0;
      const outflow = r.direction === 'pay' ? Number(r.amount) : 0;
      balance += inflow - outflow;
      const particulars = r.is_direct
        ? (r.direction === 'pay' ? `Paid to ${firm.name}` : `Received from ${firm.name}`)
        : (r.direction === 'pay' ? `Paid — ${r.party_name} (wallet)` : `Receipt — ${r.party_name} (stock sale)`);
      return { ...r, amount: Number(r.amount), inflow, outflow, balance, particulars };
    });

    res.json({
      firm: { id: firm.id, name: firm.name },
      ledger: ledger.reverse(), // newest first for display
      totals: {
        cash_in: ledger.reduce((s, r) => s + r.inflow, 0),
        cash_out: ledger.reduce((s, r) => s + r.outflow, 0),
        net: balance,
      },
    });
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

export default router;
