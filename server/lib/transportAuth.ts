import { getOne } from '../db/database';

/**
 * Returns true if the request user can directly edit/delete TransportBook entries.
 * Admins always can. Other users can when the tb_open_edit setting is '1' (default).
 */
export async function canEditTransport(req: any): Promise<boolean> {
  if (req.user?.role === 'admin') return true;
  const row = await getOne(`SELECT value FROM app_settings WHERE key='tb_open_edit'`);
  return (row?.value ?? '1') !== '0';
}
