import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, Users, Pencil, Trash2, History } from 'lucide-react';
import { useCustomers } from '../hooks/useCustomers.js';
import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../components/common/Toast.jsx';
import PageHeader from '../components/common/PageHeader.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import Modal from '../components/common/Modal.jsx';
import CustomerForm from '../components/customers/CustomerForm.jsx';
import { PaymentStatusBadge, InvoiceStatusBadge } from '../components/common/Badges.jsx';
import { formatINR } from '../utils/currency.js';
import { formatDate } from '../utils/dateUtils.js';

export default function Customers() {
  const { customers, saveCustomer, deleteCustomer } = useCustomers();
  const { invoices } = useApp();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [history, setHistory] = useState(null);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return customers.filter((c) => !t || [c.name, c.phone, c.city, c.address].join(' ').toLowerCase().includes(t));
  }, [customers, q]);

  const historyInvoices = history ? invoices.filter((i) => i.customerId === history.id && i.status !== 'draft') : [];

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle={`${customers.length} customers`}
        actions={<button className="btn btn-primary" onClick={() => setEditing({})}><UserPlus size={15} /> Add customer</button>}
      />
      <div className="card">
        <div className="card-header">
          <input className="input" style={{ maxWidth: 360 }} placeholder="Search name, phone, city…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon={Users} title={customers.length ? 'No matching customers' : 'No customers yet'}>
            Customers are also saved automatically when an invoice is finalized.
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Name</th><th>Phone</th><th>City / State</th><th>GSTIN</th><th className="num">Invoices</th><th className="num">Total purchases</th><th className="num">Balance</th><th>Last purchase</th><th /></tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td className="strong">{c.name}<div className="small muted">{c.address}</div></td>
                    <td>{c.phone}</td>
                    <td>{[c.city, c.state].filter(Boolean).join(', ')}{c.pin ? ` - ${c.pin}` : ''}</td>
                    <td className="small">{c.gstin}</td>
                    <td className="num">{c.stats.count}</td>
                    <td className="num">₹{formatINR(c.stats.totalPaise)}</td>
                    <td className="num">{c.stats.balancePaise ? `₹${formatINR(c.stats.balancePaise)}` : '—'}</td>
                    <td>{formatDate(c.stats.lastDate) || '—'}</td>
                    <td className="actions">
                      <button className="btn btn-sm btn-icon" title="Purchase history" onClick={() => setHistory(c)}><History size={14} /></button>
                      <button className="btn btn-sm btn-icon" title="Edit" onClick={() => setEditing(c)}><Pencil size={14} /></button>
                      <button className="btn btn-sm btn-icon btn-danger" title="Delete" onClick={() => setDeleting(c)}><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <CustomerForm
          customer={editing}
          onClose={() => setEditing(null)}
          onSave={async (c) => {
            await saveCustomer(c);
            toast('Customer saved.', 'success');
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={`Delete ${deleting.name}?`}
          message={deleting.stats.count ? `This customer has ${deleting.stats.count} invoice(s). Existing invoices keep their own copy of the customer details and are not affected.` : 'This cannot be undone.'}
          danger
          confirmLabel="Delete customer"
          onConfirm={async () => { await deleteCustomer(deleting.id); toast('Customer deleted.', 'success'); }}
          onClose={() => setDeleting(null)}
        />
      )}
      {history && (
        <Modal size="wide" title={`Purchase history · ${history.name}`} onClose={() => setHistory(null)}>
          {historyInvoices.length === 0 ? (
            <EmptyState icon={History} title="No invoices yet" />
          ) : (
            <table className="table">
              <thead><tr><th>Invoice</th><th>Date</th><th>Items</th><th className="num">Gross</th><th className="num">Balance</th><th>Status</th></tr></thead>
              <tbody>
                {historyInvoices.map((i) => (
                  <tr key={i.id}>
                    <td><Link to={`/invoices/${i.id}`}>{i.invoiceNo}</Link></td>
                    <td>{formatDate(i.date)}</td>
                    <td className="small">{i.items.map((it) => it.description).join(', ')}</td>
                    <td className="num">₹{formatINR(i.totals.grossPaise)}</td>
                    <td className="num">₹{formatINR(i.balancePaise)}</td>
                    <td>{i.status === 'cancelled' ? <InvoiceStatusBadge status={i.status} /> : <PaymentStatusBadge status={i.paymentStatus} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Modal>
      )}
    </>
  );
}
