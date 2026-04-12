#!/usr/bin/env node
/**
 * Weekly backup: exports all DB tables to Excel and uploads to Google Drive.
 * Requires env vars: DATABASE_URL, GOOGLE_SERVICE_ACCOUNT_KEY, GOOGLE_DRIVE_FOLDER_ID
 */
const { Pool } = require('pg');
const XLSX = require('xlsx');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const TABLES = [
  'parties', 'cement_brands', 'godowns', 'purchases', 'sales',
  'payments', 'expenses', 'loans', 'imprest_handlers',
  'imprest_transactions', 'bank_balances', 'users', 'user_permissions',
];

async function main() {
  const missingVars = ['DATABASE_URL', 'GOOGLE_SERVICE_ACCOUNT_KEY', 'GOOGLE_DRIVE_FOLDER_ID']
    .filter((v) => !process.env[v]);
  if (missingVars.length > 0) {
    console.error('Missing env vars:', missingVars.join(', '));
    process.exit(1);
  }

  // ── Connect to DB ──────────────────────────────────────────────────────────
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  console.log('Connected to database');

  // ── Build Excel workbook ───────────────────────────────────────────────────
  const wb = XLSX.utils.book_new();
  for (const table of TABLES) {
    const { rows } = await pool.query(`SELECT * FROM ${table}`);
    const ws = rows.length > 0
      ? XLSX.utils.json_to_sheet(rows)
      : XLSX.utils.aoa_to_sheet([['(empty table)']]);
    // Excel sheet names max 31 chars
    const sheetName = table.replace('imprest_', 'imp_').slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    console.log(`  ${table}: ${rows.length} rows`);
  }

  await pool.end();

  const date = new Date().toISOString().slice(0, 10);
  const filename = `cementbook-backup-${date}.xlsx`;
  const filepath = path.join('/tmp', filename);
  XLSX.writeFile(wb, filepath);
  console.log(`Excel written: ${filepath}`);

  // ── Upload to Google Drive ─────────────────────────────────────────────────
  const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
  const auth = new google.auth.GoogleAuth({
    credentials: serviceAccount,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });
  const drive = google.drive({ version: 'v3', auth });

  const response = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
    media: {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      body: fs.createReadStream(filepath),
    },
    fields: 'id,name',
  });

  console.log(`Uploaded to Google Drive: ${response.data.name} (id: ${response.data.id})`);
  fs.unlinkSync(filepath);
}

main().catch((e) => {
  console.error('Backup failed:', e.message);
  process.exit(1);
});
