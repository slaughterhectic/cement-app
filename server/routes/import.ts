import { Router } from 'express';
import { query, getOne, getAll } from '../db/database';
import multer from 'multer';
import XLSX from 'xlsx';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/parse', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const fileType = req.body.file_type || 'auto';

    if (fileType === 'sale_ledger' || workbook.SheetNames.length > 10) {
      const sheets = workbook.SheetNames.map((name) => {
        const sheet = workbook.Sheets[name];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        return { name, headers: data[0] || [], preview: data.slice(0, 10), totalRows: data.length - 1 };
      });
      return res.json({ type: 'sale_ledger', sheets, totalSheets: sheets.length });
    }

    if (fileType === 'daily_sale' || workbook.SheetNames.some((n: string) => n.match(/sep|oct|nov|dec|jan|feb|mar|apr/i))) {
      const sheets = workbook.SheetNames.map((name) => {
        const sheet = workbook.Sheets[name];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        return { name, headers: data[0] || [], preview: data.slice(0, 10), totalRows: data.length - 1 };
      });
      return res.json({ type: 'daily_sale', sheets, totalSheets: sheets.length });
    }

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    return res.json({
      type: 'godown',
      sheets: [{ name: sheetName, headers: data[0] || [], preview: data.slice(0, 10), totalRows: data.length - 1 }],
      totalSheets: 1,
    });
  } catch (err: any) {
    res.status(400).json({ error: `Failed to parse file: ${err.message}` });
  }
});

router.post('/execute', async (req, res) => {
  const { type, data, columnMapping } = req.body;
  const imported = { sales: 0, parties: 0, payments: 0, purchases: 0 };

  try {
    for (const sheet of (data || [])) {
      for (const row of (sheet.rows || [])) {
        const mapped = columnMapping ? applyMapping(row, columnMapping) : row;
        if (!mapped.date) continue;

        if (type === 'sale_ledger') {
          const partyName = sheet.name?.trim();
          if (!partyName) continue;

          let party = await getOne('SELECT id FROM parties WHERE UPPER(TRIM(name))=$1', [partyName.toUpperCase()]);
          if (!party) {
            party = await getOne('INSERT INTO parties (name, type) VALUES ($1, $2) RETURNING id', [partyName, 'dealer']);
            imported.parties++;
          }

          if (mapped.debit && Number(mapped.debit) > 0) {
            const brand = await getOne('SELECT id FROM cement_brands WHERE name ILIKE $1', [`%${mapped.particulars || ''}%`]);
            if (brand) {
              await query(
                'INSERT INTO sales (date, party_id, brand_id, cement_type, bags, sale_rate) VALUES ($1,$2,$3,$4,$5,$6)',
                [mapped.date, party.id, brand.id, 'OPC', mapped.qty || 0, mapped.rate || 0]
              );
              imported.sales++;
            }
          } else if (mapped.credit && Number(mapped.credit) > 0) {
            await query(
              'INSERT INTO payments (date, party_id, amount, mode) VALUES ($1,$2,$3,$4)',
              [mapped.date, party.id, mapped.credit, 'bank']
            );
            imported.payments++;
          }
        }
      }
    }

    res.json({ success: true, imported });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

function applyMapping(row: any, mapping: any) {
  if (!mapping) return row;
  const result: any = {};
  for (const [targetField, sourceField] of Object.entries(mapping)) {
    result[targetField] = row[sourceField as string];
  }
  return result;
}

export default router;
