import { INVOICE_STATUS, PAYMENT_STATUS } from '../../constants/index.js';

export function InvoiceStatusBadge({ status, revision }) {
  if (status === INVOICE_STATUS.DRAFT) return <span className="badge neutral">Draft</span>;
  if (status === INVOICE_STATUS.CANCELLED) return <span className="badge danger">Cancelled</span>;
  return <span className="badge info">Final{revision ? ` · Rev ${revision}` : ''}</span>;
}

export function PaymentStatusBadge({ status }) {
  const cls = status === PAYMENT_STATUS.PAID ? 'success' : status === PAYMENT_STATUS.PARTIAL ? 'warning' : 'danger';
  return <span className={`badge ${cls}`}>{status}</span>;
}
