/**
 * Open the browser print dialog for the invoice currently mounted in <PrintPortal>.
 * The document title becomes the suggested PDF file name ("Save as PDF").
 */
export function printInvoice(invoice, { asPdf = false } = {}) {
  const original = document.title;
  const name = String(invoice?.customer?.name || '').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '');
  document.title = `Invoice-${invoice?.invoiceNo || 'draft'}${name ? `-${name}` : ''}`;
  const restore = () => {
    document.title = original;
    window.removeEventListener('afterprint', restore);
  };
  window.addEventListener('afterprint', restore);
  if (asPdf) {
    // Browsers cannot save a PDF silently; the print dialog's "Save as PDF" destination is used.
    console.info('Choose "Save as PDF" as the destination in the print dialog.');
  }
  // Let React flush the portal before printing.
  setTimeout(() => window.print(), 50);
}
