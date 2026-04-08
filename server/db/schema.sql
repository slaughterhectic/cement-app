CREATE TABLE IF NOT EXISTS parties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  location TEXT,
  district TEXT,
  type TEXT CHECK(type IN ('dealer', 'contractor', 'builder', 'institution', 'damage_buyer', 'other')),
  opening_balance REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cement_brands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT CHECK(type IN ('OPC', 'PPC', 'DAMAGE', 'OTHER')),
  manufacturer TEXT,
  is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS godowns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  location TEXT
);

CREATE TABLE IF NOT EXISTS purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  party_id INTEGER NOT NULL REFERENCES parties(id),
  amount REAL NOT NULL,
  mode TEXT CHECK(mode IN ('bank', 'cash')) DEFAULT 'bank',
  bank_name TEXT,
  remarks TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  amount REAL NOT NULL,
  category TEXT,
  description TEXT NOT NULL,
  bank_name TEXT,
  mode TEXT CHECK(mode IN ('bank', 'cash')) DEFAULT 'bank',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
