import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, Menu, AlertTriangle, Coins, Wallet } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { formatDate, todayISO } from '../../utils/dateUtils.js';
import { INVOICE_STATUS } from '../../constants/index.js';

export default function Header({ onMenu }) {
  const { settings, user, goldRates, invoices } = useApp();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);

  const notifications = useMemo(() => {
    const list = [];
    const v = settings.verification;
    if (!v.gstin || !v.ifsc || !v.taxRates)
      list.push({ icon: AlertTriangle, text: 'Verify GSTIN, IFSC and GST rates in Settings before issuing live invoices.', to: '/settings' });
    const latest = goldRates[0]?.effectiveAt?.slice(0, 10);
    const today = todayISO();
    if (!latest) list.push({ icon: Coins, text: 'No gold rates entered yet.', to: '/rates' });
    else if (latest !== today) list.push({ icon: Coins, text: `Gold rates were last updated on ${formatDate(latest)}.`, to: '/rates' });
    const due = invoices.filter((i) => i.status === INVOICE_STATUS.FINAL && i.balancePaise > 0).length;
    if (due) list.push({ icon: Wallet, text: `${due} invoice${due > 1 ? 's have' : ' has'} an outstanding balance.`, to: '/payments' });
    return list;
  }, [settings.verification, goldRates, invoices]);

  const submit = (e) => {
    e.preventDefault();
    navigate(`/invoices?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <header className="topbar">
      <button className="btn btn-ghost btn-icon menu-btn" onClick={onMenu} aria-label="Menu">
        <Menu size={18} />
      </button>
      <div className="shop">{settings.business.name}</div>
      <div className="date">{formatDate(todayISO(), 'EEEE, dd MMM yyyy')}</div>
      <form className="search" onSubmit={submit} role="search">
        <Search size={15} />
        <input
          className="input"
          placeholder="Search invoice no., customer or phone…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </form>
      <div className="notif">
        <button className="btn btn-ghost btn-icon" onClick={() => setOpen((o) => !o)} aria-label="Notifications">
          <Bell size={18} />
        </button>
        {notifications.length > 0 && <span className="dot" />}
        {open && (
          <div className="notif-panel" onMouseLeave={() => setOpen(false)}>
            {notifications.length === 0 && <div className="item muted">All caught up.</div>}
            {notifications.map((n, i) => (
              <a
                key={i}
                className="item"
                href={n.to}
                onClick={(e) => {
                  e.preventDefault();
                  setOpen(false);
                  navigate(n.to);
                }}
              >
                <n.icon size={15} color="var(--gold-dark)" /> <span style={{ color: 'var(--text)' }}>{n.text}</span>
              </a>
            ))}
          </div>
        )}
      </div>
      <div className="user">
        <div className="avatar">{user.slice(0, 2).toUpperCase()}</div>
        <span>{user}</span>
      </div>
    </header>
  );
}
