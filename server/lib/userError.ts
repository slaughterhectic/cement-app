/**
 * Convert a thrown error into a message safe to show end users.
 *
 * Raw Postgres error strings like
 *   "new row for relation \"pending_entries\" violates check constraint \"pending_entries_entry_type_check\""
 * are technical and look broken to clients. Map known PG error codes to friendly
 * messages and log the original on the server. For unknown errors, fall back to
 * a short generic line — never the raw e.message.
 */
export function friendlyError(e: any, fallback = 'Could not save the entry. Please try again or contact support.'): string {
  const code = (e && typeof e === 'object' ? e.code : null) as string | null;
  // Standard SQLSTATE classes — codes here are the integrity-constraint family.
  if (code === '23505') return 'This entry already exists.';
  if (code === '23503') return 'Referenced item could not be found.';
  if (code === '23502') return 'A required field is missing.';
  if (code === '23514') return 'One of the values is not allowed here.';
  if (code === '22001') return 'One of the values is too long.';
  // Don't leak raw PG messages — log and use fallback.
  if (code) {
    // eslint-disable-next-line no-console
    console.error('PG error', { code, detail: e?.detail, message: e?.message });
    return fallback;
  }
  // Non-PG errors (validation Errors thrown by us) carry sensible messages already.
  return (e && typeof e.message === 'string') ? e.message : fallback;
}
