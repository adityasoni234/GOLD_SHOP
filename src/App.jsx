import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext.jsx';
import { ToastProvider } from './components/common/Toast.jsx';
import AuthGate from './components/layout/AuthGate.jsx';
import AppLayout from './components/layout/AppLayout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import CreateInvoice from './pages/CreateInvoice.jsx';
import InvoiceHistory from './pages/InvoiceHistory.jsx';
import InvoiceDetails from './pages/InvoiceDetails.jsx';
import Customers from './pages/Customers.jsx';
import Products from './pages/Products.jsx';
import GoldRates from './pages/GoldRates.jsx';
import Payments from './pages/Payments.jsx';
import Reports from './pages/Reports.jsx';
import Settings from './pages/Settings.jsx';
import PrintSample from './pages/PrintSample.jsx';

/** Remount the invoice form whenever the URL changes (new / edit / duplicate). */
function InvoiceFormRoute() {
  const loc = useLocation();
  return <CreateInvoice key={loc.pathname + loc.search} />;
}

function Loader({ children }) {
  const { loading, error } = useApp();
  if (loading) return <div className="empty" style={{ paddingTop: '30vh' }}>Loading shop data…</div>;
  if (error)
    return (
      <div className="page">
        <div className="alert danger">Could not load data: {error}</div>
      </div>
    );
  return children;
}

export default function App() {
  return (
    <ToastProvider>
      <AuthGate>
        <AppProvider>
          <Loader>
            <Routes>
              <Route element={<AppLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="invoices" element={<InvoiceHistory />} />
                <Route path="invoices/new" element={<InvoiceFormRoute />} />
                <Route path="invoices/:id" element={<InvoiceDetails />} />
                <Route path="invoices/:id/edit" element={<InvoiceFormRoute />} />
                <Route path="customers" element={<Customers />} />
                <Route path="products" element={<Products />} />
                <Route path="rates" element={<GoldRates />} />
                <Route path="payments" element={<Payments />} />
                <Route path="reports" element={<Reports />} />
                <Route path="settings" element={<Settings />} />
                <Route path="print-sample" element={<PrintSample />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </Loader>
        </AppProvider>
      </AuthGate>
    </ToastProvider>
  );
}
