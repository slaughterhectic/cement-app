import pg from 'pg';
import bcrypt from 'bcryptjs';

const poolConfig: pg.PoolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5433'),
      database: process.env.DB_NAME || 'cementbook',
      user: process.env.DB_USER || 'cementbook',
      password: process.env.DB_PASS || 'cement123',
      max: 20,
      idleTimeoutMillis: 30000,
    };

const pool = new pg.Pool(poolConfig);

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
    await client.query(`ALTER TABLE purchases ADD COLUMN IF NOT EXISTS freight_rate REAL DEFAULT 0;`);
    await client.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS cost_rate REAL DEFAULT 0;`);
    await client.query(`ALTER TABLE parties ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES parties(id);`);
    await client.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS received BOOLEAN NOT NULL DEFAULT FALSE;`);
    await client.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS direction TEXT CHECK(direction IN ('pay','receive')) DEFAULT 'receive';`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS expense_categories (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(`
      INSERT INTO expense_categories (name, sort_order) VALUES
        ('Office expense', 10), ('Staff welfare & Refreshment', 20),
        ('Labour - Loading / Unloading', 30), ('Travel Expense', 40),
        ('Driver expense', 50), ('Fuel expense', 60),
        ('Bank charges', 70), ('Freight', 80), ('Salary', 90), ('Miscellaneous', 100)
      ON CONFLICT (name) DO NOTHING;
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS party_loans (
        id SERIAL PRIMARY KEY,
        date TEXT NOT NULL,
        party_id INTEGER NOT NULL REFERENCES parties(id),
        amount REAL NOT NULL,
        mode TEXT CHECK(mode IN ('bank', 'cash')) DEFAULT 'bank',
        bank_name TEXT,
        type TEXT CHECK(type IN ('disbursement', 'repayment')) NOT NULL,
        remarks TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Transporter tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS transporters (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS transporter_payments (
        id SERIAL PRIMARY KEY,
        date TEXT NOT NULL,
        transporter_id INTEGER NOT NULL REFERENCES transporters(id),
        amount REAL NOT NULL,
        mode TEXT CHECK(mode IN ('cash','bank')) DEFAULT 'cash',
        bank_name TEXT,
        remarks TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // TruckBook tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS trucks (
        id SERIAL PRIMARY KEY,
        truck_number TEXT NOT NULL UNIQUE,
        purchase_date TEXT,
        total_value REAL DEFAULT 0,
        down_payment REAL DEFAULT 0,
        financed_amount REAL DEFAULT 0,
        emi_amount REAL DEFAULT 0,
        emi_tenure INTEGER,
        lender_name TEXT,
        is_active INTEGER DEFAULT 1,
        remarks TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS drivers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        license_number TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS truck_trips (
        id SERIAL PRIMARY KEY,
        date TEXT NOT NULL,
        truck_id INTEGER NOT NULL REFERENCES trucks(id),
        driver_id INTEGER REFERENCES drivers(id),
        material_name TEXT,
        quantity REAL DEFAULT 0,
        load_from TEXT,
        billed_party TEXT,
        billed_destination TEXT,
        transport_name TEXT,
        freight_rate REAL DEFAULT 0,
        loading_charge REAL DEFAULT 0,
        unloading_charge REAL DEFAULT 0,
        advance_litres REAL DEFAULT 0,
        advance_rate REAL DEFAULT 0,
        advance_deduction REAL DEFAULT 0,
        toll_expense REAL DEFAULT 0,
        diesel_litres REAL DEFAULT 0,
        diesel_rate REAL DEFAULT 0,
        diesel_amount REAL DEFAULT 0,
        diesel_from TEXT,
        driver_payment REAL DEFAULT 0,
        miscellaneous REAL DEFAULT 0,
        odometer_start INTEGER,
        odometer_end INTEGER,
        total_km INTEGER,
        total_freight REAL DEFAULT 0,
        net_freight REAL DEFAULT 0,
        net_profit REAL DEFAULT 0,
        remarks TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS truck_expenses (
        id SERIAL PRIMARY KEY,
        date TEXT NOT NULL,
        truck_id INTEGER REFERENCES trucks(id),
        category TEXT,
        description TEXT,
        amount REAL NOT NULL,
        mode TEXT CHECK(mode IN ('cash','bank')) DEFAULT 'cash',
        bank_name TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS driver_payments (
        id SERIAL PRIMARY KEY,
        date TEXT NOT NULL,
        driver_id INTEGER NOT NULL REFERENCES drivers(id),
        amount REAL NOT NULL,
        mode TEXT CHECK(mode IN ('cash','bank')) DEFAULT 'cash',
        bank_name TEXT,
        trip_id INTEGER REFERENCES truck_trips(id),
        remarks TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Requests table
    await client.query(`
      CREATE TABLE IF NOT EXISTS requests (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        message TEXT,
        status TEXT CHECK(status IN ('pending', 'completed')) DEFAULT 'pending',
        created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        completed_by INTEGER REFERENCES users(id),
        completed_at TIMESTAMPTZ,
        admin_note TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);


    // Add 'supplier' to parties type check
    await client.query(`ALTER TABLE parties DROP CONSTRAINT IF EXISTS parties_type_check;`);
    await client.query(`ALTER TABLE parties ADD CONSTRAINT parties_type_check CHECK(type IN ('dealer','contractor','builder','institution','damage_buyer','other','supplier'));`);

    // Add supplier_id FK to purchases
    // truck_trips new columns
    await client.query(`ALTER TABLE truck_trips ADD COLUMN IF NOT EXISTS transporter_id INTEGER REFERENCES transporters(id);`);
    await client.query(`ALTER TABLE truck_trips ADD COLUMN IF NOT EXISTS diesel_from_id INTEGER REFERENCES transporters(id);`);
    await client.query(`ALTER TABLE truck_trips ADD COLUMN IF NOT EXISTS transporter_commission REAL DEFAULT 0;`);
    // transporter_payments new columns
    await client.query(`ALTER TABLE transporter_payments ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'paid';`);
    // driver_payments new columns
    await client.query(`ALTER TABLE driver_payments ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'paid';`);
    // trucks new columns
    await client.query(`ALTER TABLE trucks ADD COLUMN IF NOT EXISTS doc_expiry_date TEXT;`);
    await client.query(`ALTER TABLE trucks ADD COLUMN IF NOT EXISTS drive_link TEXT;`);

    await client.query(`ALTER TABLE purchases ADD COLUMN IF NOT EXISTS supplier_id INTEGER REFERENCES parties(id);`);

    // Migrate existing supplier_name values into parties table (type = supplier) and link back
    await client.query(`
      INSERT INTO parties (name, type)
      SELECT DISTINCT p.supplier_name, 'supplier'
      FROM purchases p
      WHERE p.supplier_name IS NOT NULL AND p.supplier_name != ''
        AND NOT EXISTS (SELECT 1 FROM parties pt WHERE LOWER(pt.name) = LOWER(p.supplier_name));
    `);
    await client.query(`
      UPDATE purchases p
      SET supplier_id = pt.id
      FROM parties pt
      WHERE LOWER(pt.name) = LOWER(p.supplier_name) AND p.supplier_id IS NULL;
    `);

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
      CREATE TABLE IF NOT EXISTS loan_repayments (
        id SERIAL PRIMARY KEY,
        loan_id INTEGER NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        amount REAL NOT NULL,
        mode TEXT CHECK(mode IN ('bank','cash')) DEFAULT 'bank',
        bank_name TEXT,
        cash_handler TEXT,
        remarks TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(`ALTER TABLE loan_repayments ADD COLUMN IF NOT EXISTS cash_handler TEXT`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_loan_repayments_loan ON loan_repayments(loan_id)`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS bank_transfers (
        id SERIAL PRIMARY KEY,
        date TEXT NOT NULL,
        from_bank TEXT NOT NULL,
        to_bank TEXT NOT NULL,
        amount REAL NOT NULL CHECK(amount > 0),
        remarks TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        CHECK(from_bank <> to_bank)
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_bank_transfers_from ON bank_transfers(from_bank)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_bank_transfers_to ON bank_transfers(to_bank)`);

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

    // Auth tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'user')) DEFAULT 'user',
        display_name TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS user_permissions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        permission_name TEXT NOT NULL,
        UNIQUE(user_id, permission_name)
      );
    `);

    // Seed default users
    const defaultUsers = [
      { username: 'admin', password: 'cement@123', role: 'admin', display_name: 'Admin' },
      { username: 'gourav', password: 'gourav@123', role: 'user', display_name: 'Gourav' },
      { username: 'akash', password: 'akash@123', role: 'user', display_name: 'Akash' },
    ];
    for (const u of defaultUsers) {
      const hash = await bcrypt.hash(u.password, 10);
      await client.query(
        `INSERT INTO users (username, password_hash, role, display_name) VALUES ($1, $2, $3, $4) ON CONFLICT (username) DO NOTHING`,
        [u.username, hash, u.role, u.display_name]
      );
    }

    // Pending entries — entries submitted by non-admin users with a past/future date, awaiting admin approval
    await client.query(`
      CREATE TABLE IF NOT EXISTS pending_entries (
        id SERIAL PRIMARY KEY,
        entry_type TEXT NOT NULL CHECK(entry_type IN ('sale', 'purchase', 'payment', 'expense')),
        entry_data JSONB NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
        created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_by_name TEXT NOT NULL DEFAULT '',
        reviewed_by INTEGER REFERENCES users(id),
        reviewed_at TIMESTAMPTZ,
        admin_note TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Add source column to requests and pending_entries to separate CementBook / TruckBook
    await client.query(`ALTER TABLE requests ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'cementbook';`);
    await client.query(`ALTER TABLE pending_entries ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'cementbook';`);
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_pending_entries_source_status_created ON pending_entries (source, status, created_at DESC)`
    );

    // opening_balance_type: 'dr' = they owe us (debit), 'cr' = we owe them (credit)
    await client.query(`ALTER TABLE parties ADD COLUMN IF NOT EXISTS opening_balance_type TEXT NOT NULL DEFAULT 'dr'`);
    // Existing parties also need supplier type allowed in the check constraint
    await client.query(`ALTER TABLE parties DROP CONSTRAINT IF EXISTS parties_type_check`);
    await client.query(`ALTER TABLE parties ADD CONSTRAINT parties_type_check CHECK(type IN ('dealer','contractor','builder','institution','damage_buyer','supplier','other'))`);

    // --- Unified cash_handler column for every cash-capable table ---
    // Pre-existing rows stored the handler name in `bank_name`; this migrates them.
    await client.query(`ALTER TABLE payments             ADD COLUMN IF NOT EXISTS cash_handler TEXT`);
    await client.query(`ALTER TABLE expenses             ADD COLUMN IF NOT EXISTS cash_handler TEXT`);
    await client.query(`ALTER TABLE driver_payments      ADD COLUMN IF NOT EXISTS cash_handler TEXT`);
    await client.query(`ALTER TABLE truck_expenses       ADD COLUMN IF NOT EXISTS cash_handler TEXT`);
    await client.query(`ALTER TABLE transporter_payments ADD COLUMN IF NOT EXISTS cash_handler TEXT`);
    for (const tbl of ['payments', 'expenses', 'driver_payments', 'truck_expenses', 'transporter_payments']) {
      await client.query(
        `UPDATE ${tbl} SET cash_handler = bank_name, bank_name = NULL
           WHERE mode = 'cash'
             AND cash_handler IS NULL
             AND bank_name IS NOT NULL
             AND bank_name IN (SELECT handler_name FROM imprest_handlers)`
      );
    }

    // Link imprest_transactions back to their originating row so edits/deletes cascade cleanly.
    await client.query(`ALTER TABLE imprest_transactions ADD COLUMN IF NOT EXISTS source_table TEXT`);
    await client.query(`ALTER TABLE imprest_transactions ADD COLUMN IF NOT EXISTS source_id INTEGER`);
    await client.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_imprest_txn_source
         ON imprest_transactions (source_table, source_id)
         WHERE source_table IS NOT NULL AND source_id IS NOT NULL`
    );

    // Opening stock per godown+brand (for bags already on hand before the app was used).
    // Stock value is computed as bags * rate.
    await client.query(`
      CREATE TABLE IF NOT EXISTS godown_opening_stock (
        id SERIAL PRIMARY KEY,
        godown_id INTEGER NOT NULL REFERENCES godowns(id) ON DELETE CASCADE,
        brand_id  INTEGER NOT NULL REFERENCES cement_brands(id) ON DELETE CASCADE,
        bags INTEGER NOT NULL DEFAULT 0,
        rate REAL NOT NULL DEFAULT 0,
        as_of_date TEXT,
        remarks TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (godown_id, brand_id)
      )
    `);

    // Transport Book (Rudra Logistics) tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS rl_truck_owners (
        id SERIAL PRIMARY KEY,
        truck_number TEXT NOT NULL UNIQUE,
        owner_name TEXT NOT NULL,
        owner_phone TEXT,
        driver_name TEXT,
        driver_phone TEXT,
        bank_account TEXT,
        ifsc_code TEXT,
        beneficiary_name TEXT,
        pan_number TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS rl_trips (
        id SERIAL PRIMARY KEY,
        date TEXT NOT NULL,
        builty_number TEXT,
        do_number TEXT,
        truck_owner_id INTEGER NOT NULL REFERENCES rl_truck_owners(id),
        party_name TEXT NOT NULL,
        location TEXT,
        dch_type TEXT,
        qty REAL NOT NULL DEFAULT 0,
        acc_freight_rate REAL NOT NULL DEFAULT 0,
        commission_pct REAL DEFAULT 6.29,
        diesel_advance REAL DEFAULT 0,
        cash_advance REAL DEFAULT 0,
        petrol_slip_number TEXT,
        epod_bill_number TEXT,
        difference_rate REAL DEFAULT 0,
        remarks TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS rl_invoices (
        id SERIAL PRIMARY KEY,
        invoice_number TEXT NOT NULL UNIQUE,
        invoice_date TEXT,
        invoice_amount REAL,
        payment_receive_date TEXT,
        received_amount REAL,
        tds_amount REAL,
        status TEXT CHECK(status IN ('pending','done','partial')) DEFAULT 'pending',
        remarks TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS rl_partners (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        opening_capital REAL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS rl_partner_transactions (
        id SERIAL PRIMARY KEY,
        date TEXT NOT NULL,
        partner_id INTEGER NOT NULL REFERENCES rl_partners(id),
        type TEXT CHECK(type IN ('withdrawal','profit','capital')) NOT NULL,
        amount REAL NOT NULL,
        remarks TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    // Seed default partners only on first setup (empty table)
    const partnerCount = await client.query(`SELECT COUNT(*)::int AS c FROM rl_partners`);
    if (partnerCount.rows[0].c === 0) {
      await client.query(`
        INSERT INTO rl_partners (name, opening_capital) VALUES
          ('Shubham', 0), ('Rahul', 0), ('Rahul Ashish Singh', 0), ('Partner 4', 0)
        ON CONFLICT (name) DO NOTHING;
      `);
    }

    // Global key-value settings (handling charges, bilty rate, gps rent, etc.)
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(`
      INSERT INTO app_settings (key, value) VALUES
        ('handling_non_trade_per_mt', '17'),
        ('handling_sow_per_mt', '17'),
        ('bilty_per_mt', '10'),
        ('gps_rent_monthly', '250')
      ON CONFLICT (key) DO NOTHING;
    `);

    // material_type on rl_trips (added incrementally — existing rows stay NULL)
    await client.query(`
      ALTER TABLE rl_trips ADD COLUMN IF NOT EXISTS material_type TEXT
    `);

    // Monthly GPS rent debit log — one row per (truck_owner, YYYY-MM)
    await client.query(`
      CREATE TABLE IF NOT EXISTS rl_gps_rent_debits (
        id SERIAL PRIMARY KEY,
        truck_owner_id INTEGER NOT NULL REFERENCES rl_truck_owners(id) ON DELETE CASCADE,
        period TEXT NOT NULL,
        date TEXT NOT NULL,
        amount REAL NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (truck_owner_id, period)
      );
    `);

    // Track when an owner was activated so GPS backfill doesn't reach before that date
    await client.query(`
      ALTER TABLE rl_truck_owners ADD COLUMN IF NOT EXISTS active_since TEXT
    `);

    // Per-owner default commission % — auto-populated into new trips so we
    // don't have to remember each owner's rate when entering trips.
    await client.query(`
      ALTER TABLE rl_truck_owners ADD COLUMN IF NOT EXISTS commission_pct REAL DEFAULT 6.29
    `);
    await client.query(`
      UPDATE rl_truck_owners SET active_since = to_char(COALESCE(created_at, NOW()), 'YYYY-MM-DD')
      WHERE is_active = 1 AND active_since IS NULL
    `);

    // E-Way Bill tracking on trips
    await client.query(`ALTER TABLE rl_trips ADD COLUMN IF NOT EXISTS eway_bill_number TEXT`);
    await client.query(`ALTER TABLE rl_trips ADD COLUMN IF NOT EXISTS eway_bill_generated_at TEXT`);
    await client.query(`ALTER TABLE rl_trips ADD COLUMN IF NOT EXISTS eway_bill_valid_until TEXT`);
    await client.query(`ALTER TABLE rl_trips ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'pending'`);
    await client.query(`ALTER TABLE rl_trips ADD COLUMN IF NOT EXISTS delivered_at TEXT`);

    // Owner-level advance payments — lump sums paid to a truck owner that are
    // adjusted against the owner's net payable in the aggregated owner ledger.
    // Stored at owner_name level (not truck_owner_id) because advances are
    // typically given to the owner regardless of which truck earned the trips.
    await client.query(`
      CREATE TABLE IF NOT EXISTS rl_owner_advances (
        id SERIAL PRIMARY KEY,
        owner_name TEXT NOT NULL,
        date TEXT NOT NULL,
        amount REAL NOT NULL,
        remarks TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_rl_owner_advances_owner_name
        ON rl_owner_advances (owner_name)
    `);

    // Compliance tracking on invoices — GSTR / ITC status
    await client.query(`ALTER TABLE rl_invoices ADD COLUMN IF NOT EXISTS gstr1_status TEXT DEFAULT 'pending'`);
    await client.query(`ALTER TABLE rl_invoices ADD COLUMN IF NOT EXISTS gstr1_period TEXT`);
    await client.query(`ALTER TABLE rl_invoices ADD COLUMN IF NOT EXISTS gstr3b_status TEXT DEFAULT 'pending'`);
    await client.query(`ALTER TABLE rl_invoices ADD COLUMN IF NOT EXISTS gstr3b_period TEXT`);
    await client.query(`ALTER TABLE rl_invoices ADD COLUMN IF NOT EXISTS itc_status TEXT DEFAULT 'not_claimed'`);
    await client.query(`ALTER TABLE rl_invoices ADD COLUMN IF NOT EXISTS itc_period TEXT`);
    await client.query(`ALTER TABLE rl_invoices ADD COLUMN IF NOT EXISTS compliance_remarks TEXT`);

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
