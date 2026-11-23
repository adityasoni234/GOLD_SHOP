import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DATA_MODE } from '../services/db.js';
import { loadSettings, saveSettings as persistSettings, DEFAULT_SETTINGS } from '../services/settingsService.js';
import * as invoiceService from '../services/invoiceService.js';
import * as customerService from '../services/customerService.js';
import * as productService from '../services/productService.js';
import * as rateService from '../services/rateService.js';
import * as paymentService from '../services/paymentService.js';
import { INVOICE_STATUS } from '../constants/index.js';
import { logAudit } from '../services/auditService.js';
import { formatINR } from '../utils/currency.js';

const AppContext = createContext(null);

/**
 * Loads all shop data once and exposes action functions.
 * Every action writes through the service layer, then refreshes the affected collection.
 */
export function AppProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [goldRates, setGoldRates] = useState([]);
  const [silverRates, setSilverRates] = useState([]);
  const [payments, setPayments] = useState([]);

  const refreshInvoices = useCallback(async () => setInvoices(await invoiceService.listInvoices()), []);
  const refreshCustomers = useCallback(async () => setCustomers(await customerService.listCustomers()), []);
  const refreshProducts = useCallback(async () => setProducts(await productService.listProducts()), []);
  const refreshRates = useCallback(async () => {
    const [g, s] = await Promise.all([rateService.listGoldRates(), rateService.listSilverRates()]);
    setGoldRates(g);
    setSilverRates(s);
  }, []);
  const refreshPayments = useCallback(async () => setPayments(await paymentService.listPayments()), []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const s = await loadSettings();
        if (!alive) return;
        setSettings(s);
        await Promise.all([refreshInvoices(), refreshCustomers(), refreshProducts(), refreshRates(), refreshPayments()]);
      } catch (err) {
        console.error(err);
        if (alive) setError(err.message || 'Failed to load data');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [refreshInvoices, refreshCustomers, refreshProducts, refreshRates, refreshPayments]);

  const user = settings.business.operatorName || 'Operator';

  // ---------------------------------------------------------------- settings
  const saveSettings = useCallback(async (next) => {
    const saved = await persistSettings(next);
    setSettings(saved);
    return saved;
  }, []);

  // ---------------------------------------------------------------- customers
  const saveCustomer = useCallback(
    async (c) => {
      const saved = await customerService.saveCustomer(c);
      await refreshCustomers();
      return saved;
    },
    [refreshCustomers],
  );
  const deleteCustomer = useCallback(
    async (id) => {
      await customerService.deleteCustomer(id);
      await refreshCustomers();
    },
    [refreshCustomers],
  );

  // ---------------------------------------------------------------- products
  const saveProduct = useCallback(
    async (p) => {
      const saved = await productService.saveProduct(p);
      await refreshProducts();
      return saved;
    },
    [refreshProducts],
  );
  const deleteProduct = useCallback(
    async (id) => {
      await productService.deleteProduct(id);
      await refreshProducts();
    },
    [refreshProducts],
  );

  // ---------------------------------------------------------------- rates
  const saveRates = useCallback(
    async (metal, rates, note) => {
      const saved = await rateService.saveRateEntry(metal, rates, { note, user });
      await refreshRates();
      return saved;
    },
    [refreshRates, user],
  );

  const getTodayRate = useCallback(
    (metal, purity) => rateService.findLatestRate(metal === 'Silver' ? silverRates : goldRates, purity),
    [goldRates, silverRates],
  );

  // ---------------------------------------------------------------- payments
  const syncInvoicePayments = useCallback(async (invoiceId) => {
    const [inv, all] = await Promise.all([invoiceService.getInvoice(invoiceId), paymentService.listPayments()]);
    if (inv && inv.status !== INVOICE_STATUS.DRAFT) {
      const summary = paymentService.summarisePayments(
        inv.totals.grossPaise,
        all.filter((p) => p.invoiceId === invoiceId),
      );
      await invoiceService.applyPaymentSummary(inv, summary);
    }
    setPayments(all);
  }, []);

  const recordPayment = useCallback(
    async (payment) => {
      const saved = await paymentService.savePayment({ ...payment, recordedBy: user });
      await logAudit({ entityId: payment.invoiceId, action: 'payment', details: `₹${formatINR(payment.amountPaise)} received via ${payment.mode}${payment.reference ? ` (ref ${payment.reference})` : ''}`, user });
      await syncInvoicePayments(payment.invoiceId);
      await refreshInvoices();
      return saved;
    },
    [syncInvoicePayments, refreshInvoices, user],
  );

  const deletePayment = useCallback(
    async (payment) => {
      await paymentService.deletePayment(payment.id);
      await logAudit({ entityId: payment.invoiceId, action: 'payment deleted', details: `₹${formatINR(payment.amountPaise)} ${payment.mode} dated ${payment.date} removed`, before: payment, user });
      await syncInvoicePayments(payment.invoiceId);
      await refreshInvoices();
    },
    [syncInvoicePayments, refreshInvoices, user],
  );

  // ---------------------------------------------------------------- invoices
  const saveDraft = useCallback(
    async (form) => {
      const saved = await invoiceService.saveDraft(form, settings);
      await refreshInvoices();
      return saved;
    },
    [settings, refreshInvoices],
  );

  /** Finalize a new invoice: number allocation, customer upsert, initial payments. */
  const finalizeInvoice = useCallback(
    async (form, initialPayments = []) => {
      const customer = await customerService.upsertCustomerFromInvoice(
        { ...form.customer, id: form.customerId },
        customers,
      );
      const { invoice, alreadyFinal } = await invoiceService.finalizeInvoice(
        { ...form, customerId: customer.id },
        settings,
        { user },
      );
      if (!alreadyFinal) {
        for (const p of initialPayments) {
          if (p.amountPaise > 0) {
            await paymentService.savePayment({
              ...p,
              invoiceId: invoice.id,
              invoiceNo: invoice.invoiceNo,
              customerName: invoice.customer.name,
              recordedBy: user,
            });
          }
        }
        await syncInvoicePayments(invoice.id);
      }
      await Promise.all([refreshInvoices(), refreshCustomers()]);
      return invoice;
    },
    [customers, settings, user, syncInvoicePayments, refreshInvoices, refreshCustomers],
  );

  const reviseInvoice = useCallback(
    async (form, reason) => {
      const saved = await invoiceService.reviseInvoice(form, settings, { reason, user });
      await syncInvoicePayments(saved.id);
      await refreshInvoices();
      return saved;
    },
    [settings, user, syncInvoicePayments, refreshInvoices],
  );

  const cancelInvoice = useCallback(
    async (invoice, reason) => {
      const saved = await invoiceService.cancelInvoice(invoice, reason, { user });
      await refreshInvoices();
      return saved;
    },
    [user, refreshInvoices],
  );

  const deleteDraft = useCallback(
    async (invoice) => {
      await invoiceService.deleteDraft(invoice);
      await refreshInvoices();
    },
    [refreshInvoices],
  );

  const value = useMemo(
    () => ({
      dataMode: DATA_MODE,
      loading,
      error,
      user,
      settings,
      invoices,
      customers,
      products,
      goldRates,
      silverRates,
      payments,
      saveSettings,
      saveCustomer,
      deleteCustomer,
      saveProduct,
      deleteProduct,
      saveRates,
      getTodayRate,
      recordPayment,
      deletePayment,
      saveDraft,
      finalizeInvoice,
      reviseInvoice,
      cancelInvoice,
      deleteDraft,
      refreshInvoices,
    }),
    [
      loading, error, user, settings, invoices, customers, products, goldRates, silverRates, payments,
      saveSettings, saveCustomer, deleteCustomer, saveProduct, deleteProduct, saveRates, getTodayRate,
      recordPayment, deletePayment, saveDraft, finalizeInvoice, reviseInvoice, cancelInvoice, deleteDraft,
      refreshInvoices,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
