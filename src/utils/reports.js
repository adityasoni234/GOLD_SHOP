/**
 * Report builders. Each returns { columns, rows, totals } where money columns
 * hold paise and weight columns hold milligrams. Only finalized, non-cancelled
 * invoices are counted as sales. Revenue is NOT profit.
 */
import { formatINR, formatWeight, paiseToPlain } from './currency.js';
import { formatDate, monthKey, monthLabel, financialYear, inDateRange } from './dateUtils.js';
import { INVOICE_STATUS } from '../constants/index.js';

const money = (key, label) => ({ key, label, type: 'money', align: 'right' });
const weight = (key, label) => ({ key, label, type: 'weight', align: 'right' });
const count = (key, label) => ({ key, label, type: 'count', align: 'right' });
const text = (key, label) => ({ key, label });

export const REPORT_TYPES = [
  { id: 'daily', label: 'Daily sales' },
  { id: 'monthly', label: 'Monthly sales' },
  { id: 'yearly', label: 'Yearly sales (FY)' },
  { id: 'customer', label: 'Customer-wise sales' },
  { id: 'gold', label: 'Gold sales' },
  { id: 'silver', label: 'Silver sales' },
  { id: 'gst', label: 'GST collection' },
  { id: 'payments', label: 'Payment collection' },
  { id: 'outstanding', label: 'Outstanding balances' },
  { id: 'invoice', label: 'Invoice-wise revenue' },
];

function sumRows(rows, columns) {
  const totals = {};
  columns.forEach((c) => {
    if (['money', 'weight', 'count'].includes(c.type)) totals[c.key] = rows.reduce((a, r) => a + (r[c.key] || 0), 0);
  });
  return totals;
}

function groupSales(invoices, keyFn, labelFn) {
  const map = new Map();
  invoices.forEach((i) => {
    const k = keyFn(i);
    const r = map.get(k) || { key: k, period: labelFn(k, i), invoices: 0, netMg: 0, total: 0, cgst: 0, sgst: 0, igst: 0, oldMetal: 0, gross: 0 };
    r.invoices += 1;
    r.netMg += i.totals.netMg;
    r.total += i.totals.itemsTotalPaise;
    r.cgst += i.totals.cgstPaise;
    r.sgst += i.totals.sgstPaise;
    r.igst += i.totals.igstPaise;
    r.oldMetal += i.totals.adjustmentPaise || 0;
    r.gross += i.totals.grossPaise;
    map.set(k, r);
  });
  return [...map.values()].sort((a, b) => (a.key < b.key ? 1 : -1));
}

const SALES_COLUMNS = [
  text('period', 'Period'),
  count('invoices', 'Invoices'),
  weight('netMg', 'Net wt (g)'),
  money('total', 'Total amount'),
  money('cgst', 'CGST'),
  money('sgst', 'SGST'),
  money('igst', 'IGST'),
  money('oldMetal', 'Old gold/silver (±)'),
  money('gross', 'Gross amount'),
];

function metalRows(invoices, metal) {
  const rows = [];
  invoices.forEach((inv) =>
    inv.items.forEach((it, idx) => {
      if (it.metal !== metal) return;
      const l = inv.lines[idx];
      rows.push({
        key: `${inv.id}-${idx}`,
        date: formatDate(inv.date),
        invoiceNo: inv.invoiceNo,
        customer: inv.customer.name,
        description: it.description,
        purity: it.purity,
        pieces: l.pieces,
        grossMg: l.grossMg,
        netMg: l.netMg,
        rate: l.ratePaise,
        metal: l.metalPaise,
        making: l.makingPaise,
        total: l.totalPaise,
      });
    }),
  );
  const columns = [
    text('date', 'Date'), text('invoiceNo', 'Invoice'), text('customer', 'Customer'), text('description', 'Item'),
    text('purity', 'Purity'), count('pieces', 'PC'), weight('grossMg', 'Gross wt'), weight('netMg', 'Net wt'),
    { ...money('rate', 'Rate/g'), noTotal: true }, money('metal', 'Metal value'), money('making', 'Making'), money('total', 'Item total (pre-GST)'),
  ];
  return { columns, rows };
}

export function buildReport(type, { invoices, payments, from, to }) {
  const sales = invoices.filter((i) => i.status === INVOICE_STATUS.FINAL && inDateRange(i.date, from, to));
  let columns;
  let rows;

  switch (type) {
    case 'daily':
      columns = SALES_COLUMNS;
      rows = groupSales(sales, (i) => i.date, (k) => formatDate(k));
      break;
    case 'monthly':
      columns = SALES_COLUMNS;
      rows = groupSales(sales, (i) => monthKey(i.date), (k) => monthLabel(k));
      break;
    case 'yearly':
      columns = SALES_COLUMNS;
      rows = groupSales(sales, (i) => financialYear(i.date), (k) => k);
      break;
    case 'customer': {
      columns = [text('period', 'Customer'), text('phone', 'Phone'), ...SALES_COLUMNS.slice(1), money('balance', 'Balance due')];
      rows = groupSales(sales, (i) => i.customerId || i.customer.name, (k, i) => i.customer.name);
      rows.forEach((r) => {
        const invs = sales.filter((i) => (i.customerId || i.customer.name) === r.key);
        r.phone = invs[0]?.customer.phone || '';
        r.balance = invs.reduce((a, i) => a + (i.balancePaise || 0), 0);
      });
      rows.sort((a, b) => b.gross - a.gross);
      break;
    }
    case 'gold':
    case 'silver':
      ({ columns, rows } = metalRows(sales, type === 'gold' ? 'Gold' : 'Silver'));
      break;
    case 'gst':
      columns = [
        text('date', 'Date'), text('invoiceNo', 'Invoice'), text('customer', 'Customer'), text('gstin', 'Customer GSTIN'),
        text('pos', 'Place of supply'), money('taxable', 'Taxable value'), money('cgst', 'CGST'), money('sgst', 'SGST'),
        money('igst', 'IGST'), money('tax', 'Total GST'), money('gross', 'Invoice value'),
      ];
      rows = sales.map((i) => ({
        key: i.id, date: formatDate(i.date), invoiceNo: i.invoiceNo, customer: i.customer.name, gstin: i.customer.gstin,
        pos: `${i.placeOfSupply} (${i.placeOfSupplyCode})`, taxable: i.totals.taxablePaise, cgst: i.totals.cgstPaise,
        sgst: i.totals.sgstPaise, igst: i.totals.igstPaise, tax: i.totals.totalTaxPaise, gross: i.totals.grossPaise,
      }));
      break;
    case 'payments': {
      const valid = new Set(invoices.filter((i) => i.status === INVOICE_STATUS.FINAL).map((i) => i.id));
      columns = [text('mode', 'Payment mode'), count('count', 'Payments'), money('amount', 'Amount collected')];
      const map = new Map();
      payments
        .filter((p) => valid.has(p.invoiceId) && inDateRange(p.date, from, to))
        .forEach((p) => {
          const r = map.get(p.mode) || { key: p.mode, mode: p.mode, count: 0, amount: 0 };
          r.count += 1;
          r.amount += p.amountPaise;
          map.set(p.mode, r);
        });
      rows = [...map.values()].sort((a, b) => b.amount - a.amount);
      break;
    }
    case 'outstanding':
      columns = [
        text('date', 'Date'), text('invoiceNo', 'Invoice'), text('customer', 'Customer'), text('phone', 'Phone'),
        money('gross', 'Gross'), money('paid', 'Paid'), money('balance', 'Balance due'), text('status', 'Status'),
      ];
      rows = sales
        .filter((i) => i.balancePaise > 0)
        .map((i) => ({
          key: i.id, date: formatDate(i.date), invoiceNo: i.invoiceNo, customer: i.customer.name, phone: i.customer.phone,
          gross: i.totals.grossPaise, paid: i.amountPaidPaise || 0, balance: i.balancePaise, status: i.paymentStatus,
        }));
      break;
    case 'invoice':
    default:
      columns = [
        text('date', 'Date'), text('invoiceNo', 'Invoice'), text('customer', 'Customer'), weight('netMg', 'Net wt'),
        money('total', 'Total amount'), money('tax', 'GST'), money('oldMetal', 'Old gold/silver (±)'), money('roundOff', 'Round off'), money('gross', 'Gross amount'),
        money('paid', 'Paid'), money('balance', 'Balance'),
      ];
      rows = sales.map((i) => ({
        key: i.id, date: formatDate(i.date), invoiceNo: i.invoiceNo, customer: i.customer.name, netMg: i.totals.netMg,
        total: i.totals.itemsTotalPaise, tax: i.totals.totalTaxPaise, oldMetal: i.totals.adjustmentPaise || 0, roundOff: i.totals.roundOffPaise,
        gross: i.totals.grossPaise, paid: i.amountPaidPaise || 0, balance: i.balancePaise || 0,
      }));
  }

  const totals = sumRows(rows, columns.filter((c) => !c.noTotal));
  return { columns, rows, totals };
}

export function formatCell(col, value) {
  if (value === undefined || value === null || value === '') return '';
  if (col.type === 'money') return formatINR(value);
  if (col.type === 'weight') return formatWeight(value);
  return value;
}

export function csvValue(col, value) {
  if (col.type === 'money') return paiseToPlain(value || 0);
  if (col.type === 'weight') return formatWeight(value || 0);
  return value ?? '';
}
