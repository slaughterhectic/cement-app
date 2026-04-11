import { query } from './database';

async function truncateAll() {
  console.log('Truncating all tables...');
  await query(`
    TRUNCATE TABLE
      imprest_transactions,
      imprest_handlers,
      bank_balances,
      loans,
      expenses,
      payments,
      sales,
      purchases,
      godowns,
      cement_brands,
      parties
    RESTART IDENTITY CASCADE
  `);
  console.log('All tables truncated successfully.');
  process.exit(0);
}

truncateAll().catch((e) => {
  console.error('Truncation failed:', e);
  process.exit(1);
});
