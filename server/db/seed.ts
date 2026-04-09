import pg from 'pg';
import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433'),
  database: process.env.DB_NAME || 'cementbook',
  user: process.env.DB_USER || 'cementbook',
  password: process.env.DB_PASS || 'cement123',
});

async function run() {
  const client = await pool.connect();
  try {
    // Create schema
    await client.query(`
      DROP TABLE IF EXISTS expenses CASCADE;
      DROP TABLE IF EXISTS payments CASCADE;
      DROP TABLE IF EXISTS sales CASCADE;
      DROP TABLE IF EXISTS purchases CASCADE;
      DROP TABLE IF EXISTS godowns CASCADE;
      DROP TABLE IF EXISTS cement_brands CASCADE;
      DROP TABLE IF EXISTS parties CASCADE;

      CREATE TABLE parties (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        location TEXT,
        district TEXT,
        type TEXT CHECK(type IN ('dealer', 'contractor', 'builder', 'institution', 'damage_buyer', 'other')),
        opening_balance REAL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE cement_brands (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT CHECK(type IN ('OPC', 'PPC', 'DAMAGE', 'OTHER')),
        manufacturer TEXT,
        is_active INTEGER DEFAULT 1
      );

      CREATE TABLE godowns (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        location TEXT
      );

      CREATE TABLE purchases (
        id SERIAL PRIMARY KEY,
        date TEXT NOT NULL,
        supplier_name TEXT NOT NULL,
        brand_id INTEGER REFERENCES cement_brands(id),
        cement_type TEXT,
        bags REAL NOT NULL,
        purchase_rate REAL NOT NULL,
        purchase_amount REAL GENERATED ALWAYS AS (bags * purchase_rate) STORED,
        godown_id INTEGER REFERENCES godowns(id),
        truck_number TEXT,
        source_location TEXT,
        remarks TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE sales (
        id SERIAL PRIMARY KEY,
        date TEXT NOT NULL,
        party_id INTEGER NOT NULL REFERENCES parties(id),
        brand_id INTEGER NOT NULL REFERENCES cement_brands(id),
        cement_type TEXT,
        bags REAL NOT NULL,
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

      CREATE TABLE payments (
        id SERIAL PRIMARY KEY,
        date TEXT NOT NULL,
        party_id INTEGER NOT NULL REFERENCES parties(id),
        amount REAL NOT NULL,
        mode TEXT CHECK(mode IN ('bank', 'cash')) DEFAULT 'bank',
        bank_name TEXT,
        remarks TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE expenses (
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
    console.log('Schema created');

    // Seed godowns
    await client.query(`
      INSERT INTO godowns (name, location) VALUES
        ('Maunda Godown', 'Maunda, Lucknow'),
        ('Dubagga Godown', 'Dubagga, Lucknow'),
        ('Main Office', 'Lucknow')
    `);
    console.log('Seeded 3 godowns');

    // Seed brands
    const brands = [
      ['Shree Cement OPC', 'OPC', 'Shree Cement'],
      ['Shree Cement PPC', 'PPC', 'Shree Cement'],
      ['JK Cement OPC', 'OPC', 'JK Cement'],
      ['JK Cement PPC', 'PPC', 'JK Cement'],
      ['Birla OPC', 'OPC', 'Birla'],
      ['Birla Multicem', 'PPC', 'Birla'],
      ['Ultratech OPC', 'OPC', 'Ultratech'],
      ['Ultratech PPC', 'PPC', 'Ultratech'],
      ['Ultratech Damage', 'DAMAGE', 'Ultratech'],
      ['Tansen OPC', 'OPC', 'Tansen'],
      ['Tansen PPC', 'PPC', 'Tansen'],
      ['Sagarmatha OPC', 'OPC', 'Sagarmatha'],
      ['Bangur OPC', 'OPC', 'Bangur'],
      ['Bangur PPC', 'PPC', 'Bangur'],
      ['ACC Gold', 'PPC', 'ACC'],
      ['Mycem PPC', 'PPC', 'Mycem'],
      ['Double Bull OPC', 'OPC', 'Double Bull'],
      ['Double Bull PPC', 'PPC', 'Double Bull'],
      ['HV Cement', 'OPC', 'HV'],
      ['Palpa OPC', 'OPC', 'Palpa'],
      ['Arghakhanchi OPC', 'OPC', 'Arghakhanchi'],
      ['Prism NFR', 'OTHER', 'Prism'],
    ];
    for (const [name, type, mfr] of brands) {
      await client.query('INSERT INTO cement_brands (name, type, manufacturer) VALUES ($1, $2, $3)', [name, type, mfr]);
    }
    console.log(`Seeded ${brands.length} brands`);

    // Build brand lookup
    const brandRows = (await client.query('SELECT id, name, type FROM cement_brands')).rows;
    const brandMap: Record<string, number> = {};
    for (const b of brandRows) {
      brandMap[b.name.toLowerCase()] = b.id;
      brandMap[b.name.toLowerCase().replace(' cement', '')] = b.id;
    }

    function findBrand(raw: string): { id: number; type: string } | null {
      if (!raw) return null;
      const s = raw.trim().toLowerCase();
      for (const b of brandRows) {
        if (s === b.name.toLowerCase()) return { id: b.id, type: b.type };
      }
      const mapping: [RegExp, string][] = [
        [/shree.*opc|shree opc|shri.*opc/i, 'Shree Cement OPC'],
        [/shree.*ppc|shree ppc|shri.*ppc|shree cement(?!.*opc)/i, 'Shree Cement PPC'],
        [/j\.?k\.?.*opc|jk.*opc/i, 'JK Cement OPC'],
        [/j\.?k\.?.*ppc|jk.*ppc|j\.?k\.? cem/i, 'JK Cement PPC'],
        [/b[ri]+la.*opc/i, 'Birla OPC'],
        [/b[ri]+la.*multi|b[ri]+la.*dam|b[ri]+la(?!.*opc)/i, 'Birla Multicem'],
        [/ultratech.*dam/i, 'Ultratech Damage'],
        [/ultratech.*opc/i, 'Ultratech OPC'],
        [/ultratech.*ppc|ultratech.*nfr|ultratech.*trade/i, 'Ultratech PPC'],
        [/tansen.*opc|tansen(?!.*ppc)/i, 'Tansen OPC'],
        [/tansen.*ppc/i, 'Tansen PPC'],
        [/sagarmatha/i, 'Sagarmatha OPC'],
        [/bangur.*opc|bangur(?!.*ppc)/i, 'Bangur OPC'],
        [/bangur.*ppc/i, 'Bangur PPC'],
        [/acc.*gold|acc/i, 'ACC Gold'],
        [/my\s*cem/i, 'Mycem PPC'],
        [/double.*bull.*opc/i, 'Double Bull OPC'],
        [/double.*bull.*ppc|double bull/i, 'Double Bull PPC'],
        [/hv\s*cement/i, 'HV Cement'],
        [/palpa/i, 'Palpa OPC'],
        [/arghakh/i, 'Arghakhanchi OPC'],
        [/prism/i, 'Prism NFR'],
        [/perfect.*dam/i, 'Ultratech Damage'],
      ];
      for (const [re, name] of mapping) {
        if (re.test(s)) {
          const found = brandRows.find((b: any) => b.name === name);
          if (found) return { id: found.id, type: found.type };
        }
      }
      return null;
    }

    // Build godown lookup
    const godownRows = (await client.query('SELECT id, name FROM godowns')).rows;
    const godownMap: Record<string, number> = {};
    for (const g of godownRows) godownMap[g.name.toLowerCase()] = g.id;

    // ============================================================
    // IMPORT FROM EXCEL FILES
    // ============================================================

    const excelDir = path.resolve(process.cwd(), '..');
    const saleLedgerPath = path.join(excelDir, 'Sale ledger.xlsx');
    const dailySalePath = path.join(excelDir, 'DAILY SALE REPORT.xlsx');
    const godownPath = path.join(process.cwd(), 'maunda godown.xlsx') ||
      path.join(excelDir, 'maunda godown.xlsx');
    const godownPathAlt = path.join(excelDir, 'cementbook', 'maunda godown.xlsx');

    // Helper: parse Excel date (could be serial number or string)
    function parseDate(val: any): string | null {
      if (!val) return null;
      if (typeof val === 'number') {
        const d = XLSX.SSF.parse_date_code(val);
        if (d) {
          const mm = String(d.m).padStart(2, '0');
          const dd = String(d.d).padStart(2, '0');
          return `${d.y}-${mm}-${dd}`;
        }
        return null;
      }
      // Clean common typos: double dots, stray dashes between digits
      let s = String(val).trim()
        .replace(/\.{2,}/g, '.')    // "17..11" → "17.11"
        .replace(/(\d)[\-]+\./g, '$1.')  // "16.10-.2025" → "16.10.2025"
        .replace(/\.(\d)[\-]+/g, '.$1'); // handle other dash positions

      // DD.MM.YYYY or DD/MM/YYYY (4-digit year) with sanity check
      const m = s.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})$/);
      if (m) {
        let year = parseInt(m[3]);
        if (year > 2030) {
          const ys = String(year);
          if (ys.startsWith('22')) year = parseInt('20' + ys.slice(2));
          else if (year > 2040) year = parseInt('20' + ys.slice(-2));
        }
        return `${year}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
      }
      // DD.MM.YY (2-digit year) → 2000+YY, capped to reasonable range
      const m2 = s.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{2})$/);
      if (m2) {
        let year = 2000 + parseInt(m2[3]);
        if (year > 2030) year -= 100;
        return `${year}-${m2[2].padStart(2, '0')}-${m2[1].padStart(2, '0')}`;
      }
      // DD.MM.YYY (truncated 4-digit year like "206" → "2026")
      const m3 = s.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{3})$/);
      if (m3) {
        const year = parseInt(m3[3]) < 100 ? 2000 + parseInt(m3[3]) : parseInt('2' + m3[3]);
        return `${year}-${m3[2].padStart(2, '0')}-${m3[1].padStart(2, '0')}`;
      }
      // ISO format already
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
      return null;
    }

    function parseNum(val: any): number {
      if (val == null) return 0;
      if (typeof val === 'number') return val;
      const s = String(val).replace(/[^0-9.\-]/g, '');
      return parseFloat(s) || 0;
    }

    // Normalize bank_name: known banks → standard name, others → null
    function normalizeBankName(raw: string | null): string | null {
      if (!raw) return null;
      const s = raw.trim().toLowerCase();
      if (/^(bob|bob\s|bank of baroda)/i.test(s)) return 'BOB';
      if (/^arm(tech|ech)/i.test(s)) return 'ARMTECH';
      if (/^ko(tak|kat)/i.test(s)) return 'KOTAK';
      if (/^axis/i.test(s)) return 'AXIS';
      if (/^hdfc/i.test(s)) return 'HDFC';
      if (/^icici/i.test(s)) return 'ICICI';
      if (/^(ok|obc|oriental)/i.test(s)) return 'OK';
      if (/^sbi/i.test(s)) return 'SBI';
      if (/cash/i.test(s)) return null;
      return null;
    }

    // Party name alias map: variant → canonical name
    // Resolves name mismatches between Sale Ledger and Daily Sale Report
    const partyAliases: Record<string, string> = {};
    function addAliases(canonical: string, variants: string[]) {
      for (const v of variants) partyAliases[v.trim().toUpperCase()] = canonical;
    }

    // Spelling variants & typos
    addAliases('ABHIJIT AGARWAL', ['abhijeet agarwal']);
    addAliases('ABDUL DUBAGGA', ['ABDUL DUBGGA', 'abdula dubgga']);
    addAliases('AJAY GOODS CAREER', ['AJAY GOODS CARRER', 'AJAY GOODS']);
    addAliases('ANIL SINGH ALLAHABAD', ['ANIL SINGH ALLAHABA', 'ANIL ALLAHABAD']);
    addAliases('Anil agarwal Behraich', ['ANIL AGARWAL BEHRAIC', 'ANIL AGARWAL LUCKNOW', 'ANIL AGRAWAL']);
    addAliases('ANUBHAV SINGH', ['ANUBHAV', 'ANUBAH SINGH']);
    addAliases('ANURAG SINGH', ['ANURAG  SINGH', 'Anurag Singh new']);
    addAliases('Anurag pratapgarh', ['ANURAG PTP']);
    addAliases('AZAD SINGH', ['AZAD SINGH KUNDA']);
    addAliases('BIRLA MUNSI HARDOI', ['Birla Munshi Hardoi', 'BRILA MUNSI HARDOI']);
    addAliases('CHINMAY CONSTRUCTION', ['CHINMAY CONTRUCTION', 'CHINMAY DEVELOPERS']);
    addAliases('CS COLLEGE MAINPURI', ['CS COLLEGE MAINPUR']);
    addAliases('DIXIT RBL', ['DIXIT', 'DIXIT JII']);
    addAliases('DILEEP ALAMNAGAR', ['Dileep lko']);
    addAliases('Guddu Behraich', ['Guddu Bahraich']);
    addAliases('Kamal Lucknow', ['KAMAL LKO']);
    addAliases('MANISH YADAV BALLIA', ['MANISH BALLIA', 'MANISH YADAV CONTRACTOR', 'MANISH contractor', 'Manish yadav']);
    addAliases('MARVA CEMENT', ['Marwa Cement']);
    addAliases('MISHRA & SON', ['MISHRA & SOND', 'Mishra Sons']);
    addAliases('OP AZAMGARH', ['O P AZAMGARH']);
    addAliases('PINTU SULTANPUR', ['PINTU']);
    addAliases('PRASANT BARABANKI', ['PRASHANT BARABANKI']);
    addAliases('PRASHANT SINGH', ['prasant singh', 'PRASANT SINGH']);
    addAliases('PREMA ENTERPRISES', ['PREMA ENTERPRISRES', 'Prema enterprises']);
    addAliases('RAGHAV SINGH', ['RAGHAV']);
    addAliases('SANDEEP KARSA', ['SANDEEP SINGH KARSA']);
    addAliases('SANJAY SINGH RUDAULI', ['Sanjay Rudauli', 'SANJAY RUDAULI']);
    addAliases('SAURABH SINGH', ['saurabh double bull munsi', 'SAURABH']);
    addAliases('SHREE ANNAPURNA INDUSTRIES', ['SHREE ANNAPURNA INDS', 'Shree Annapurna Industries']);
    addAliases('SHREE KHATU SHYAM', ['shree khatu shyam sales', 'Shree Khatu Shyam']);
    addAliases('SUBHASH RBL', ['Subhash jii', 'SUBHASH RAIBARELI', 'SHUBHAS RBL', 'Subhash']);
    addAliases('S S INDUSTRIES', ['SS INDUSTRIES']);
    addAliases('SASHI YADAV', ['SHASHI YADAV']);
    addAliases('VINOD SINGH RUDAULI', ['vinod singh rudauoli']);
    addAliases('VIVEK SHUKLA GONDA', ['VIVEK SHUKLA']);
    // Vivek 1 kept separate — unclear if same as Vivek Singh
    addAliases('Ashish Yash Builders', ['Ashish yash']);
    addAliases('Sunil raebarelly', ['sunil rbl']);
    addAliases('Archit Construction', ['Archit const']);
    addAliases('BANSAL', ['Bansal  Maurana']);
    addAliases('SALVENDRA GONDA', ['SALVENDRA']);
    addAliases('VIVEK SHUKLA GONDA', ['VIVEK SHUKLA']);
    addAliases('MAX INFRA', ['Max Infra']);
    // ANIL AGARWAL kept separate — multiple Anils in different cities
    addAliases('SHUBHAM ENTERPRISES', ['shubham enterprises', 'SHUBHAM RAIBAREILLY']);
    addAliases('ABHISHEK JAUNPUR', ['Abhishek jaunpur']);

    function resolvePartyName(name: string): string {
      const key = name.trim().toUpperCase();
      return partyAliases[key] || name.trim();
    }

    // Helper: get or create party
    const partyCache: Record<string, number> = {};
    async function getOrCreateParty(name: string, balance?: number): Promise<number> {
      const resolved = resolvePartyName(name);
      const key = resolved.toUpperCase();
      if (partyCache[key]) return partyCache[key];
      const existing = await client.query(
        'SELECT id FROM parties WHERE UPPER(TRIM(name)) = $1', [key]
      );
      if (existing.rows.length > 0) {
        partyCache[key] = existing.rows[0].id;
        return existing.rows[0].id;
      }
      const result = await client.query(
        'INSERT INTO parties (name, type, opening_balance) VALUES ($1, $2, $3) RETURNING id',
        [resolved, 'dealer', balance || 0]
      );
      partyCache[key] = result.rows[0].id;
      return result.rows[0].id;
    }

    // ============================================================
    // 1) IMPORT SALE LEDGER - Debitors list (parties + balances)
    // ============================================================
    let importedParties = 0;
    let importedPayments = 0;
    let importedSalesFromLedger = 0;
    let importedExpenses = 0;

    if (fs.existsSync(saleLedgerPath)) {
      console.log('\nImporting Sale Ledger...');
      const wb = XLSX.readFile(saleLedgerPath);

      // 1a) Import Debitors list -> parties with opening balances
      const dlSheet = wb.Sheets['Debitors list'];
      if (dlSheet) {
        const dl = XLSX.utils.sheet_to_json(dlSheet, { header: 1 }) as any[][];
        const skipNames = new Set([
          'party name', 'below 5 lac', 'above 5 lac', 'above 10 lac',
          'grand total', 'total', 'other payment', 'purchase party',
          '5 to 10 lac', 'cash in hand', 'mauda godown', 'dubagga godown',
          'balance', 'sundry creditors', 'sundry debtors', 'market investment',
          'greennets', 'manoj gupta bc',
          'sundry debtors', 'market investment', 'greennets',
        ]);
        for (let i = 3; i < dl.length; i++) {
          const row = dl[i];
          if (!row || !row[2] || typeof row[2] !== 'string') continue;
          const name = row[2].trim();
          if (name.length < 2 || skipNames.has(name.toLowerCase())) continue;
          const balance = parseNum(row[3]);
          await getOrCreateParty(name, balance);
          importedParties++;
        }
        console.log(`  Imported ${importedParties} parties from Debitors List`);
      }

      // 1b) Import Office Expenses
      const oeSheet = wb.Sheets['OFFICE EXPENSE'];
      if (oeSheet) {
        const oe = XLSX.utils.sheet_to_json(oeSheet, { header: 1 }) as any[][];
        for (let i = 2; i < oe.length; i++) {
          const row = oe[i];
          if (!row) continue;
          // Office expenses (columns 0-3)
          const offDate = parseDate(row[0]);
          const offAmount = parseNum(row[1]);
          const offRemark = row[2] ? String(row[2]).trim() : '';
          const offBank = row[3] ? String(row[3]).trim() : '';
          if (offDate && offAmount > 0 && offRemark) {
            await client.query(
              'INSERT INTO expenses (date, amount, category, description, bank_name, mode) VALUES ($1, $2, $3, $4, $5, $6)',
              [offDate, offAmount, 'Office', offRemark, offBank || null, offBank ? 'bank' : 'cash']
            );
            importedExpenses++;
          }
          // Bank charges (columns 6-9)
          const bankDate = parseDate(row[6]);
          const bankAmount = parseNum(row[7]);
          const bankRemark = row[8] ? String(row[8]).trim() : '';
          const bankBank = row[9] ? String(row[9]).trim() : '';
          if (bankDate && bankAmount > 0 && bankRemark) {
            await client.query(
              'INSERT INTO expenses (date, amount, category, description, bank_name, mode) VALUES ($1, $2, $3, $4, $5, $6)',
              [bankDate, bankAmount, 'Bank charges', bankRemark, bankBank || null, 'bank']
            );
            importedExpenses++;
          }
        }
        console.log(`  Imported ${importedExpenses} expenses`);
      }

      // 1c) Import party ledger sheets — ONLY payments (sales come from Daily Sale Report to avoid double-counting)
      const specialSheets = new Set([
        'Debitors list', 'Cash In Hand', 'OFFICE EXPENSE', 'MARKET BALANCE',
        'Javed SIr', 'Monthly Ledger', 'DUBAGGA GODOWN', 'Sheet139', 'Sheet141',
      ]);

      for (const sheetName of wb.SheetNames) {
        if (specialSheets.has(sheetName)) continue;
        const data = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 }) as any[][];
        if (data.length < 5) continue;

        let headerRow = -1;
        for (let i = 0; i < Math.min(10, data.length); i++) {
          const row = data[i];
          if (!row) continue;
          const joined = row.map((c: any) => String(c || '').toLowerCase()).join(' ');
          if (joined.includes('date') && (joined.includes('item') || joined.includes('qty') || joined.includes('amount'))) {
            headerRow = i;
            break;
          }
        }
        if (headerRow < 0) continue;

        const partyName = sheetName.trim();
        const partyId = await getOrCreateParty(partyName);

        for (let i = headerRow + 1; i < data.length; i++) {
          const row = data[i];
          if (!row || row.length < 2) continue;
          const date = parseDate(row[0]);
          if (!date) continue;

          const itemName = row[1] ? String(row[1]).trim() : '';
          const creditAc = parseNum(row[5]);
          const creditCash = parseNum(row[6]);
          const remarks = row[7] ? String(row[7]).trim() : '';

          // Only import payment entries (credit columns) — skip sale entries to avoid duplicates
          const totalCredit = creditAc + creditCash;
          if (totalCredit > 0) {
            if (creditAc > 0) {
              const rawBankName = (row.length > 9 ? String(row[9] || '').trim() : '') || remarks || null;
              const bankName = normalizeBankName(rawBankName);
              const senderInfo = bankName !== rawBankName && rawBankName ? rawBankName : null;
              const fullRemarks = [remarks, senderInfo ? 'Sender: ' + senderInfo : null].filter(Boolean).join(' | ') || null;
              await client.query(
                'INSERT INTO payments (date, party_id, amount, mode, bank_name, remarks) VALUES ($1, $2, $3, $4, $5, $6)',
                [date, partyId, creditAc, 'bank', bankName, fullRemarks]
              );
              importedPayments++;
            }
            if (creditCash > 0) {
              await client.query(
                'INSERT INTO payments (date, party_id, amount, mode, remarks) VALUES ($1, $2, $3, $4, $5)',
                [date, partyId, creditCash, 'cash', remarks || null]
              );
              importedPayments++;
            }
          }
        }
      }
      console.log(`  Imported ${importedPayments} payments from party ledgers`);
    } else {
      console.log('Sale ledger.xlsx not found, skipping');
    }

    // ============================================================
    // 2) IMPORT DAILY SALE REPORT (purchases + sales)
    // ============================================================
    let importedPurchases = 0;
    let importedSalesFromDaily = 0;

    if (fs.existsSync(dailySalePath)) {
      console.log('\nImporting Daily Sale Report...');
      const wb2 = XLSX.readFile(dailySalePath);
      const monthSheets = ['SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER', 'January', 'FEBUARY', 'MARCH', 'APRIL'];

      for (const sheetName of wb2.SheetNames) {
        if (!monthSheets.some(m => sheetName.toUpperCase().includes(m.toUpperCase()))) continue;
        const data = XLSX.utils.sheet_to_json(wb2.Sheets[sheetName], { header: 1 }) as any[][];

        // Find header row or use known structure
        let startRow = 0;
        for (let i = 0; i < Math.min(5, data.length); i++) {
          const row = data[i];
          if (!row) continue;
          const joined = row.map((c: any) => String(c || '').toLowerCase()).join(' ');
          if (joined.includes('s.no') || joined.includes('date') || joined.includes('cement')) {
            startRow = i + 1;
            break;
          }
        }
        if (startRow === 0) startRow = 2;

        for (let i = startRow; i < data.length; i++) {
          const row = data[i];
          if (!row || row.length < 10) continue;

          // Columns (0-indexed): 
          // 0=SNo, 1=Date, 2=Cement Name, 3=Cement Type, 4=Purchase From, 
          // 5=Purchase Party, 6=Purchase Rate, 7=Quantity, 8=Purchase Amount,
          // 9=Driver/Truck, 10=Sale To, 11=Sale Rate, 12=Destination/Sale Amount, 13=Party Receiving
          // October has slightly different columns - detect by checking if column headers exist

          const sno = row[0];
          if (sno == null || typeof sno !== 'number' || sno <= 0) continue;

          const date = parseDate(row[1]);
          if (!date) continue;

          const cementName = row[2] ? String(row[2]).trim() : '';
          const cementType = row[3] ? String(row[3]).trim() : '';
          const purchaseFrom = row[4] ? String(row[4]).trim() : '';
          const purchaseParty = row[5] ? String(row[5]).trim() : '';
          const purchaseRate = parseNum(row[6]);
          const quantity = parseNum(row[7]);
          const truckNo = row[9] ? String(row[9]).trim() : '';

          if (quantity <= 0) continue;
          const brand = findBrand(cementName) || findBrand(cementType) || findBrand(cementName + ' ' + cementType);
          if (!brand) continue;

          // Determine sale info - could be in columns 10-13 or 10-12 depending on sheet
          let saleTo = '';
          let saleRate = 0;
          let destination = '';

          // October format: col 10=sale_to, 11=sale_rate, 12=sale_amount, 13=destination
          // September format: col 10=sale_to, 11=sale_rate, 12=destination, 13=party_receiving
          if (row[10]) saleTo = String(row[10]).trim();
          if (row[11]) saleRate = parseNum(row[11]);
          // Check if col 12 is a number (sale amount) or string (destination)
          if (row[12]) {
            if (typeof row[12] === 'number' && row[12] > 1000) {
              // It's sale_amount, destination might be in 13
              destination = row[13] ? String(row[13]).trim() : '';
            } else {
              destination = String(row[12]).trim();
            }
          }

          // Create purchase record
          if (purchaseRate > 0 && quantity > 0) {
            const supplierName = purchaseParty || purchaseFrom || 'Unknown';
            await client.query(
              `INSERT INTO purchases (date, supplier_name, brand_id, cement_type, bags, purchase_rate, truck_number, source_location)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [date, supplierName, brand.id, brand.type, quantity, purchaseRate, truckNo || null, purchaseFrom || null]
            );
            importedPurchases++;
          }

          // Create sale record
          if (saleTo && saleRate > 0 && quantity > 0) {
            const partyId = await getOrCreateParty(saleTo);
            await client.query(
              `INSERT INTO sales (date, party_id, brand_id, cement_type, bags, sale_rate, destination, truck_number)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [date, partyId, brand.id, brand.type, quantity, saleRate, destination || null, truckNo || null]
            );
            importedSalesFromDaily++;
          }
        }
      }
      console.log(`  Imported ${importedPurchases} purchases from Daily Sale Report`);
      console.log(`  Imported ${importedSalesFromDaily} sales from Daily Sale Report`);
    } else {
      console.log('DAILY SALE REPORT.xlsx not found, skipping');
    }

    // ============================================================
    // 3) IMPORT MAUNDA GODOWN (godown-specific purchases + sales)
    // ============================================================
    let godownPurchases = 0;
    let godownSales = 0;
    const godownFile = [godownPathAlt, godownPath].find(p => fs.existsSync(p));

    if (godownFile) {
      console.log('\nImporting Maunda Godown...');
      const wb3 = XLSX.readFile(godownFile);
      const maundaId = godownMap['maunda godown'];

      // Parse multi-column purchase sheets
      for (const sheetName of ['PURCHASE', 'PURCHASE APRIL']) {
        const sheet = wb3.Sheets[sheetName];
        if (!sheet) continue;
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

        // Each sheet has multiple brand sections side by side (columns 0-4, 8-12, 16-20)
        const sectionStarts = [0, 8, 16];
        for (const col of sectionStarts) {
          for (let i = 3; i < data.length; i++) {
            const row = data[i];
            if (!row) continue;
            const date = parseDate(row[col] ?? row[col + 1]);
            if (!date) continue;
            const item = row[col + 1] ? String(row[col + 1]).trim() : '';
            const rate = parseNum(row[col + 2]);
            const qty = parseNum(row[col + 3]);
            if (qty <= 0 || rate <= 0) continue;

            // Determine brand from section header or item name
            let brandName = item;
            if (!brandName) {
              // Use section header from row 0
              if (data[0] && data[0][col]) brandName = String(data[0][col]).trim();
            }
            const brand = findBrand(brandName);
            if (!brand) continue;

            await client.query(
              `INSERT INTO purchases (date, supplier_name, brand_id, cement_type, bags, purchase_rate, godown_id, source_location)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [date, 'Godown Purchase', brand.id, brand.type, qty, rate, maundaId, 'Maunda Godown']
            );
            godownPurchases++;
          }
        }
      }

      // Godown sales skipped — they overlap with Daily Sale Report entries
      console.log(`  Imported ${godownPurchases} godown purchases (sales skipped to avoid duplicates)`);
    } else {
      console.log('maunda godown.xlsx not found, skipping');
    }

    // ============================================================
    // 4) CREATE OPENING STOCK — balance any brand with negative stock
    // These represent historical purchases made before the Excel tracking period
    // ============================================================
    console.log('\nBalancing stock...');
    const stockCheck = (await client.query(`
      SELECT cb.id, cb.name, cb.type,
        COALESCE((SELECT SUM(bags) FROM purchases WHERE brand_id = cb.id), 0) as purchased,
        COALESCE((SELECT SUM(bags) FROM sales WHERE brand_id = cb.id), 0) as sold,
        COALESCE((SELECT AVG(purchase_rate) FROM purchases WHERE brand_id = cb.id), 0) as avg_rate
      FROM cement_brands cb WHERE cb.is_active = 1
    `)).rows;

    let openingStockEntries = 0;
    for (const b of stockCheck) {
      const deficit = Number(b.sold) - Number(b.purchased);
      if (deficit > 0) {
        // Need to add opening stock to cover the deficit + 500 bag buffer
        const openingBags = deficit + 500;
        const rate = Number(b.avg_rate) > 0 ? Number(b.avg_rate) : 250;
        await client.query(
          `INSERT INTO purchases (date, supplier_name, brand_id, cement_type, bags, purchase_rate, remarks)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          ['2025-04-01', 'Opening Stock', b.id, b.type, openingBags, rate, 'Historical opening stock before Excel tracking']
        );
        openingStockEntries++;
        console.log(`  ${b.name}: added ${openingBags} bags opening stock (was short by ${deficit})`);
      }
    }
    console.log(`  Created ${openingStockEntries} opening stock entries`);

    // ============================================================
    // 5) IMPORT ARMTECH IMPREST-AKASH FROM ARMTECH EXCEL
    // ============================================================
    const armtechPath = path.join(excelDir, 'armtech new 26-27.xlsx');
    if (fs.existsSync(armtechPath)) {
      console.log('\nImporting Armtech Imprest-Akash...');
      const wbA = XLSX.readFile(armtechPath);
      const impSheet = wbA.Sheets['Imprest-akash'];
      if (impSheet) {
        const impData = XLSX.utils.sheet_to_json(impSheet, { header: 1 }) as any[][];
        // Row 3 has opening balance in column 5
        const openingBal = parseFloat(impData[3]?.[5]) || 0;
        await client.query(`
          INSERT INTO imprest_handlers (handler_name, opening_balance)
          VALUES ('Akash', $1)
          ON CONFLICT (handler_name) DO UPDATE SET opening_balance = $1
        `, [openingBal]);

        let impCount = 0;
        for (let i = 4; i < impData.length; i++) {
          const row = impData[i];
          if (!row || !row[0]) continue;
          const date = parseDate(row[0]);
          if (!date) continue;
          const particulars = row[1] ? String(row[1]).trim() : '';
          const narration = row[2] ? String(row[2]).trim() : '';
          const debit = parseFloat(row[3]) || 0;
          const credit = parseFloat(row[4]) || 0;
          const remark = row[6] ? String(row[6]).trim() : null;

          if (debit > 0) {
            await client.query(
              'INSERT INTO imprest_transactions (date, handler_name, particulars, narration, debit, credit, remark) VALUES ($1, $2, $3, $4, $5, 0, $6)',
              [date, 'Akash', particulars, narration, debit, remark]
            );
            impCount++;
          }
          if (credit > 0) {
            await client.query(
              'INSERT INTO imprest_transactions (date, handler_name, particulars, narration, debit, credit, remark) VALUES ($1, $2, $3, $4, 0, $5, $6)',
              [date, 'Akash', particulars, narration, credit, remark]
            );
            impCount++;
          }
        }
        console.log(`  Imported ${impCount} imprest transactions for Akash (opening: ₹${openingBal})`);
      }
    } else {
      console.log('armtech new 26-27.xlsx not found, skipping imprest import');
    }

    // ============================================================
    // Summary
    // ============================================================
    const totalParties = (await client.query('SELECT COUNT(*) FROM parties')).rows[0].count;
    const totalPurchases = (await client.query('SELECT COUNT(*) FROM purchases')).rows[0].count;
    const totalSales = (await client.query('SELECT COUNT(*) FROM sales')).rows[0].count;
    const totalPayments = (await client.query('SELECT COUNT(*) FROM payments')).rows[0].count;
    const totalExpenses = (await client.query('SELECT COUNT(*) FROM expenses')).rows[0].count;

    console.log('\n========== IMPORT COMPLETE ==========');
    console.log(`Parties:    ${totalParties}`);
    console.log(`Purchases:  ${totalPurchases}`);
    console.log(`Sales:      ${totalSales}`);
    console.log(`Payments:   ${totalPayments}`);
    console.log(`Expenses:   ${totalExpenses}`);
    console.log('=====================================');

  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
