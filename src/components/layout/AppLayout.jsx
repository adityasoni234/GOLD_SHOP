import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';

export default function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="app-shell">
      <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} />
      <div className="main">
        <Header onMenu={() => setMenuOpen((o) => !o)} />
        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
