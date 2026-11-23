import { createPortal } from 'react-dom';
import PrintableInvoice from './PrintableInvoice.jsx';

/**
 * Renders the invoice into #print-root (outside the app shell).
 * Print CSS hides the app and shows only this node, so the printout contains
 * nothing but the A4 invoice.
 */
export default function PrintPortal(props) {
  const el = typeof document !== 'undefined' ? document.getElementById('print-root') : null;
  if (!el || !props.invoice) return null;
  return createPortal(<PrintableInvoice {...props} />, el);
}
