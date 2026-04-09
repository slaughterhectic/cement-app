import { Router } from 'express';
import { getAll, getOne, query } from '../db/database';

const router = Router();

router.get('/summary', async (_req, res) => {
  try {
    // Cash: imprest handlers with opening + transactions
    const handlers = await getAll(`
      SELECT ih.handler_name,
        ih.opening_balance,
        COALESCE((SELECT SUM(credit) FROM imprest_transactions WHERE handler_name=ih.handler_name),0) as total_received,
        COALESCE((SELECT SUM(debit) FROM imprest_transactions WHERE handler_name=ih.handler_name),0) as total_spent
      FROM imprest_handlers ih
      ORDER BY ih.handler_name
    `);
    const cash = handlers.map((h: any) => ({
      handler: h.handler_name,
      opening: Number(h.opening_balance),
      total_received: Number(h.total_received),
      total_spent: Number(h.total_spent),
      balance: Number(h.opening_balance) + Number(h.total_received) - Number(h.total_spent),
    }));
    const totalCash = cash.reduce((s: number, h: any) => s + h.balance, 0);

    // Banks: ONLY explicitly configured banks from bank_balances table.
    // Balance = opening + customer payments received via that bank - expenses paid via that bank.
    // Note: bank_name in payments may store various labels; match case-insensitively.
    const bankRows = await getAll(`SELECT * FROM bank_balances ORDER BY bank_name`);

    const banks = await Promise.all(bankRows.map(async (b: any) => {
      const name = b.bank_name;
      const received = await getOne(
        `SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE mode='bank' AND LOWER(bank_name)=LOWER($1)`,
        [name]
      );
      const paid = await getOne(
        `SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE mode='bank' AND LOWER(bank_name)=LOWER($1)`,
        [name]
      );
      const ob = Number(b.opening_balance ?? 0);
      const rc = Number(received?.total ?? 0);
      const pd = Number(paid?.total ?? 0);
      return { bank_name: name, opening: ob, total_received: rc, total_paid: pd, balance: ob + rc - pd };
    }));
    const totalBank = banks.reduce((s: number, b: any) => s + b.balance, 0);

    // Stock value
    const stockCalc = await getOne(`
      SELECT COALESCE(SUM(sub.stock * sub.avg_rate),0) as value, COALESCE(SUM(sub.stock),0) as bags FROM (
        SELECT cb.id,
          (COALESCE((SELECT SUM(bags) FROM purchases WHERE brand_id=cb.id),0)
           - COALESCE((SELECT SUM(bags) FROM sales WHERE brand_id=cb.id),0)) as stock,
          COALESCE((SELECT AVG(purchase_rate) FROM purchases WHERE brand_id=cb.id),0) as avg_rate
        FROM cement_brands cb
      ) sub WHERE sub.stock > 0
    `);

    // Outstanding receivables
    const outstandingCalc = await getOne(`
      SELECT COALESCE(SUM(
        COALESCE(p.opening_balance,0)
        + COALESCE((SELECT SUM(sale_amount) FROM sales WHERE party_id=p.id),0)
        - COALESCE((SELECT SUM(amount) FROM payments WHERE party_id=p.id),0)
      ),0) as total FROM parties p
    `);

    // Loans outstanding
    const loansCalc = await getOne(`
      SELECT COALESCE(SUM(COALESCE(outstanding_principal, principal)),0) as total FROM loans
    `);

    res.json({
      cash,
      totalCash,
      banks,
      totalBank,
      stockValue: { value: Number(stockCalc?.value ?? 0), bags: Number(stockCalc?.bags ?? 0) },
      totalOutstanding: Number(outstandingCalc?.total ?? 0),
      totalLoans: Number(loansCalc?.total ?? 0),
      totalCapital: totalCash + totalBank,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/banks', async (_req, res) => {
  try {
    const rows = await getAll(`SELECT * FROM bank_balances ORDER BY bank_name`);
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/banks', async (req, res) => {
  const { bank_name, opening_balance } = req.body;
  try {
    const row = await getOne(
      `INSERT INTO bank_balances (bank_name, opening_balance)
       VALUES ($1,$2)
       ON CONFLICT (bank_name) DO UPDATE SET opening_balance=$2
       RETURNING *`,
      [bank_name, opening_balance ?? 0]
    );
    res.json(row);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

router.delete('/banks/:name', async (req, res) => {
  try {
    await query('DELETE FROM bank_balances WHERE bank_name=$1', [req.params.name]);
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

export default router;
