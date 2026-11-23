import { Plus, Trash2 } from 'lucide-react';
import { PAYMENT_MODES } from '../../constants/index.js';
import { todayISO } from '../../utils/dateUtils.js';
import { uid } from '../../utils/misc.js';
import { paiseToPlain } from '../../utils/currency.js';

export const newPaymentEntry = () => ({ id: uid('pe_'), mode: 'Cash', amount: '', reference: '', date: todayISO() });

/** Editable list of payment rows (used when finalizing an invoice). */
export default function PaymentEntries({ entries, setEntries, remainingPaise }) {
  const update = (id, patch) => setEntries(entries.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  return (
    <div>
      {entries.map((e) => (
        <div className="pay-row" key={e.id}>
          <div className="field">
            <label>Mode</label>
            <select className="select" value={e.mode} onChange={(ev) => update(e.id, { mode: ev.target.value })}>
              {PAYMENT_MODES.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Amount ₹</label>
            <input className="input num" inputMode="decimal" value={e.amount} onChange={(ev) => update(e.id, { amount: ev.target.value })} />
          </div>
          <div className="field">
            <label>Reference / Txn ID</label>
            <input className="input" value={e.reference} onChange={(ev) => update(e.id, { reference: ev.target.value })} />
          </div>
          <div className="field">
            <label>Date</label>
            <input className="input" type="date" value={e.date} onChange={(ev) => update(e.id, { date: ev.target.value })} />
          </div>
          <div className="row">
            {remainingPaise > 0 && !e.amount && (
              <button type="button" className="btn btn-sm" onClick={() => update(e.id, { amount: paiseToPlain(remainingPaise) })}>
                Balance
              </button>
            )}
            <button type="button" className="btn btn-ghost btn-icon" onClick={() => setEntries(entries.filter((x) => x.id !== e.id))} aria-label="Remove payment">
              <Trash2 size={15} color="var(--danger)" />
            </button>
          </div>
        </div>
      ))}
      <button type="button" className="btn btn-sm" style={{ marginTop: 10 }} onClick={() => setEntries([...entries, newPaymentEntry()])}>
        <Plus size={14} /> Add payment
      </button>
    </div>
  );
}
