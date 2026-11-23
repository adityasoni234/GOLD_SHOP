/**
 * Turns the A4 PrintableInvoice into a real PDF file in the browser.
 *
 * The invoice is rendered off-screen at its physical size (210 x 297 mm),
 * captured as a high-resolution image and placed on one A4 page with jsPDF.
 * Libraries are loaded on demand so they don't slow down the rest of the app.
 */
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import PrintableInvoice from './PrintableInvoice.jsx';

const A4_W_PX = Math.round((210 / 25.4) * 96); // 794
const A4_H_PX = Math.round((297 / 25.4) * 96); // 1123

export function invoiceFileName(invoice) {
  const name = String(invoice?.customer?.name || '').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '');
  return `Invoice-${invoice?.invoiceNo || 'draft'}${name ? `-${name}` : ''}.pdf`;
}

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

/**
 * @param props  same props as <PrintableInvoice> ({ invoice, print, logoDataUrl, sample })
 * @returns Promise<File>  a PDF File ready to download or share
 */
export async function createInvoicePdf(props) {
  const [{ toJpeg }, { jsPDF }] = await Promise.all([import('html-to-image'), import('jspdf')]);

  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  Object.assign(host.style, {
    position: 'fixed',
    left: '-10000px',
    top: '0',
    width: `${A4_W_PX}px`,
    height: `${A4_H_PX}px`,
    background: '#fff',
    pointerEvents: 'none',
  });
  document.body.appendChild(host);
  const root = createRoot(host);

  try {
    // Printer offsets are for paper alignment only; a PDF should be centred.
    root.render(createElement(PrintableInvoice, { ...props, print: {} }));
    await nextFrame();
    await nextFrame();
    if (document.fonts?.ready) await document.fonts.ready;

    const page = host.querySelector('.inv-page');
    const dataUrl = await toJpeg(page, {
      quality: 0.92,
      pixelRatio: 2.5,
      backgroundColor: '#ffffff',
      width: A4_W_PX,
      height: A4_H_PX,
      cacheBust: false,
    });

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    pdf.addImage(dataUrl, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
    pdf.setProperties({
      title: invoiceFileName(props.invoice).replace(/\.pdf$/, ''),
      subject: 'Tax Invoice',
      creator: props.invoice?.shop?.business?.name || 'ABS Billing',
    });
    const blob = pdf.output('blob');
    return new File([blob], invoiceFileName(props.invoice), { type: 'application/pdf' });
  } finally {
    root.unmount();
    host.remove();
  }
}

export function downloadFile(file) {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
