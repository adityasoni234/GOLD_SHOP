import { useState } from 'react';
import Modal from '../common/Modal.jsx';
import Field from '../common/Field.jsx';
import { JEWELLERY_CATEGORIES, METALS } from '../../constants/index.js';
import { EMPTY_PRODUCT } from '../../services/productService.js';
import { MAKING_TYPE_LABELS, ADDITIONAL_TYPE_LABELS } from '../../utils/calculations.js';
import { parseScaled, SCALE } from '../../utils/decimal.js';

export default function ProductForm({ product, settings, onSave, onClose }) {
  const [p, setP] = useState({ ...EMPTY_PRODUCT, hsn: settings.jewellery.defaultHsn, ...product });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (patch) => setP((x) => ({ ...x, ...patch }));
  const purities = settings.jewellery.purities.filter((x) => x.metal === p.metal);

  const submit = async (e) => {
    e?.preventDefault();
    const errs = {};
    if (!p.name.trim()) errs.name = 'Product name is required';
    if (p.makingValue !== '' && !(parseScaled(p.makingValue, SCALE.PERCENT) >= 0)) errs.makingValue = 'Must be a non-negative number';
    if (p.additionalValue !== '' && !(parseScaled(p.additionalValue, SCALE.MONEY) >= 0)) errs.additionalValue = 'Must be a non-negative number';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await onSave(p);
      onClose();
    } catch (err) {
      setErrors({ form: err.message });
      setBusy(false);
    }
  };

  return (
    <Modal
      size="wide"
      title={p.id ? 'Edit product' : 'Add product'}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={busy}>Save product</button>
        </>
      }
    >
      <form className="form-grid" onSubmit={submit}>
        <Field label="Product name" required error={errors.name} className="span-2">
          <input className="input" autoFocus value={p.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Necklace Set 22k" />
        </Field>
        <Field label="Category">
          <select className="select" value={p.category} onChange={(e) => set({ category: e.target.value })}>
            {JEWELLERY_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Metal">
          <select className="select" value={p.metal} onChange={(e) => set({ metal: e.target.value, purity: settings.jewellery.purities.find((x) => x.metal === e.target.value)?.label })}>
            {METALS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="Purity">
          <select className="select" value={p.purity} onChange={(e) => set({ purity: e.target.value })}>
            {purities.map((x) => <option key={x.label} value={x.label}>{x.label} ({x.fineness})</option>)}
          </select>
        </Field>
        <Field label="HSN/SAC">
          <input className="input" value={p.hsn} onChange={(e) => set({ hsn: e.target.value })} />
        </Field>
        <Field label="HUID">
          <input className="input" value={p.huid} onChange={(e) => set({ huid: e.target.value.toUpperCase() })} />
        </Field>
        <Field label="Default making type">
          <select className="select" value={p.makingType} onChange={(e) => set({ makingType: e.target.value })}>
            {Object.entries(MAKING_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Default making value" error={errors.makingValue}>
          <input className="input num" inputMode="decimal" value={p.makingValue} onChange={(e) => set({ makingValue: e.target.value })} />
        </Field>
        <Field label="Default additional type">
          <select className="select" value={p.additionalType} onChange={(e) => set({ additionalType: e.target.value })}>
            {Object.entries(ADDITIONAL_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Default additional value ₹" error={errors.additionalValue}>
          <input className="input num" inputMode="decimal" value={p.additionalValue} onChange={(e) => set({ additionalValue: e.target.value })} />
        </Field>
        <Field label="Description" className="span-all">
          <input className="input" value={p.description} onChange={(e) => set({ description: e.target.value })} />
        </Field>
        {errors.form && <div className="field-error span-all">{errors.form}</div>}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
