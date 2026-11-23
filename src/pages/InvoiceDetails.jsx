import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import { Printer, FileDown, Pencil, Copy, Ban, Wallet, Trash2, History, ArrowLeft, Calculator, CheckCircle2, MessageCircle } from 'lucide-react';
import { openWhatsApp, invoiceMessage, reminderMessage, waPhone } from '../utils/whatsapp.js';
import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../components/common/Toast.jsx';
import PageHeader from '../components/common/PageHeader.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import PaymentForm from '../components/payments/PaymentForm.jsx';
import { InvoiceStatusBadge, PaymentStatusBadge } from '../components/common/Badges.jsx';
import A4Preview from '../invoice/A4Preview.jsx';
import PrintPortal from '../invoice/PrintPortal.jsx';
import { printInvoice } from '../invoice/printInvoice.js';
import { listAuditLogs } from '../services/auditService.js';
import { formatINR } from '../utils/currency.js';
import { formatDate, formatDateTime } from '../utils/dateUtils.js';
import { INVOICE_STATUS } from '../constants/index.js';

export default function InvoiceDetails() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const { invoices, payments, settings, recordPayment, deletePayment, cancelInvoice, deleteDraft } = useApp();
  const invoice = invoices.find((i) => i.id === id);
  const invPayments = useMemo(() => payments.filter((p) => p.invoiceId === id), [payments, id]);
  const [logs, setLogs] = useState([]);
  const [dialog, setDialog] = useState(null);
  const [showCalc, setShowCalc] = useState(false);

  useEffect(() => {
    listAuditLogs(id).then(setLogs).catch(() => setLogs([]));
  }, [id, invoice?.updatedAt]);

  useEffect(() => {
    if (invoice && params.get('print') === '1' && invoice.status !== INVOICE_STATUS.DRAFT) {
      setParams({}, { replace: true });
      printInvoice(invoice);
    }
  }, [invoice, params, setParams]);

  if (!invoice) {
    return (
      <div className="alert danger">
        Invoice not found. <Link to="/invoices">Back to all invoices</Link>
      </div>
    );
  }

  const isDraft = invoice.status === INVOICE_STATUS.DRAFT;
  const isFinal = invoice.status === INVOICE_STATUS.FINAL;
  const t = invoice.totals;
  const printProps = { invoice, print: settings.invoice, logoDataUrl: settings.business.logoDataUrl };

  return (
    <>
      <PageHeader
        title={
          <span className="row">
            {isDraft ? 'Draft invoice' : `Invoice ${invoice.invoiceNo}`} <InvoiceStatusBadge status={invoice.status} revision={invoice.revision} />
            {!isDraft && <PaymentStatusBadge status={invoice.paymentStatus} />}
          </span>
        }
        subtitle={`${invoice.customer.name} · ${formatDate(invoice.date, settings.invoice.dateFormat)} · ₹${formatINR(t.grossPaise)}`}
        actions={
          <>
            <button className="btn" onClick={() => navigate('/invoices')}><ArrowLeft size={15} /> All invoices</button>
            {isDraft ? (
              <>
                <Link className="btn btn-primary" to={`/invoices/${invoice.id}/edit`}><Pencil size={15} /> Continue editing</Link>
                <button className="btn btn-danger" onClick={() => setDialog('delete')}><Trash2 size={15} /> Delete draft</button>
              </>
            ) : (
              <>
                <button className="btn btn-primary" onClick={() => printInvoice(invoice)}><Printer size={15} /> Print invoice</button>
                <button className="btn" onClick={() => printInvoice(invoice, { asPdf: true })} title='In the print dialog choose "Save as PDF"'>
                  <FileDown size={15} /> Download PDF
                </button>
                {isFinal && (
                  <button
                    className="btn btn-whatsapp"
                    onClick={() => openWhatsApp(invoice.customer.phone, invoiceMessage(invoice))}
                    title={waPhone(invoice.customer.phone) ? `Send bill summary to ${invoice.customer.phone}` : 'No valid mobile on this invoice – WhatsApp will ask you to pick a contact'}
                  >
                    <MessageCircle size={15} /> Send on WhatsApp
                  </button>
                )}
                {isFinal && <button className="btn" onClick={() => setDialog('pay')}><Wallet size={15} /> Record payment</button>}
                {isFinal && <Link className="btn" to={`/invoices/${invoice.id}/edit`}><Pencil size={15} /> Edit</Link>}
              </>
            )}
            <Link className="btn" to={`/invoices/new?from=${invoice.id}`}><Copy size={15} /> Duplicate</Link>
            {isFinal && <button className="btn btn-danger" onClick={() => setDialog('cancel')}><Ban size={15} /> Cancel invoice</button>}
          </>
        }
      />

      {location.state?.justCreated && (
        <div className="alert success" style={{ marginBottom: 16 }}>
          <CheckCircle2 size={16} />
          <div className="grow">Invoice {invoice.invoiceNo} saved. Print it on A4 paper with “Background graphics” on and margins set to “None”.</div>
          <button className="btn btn-sm btn-primary" onClick={() => printInvoice(invoice)}><Printer size={13} /> Print now</button>
          <button className="btn btn-sm btn-whatsapp" onClick={() => openWhatsApp(invoice.customer.phone, invoiceMessage(invoice))}><MessageCircle size={13} /> WhatsApp</button>
        </div>
      )}
      {invoice.status === INVOICE_STATUS.CANCELLED && (
        <div className="alert danger" style={{ marginBottom: 16 }}>
          <Ban size={16} />
          <div>Cancelled on {formatDateTime(invoice.cancelledAt)}. Reason: {invoice.cancelReason}</div>
        </div>
      )}

      <div className="grid details-grid">
        <div className="preview-modal-body">
          <A4Preview {...printProps} />
        </div>

        <div className="stack">
          {!isDraft && (
            <div className="card">
              <div className="card-header">
                <h3><Wallet size={16} /> Payments</h3>
                <div className="row">
                  {isFinal && invoice.balancePaise > 0 && (
                    <button className="btn btn-sm btn-whatsapp" title="Send balance reminder on WhatsApp" onClick={() => openWhatsApp(invoice.customer.phone, reminderMessage(invoice))}>
                      <MessageCircle size={13} /> Reminder
                    </button>
                  )}
                  {isFinal && <button className="btn btn-sm" onClick={() => setDialog('pay')}>Record</button>}
                </div>
              </div>
              <div className="card-body">
                <dl className="kv">
                  <dt>Gross amount</dt><dd className="right num strong">₹{formatINR(t.grossPaise)}</dd>
                  <dt>Amount paid</dt><dd className="right num">₹{formatINR(invoice.amountPaidPaise || 0)}</dd>
                  <dt>Balance due</dt><dd className="right num strong" style={{ color: invoice.balancePaise ? 'var(--danger)' : 'var(--success)' }}>₹{formatINR(invoice.balancePaise)}</dd>
                </dl>
                {invPayments.length > 0 && <div className="divider" />}
                {invPayments.map((p) => (
                  <div key={p.id} className="spread small" style={{ padding: '4px 0' }}>
                    <div>
                      <div className="strong">₹{formatINR(p.amountPaise)} · {p.mode}</div>
                      <div className="muted">{formatDate(p.date)}{p.reference ? ` · Ref ${p.reference}` : ''}</div>
                    </div>
                    {isFinal && (
                      <button className="btn btn-ghost btn-icon" title="Delete payment" onClick={() => setDialog({ type: 'delpay', payment: p })}>
                        <Trash2 size={14} color="var(--danger)" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <h3><Calculator size={16} /> Calculation breakdown</h3>
              <button className="btn btn-sm" onClick={() => setShowCalc((s) => !s)}>{showCalc ? 'Hide' : 'Show'}</button>
            </div>
            {showCalc && (
              <div className="card-body small stack">
                {invoice.lines.map((l, i) => (
                  <div key={i}>
                    <div className="strong">{i + 1}. {invoice.items[i].metal} {invoice.items[i].description} ({invoice.items[i].purity})</div>
                    {l.breakdown.map((b, j) => <div key={j} className="muted num">{b}</div>)}
                  </div>
                ))}
                <div className="divider" />
                <div className="num">
                  Total ₹{formatINR(t.itemsTotalPaise)} + GST ₹{formatINR(t.totalTaxPaise)}{t.adjustmentPaise ? ` ${t.adjustmentPaise < 0 ? '−' : '+'} old gold/silver ₹${formatINR(Math.abs(t.adjustmentPaise))}` : ''} + round-off {formatINR(t.roundOffPaise)} = <b>₹{formatINR(t.grossPaise)}</b>
                </div>
                <div className="muted">Tax config frozen on this invoice: CGST {invoice.taxConfig.cgstRate}% · SGST {invoice.taxConfig.sgstRate}% · IGST {invoice.taxConfig.igstRate}%</div>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-header"><h3><History size={16} /> Audit trail</h3></div>
            <div className="card-body small">
              {logs.length === 0 && <div className="muted">No audit entries.</div>}
              {logs.map((l) => (
                <div key={l.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--border-soft)' }}>
                  <div className="spread">
                    <span className="badge neutral" style={{ textTransform: 'capitalize' }}>{l.action}</span>
                    <span className="muted">{formatDateTime(l.at)}</span>
                  </div>
                  {l.details && <div style={{ marginTop: 3 }}>{l.details}</div>}
                  {l.reason && <div className="muted">Reason: {l.reason}</div>}
                  {l.user && <div className="muted">By {l.user}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <PrintPortal {...printProps} />

      {dialog === 'pay' && <PaymentForm invoice={invoice} onSave={async (p) => { await recordPayment(p); toast('Payment recorded.', 'success'); }} onClose={() => setDialog(null)} />}
      {dialog === 'cancel' && (
        <ConfirmDialog
          title={`Cancel invoice ${invoice.invoiceNo}?`}
          message="The invoice stays in the records marked CANCELLED and is excluded from sales reports. Its number is not reused."
          danger
          requireReason
          reasonLabel="Cancellation reason"
          confirmLabel="Cancel invoice"
          onConfirm={async (reason) => { await cancelInvoice(invoice, reason); toast('Invoice cancelled.', 'success'); }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'delete' && (
        <ConfirmDialog
          title="Delete this draft?"
          message="Drafts have no invoice number. This cannot be undone."
          danger
          confirmLabel="Delete draft"
          onConfirm={async () => { await deleteDraft(invoice); navigate('/invoices'); }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.type === 'delpay' && (
        <ConfirmDialog
          title="Delete payment?"
          message={`Remove the payment of ₹${formatINR(dialog.payment.amountPaise)} (${dialog.payment.mode}) dated ${formatDate(dialog.payment.date)}? The balance will be recalculated.`}
          danger
          confirmLabel="Delete payment"
          onConfirm={async () => { await deletePayment(dialog.payment); toast('Payment deleted.', 'success'); }}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  );
}
