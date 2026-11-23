import { useMemo } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { INVOICE_STATUS } from '../constants/index.js';

/** Customers enriched with purchase totals computed from finalized invoices. */
export function useCustomers() {
  const { customers, invoices, saveCustomer, deleteCustomer } = useApp();
  const enriched = useMemo(() => {
    const stats = {};
    invoices
      .filter((i) => i.status === INVOICE_STATUS.FINAL && i.customerId)
      .forEach((i) => {
        const s = (stats[i.customerId] ||= { count: 0, totalPaise: 0, lastDate: '', balancePaise: 0 });
        s.count += 1;
        s.totalPaise += i.totals.grossPaise;
        s.balancePaise += i.balancePaise || 0;
        if (i.date > s.lastDate) s.lastDate = i.date;
      });
    return customers.map((c) => ({ ...c, stats: stats[c.id] || { count: 0, totalPaise: 0, lastDate: '', balancePaise: 0 } }));
  }, [customers, invoices]);
  return { customers: enriched, saveCustomer, deleteCustomer };
}
