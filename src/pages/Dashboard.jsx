import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { IndianRupee, Receipt, CalendarDays, Gem, CircleDollarSign, Landmark, Calculator, FilePlus2, Files, Coins, Users, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { useInvoices } from '../hooks/useInvoices.js';
import { useCustomers } from '../hooks/useCustomers.js';
import { useGoldRates } from '../hooks/useGoldRates.js';
import PageHeader from '../components/common/PageHeader.jsx';
import StatCard from '../components/common/StatCard.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { PaymentStatusBadge } from '../components/common/Badges.jsx';
import { formatINR, formatWeight } from '../utils/currency.js';
import { formatDate, formatDateTime, todayISO, monthKey } from '../utils/dateUtils.js';
import { toScaled, SCALE } from '../utils/decimal.js';

/** All figures are computed from finalized (non-cancelled) invoices only. */
export default function Dashboard() {
  const { settings, dataMode } = useApp();
  const { active } = useInvoices();
  const { customers } = useCustomers();
  const { current, lastUpdated } = useGoldRates();

  const stats = useMemo(() => {
    const today = todayISO();
    const month = monthKey(today);
    const todays = active.filter((i) => i.date === today);
    const monthly = active.filter((i) => monthKey(i.date) === month);
    const sum = (list, f) => list.reduce((a, i) => a + f(i), 0);
    const total = sum(active, (i) => i.totals.grossPaise);
    return {
      todaySales: sum(todays, (i) => i.totals.grossPaise),
      todayCount: todays.length,
      monthSales: sum(monthly, (i) => i.totals.grossPaise),
      monthCount: monthly.length,
      goldMg: sum(active, (i) => i.totals.goldNetMg || 0),
      silverMg: sum(active, (i) => i.totals.silverNetMg || 0),
      gst: sum(active, (i) => i.totals.totalTaxPaise),
      monthGst: sum(monthly, (i) => i.totals.totalTaxPaise),
      avg: active.length ? Math.round(total / active.length) : 0,
      outstanding: sum(active, (i) => i.balancePaise || 0),
    };
  }, [active]);

  const recent = active.slice(0, 6);
  const recentCustomers = [...customers].filter((c) => c.stats.lastDate).sort((a, b) => (a.stats.lastDate < b.stats.lastDate ? 1 : -1)).slice(0, 6);
  const v = settings.verification;
  const shownRates = settings.jewellery.purities.filter((p) => ['24K', '22K', '18K', 'Silver 999'].includes(p.label));

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome back. Figures are calculated from finalized invoices${dataMode === 'demo' ? ' saved in this browser (demo mode)' : ''}.`}
        actions={
          <>
            <Link className="btn" to="/invoices"><Files size={15} /> View all invoices</Link>
            <Link className="btn btn-primary btn-lg" to="/invoices/new"><FilePlus2 size={16} /> Create new invoice</Link>
          </>
        }
      />

      {(!v.gstin || !v.ifsc || !v.taxRates) && (
        <div className="alert warning" style={{ marginBottom: 16 }}>
          <AlertTriangle size={16} />
          <div>
            Before issuing live tax invoices, verify the shop GSTIN, bank IFSC and GST rates with your accountant, then tick them as verified in <Link to="/settings">Settings</Link>.
          </div>
        </div>
      )}

      <div className="grid cols-4" style={{ marginBottom: 16 }}>
        <StatCard icon={IndianRupee} label="Today's sales" value={`₹${formatINR(stats.todaySales)}`} meta={`${stats.todayCount} invoice${stats.todayCount === 1 ? '' : 's'} today`} />
        <StatCard icon={CalendarDays} label="This month" value={`₹${formatINR(stats.monthSales)}`} meta={`${stats.monthCount} invoice${stats.monthCount === 1 ? "" : "s"} · GST ₹${formatINR(stats.monthGst)}`} />
        <StatCard icon={Landmark} label="Total GST collected" value={`₹${formatINR(stats.gst)}`} meta="All finalized invoices" />
        <StatCard icon={Calculator} label="Average invoice" value={`₹${formatINR(stats.avg)}`} meta={`Outstanding ₹${formatINR(stats.outstanding)}`} />
        <StatCard icon={Gem} label="Total gold sold" value={`${formatWeight(stats.goldMg)} g`} meta="Net weight" />
        <StatCard icon={CircleDollarSign} label="Total silver sold" value={`${formatWeight(stats.silverMg)} g`} meta="Net weight" />
        <StatCard icon={Receipt} label="Invoices issued" value={active.length} meta="Excludes drafts & cancelled" />
        <div className="card stat">
          <div className="label"><Coins size={15} /> Today's rates (₹/g)</div>
          <div className="small" style={{ marginTop: 6 }}>
            {shownRates.map((p) => (
              <div key={p.label} className="spread"><span className="muted">{p.label}</span><span className="num strong">{current[p.label] ? formatINR(toScaled(current[p.label].rate, SCALE.MONEY)) : '—'}</span></div>
            ))}
          </div>
          <div className="meta">{lastUpdated ? `Updated ${formatDateTime(lastUpdated)}` : <Link to="/rates">Enter rates</Link>}</div>
        </div>
      </div>

      <div className="grid cols-2">
        <div className="card">
          <div className="card-header"><h3><Receipt size={16} /> Recent invoices</h3><Link to="/invoices" className="small">View all</Link></div>
          {recent.length === 0 ? (
            <EmptyState icon={Receipt} title="No invoices yet"><Link to="/invoices/new">Create the first invoice</Link></EmptyState>
          ) : (
            <table className="table">
              <tbody>
                {recent.map((i) => (
                  <tr key={i.id}>
                    <td><Link to={`/invoices/${i.id}`} className="strong">{i.invoiceNo}</Link><div className="small muted">{formatDate(i.date)}</div></td>
                    <td>{i.customer.name}</td>
                    <td className="num">₹{formatINR(i.totals.grossPaise)}</td>
                    <td><PaymentStatusBadge status={i.paymentStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="card">
          <div className="card-header"><h3><Users size={16} /> Recent customers</h3><Link to="/customers" className="small">Manage</Link></div>
          {recentCustomers.length === 0 ? (
            <EmptyState icon={Users} title="No customers yet">Customers are added automatically when you finalize an invoice.</EmptyState>
          ) : (
            <table className="table">
              <tbody>
                {recentCustomers.map((c) => (
                  <tr key={c.id}>
                    <td><div className="strong">{c.name}</div><div className="small muted">{c.phone}</div></td>
                    <td className="small muted">Last: {formatDate(c.stats.lastDate)}</td>
                    <td className="num">₹{formatINR(c.stats.totalPaise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="grid cols-4" style={{ marginTop: 16 }}>
        <Link className="btn btn-lg" to="/invoices/new"><FilePlus2 size={16} /> Create new invoice</Link>
        <Link className="btn btn-lg" to="/invoices"><Files size={16} /> View all invoices</Link>
        <Link className="btn btn-lg" to="/rates"><Coins size={16} /> Manage gold rates</Link>
        <Link className="btn btn-lg" to="/customers"><Users size={16} /> Manage customers</Link>
      </div>
    </>
  );
}
