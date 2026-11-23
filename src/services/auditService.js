import { listAll, saveOne, COLLECTIONS } from './db.js';
import { uid, clean } from '../utils/misc.js';

/** Append-only audit trail. */
export async function logAudit({ entity = 'invoice', entityId, action, reason = '', details = '', before = null, after = null, user = '' }) {
  const id = uid('log_');
  return saveOne(COLLECTIONS.AUDIT_LOGS, id, {
    entity,
    entityId,
    action,
    reason,
    details,
    before: before ? clean(before) : null,
    after: after ? clean(after) : null,
    user,
    at: new Date().toISOString(),
  });
}

export async function listAuditLogs(entityId) {
  const all = await listAll(COLLECTIONS.AUDIT_LOGS);
  return all
    .filter((l) => !entityId || l.entityId === entityId)
    .sort((a, b) => (a.at < b.at ? 1 : -1));
}
