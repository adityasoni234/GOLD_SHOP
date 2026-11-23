import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, AlertCircle, Download, MessageCircle } from 'lucide-react';
import { openWhatsApp, reminderMessage } from '../utils/whatsapp.js';
import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../components/common/Toast.jsx';
import PageHeader from '../components/common/PageHeader.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import StatCard from '../components/common/StatCard.jsx';
import PaymentForm from '../components/payments/PaymentForm.jsx';
import { PaymentStatusBadge } from '../components/common/Badges.jsx';
import { formatINR, paiseToPlain } from '../utils/currency.js';
import { formatDate, inDateRange } from '../utils/dateUtils.js';
import { downloadCSV } from '../utils/misc.js';
import { PAYMENT_MODES, INVOICE_STATUS } from '../constants/index.js';

export default function Payments() {
  const { payments, invoices, recordPayment } = useApp();
  const toast = useToast();
  const [tab, setTab] = useState('outstanding');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [mode, setMode] = useState('');
  const [paying, setPaying] = useState(null);

  const invoiceById = useMemo(() => Object.fromEntries(invoices.map((i) => [i.id, i])), [invoices]);
  const outstanding = invoices.filter((i) => i.status === INVOICE_STATUS.FINAL && i.balancePaise > 0);
  const totalOutstanding = outstanding.reduce((a, i) => a + i.balancePaise, 0);

  const filtered = payments.filter((p) => inDateRange(p.date, from, to) && (!mode || p.mode === mode) && invoiceById[p.invoiceId]?.status !== INVOICE_STATUS.CANCELLED);
  const collected = filtered.reduce((a, p) => a + p.amountPaise, 0);

  return (
    <>
      <PageHeader title="Payments" subtitle="Payment entries never change an invoice's GST calculation." />
      <div className="grid cols-3" style={{ marginBottom: 16 }}>
        <StatCard icon={AlertCircle} label="Outstanding balance" value={`₹${formatINR(totalOutstanding)}`} meta={`${outstanding.length} invoices`} />
        <StatCard icon={Wallet} label="Collected (filtered)" value={`₹${formatINR(collected)}`} meta={`${filtered.length} payments`} />
        <StatCard icon={Wallet} label="All payments recorded" value={payments.length} />
      </div>
      <div className="tabs" style={{ marginBottom: 12 }}>
        <button className={tab === 'outstanding' ? 'active' : ''} onClick={() => setTab('outstanding')}>Outstanding invoices</button>
        <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>Payment history</button>
      </div>

      {tab === 'outstanding' ? (
        <div className="card">
          {outstanding.length === 0 ? (
            <EmptyState icon={Wallet} title="No outstanding balances" />
          ) : (
            <table className="table">
              <thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th className="num">Gross</th><th className="num">Paid</th><th className="num">Balance</th><th>Status</th><th /></tr></thead>
              <tbody>
                {outstanding.map((i) => (
                  <tr key={i.id}>
                    <td><Link to={`/invoices/${i.id}`} className="strong">{i.invoiceNo}</Link></td>
                    <td>{formatDate(i.date)}</td>
                    <td>{i.customer.name}<div className="small muted">{i.customer.phone}</div></td>
                    <td className="num">₹{formatINR(i.totals.grossPaise)}</td>
                    <td className="num">₹{formatINR(i.amountPaidPaise || 0)}</td>
                    <td className="num strong">₹{formatINR(i.balancePaise)}</td>
                    <td><PaymentStatusBadge status={i.paymentStatus} /></td>
                    <td className="actions">
                      <button className="btn btn-sm btn-whatsapp" title="Send balance reminder on WhatsApp" onClick={() => openWhatsApp(i.customer.phone, reminderMessage(i))}><MessageCircle size={13} /> Remind</button>
                      <button className="btn btn-sm btn-primary" onClick={() => setPaying(i)}>Record payment</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="card">
          <div className="card-header filters">
            <div className="field"><label>From</label><input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div className="field"><label>To</label><input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
            <div className="field"><label>Mode</label>
              <select className="select" value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="">All modes</option>
                {PAYMENT_MODES.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <button
              className="btn"
              disabled={!filtered.length}
              onClick={() =>
                downloadCSV('payments.csv', [
                  { label: 'Date', key: 'date' },
                  { label: 'Invoice No', key: 'invoiceNo' },
                  { label: 'Customer', key: 'customerName' },
                  { label: 'Mode', key: 'mode' },
                  { label: 'Amount', csv: (r) => paiseToPlain(r.amountPaise) },
                  { label: 'Reference', key: 'reference' },
                  { label: 'Note', key: 'note' },
                ], filtered)
              }
            >
              <Download size={15} /> Export CSV
            </button>
          </div>
          {filtered.length === 0 ? (
            <EmptyState icon={Wallet} title="No payments found" />
          ) : (
            <table className="table">
              <thead><tr><th>Date</th><th>Invoice</th><th>Customer</th><th>Mode</th><th>Reference</th><th className="num">Amount</th></tr></thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td>{formatDate(p.date)}</td>
                    <td><Link to={`/invoices/${p.invoiceId}`}>{p.invoiceNo}</Link></td>
                    <td>{p.customerName}</td>
                    <td>{p.mode}</td>
                    <td className="small">{p.reference}</td>
                    <td className="num">₹{formatINR(p.amountPaise)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td colSpan={5}>Total</td><td className="num">₹{formatINR(collected)}</td></tr></tfoot>
            </table>
          )}
        </div>
      )}
      {paying && <PaymentForm invoice={paying} onClose={() => setPaying(null)} onSave={async (p) => { await recordPayment(p); toast('Payment recorded.', 'success'); }} />}
    </>
  );
}
