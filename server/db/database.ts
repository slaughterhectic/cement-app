import pg from 'pg';

const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433'),
  database: process.env.DB_NAME || 'cementbook',
  user: process.env.DB_USER || 'cementbook',
  password: process.env.DB_PASS || 'cement123',
  max: 20,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('Unexpected PG pool error', err);
});

export async function initializeDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS parties (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        location TEXT,
        district TEXT,
        type TEXT CHECK(type IN ('dealer', 'contractor', 'builder', 'institution', 'damage_buyer', 'other')),
        opening_balance REAL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS cement_brands (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT CHECK(type IN ('OPC', 'PPC', 'DAMAGE', 'OTHER')),
        manufacturer TEXT,
        is_active INTEGER DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS godowns (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        location TEXT
      );

      CREATE TABLE IF NOT EXISTS purchases (
        id SERIAL PRIMARY KEY,
        date TEXT NOT NULL,
        supplier_name TEXT NOT NULL,
        brand_id INTEGER REFERENCES cement_brands(id),
        cement_type TEXT,
        bags INTEGER NOT NULL,
        purchase_rate REAL NOT NULL,
        purchase_amount REAL GENERATED ALWAYS AS (bags * purchase_rate) STORED,
        godown_id INTEGER REFERENCES godowns(id),
        truck_number TEXT,
        source_location TEXT,
        remarks TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        date TEXT NOT NULL,
        party_id INTEGER NOT NULL REFERENCES parties(id),
        brand_id INTEGER NOT NULL REFERENCES cement_brands(id),
        cement_type TEXT,
        bags INTEGER NOT NULL,
        sale_rate REAL NOT NULL,
        sale_amount REAL GENERATED ALWAYS AS (bags * sale_rate) STORED,
        destination TEXT,
        invoice_number TEXT,
        billed_party TEXT,
        billed_quantity INTEGER,
        billed_rate REAL,
        billed_amount REAL,
        truck_number TEXT,
        godown_id INTEGER REFERENCES godowns(id),
        remarks TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        date TEXT NOT NULL,
        party_id INTEGER NOT NULL REFERENCES parties(id),
        amount REAL NOT NULL,
        mode TEXT CHECK(mode IN ('bank', 'cash')) DEFAULT 'bank',
        bank_name TEXT,
        remarks TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        date TEXT NOT NULL,
        amount REAL NOT NULL,
        category TEXT,
        description TEXT NOT NULL,
        bank_name TEXT,
        mode TEXT CHECK(mode IN ('bank', 'cash')) DEFAULT 'bank',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    // Migrations
    await client.query(`ALTER TABLE purchases ADD COLUMN IF NOT EXISTS invoice_number TEXT;`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS loans (
        id SERIAL PRIMARY KEY,
        lender_name TEXT NOT NULL,
        principal REAL NOT NULL,
        interest_rate REAL NOT NULL,
        emi_amount REAL,
        start_date TEXT NOT NULL,
        tenure_months INTEGER,
        outstanding_principal REAL,
        remarks TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS imprest_transactions (
        id SERIAL PRIMARY KEY,
        date TEXT NOT NULL,
        handler_name TEXT NOT NULL DEFAULT 'Akash',
        particulars TEXT,
        narration TEXT,
        debit REAL DEFAULT 0,
        credit REAL DEFAULT 0,
        remark TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS imprest_handlers (
        id SERIAL PRIMARY KEY,
        handler_name TEXT NOT NULL UNIQUE,
        opening_balance REAL DEFAULT 0
      );
    `);

    await client.query(`
      INSERT INTO imprest_handlers (handler_name, opening_balance)
      VALUES ('Akash', 0)
      ON CONFLICT (handler_name) DO NOTHING;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS bank_balances (
        id SERIAL PRIMARY KEY,
        bank_name TEXT NOT NULL UNIQUE,
        opening_balance REAL DEFAULT 0
      );
    `);

    // Rename "Main Office" godown to "Plant"
    await client.query(`UPDATE godowns SET name = 'Plant' WHERE name = 'Main Office';`);

    console.log('Database schema initialized');
  } finally {
    client.release();
  }
}

export async function query(text: string, params?: any[]) {
  return pool.query(text, params);
}

export async function getOne(text: string, params?: any[]) {
  const result = await pool.query(text, params);
  return result.rows[0] || null;
}

export async function getAll(text: string, params?: any[]) {
  const result = await pool.query(text, params);
  return result.rows;
}

export default pool;
