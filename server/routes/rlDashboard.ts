import { Router } from 'express';
import { getAll, getOne } from '../db/database';
import { friendlyError } from '../lib/userError';
import { getAllSettingsMap } from './settings';

const router = Router();

async function billingSummary(company: 'acc' | 'jk', month: string | null) {
  const tp: any[] = [company];
  let tw = 'WHERE company=$1';
  if (month) { tp.push(`${month}%`); tw += ` AND date LIKE $${tp.length}`; }

  const ip: any[] = [company];
  let iw = 'WHERE company=$1';
  if (month) { ip.push(`${month}%`); iw += ` AND COALESCE(invoice_date,'') LIKE $${ip.length}`; }

  const [tripRow, invRow] = await Promise.all([
    getOne(`SELECT COALESCE(SUM(qty*acc_freight_rate),0)::float AS total FROM rl_trips ${tw}`, tp),
    getOne(`SELECT COALESCE(SUM(invoice_amount),0)::float AS invoiced, COALESCE(SUM(received_amount),0)::float AS received, COALESCE(SUM(tds_amount),0)::float AS tds, COUNT(*)::int AS invoice_count FROM rl_invoices ${iw}`, ip),
  ]);

  const tripTotal = Number(tripRow?.total) || 0;
  const invoiced  = Number(invRow?.invoiced) || 0;
  const received  = Number(invRow?.received) || 0;
  const tds       = Number(invRow?.tds) || 0;
  return {
    trip_acc_total:      tripTotal,
    invoiced,
    received,
    tds,
    pending_to_invoice:  Math.max(0, tripTotal - invoiced),
    pending_payment:     Math.max(0, invoiced - received),
    invoice_count:       Number(invRow?.invoice_count) || 0,
  };
}

// GET /rl/dashboard?month=YYYY-MM
router.get('/', async (req, res) => {
  try {
    const reqMonth = typeof req.query.month === 'string' ? req.query.month.trim() : '';
    const now = new Date();
    const m = reqMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const settings = await getAllSettingsMap();
    const biltyRate = Number(settings.bilty_per_mt) || 10;

    const [
      tripsMonth, tripsAllTime,
      accM, jkM, accAll, jkAll,
      dieselParties,
      bankRow, partners,
      expMonth, commMonth,
      ownerPayable, advancesTotal, gpsRentTotal,
    ] = await Promise.all([
      getAll(`
        SELECT company,
          COUNT(*)::int AS trip_count,
          COALESCE(SUM(qty*acc_freight_rate),0)::float AS acc_amount,
          COALESCE(SUM(qty*acc_freight_rate*commission_pct/100),0)::float AS commission,
          COALESCE(SUM(qty),0)::float AS total_qty
        FROM rl_trips WHERE date LIKE $1 GROUP BY company
      `, [`${m}%`]),
      getAll(`SELECT company, COUNT(*)::int AS trip_count FROM rl_trips GROUP BY company`),
      billingSummary('acc', m),
      billingSummary('jk', m),
      billingSummary('acc', null),
      billingSummary('jk', null),
      getAll(`
        SELECT p.id, p.name, p.is_active,
          (p.opening_balance + COALESCE(t.tc,0) - COALESCE(t.td,0))::float AS balance
        FROM rl_diesel_parties p
        LEFT JOIN (
          SELECT diesel_party_id,
            COALESCE(SUM(amount) FILTER (WHERE type='credit'),0) AS tc,
            COALESCE(SUM(amount) FILTER (WHERE type='debit'),0)  AS td
          FROM rl_diesel_transactions GROUP BY diesel_party_id
        ) t ON t.diesel_party_id=p.id
        ORDER BY p.name
      `),
      getOne(`
        SELECT
          COALESCE(SUM(ob),0)::float   AS opening,
          COALESCE(SUM(tc),0)::float   AS credits,
          COALESCE(SUM(td),0)::float   AS debits,
          COUNT(*)::int                AS active_banks
        FROM (
          SELECT b.opening_balance AS ob,
            COALESCE((SELECT SUM(amount) FROM rl_bank_transactions WHERE bank_id=b.id AND type='credit'),0) AS tc,
            COALESCE((SELECT SUM(amount) FROM rl_bank_transactions WHERE bank_id=b.id AND type='debit'),0)  AS td
          FROM rl_banks b WHERE b.is_active=1
        ) x
      `),
      getAll(`
        SELECT p.name,
          (COALESCE(p.opening_capital,0)
            + COALESCE((SELECT SUM(amount) FROM rl_partner_transactions WHERE partner_id=p.id AND type='capital'),0)
            + COALESCE((SELECT SUM(amount) FROM rl_partner_transactions WHERE partner_id=p.id AND type='profit'),0)
            - COALESCE((SELECT SUM(amount) FROM rl_partner_transactions WHERE partner_id=p.id AND type='withdrawal'),0)
          )::float AS balance
        FROM rl_partners p ORDER BY p.id
      `),
      getOne(`SELECT COALESCE(SUM(amount),0)::float AS total FROM rl_expenses WHERE date LIKE $1`, [`${m}%`]),
      getOne(`SELECT COALESCE(SUM(qty*acc_freight_rate*commission_pct/100),0)::float AS total FROM rl_trips WHERE date LIKE $1`, [`${m}%`]),
      // Total final_payment we owe truck owners across all trips
      getOne(`
        SELECT COALESCE(SUM(
          qty*acc_freight_rate
          - qty*acc_freight_rate*commission_pct/100
          - qty*$1
          - diesel_advance
          - cash_advance
        ),0)::float AS total
        FROM rl_trips
      `, [biltyRate]),
      getOne(`SELECT COALESCE(SUM(amount),0)::float AS total FROM rl_owner_advances`),
      // GPS rent debits reduce what we owe truck owners
      getOne(`SELECT COALESCE(SUM(amount),0)::float AS total FROM rl_gps_rent_debits`).catch(() => ({ total: 0 })),
    ]);

    const accTrip = tripsMonth.find((t: any) => t.company === 'acc') || { trip_count: 0, acc_amount: 0, commission: 0, total_qty: 0 };
    const jkTrip  = tripsMonth.find((t: any) => t.company === 'jk') || { trip_count: 0, acc_amount: 0, commission: 0, total_qty: 0 };
    const accAllTime = tripsAllTime.find((t: any) => t.company === 'acc') || { trip_count: 0 };
    const jkAllTime  = tripsAllTime.find((t: any) => t.company === 'jk') || { trip_count: 0 };

    const bankO = Number(bankRow?.opening) || 0;
    const bankC = Number(bankRow?.credits) || 0;
    const bankD = Number(bankRow?.debits)  || 0;

    const dieselNet = dieselParties.reduce((s: number, p: any) => s + Number(p.balance), 0);
    const truckPayable   = Number(ownerPayable?.total)  || 0;
    const advancesPaid   = Number(advancesTotal?.total)  || 0;
    const gpsRent        = Number(gpsRentTotal?.total)   || 0;
    const truckOutstanding = truckPayable - advancesPaid - gpsRent;

    const totalCapital = partners.reduce((s: number, p: any) => s + Number(p.balance), 0);
    const monthCommission = Number(commMonth?.total) || 0;
    const monthExpenses   = Number(expMonth?.total)  || 0;

    res.json({
      month: m,
      trips: {
        month: {
          acc: Number(accTrip.trip_count),
          jk:  Number(jkTrip.trip_count),
          total: Number(accTrip.trip_count) + Number(jkTrip.trip_count),
        },
        all_time: {
          acc: Number(accAllTime.trip_count),
          jk:  Number(jkAllTime.trip_count),
          total: Number(accAllTime.trip_count) + Number(jkAllTime.trip_count),
        },
        month_freight: {
          acc: Number(accTrip.acc_amount),
          jk:  Number(jkTrip.acc_amount),
        },
        month_commission: {
          acc: Number(accTrip.commission),
          jk:  Number(jkTrip.commission),
        },
        month_qty: {
          acc: Number(accTrip.total_qty),
          jk:  Number(jkTrip.total_qty),
        },
      },
      acc: { month: accM, all_time: accAll },
      jk:  { month: jkM,  all_time: jkAll },
      outstanding: {
        diesel: {
          net: dieselNet,
          parties: dieselParties.map((p: any) => ({ id: p.id, name: p.name, balance: Number(p.balance), is_active: p.is_active })),
        },
        truck: {
          payable:       truckPayable,
          advances_paid: advancesPaid,
          gps_rent:      gpsRent,
          net:           truckOutstanding,
        },
      },
      bank: {
        opening:      bankO,
        credits:      bankC,
        debits:       bankD,
        closing:      bankO + bankC - bankD,
        active_banks: Number(bankRow?.active_banks) || 0,
      },
      capital: {
        total:    totalCapital,
        partners: partners.map((p: any) => ({ name: p.name, balance: Number(p.balance) })),
      },
      this_month: {
        commission: monthCommission,
        expenses:   monthExpenses,
        profit:     monthCommission - monthExpenses,
      },
    });
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

export default router;
