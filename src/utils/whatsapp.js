/**
 * WhatsApp click-to-chat helpers (https://wa.me).
 * Opens WhatsApp (app or web) with a pre-filled message; the shopkeeper presses Send.
 * WhatsApp links cannot attach files, so the PDF (if needed) is attached manually.
 */
import { formatINR, formatWeight, formatPercent } from './currency.js';
import { formatDate } from './dateUtils.js';

/** Normalise an Indian mobile number to 91XXXXXXXXXX, or '' if it doesn't look valid. */
export function waPhone(phone) {
  let d = String(phone || '').replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  if (d.length === 10) d = `91${d}`;
  return /^91[6-9]\d{9}$/.test(d) ? d : '';
}

export function whatsappUrl(phone, text) {
  const p = waPhone(phone);
  return `https://wa.me/${p}?text=${encodeURIComponent(text)}`;
}

/** Bill summary message for a finalized invoice. */
export function invoiceMessage(invoice) {
  const t = invoice.totals;
  const b = invoice.shop.business;
  const fmt = invoice.shop.dateFormat || 'dd-MM-yyyy';
  const intra = t.taxMode !== 'inter';
  const lines = [
    `*${b.name}*`,
    `Tax Invoice No: *${invoice.invoiceNo}*   Date: ${formatDate(invoice.date, fmt)}`,
    `Customer: ${invoice.customer.name}`,
    '',
    ...invoice.items.map((it, i) => {
      const l = invoice.lines[i];
      return `${i + 1}. ${it.metal} ${it.description} (${it.purity}) – Net ${formatWeight(l.netMg)} g – ₹${formatINR(l.totalPaise)}`;
    }),
    '',
    `Total Amount: ₹${formatINR(t.itemsTotalPaise)}`,
    ...(intra
      ? [`CGST ${formatPercent(t.cgstRateScaled)}%: ₹${formatINR(t.cgstPaise)}`, `SGST ${formatPercent(t.sgstRateScaled)}%: ₹${formatINR(t.sgstPaise)}`]
      : [`IGST ${formatPercent(t.igstRateScaled)}%: ₹${formatINR(t.igstPaise)}`]),
    ...(t.oldMetal || [])
      .filter((o) => o.amountPaise > 0)
      .map((o) => `${o.direction === 'add' ? 'Add' : 'Less'}: ${o.label}${o.weightMg ? ` (${formatWeight(o.weightMg)} g)` : ''}: ${o.direction === 'add' ? '' : '-'}₹${formatINR(o.amountPaise)}`),
    ...(t.roundOffPaise ? [`Round Off: ${formatINR(t.roundOffPaise)}`] : []),
    `*Gross Amount: ₹${formatINR(t.grossPaise)}*`,
    `(${invoice.amountInWords})`,
  ];
  if (invoice.amountPaidPaise) {
    lines.push('', `Paid: ₹${formatINR(invoice.amountPaidPaise)}`, `Balance due: ₹${formatINR(invoice.balancePaise || 0)}`);
  }
  lines.push('', 'Thank you for your purchase!', `${b.name}`, `Contact: ${b.contacts}`);
  return lines.join('\n');
}

export const DEFAULT_THANK_YOU =
  'Namaste {customer} ji,\n\nThank you for shopping with *{shop}*! 🙏\nPlease find attached your bill (Invoice No. {invoiceNo}, dated {date}).\n\nWe look forward to serving you again.\n\n{shop}\nContact: {contacts}';

/**
 * Thank-you message sent together with the bill PDF.
 * Placeholders: {customer} {invoiceNo} {date} {amount} {shop} {contacts}
 */
export function thankYouMessage(invoice, template = DEFAULT_THANK_YOU) {
  const b = invoice.shop.business;
  const values = {
    customer: invoice.customer.name,
    invoiceNo: invoice.invoiceNo,
    date: formatDate(invoice.date, invoice.shop.dateFormat || 'dd-MM-yyyy'),
    amount: `₹${formatINR(invoice.totals.grossPaise)}`,
    shop: b.name,
    contacts: b.contacts,
  };
  return String(template || DEFAULT_THANK_YOU).replace(/\{(\w+)\}/g, (m, k) => (k in values ? values[k] : m));
}

/** Polite reminder for an outstanding balance. */
export function reminderMessage(invoice) {
  const b = invoice.shop.business;
  return [
    `Namaste ${invoice.customer.name} ji,`,
    '',
    `This is a reminder from *${b.name}* for Invoice No. ${invoice.invoiceNo} dated ${formatDate(invoice.date, invoice.shop.dateFormat || 'dd-MM-yyyy')}.`,
    `Invoice amount: ₹${formatINR(invoice.totals.grossPaise)}`,
    `Paid: ₹${formatINR(invoice.amountPaidPaise || 0)}`,
    `*Balance due: ₹${formatINR(invoice.balancePaise || 0)}*`,
    '',
    'Kindly clear the balance at your convenience. Thank you!',
    `Contact: ${b.contacts}`,
  ].join('\n');
}

export function openWhatsApp(phone, text) {
  window.open(whatsappUrl(phone, text), '_blank', 'noopener');
}
