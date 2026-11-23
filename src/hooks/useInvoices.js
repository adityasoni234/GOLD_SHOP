import { useMemo } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { INVOICE_STATUS } from '../constants/index.js';

/** Invoices plus derived helpers. "Active" = finalized and not cancelled (counts as sales). */
export function useInvoices() {
  const app = useApp();
  const active = useMemo(() => app.invoices.filter((i) => i.status === INVOICE_STATUS.FINAL), [app.invoices]);
  const drafts = useMemo(() => app.invoices.filter((i) => i.status === INVOICE_STATUS.DRAFT), [app.invoices]);
  const byId = useMemo(() => Object.fromEntries(app.invoices.map((i) => [i.id, i])), [app.invoices]);
  return {
    invoices: app.invoices,
    active,
    drafts,
    byId,
    saveDraft: app.saveDraft,
    finalizeInvoice: app.finalizeInvoice,
    reviseInvoice: app.reviseInvoice,
    cancelInvoice: app.cancelInvoice,
    deleteDraft: app.deleteDraft,
  };
}
