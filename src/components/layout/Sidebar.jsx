import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, FilePlus2, Files, Users, Gem, Coins, Wallet, BarChart3, Settings, Database,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/invoices/new', label: 'Create Invoice', icon: FilePlus2 },
  { to: '/invoices', label: 'All Invoices', icon: Files, end: true },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/products', label: 'Jewellery Products', icon: Gem },
  { to: '/rates', label: 'Gold & Silver Rates', icon: Coins },
  { to: '/payments', label: 'Payments', icon: Wallet },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ open, onNavigate }) {
  const { dataMode, settings } = useApp();
  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="sidebar-brand">
        <div className="mark">{settings.business.monogramText || 'ABS'}</div>
        <div className="name">{settings.business.name}</div>
      </div>
      <nav>
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} onClick={onNavigate}>
            <Icon size={17} /> {label}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-foot">
        <span className={`mode-pill ${dataMode}`}>
          <Database size={11} /> {dataMode === 'firebase' ? 'Firebase connected' : 'Demo mode · this browser'}
        </span>
      </div>
    </aside>
  );
}
