import { useState } from 'react';
import Modal from '../common/Modal.jsx';
import Field from '../common/Field.jsx';
import { PAYMENT_MODES } from '../../constants/index.js';
import { todayISO } from '../../utils/dateUtils.js';
import { formatINR, paiseToPlain } from '../../utils/currency.js';
import { parseScaled, SCALE } from '../../utils/decimal.js';

/** Record a payment against a finalized invoice. */
export default function PaymentForm({ invoice, onSave, onClose }) {
  const [mode, setMode] = useState('Cash');
  const [amount, setAmount] = useState(invoice.balancePaise > 0 ? paiseToPlain(invoice.balancePaise) : '');
  const [reference, setReference] = useState('');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e?.preventDefault();
    const amountPaise = parseScaled(amount, SCALE.MONEY);
    if (!Number.isFinite(amountPaise) || amountPaise <= 0) return setError('Enter an amount greater than zero.');
    if (amountPaise > invoice.balancePaise && !window.confirm('This amount is more than the balance due. Record it anyway?')) return;
    setBusy(true);
    try {
      await onSave({ invoiceId: invoice.id, invoiceNo: invoice.invoiceNo, customerName: invoice.customer.name, date, mode, amountPaise, reference, note });
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Modal
      title={`Record payment · Invoice ${invoice.invoiceNo}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={busy}>{busy ? 'Saving…' : 'Save payment'}</button>
        </>
      }
    >
      <form onSubmit={submit} className="stack">
        <div className="alert info">
          Gross ₹{formatINR(invoice.totals.grossPaise)} · Paid ₹{formatINR(invoice.amountPaidPaise || 0)} · <b>Balance ₹{formatINR(invoice.balancePaise)}</b>
        </div>
        <div className="form-grid">
          <Field label="Amount ₹" required>
            <input className="input num" autoFocus inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="Payment mode">
            <select className="select" value={mode} onChange={(e) => setMode(e.target.value)}>
              {PAYMENT_MODES.map((m) => <option key={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Date">
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Transaction reference">
            <input className="input" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UPI ref / cheque no." />
          </Field>
          <Field label="Note" className="span-all">
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </div>
        {error && <div className="field-error">{error}</div>}
      </form>
    </Modal>
  );
}
