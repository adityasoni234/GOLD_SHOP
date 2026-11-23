import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FilePlus2, Printer, Eye, Copy, Pencil, Files, Download, MessageCircle } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import PageHeader from '../components/common/PageHeader.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { InvoiceStatusBadge, PaymentStatusBadge } from '../components/common/Badges.jsx';
import { formatINR, paiseToPlain, formatWeight } from '../utils/currency.js';
import { formatDate, monthKey } from '../utils/dateUtils.js';
import { downloadCSV } from '../utils/misc.js';
import { JEWELLERY_CATEGORIES, INVOICE_STATUS, PAYMENT_STATUS } from '../constants/index.js';

export default function InvoiceHistory() {
  const { invoices, settings } = useApp();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const [date, setDate] = useState('');
  const [month, setMonth] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [payStatus, setPayStatus] = useState('');

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (term) {
        const hay = [inv.invoiceNo, String(inv.number ?? ''), inv.customer.name, inv.customer.phone].join(' ').toLowerCase();
        if (!hay.includes(term)) return false;
      }
      if (date && inv.date !== date) return false;
      if (month && monthKey(inv.date) !== month) return false;
      if (category && !inv.items.some((it) => it.category === category)) return false;
      if (status && inv.status !== status) return false;
      if (payStatus && (inv.status === INVOICE_STATUS.DRAFT || inv.paymentStatus !== payStatus)) return false;
      return true;
    });
  }, [invoices, q, date, month, category, status, payStatus]);

  const activeTotal = filtered.filter((i) => i.status === INVOICE_STATUS.FINAL).reduce((a, i) => a + i.totals.grossPaise, 0);

  const clear = () => {
    setQ(''); setDate(''); setMonth(''); setCategory(''); setStatus(''); setPayStatus('');
    setParams({});
  };

  const exportCsv = () =>
    downloadCSV(`invoices-${new Date().toISOString().slice(0, 10)}.csv`, [
      { label: 'Invoice No', csv: (r) => r.invoiceNo || 'DRAFT' },
      { label: 'Date', key: 'date' },
      { label: 'Status', key: 'status' },
      { label: 'Customer', csv: (r) => r.customer.name },
      { label: 'Phone', csv: (r) => r.customer.phone },
      { label: 'Net Wt (g)', csv: (r) => formatWeight(r.totals.netMg) },
      { label: 'Total Amount', csv: (r) => paiseToPlain(r.totals.itemsTotalPaise) },
      { label: 'CGST', csv: (r) => paiseToPlain(r.totals.cgstPaise) },
      { label: 'SGST', csv: (r) => paiseToPlain(r.totals.sgstPaise) },
      { label: 'IGST', csv: (r) => paiseToPlain(r.totals.igstPaise) },
      { label: 'Old Gold/Silver (+/-)', csv: (r) => paiseToPlain(r.totals.adjustmentPaise || 0) },
      { label: 'Round Off', csv: (r) => paiseToPlain(r.totals.roundOffPaise) },
      { label: 'Gross Amount', csv: (r) => paiseToPlain(r.totals.grossPaise) },
      { label: 'Paid', csv: (r) => paiseToPlain(r.amountPaidPaise || 0) },
      { label: 'Balance', csv: (r) => paiseToPlain(r.balancePaise || 0) },
      { label: 'Payment Status', key: 'paymentStatus' },
    ], filtered);

  return (
    <>
      <PageHeader
        title="All invoices"
        subtitle={`${filtered.length} shown · active sales in view ₹${formatINR(activeTotal)}`}
        actions={
          <>
            <button className="btn" onClick={exportCsv} disabled={!filtered.length}><Download size={15} /> Export CSV</button>
            <Link className="btn btn-primary" to="/invoices/new"><FilePlus2 size={15} /> New invoice</Link>
          </>
        }
      />

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body filters">
          <div className="field" style={{ minWidth: 260, flex: 1 }}>
            <label>Search</label>
            <input className="input" placeholder="Invoice no., customer name or phone" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
          </div>
          <div className="field">
            <label>Date</label>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label>Month</label>
            <input className="input" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
          <div className="field">
            <label>Jewellery type</label>
            <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All</option>
              {JEWELLERY_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Status</label>
            <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All</option>
              <option value={INVOICE_STATUS.FINAL}>Final</option>
              <option value={INVOICE_STATUS.DRAFT}>Draft</option>
              <option value={INVOICE_STATUS.CANCELLED}>Cancelled</option>
            </select>
          </div>
          <div className="field">
            <label>Payment</label>
            <select className="select" value={payStatus} onChange={(e) => setPayStatus(e.target.value)}>
              <option value="">All</option>
              {Object.values(PAYMENT_STATUS).map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <button className="btn" onClick={clear}>Clear</button>
        </div>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <EmptyState icon={Files} title={invoices.length ? 'No invoices match these filters' : 'No invoices yet'}>
            {!invoices.length && <Link to="/invoices/new">Create your first invoice</Link>}
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice</th><th>Date</th><th>Customer</th><th>Items</th>
                  <th className="num">Gross amount</th><th className="num">Balance</th><th>Status</th><th>Payment</th><th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => (
                  <tr key={inv.id} className="clickable" onClick={() => navigate(`/invoices/${inv.id}`)}>
                    <td className="strong">{inv.invoiceNo || '—'}</td>
                    <td className="nowrap">{formatDate(inv.date, settings.invoice.dateFormat)}</td>
                    <td>
                      <div>{inv.customer.name}</div>
                      <div className="small muted">{inv.customer.phone}</div>
                    </td>
                    <td className="small">{inv.items.map((it) => it.description).join(', ')}</td>
                    <td className="num">₹{formatINR(inv.totals.grossPaise)}</td>
                    <td className="num">{inv.status === INVOICE_STATUS.FINAL ? `₹${formatINR(inv.balancePaise)}` : '—'}</td>
                    <td><InvoiceStatusBadge status={inv.status} revision={inv.revision} /></td>
                    <td>{inv.status !== INVOICE_STATUS.DRAFT ? <PaymentStatusBadge status={inv.paymentStatus} /> : '—'}</td>
                    <td className="actions" onClick={(e) => e.stopPropagation()}>
                      <Link className="btn btn-sm btn-icon" title="View" to={`/invoices/${inv.id}`}><Eye size={14} /></Link>
                      {inv.status !== INVOICE_STATUS.DRAFT ? (
                        <Link className="btn btn-sm btn-icon" title="Print" to={`/invoices/${inv.id}?print=1`}><Printer size={14} /></Link>
                      ) : (
                        <Link className="btn btn-sm btn-icon" title="Edit draft" to={`/invoices/${inv.id}/edit`}><Pencil size={14} /></Link>
                      )}
                      {inv.status === INVOICE_STATUS.FINAL && (
                        <Link className="btn btn-sm btn-icon btn-whatsapp" title="Send bill on WhatsApp" to={`/invoices/${inv.id}?send=whatsapp`}>
                          <MessageCircle size={14} />
                        </Link>
                      )}
                      <Link className="btn btn-sm btn-icon" title="Duplicate as new draft" to={`/invoices/new?from=${inv.id}`}><Copy size={14} /></Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
