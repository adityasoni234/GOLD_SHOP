import { useState } from 'react';
import Modal from '../common/Modal.jsx';
import Field from '../common/Field.jsx';
import { INDIAN_STATES, stateCodeFor } from '../../constants/index.js';
import { EMPTY_CUSTOMER } from '../../services/customerService.js';
import { isValidGSTIN, isValidPhone, isValidPIN } from '../../utils/validators.js';

export default function CustomerForm({ customer, onSave, onClose }) {
  const { stats, ...initial } = customer || {};
  const [c, setC] = useState({ ...EMPTY_CUSTOMER, ...initial });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (patch) => setC((x) => ({ ...x, ...patch }));

  const submit = async (e) => {
    e?.preventDefault();
    const errs = {};
    if (!c.name.trim()) errs.name = 'Name is required';
    if (c.phone && !isValidPhone(c.phone)) errs.phone = 'Enter a valid 10-digit mobile number';
    if (c.pin && !isValidPIN(c.pin)) errs.pin = 'PIN must be 6 digits';
    if (c.gstin && !isValidGSTIN(c.gstin)) errs.gstin = 'Invalid GSTIN format';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await onSave(c);
      onClose();
    } catch (err) {
      setErrors({ form: err.message });
      setBusy(false);
    }
  };

  return (
    <Modal
      size="wide"
      title={c.id ? 'Edit customer' : 'Add customer'}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={busy}>{busy ? 'Saving…' : 'Save customer'}</button>
        </>
      }
    >
      <form className="form-grid" onSubmit={submit}>
        <Field label="Name" required error={errors.name} className="span-2">
          <input className="input" autoFocus value={c.name} onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <Field label="Phone" error={errors.phone}>
          <input className="input" type="tel" value={c.phone} onChange={(e) => set({ phone: e.target.value })} />
        </Field>
        <Field label="Address" className="span-all">
          <input className="input" value={c.address} onChange={(e) => set({ address: e.target.value })} />
        </Field>
        <Field label="City">
          <input className="input" value={c.city} onChange={(e) => set({ city: e.target.value })} />
        </Field>
        <Field label="State">
          <select className="select" value={c.state} onChange={(e) => set({ state: e.target.value, stateCode: stateCodeFor(e.target.value) })}>
            {INDIAN_STATES.map((s) => <option key={s.code} value={s.name}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="State code">
          <input className="input" readOnly value={c.stateCode} />
        </Field>
        <Field label="PIN code" error={errors.pin}>
          <input className="input" inputMode="numeric" maxLength={6} value={c.pin} onChange={(e) => set({ pin: e.target.value })} />
        </Field>
        <Field label="GSTIN (optional)" error={errors.gstin}>
          <input className="input" maxLength={15} value={c.gstin} onChange={(e) => set({ gstin: e.target.value.toUpperCase() })} />
        </Field>
        <Field label="PAN / Aadhaar ref. (optional)">
          <input className="input" value={c.panAadhaar} onChange={(e) => set({ panAadhaar: e.target.value.toUpperCase() })} />
        </Field>
        {errors.form && <div className="field-error span-all">{errors.form}</div>}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
