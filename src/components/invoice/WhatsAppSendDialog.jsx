import { useEffect, useMemo, useState } from 'react';
import { MessageCircle, FileDown, Loader2, CheckCircle2, AlertTriangle, Printer } from 'lucide-react';
import Modal from '../common/Modal.jsx';
import Field from '../common/Field.jsx';
import { useToast } from '../common/Toast.jsx';
import { createInvoicePdf, downloadFile } from '../../invoice/invoicePdf.js';
import { invoiceMessage, reminderMessage, openWhatsApp, waPhone } from '../../utils/whatsapp.js';
import { logAudit } from '../../services/auditService.js';

/**
 * Send a bill (as a PDF) or a balance reminder on WhatsApp.
 *
 * - Bill mode builds the A4 PDF as soon as the dialog opens, so pressing Send can
 *   open the system share sheet immediately (browsers only allow sharing from a tap).
 * - If the browser cannot share files, the PDF is downloaded and the customer's
 *   WhatsApp chat is opened with the message, ready for the file to be attached.
 */
export default function WhatsAppSendDialog({ invoice, settings, mode = 'bill', afterPrint = false, user = '', onClose }) {
  const toast = useToast();
  const isBill = mode === 'bill';
  const [phone, setPhone] = useState(invoice.customer.phone || '');
  const [message, setMessage] = useState(() => (isBill ? invoiceMessage(invoice) : reminderMessage(invoice)));
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState(isBill ? 'preparing' : 'ready');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isBill) return undefined;
    let alive = true;
    createInvoicePdf({ invoice, logoDataUrl: settings.business.logoDataUrl })
      .then((f) => {
        if (!alive) return;
        setFile(f);
        setStatus('ready');
      })
      .catch((err) => {
        console.error(err);
        if (!alive) return;
        setError('Could not create the PDF. You can still send the bill details as text.');
        setStatus('error');
      });
    return () => {
      alive = false;
    };
  }, [invoice, isBill, settings.business.logoDataUrl]);

  const canShareFile = useMemo(() => {
    try {
      return !!(file && navigator.canShare && navigator.canShare({ files: [file] }));
    } catch {
      return false;
    }
  }, [file]);

  const validPhone = waPhone(phone);

  const audit = (how) =>
    logAudit({
      entityId: invoice.id,
      action: 'whatsapp',
      details: `${isBill ? 'Bill' : 'Reminder'} sent via WhatsApp (${how})${validPhone ? ` to ${phone}` : ''}`,
      user,
    }).catch(() => {});

  const send = async () => {
    // 1) Native share sheet with the PDF attached (phones, Safari, Edge/Chrome on supported OS).
    if (isBill && canShareFile) {
      try {
        await navigator.share({ files: [file], text: message, title: file.name });
        audit('PDF shared');
        toast('Bill shared.', 'success');
        onClose();
        return;
      } catch (err) {
        if (err?.name === 'AbortError') return; // user closed the share sheet
        // otherwise fall through to the download + chat route
      }
    }
    // 2) Fallback: download the PDF and open the customer's WhatsApp chat.
    if (isBill && file) downloadFile(file);
    openWhatsApp(phone, isBill && file ? `${message}\n\n(Bill PDF attached)` : message);
    audit(isBill && file ? 'chat opened, PDF downloaded' : 'text message');
    toast(
      isBill && file ? 'PDF downloaded. In WhatsApp, tap 📎 → Document and attach it.' : 'WhatsApp opened with the message.',
      'success',
    );
    onClose();
  };

  const sendTextOnly = () => {
    openWhatsApp(phone, message);
    audit('text message');
    onClose();
  };

  return (
    <Modal
      size="wide"
      title={afterPrint ? 'Bill printed — send it on WhatsApp too?' : isBill ? `Send bill ${invoice.invoiceNo} on WhatsApp` : `Send balance reminder · ${invoice.invoiceNo}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>{afterPrint ? 'Not now' : 'Cancel'}</button>
          {isBill && (
            <>
              <button className="btn" onClick={sendTextOnly}>Text only</button>
              <button className="btn" disabled={!file} onClick={() => downloadFile(file)}><FileDown size={15} /> Download PDF</button>
            </>
          )}
          <button className="btn btn-whatsapp-solid" onClick={send} disabled={status === 'preparing'} autoFocus>
            {status === 'preparing' ? <Loader2 size={15} className="spin" /> : <MessageCircle size={15} />}
            {status === 'preparing' ? 'Preparing PDF…' : isBill ? 'Send bill on WhatsApp' : 'Send reminder'}
          </button>
        </>
      }
    >
      <div className="stack">
        {afterPrint && (
          <div className="alert success"><Printer size={16} /> <div>The bill was sent to the printer. You can also send the same bill to the customer on WhatsApp.</div></div>
        )}
        <div className="form-grid">
          <Field
            label="Customer WhatsApp number"
            hint={validPhone ? `Will open chat with +${validPhone}` : 'No valid mobile — WhatsApp will ask you to choose a contact'}
          >
            <input className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile" />
          </Field>
          {isBill && (
            <Field label="Bill PDF">
              <div className="row" style={{ height: 34 }}>
                {status === 'preparing' && <><Loader2 size={15} className="spin" /> <span className="muted">Creating A4 PDF…</span></>}
                {status === 'ready' && file && <><CheckCircle2 size={15} color="var(--success)" /> <span>{file.name} · {Math.max(1, Math.round(file.size / 1024))} KB</span></>}
                {status === 'error' && <><AlertTriangle size={15} color="var(--danger)" /> <span className="small">{error}</span></>}
              </div>
            </Field>
          )}
        </div>
        <Field label="Message">
          <textarea className="textarea" rows={10} value={message} onChange={(e) => setMessage(e.target.value)} style={{ fontFamily: 'var(--font-ui)', fontSize: 13 }} />
        </Field>
        {isBill && status === 'ready' && (
          <div className="small muted">
            {canShareFile
              ? 'Pressing Send opens the share menu with the PDF attached — choose WhatsApp, then the customer.'
              : 'This browser cannot attach files to WhatsApp directly. Pressing Send downloads the PDF and opens the customer’s WhatsApp chat — attach the PDF with 📎 → Document.'}
          </div>
        )}
      </div>
    </Modal>
  );
}
