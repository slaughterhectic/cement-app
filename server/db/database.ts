import pg from 'pg';
import bcrypt from 'bcryptjs';

// Supabase session-mode pooler caps concurrent clients; keep the local pool
// small so we queue instead of overflowing upstream. Override via DB_POOL_MAX.
const POOL_MAX = parseInt(process.env.DB_POOL_MAX || '8');
const poolConfig: pg.PoolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: POOL_MAX,
      idleTimeoutMillis: 30000,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5433'),
      database: process.env.DB_NAME || 'cementbook',
      user: process.env.DB_USER || 'cementbook',
      password: process.env.DB_PASS || 'cement123',
      max: POOL_MAX,
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
        source_truck_number TEXT,
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
        has_gst BOOLEAN DEFAULT FALSE,
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
        advance_deduction REAL DEFAULT 0,
        toll_expense REAL DEFAULT 0,
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
        expense_completed BOOLEAN DEFAULT FALSE,
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
    await client.query(`ALTER TABLE parties ADD CONSTRAINT parties_type_check CHECK(type IN ('dealer','contractor','builder','institution','damage_buyer','other','supplier','suspense'));`);

    // Add supplier_id FK to purchases
    // truck_trips new columns
    await client.query(`ALTER TABLE truck_trips ADD COLUMN IF NOT EXISTS transporter_id INTEGER REFERENCES transporters(id);`);
    await client.query(`ALTER TABLE truck_trips ADD COLUMN IF NOT EXISTS diesel_from_id INTEGER REFERENCES transporters(id);`);
    await client.query(`ALTER TABLE truck_trips ADD COLUMN IF NOT EXISTS transporter_commission REAL DEFAULT 0;`);
    // advance diesel collapsed from (litres × rate) into a single amount stored in advance_deduction
    await client.query(`ALTER TABLE truck_trips DROP COLUMN IF EXISTS advance_litres;`);
    await client.query(`ALTER TABLE truck_trips DROP COLUMN IF EXISTS advance_rate;`);
    // Trip Expenses split: trips can be logged without costs, then expensed later.
    // Existing rows already have costs filled in, so backfill them as completed.
    await client.query(`ALTER TABLE truck_trips ADD COLUMN IF NOT EXISTS expense_completed BOOLEAN DEFAULT FALSE;`);
    await client.query(`UPDATE truck_trips SET expense_completed = TRUE WHERE expense_completed IS NOT TRUE AND (loading_charge>0 OR unloading_charge>0 OR diesel_amount>0 OR driver_payment>0 OR miscellaneous>0);`);
    // Freight is income, not a wallet outflow — drop legacy debits keyed by source_table='truck_trip'.
    // New cost-side debits use source_table='truck_trip_expense'.
    await client.query(`DELETE FROM wallet_transactions WHERE source_table='truck_trip';`);
    // Trip diesel collapsed from (litres × rate) into a single amount stored in diesel_amount.
    // Trip diesel can optionally be sourced from a transporter (trip_diesel_from_id) — when set,
    // the cost posts to that transporter's ledger instead of debiting the wallet, mirroring
    // how advance_deduction + diesel_from_id works.
    await client.query(`ALTER TABLE truck_trips DROP COLUMN IF EXISTS diesel_litres;`);
    await client.query(`ALTER TABLE truck_trips DROP COLUMN IF EXISTS diesel_rate;`);
    await client.query(`ALTER TABLE truck_trips ADD COLUMN IF NOT EXISTS trip_diesel_from_id INTEGER REFERENCES transporters(id);`);
    // GST: transporters can be GST-registered. When they are, the trip's freight gets +18% on top.
    await client.query(`ALTER TABLE transporters ADD COLUMN IF NOT EXISTS has_gst BOOLEAN DEFAULT FALSE;`);
    await client.query(`ALTER TABLE truck_trips ADD COLUMN IF NOT EXISTS gst_amount REAL DEFAULT 0;`);
    // Sales now track which purchase truck the bags came from, so the brand selector can
    // break stock down per truck and the party ledger can show that batch.
    await client.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS source_truck_number TEXT;`);
    // Freight parties: separate ledger entity for freight on purchases. The freight portion
    // (bags × freight_rate) lands on the freight party, not the supplier.
    await client.query(`
      CREATE TABLE IF NOT EXISTS freight_parties (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        opening_balance REAL DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS freight_party_payments (
        id SERIAL PRIMARY KEY,
        freight_party_id INTEGER NOT NULL REFERENCES freight_parties(id),
        date TEXT NOT NULL,
        amount REAL NOT NULL,
        mode TEXT CHECK(mode IN ('cash','bank')) DEFAULT 'cash',
        bank_name TEXT,
        cash_handler TEXT,
        remarks TEXT,
        payment_type TEXT DEFAULT 'paid',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(`ALTER TABLE purchases ADD COLUMN IF NOT EXISTS freight_party_id INTEGER REFERENCES freight_parties(id);`);
    // Earlier "additional diesel" columns are folded into the unified trip diesel pair.
    await client.query(`ALTER TABLE truck_trips DROP COLUMN IF EXISTS additional_diesel_amount;`);
    await client.query(`ALTER TABLE truck_trips DROP COLUMN IF EXISTS additional_diesel_from_id;`);
    // Backfill wallet debits for trips that were marked expense_completed via the earlier
    // migration but never went through the new PATCH /:id/expense (so the wallet was never
    // touched for them). Idempotent — only inserts where no truck_trip_expense row exists yet.
    await client.query(`
      INSERT INTO wallet_transactions (date, type, amount, source_table, source_id, remarks)
      SELECT t.date, 'debit',
             (t.loading_charge + t.unloading_charge + t.diesel_amount + t.driver_payment + t.miscellaneous),
             'truck_trip_expense', t.id, 'Expenses for trip #' || t.id || ' (backfill)'
      FROM truck_trips t
      WHERE t.expense_completed
        AND (t.loading_charge + t.unloading_charge + t.diesel_amount + t.driver_payment + t.miscellaneous) > 0
        AND t.trip_diesel_from_id IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM wallet_transactions w
          WHERE w.source_table='truck_trip_expense' AND w.source_id=t.id
        );
    `);
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

    await client.query(`ALTER TABLE party_loans ADD COLUMN IF NOT EXISTS cash_handler TEXT`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS assets (
        id SERIAL PRIMARY KEY,
        date TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT,
        amount REAL NOT NULL CHECK(amount > 0),
        mode TEXT CHECK(mode IN ('bank','cash')) DEFAULT 'bank',
        bank_name TEXT,
        cash_handler TEXT,
        remarks TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_assets_mode ON assets(mode)`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS asset_topups (
        id SERIAL PRIMARY KEY,
        asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        amount REAL NOT NULL CHECK(amount > 0),
        mode TEXT CHECK(mode IN ('bank','cash')) DEFAULT 'bank',
        bank_name TEXT,
        cash_handler TEXT,
        remarks TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_asset_topups_asset ON asset_topups(asset_id)`);

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
    // Widen entry_type CHECK to cover TruckBook + TransportBook entry types — must
    // stay in sync with the entry types accepted by /api/pending-entries/:id/approve.
    await client.query(`ALTER TABLE pending_entries DROP CONSTRAINT IF EXISTS pending_entries_entry_type_check`);
    await client.query(`
      ALTER TABLE pending_entries ADD CONSTRAINT pending_entries_entry_type_check
        CHECK (entry_type IN (
          'sale','purchase','payment','expense',
          'truck_trip','truck_expense','driver_payment','transporter_payment',
          'rl_trip','rl_owner_advance','rl_partner_transaction'
        ))
    `);

    // opening_balance_type: 'dr' = they owe us (debit), 'cr' = we owe them (credit)
    await client.query(`ALTER TABLE parties ADD COLUMN IF NOT EXISTS opening_balance_type TEXT NOT NULL DEFAULT 'dr'`);
    // Existing parties also need supplier type allowed in the check constraint
    await client.query(`ALTER TABLE parties DROP CONSTRAINT IF EXISTS parties_type_check`);
    await client.query(`ALTER TABLE parties ADD CONSTRAINT parties_type_check CHECK(type IN ('dealer','contractor','builder','institution','damage_buyer','supplier','other','suspense'))`);

    // payments.mode now accepts 'suspense' for via-suspense routing
    await client.query(`ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_mode_check`);
    await client.query(`ALTER TABLE payments ADD CONSTRAINT payments_mode_check CHECK(mode IN ('bank','cash','suspense'))`);
    await client.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS suspense_party_id INTEGER REFERENCES parties(id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_payments_suspense ON payments(suspense_party_id) WHERE suspense_party_id IS NOT NULL`);

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
    // Per-invoice payment receipts so partial payments accumulate over time.
    await client.query(`
      CREATE TABLE IF NOT EXISTS rl_invoice_payments (
        id SERIAL PRIMARY KEY,
        invoice_id INTEGER NOT NULL REFERENCES rl_invoices(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        amount REAL NOT NULL,
        mode TEXT CHECK(mode IN ('cash','bank')) DEFAULT 'bank',
        bank_name TEXT,
        reference TEXT,
        remarks TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_rl_invoice_payments_inv ON rl_invoice_payments (invoice_id, date);`);
    // Bifurcate invoice amount into base + GST and add a Misc line for one-off charges.
    await client.query(`ALTER TABLE rl_invoices ADD COLUMN IF NOT EXISTS basic_amount REAL`);
    await client.query(`ALTER TABLE rl_invoices ADD COLUMN IF NOT EXISTS gst_amount REAL`);
    await client.query(`ALTER TABLE rl_invoices ADD COLUMN IF NOT EXISTS misc_amount REAL DEFAULT 0`);
    await client.query(`ALTER TABLE rl_invoices ADD COLUMN IF NOT EXISTS misc_remarks TEXT`);

    // ACC vs JK billing — invoices are tagged per company; numbering is unique per company.
    await client.query(`ALTER TABLE rl_invoices ADD COLUMN IF NOT EXISTS company TEXT NOT NULL DEFAULT 'acc'`);
    await client.query(`ALTER TABLE rl_invoices DROP CONSTRAINT IF EXISTS rl_invoices_company_check`);
    await client.query(`ALTER TABLE rl_invoices ADD CONSTRAINT rl_invoices_company_check CHECK (company IN ('acc','jk'))`);
    await client.query(`ALTER TABLE rl_invoices DROP CONSTRAINT IF EXISTS rl_invoices_invoice_number_key`);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_rl_invoices_company_number ON rl_invoices(company, invoice_number)`);

    // Performance indexes — capital/parties summaries do many SUM(...) WHERE party_id/mode/...
    // aggregates; without these the planner falls back to seq scans.
    await client.query(`CREATE INDEX IF NOT EXISTS idx_payments_party        ON payments(party_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_payments_mode_dir     ON payments(mode, direction)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_payments_mode_bank    ON payments(mode, bank_name)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_expenses_mode_bank    ON expenses(mode, bank_name)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_expenses_mode_handler ON expenses(mode, cash_handler)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sales_party           ON sales(party_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sales_brand           ON sales(brand_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_purchases_supplier    ON purchases(supplier_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_purchases_brand       ON purchases(brand_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_party_loans_party     ON party_loans(party_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_party_loans_mode_type ON party_loans(mode, type)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_truck_expenses_mode   ON truck_expenses(mode, bank_name)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_truck_expenses_truck  ON truck_expenses(truck_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_driver_payments_mode  ON driver_payments(mode, bank_name)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_driver_payments_drv   ON driver_payments(driver_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_transporter_payments_mode ON transporter_payments(mode, bank_name)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_transporter_payments_tp   ON transporter_payments(transporter_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_imprest_handler       ON imprest_transactions(handler_name)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_godown_opening_brand  ON godown_opening_stock(brand_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_parties_type          ON parties(type)`);

    // TruckBook wallet — single virtual account funded from bank/cash, drained by trip freight.
    await client.query(`
      CREATE TABLE IF NOT EXISTS wallet_transactions (
        id SERIAL PRIMARY KEY,
        date TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('credit','debit')),
        amount REAL NOT NULL CHECK (amount > 0),
        mode TEXT CHECK (mode IN ('bank','cash')),
        bank_name TEXT,
        cash_handler TEXT,
        source_table TEXT NOT NULL DEFAULT 'manual',
        source_id INTEGER,
        remarks TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_wallet_txn_date ON wallet_transactions(date)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_wallet_txn_source ON wallet_transactions(source_table, source_id)`);

    // FastTag accounts — multiple, bank-funded only, drained by trip toll expenses.
    await client.query(`
      CREATE TABLE IF NOT EXISTS fastags (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        opening_balance REAL NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        remarks TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS fastag_transactions (
        id SERIAL PRIMARY KEY,
        fastag_id INTEGER NOT NULL REFERENCES fastags(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('credit','debit')),
        amount REAL NOT NULL CHECK (amount > 0),
        bank_name TEXT,
        source_table TEXT NOT NULL DEFAULT 'manual',
        source_id INTEGER,
        remarks TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_fastag_txn_fastag ON fastag_transactions(fastag_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_fastag_txn_source ON fastag_transactions(source_table, source_id)`);
    await client.query(`ALTER TABLE truck_trips ADD COLUMN IF NOT EXISTS fastag_id INTEGER REFERENCES fastags(id)`);

    // TransportBook Diesel parties — diesel is purchased from one or more pumps; each
    // pump keeps its own ledger so the team can see how much is outstanding per supplier.
    // Pattern mirrors fastags: opening_balance + bank/cash credits − trip diesel_advance debits.
    await client.query(`
      CREATE TABLE IF NOT EXISTS rl_diesel_parties (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        phone TEXT,
        opening_balance REAL NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        remarks TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS rl_diesel_transactions (
        id SERIAL PRIMARY KEY,
        diesel_party_id INTEGER NOT NULL REFERENCES rl_diesel_parties(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('credit','debit')),
        amount REAL NOT NULL CHECK (amount > 0),
        mode TEXT CHECK (mode IN ('bank','cash')),
        bank_name TEXT,
        cash_handler TEXT,
        source_table TEXT NOT NULL DEFAULT 'manual',
        source_id INTEGER,
        remarks TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_rl_diesel_txn_party ON rl_diesel_transactions(diesel_party_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_rl_diesel_txn_source ON rl_diesel_transactions(source_table, source_id)`);
    await client.query(`ALTER TABLE rl_trips ADD COLUMN IF NOT EXISTS diesel_party_id INTEGER REFERENCES rl_diesel_parties(id)`);
    // Per-trip diesel receipt number from the pump's credit memo + payment-received flag.
    await client.query(`ALTER TABLE rl_trips ADD COLUMN IF NOT EXISTS diesel_receipt_number TEXT`);
    await client.query(`ALTER TABLE rl_trips ADD COLUMN IF NOT EXISTS received BOOLEAN NOT NULL DEFAULT FALSE`);
    // TransportBook-isolated banking. Kept separate from CementBook bank_balances /
    // payments / capital — TransportBook tracks its own banks and a manual debit/credit
    // ledger so totals never bleed between books.
    await client.query(`
      CREATE TABLE IF NOT EXISTS rl_banks (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        opening_balance REAL DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS rl_bank_transactions (
        id SERIAL PRIMARY KEY,
        bank_id INTEGER NOT NULL REFERENCES rl_banks(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        type TEXT CHECK(type IN ('credit','debit')) NOT NULL,
        amount REAL NOT NULL,
        particulars TEXT,
        remarks TEXT,
        source_table TEXT,
        source_id INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_rl_bank_txn_bank ON rl_bank_transactions (bank_id, date);`);
    // TransportBook expenses log — salary, office rent, etc. Mirrors CementBook expenses.
    await client.query(`
      CREATE TABLE IF NOT EXISTS rl_expenses (
        id SERIAL PRIMARY KEY,
        date TEXT NOT NULL,
        category TEXT,
        description TEXT,
        amount REAL NOT NULL,
        mode TEXT CHECK(mode IN ('cash','bank')) DEFAULT 'cash',
        bank_name TEXT,
        cash_handler TEXT,
        remarks TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Trips bill either ACC or JK — used by /rl/invoices/billing-summary so each company
    // sees only its own auto-shifted freight receivable. Existing rows default to 'acc'.
    await client.query(`ALTER TABLE rl_trips ADD COLUMN IF NOT EXISTS company TEXT NOT NULL DEFAULT 'acc'`);
    await client.query(`ALTER TABLE rl_trips DROP CONSTRAINT IF EXISTS rl_trips_company_check`);
    await client.query(`ALTER TABLE rl_trips ADD CONSTRAINT rl_trips_company_check CHECK (company IN ('acc','jk'))`);

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
