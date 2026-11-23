import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Save, Upload, Trash2, Plus, Printer, Download, ShieldCheck, Database } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../components/common/Toast.jsx';
import PageHeader from '../components/common/PageHeader.jsx';
import Field from '../components/common/Field.jsx';
import { INDIAN_STATES, stateCodeFor, DATE_FORMATS, METALS } from '../constants/index.js';
import { MAKING_TYPE_LABELS, ADDITIONAL_TYPE_LABELS } from '../utils/calculations.js';
import { ROUND_OFF_LABELS } from '../utils/gstCalculations.js';
import { validateTaxSettings, isValidGSTIN, isValidIFSC } from '../utils/validators.js';
import { parseScaled, SCALE } from '../utils/decimal.js';
import { exportLocalData, importLocalData } from '../services/db.js';
import { formatDate, todayISO } from '../utils/dateUtils.js';

const TABS = [
  ['business', 'Business'],
  ['bank', 'Bank details'],
  ['invoice', 'Invoice & print'],
  ['tax', 'Tax'],
  ['jewellery', 'Jewellery'],
  ['data', 'Data & backup'],
];

export default function Settings() {
  const { settings, saveSettings, dataMode, invoices } = useApp();
  const toast = useToast();
  const [tab, setTab] = useState('business');
  const [s, setS] = useState(settings);
  const [busy, setBusy] = useState(false);

  const set = (section, patch) => setS((x) => ({ ...x, [section]: { ...x[section], ...patch } }));
  const dirty = JSON.stringify(s) !== JSON.stringify(settings);
  const highestNumber = useMemo(() => Math.max(0, ...invoices.map((i) => i.number || 0)), [invoices]);

  const errors = useMemo(() => {
    const e = [];
    if (!s.business.name.trim()) e.push('Shop name is required.');
    if (s.business.gstin && !isValidGSTIN(s.business.gstin)) e.push('Shop GSTIN format is invalid.');
    if (s.bank.ifsc && !isValidIFSC(s.bank.ifsc)) e.push('IFSC format is invalid (e.g. ICIC0001234).');
    if (!(Number(s.invoice.startNumber) >= 1) || !Number.isInteger(Number(s.invoice.startNumber))) e.push('Starting invoice number must be a whole number ≥ 1.');
    e.push(...validateTaxSettings(s.tax));
    s.jewellery.purities.forEach((p) => {
      if (!p.label.trim()) e.push('Every purity needs a label.');
      if (!(parseScaled(p.fineness, SCALE.FINENESS) > 0)) e.push(`Fineness for ${p.label || 'a purity'} must be a positive number.`);
    });
    if (new Set(s.jewellery.purities.map((p) => p.label)).size !== s.jewellery.purities.length) e.push('Purity labels must be unique.');
    return e;
  }, [s]);

  const save = async () => {
    if (errors.length) {
      toast(errors[0], 'error');
      return;
    }
    setBusy(true);
    try {
      const next = { ...s, invoice: { ...s.invoice, startNumber: Number(s.invoice.startNumber) } };
      const saved = await saveSettings(next);
      setS(saved);
      toast('Settings saved.', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const uploadLogo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 400 * 1024) {
      toast('Please use an image under 400 KB.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => set('business', { logoDataUrl: reader.result, watermarkMode: 'logo' });
    reader.readAsDataURL(file);
  };

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(exportLocalData(), null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `abs-billing-backup-${todayISO()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const importBackup = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!window.confirm('Importing a backup replaces matching data in this browser. Continue?')) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importLocalData(JSON.parse(reader.result));
        toast('Backup imported. Reloading…', 'success');
        setTimeout(() => window.location.reload(), 800);
      } catch {
        toast('That file is not a valid backup.', 'error');
      }
    };
    reader.readAsText(file);
  };

  const b = s.business;
  const bank = s.bank;
  const inv = s.invoice;
  const tax = s.tax;
  const j = s.jewellery;
  const v = s.verification;

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Changes apply to new invoices. Finalized invoices keep the details they were issued with."
        actions={<button className="btn btn-primary" onClick={save} disabled={busy || !dirty}><Save size={15} /> {dirty ? 'Save changes' : 'Saved'}</button>}
      />
      {errors.length > 0 && dirty && (
        <div className="alert danger" style={{ marginBottom: 12 }}>
          <ul style={{ margin: 0 }}>{errors.map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><h3><ShieldCheck size={16} /> Verification before live billing</h3></div>
        <div className="card-body stack">
          <p className="small muted">These values were copied from the reference invoice. Confirm them with the shop owner / accountant and tick each box.</p>
          <div className="row wrap" style={{ gap: 20 }}>
            <label className="checkbox"><input type="checkbox" checked={v.gstin} onChange={(e) => set('verification', { gstin: e.target.checked })} /> Shop GSTIN verified</label>
            <label className="checkbox"><input type="checkbox" checked={v.ifsc} onChange={(e) => set('verification', { ifsc: e.target.checked })} /> Bank IFSC entered &amp; verified</label>
            <label className="checkbox"><input type="checkbox" checked={v.taxRates} onChange={(e) => set('verification', { taxRates: e.target.checked })} /> GST rates &amp; tax rules verified</label>
          </div>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 12 }}>
        {TABS.map(([id, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}
      </div>

      <div className="card">
        <div className="card-body">
          {tab === 'business' && (
            <div className="form-grid">
              <Field label="Shop name" required className="span-2">
                <input className="input" value={b.name} onChange={(e) => set('business', { name: e.target.value })} />
              </Field>
              <Field label="Operator name" hint="Shown in the header and audit trail">
                <input className="input" value={b.operatorName} onChange={(e) => set('business', { operatorName: e.target.value })} />
              </Field>
              <Field label="Address (printed under the shop name)" className="span-all">
                <input className="input" value={b.address} onChange={(e) => set('business', { address: e.target.value })} />
              </Field>
              <Field label="Contact numbers" className="span-2">
                <input className="input" value={b.contacts} onChange={(e) => set('business', { contacts: e.target.value })} />
              </Field>
              <Field label="GSTIN" hint={v.gstin ? 'Verified' : 'Not yet verified'}>
                <input className="input" maxLength={15} value={b.gstin} onChange={(e) => set('business', { gstin: e.target.value.toUpperCase() })} />
              </Field>
              <Field label="State">
                <select className="select" value={b.state} onChange={(e) => set('business', { state: e.target.value, stateCode: stateCodeFor(e.target.value) })}>
                  {INDIAN_STATES.map((st) => <option key={st.code} value={st.name}>{st.name}</option>)}
                </select>
              </Field>
              <Field label="State code"><input className="input" readOnly value={b.stateCode} /></Field>
              <Field label="Invoice watermark">
                <select className="select" value={b.watermarkMode} onChange={(e) => set('business', { watermarkMode: e.target.value })}>
                  <option value="monogram">Monogram + shop name</option>
                  <option value="logo" disabled={!b.logoDataUrl}>Uploaded logo</option>
                  <option value="none">None</option>
                </select>
              </Field>
              <Field label="Monogram letters">
                <input className="input" maxLength={4} value={b.monogramText} onChange={(e) => set('business', { monogramText: e.target.value.toUpperCase() })} />
              </Field>
              <Field label="Logo (for watermark)" className="span-2" hint="PNG/JPG/SVG under 400 KB. Stored with settings.">
                <div className="row">
                  <label className="btn"><Upload size={15} /> Upload logo<input type="file" accept="image/*" hidden onChange={uploadLogo} /></label>
                  {b.logoDataUrl && (
                    <>
                      <img src={b.logoDataUrl} alt="Logo" style={{ height: 34, border: '1px solid var(--border)', borderRadius: 4 }} />
                      <button className="btn btn-danger btn-sm" onClick={() => set('business', { logoDataUrl: '', watermarkMode: 'monogram' })}><Trash2 size={13} /> Remove</button>
                    </>
                  )}
                </div>
              </Field>
            </div>
          )}

          {tab === 'bank' && (
            <div className="form-grid">
              <Field label="Account holder's name" className="span-2">
                <input className="input" value={bank.holder} onChange={(e) => set('bank', { holder: e.target.value })} />
              </Field>
              <Field label="Bank name"><input className="input" value={bank.bankName} onChange={(e) => set('bank', { bankName: e.target.value })} /></Field>
              <Field label="Account number"><input className="input" value={bank.accountNo} onChange={(e) => set('bank', { accountNo: e.target.value })} /></Field>
              <Field label="Branch"><input className="input" value={bank.branch} onChange={(e) => set('bank', { branch: e.target.value })} /></Field>
              <Field label="IFSC" hint="Left blank on purpose — enter the exact IFSC after checking it with the bank.">
                <input className="input" maxLength={11} value={bank.ifsc} placeholder="ICIC000XXXX" onChange={(e) => set('bank', { ifsc: e.target.value.toUpperCase() })} />
              </Field>
            </div>
          )}

          {tab === 'invoice' && (
            <div className="stack">
              <div className="form-grid">
                <Field label="Starting invoice number" hint={highestNumber ? `Highest issued: ${highestNumber}. Numbers never go backwards or repeat.` : 'Used for the first invoice.'}>
                  <input className="input num" inputMode="numeric" value={inv.startNumber} onChange={(e) => set('invoice', { startNumber: e.target.value })} />
                </Field>
                <Field label="Invoice prefix" hint="Optional, e.g. ABS/26-27/">
                  <input className="input" value={inv.prefix} onChange={(e) => set('invoice', { prefix: e.target.value })} />
                </Field>
                <Field label="Date format" hint={`Example: ${formatDate(todayISO(), inv.dateFormat)}`}>
                  <select className="select" value={inv.dateFormat} onChange={(e) => set('invoice', { dateFormat: e.target.value })}>
                    {DATE_FORMATS.map((f) => <option key={f}>{f}</option>)}
                  </select>
                </Field>
                <Field label="Paper size">
                  <select className="select" value={inv.paperSize} onChange={(e) => set('invoice', { paperSize: e.target.value })}>
                    <option value="A4">A4 portrait (210 × 297 mm)</option>
                  </select>
                </Field>
                <Field label="Print offset – top (mm)" hint="Shift if your printer prints too high/low (−10 to 10)">
                  <input className="input num" type="number" step="0.5" min="-10" max="10" value={inv.printOffsetTopMm} onChange={(e) => set('invoice', { printOffsetTopMm: e.target.value })} />
                </Field>
                <Field label="Print offset – left (mm)" hint="Shift if your printer prints off-centre">
                  <input className="input num" type="number" step="0.5" min="-10" max="10" value={inv.printOffsetLeftMm} onChange={(e) => set('invoice', { printOffsetLeftMm: e.target.value })} />
                </Field>
                <Field label="Footer text" className="span-2">
                  <input className="input" value={inv.footerText} onChange={(e) => set('invoice', { footerText: e.target.value })} />
                </Field>
                <Field
                  label="WhatsApp thank-you message (sent with the bill PDF)"
                  className="span-all"
                  hint="You can use {customer} {invoiceNo} {date} {amount} {shop} {contacts} — they are filled in automatically. *text* shows bold in WhatsApp."
                >
                  <textarea className="textarea" rows={7} value={inv.whatsappMessage} onChange={(e) => set('invoice', { whatsappMessage: e.target.value })} />
                </Field>
                <Field label="Terms & conditions (one per line, max 10)" className="span-all">
                  <textarea
                    className="textarea"
                    rows={9}
                    value={inv.terms.join('\n')}
                    onChange={(e) => set('invoice', { terms: e.target.value.split('\n').slice(0, 10) })}
                  />
                </Field>
              </div>
              <div className="alert info">
                <Printer size={16} />
                <div className="grow">
                  For exact printing: in the print dialog choose <b>A4</b>, <b>Portrait</b>, margins <b>None</b>, scale <b>100%</b>, turn <b>Background graphics</b> on and <b>Headers and footers</b> off.
                </div>
                <Link className="btn btn-sm" to="/print-sample">Print alignment test</Link>
              </div>
            </div>
          )}

          {tab === 'tax' && (
            <div className="stack">
              <div className="form-grid">
                <Field label="CGST %"><input className="input num" inputMode="decimal" value={tax.cgstRate} onChange={(e) => set('tax', { cgstRate: e.target.value })} /></Field>
                <Field label="SGST %"><input className="input num" inputMode="decimal" value={tax.sgstRate} onChange={(e) => set('tax', { sgstRate: e.target.value })} /></Field>
                <Field label="IGST %"><input className="input num" inputMode="decimal" value={tax.igstRate} onChange={(e) => set('tax', { igstRate: e.target.value })} /></Field>
                <Field label="Round-off">
                  <select className="select" value={tax.roundOff} onChange={(e) => set('tax', { roundOff: e.target.value })}>
                    {Object.entries(ROUND_OFF_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </Field>
              </div>
              <div className="stack">
                <label className="checkbox"><input type="checkbox" checked={tax.includeMakingInTaxable} onChange={(e) => set('tax', { includeMakingInTaxable: e.target.checked })} /> Include making charges in GST taxable value</label>
                <label className="checkbox"><input type="checkbox" checked={tax.includeAdditionalInTaxable} onChange={(e) => set('tax', { includeAdditionalInTaxable: e.target.checked })} /> Include additional (stone/other) charges in GST taxable value</label>
              </div>
              <div className="alert warning small">
                Defaults (CGST 1.5% + SGST 1.5%, IGST 3%) are taken from the reference invoice. Tax treatment of jewellery, making charges, old-gold exchange and other components must be confirmed with your accountant. Intra-/inter-state is decided from the shop state and the invoice’s place of supply and can be overridden per invoice.
              </div>
            </div>
          )}

          {tab === 'jewellery' && (
            <div className="stack">
              <div className="form-grid">
                <Field label="Default metal">
                  <select className="select" value={j.defaultMetal} onChange={(e) => set('jewellery', { defaultMetal: e.target.value })}>
                    {METALS.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </Field>
                <Field label="Default purity">
                  <select className="select" value={j.defaultPurity} onChange={(e) => set('jewellery', { defaultPurity: e.target.value })}>
                    {j.purities.map((p) => <option key={p.label}>{p.label}</option>)}
                  </select>
                </Field>
                <Field label="Default HSN/SAC"><input className="input" value={j.defaultHsn} onChange={(e) => set('jewellery', { defaultHsn: e.target.value })} /></Field>
                <Field label="Default making method">
                  <select className="select" value={j.defaultMakingType} onChange={(e) => set('jewellery', { defaultMakingType: e.target.value })}>
                    {Object.entries(MAKING_TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </Field>
                <Field label="Default making value"><input className="input num" inputMode="decimal" value={j.defaultMakingValue} onChange={(e) => set('jewellery', { defaultMakingValue: e.target.value })} /></Field>
                <Field label="Default additional-charge method">
                  <select className="select" value={j.defaultAdditionalType} onChange={(e) => set('jewellery', { defaultAdditionalType: e.target.value })}>
                    {Object.entries(ADDITIONAL_TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </Field>
              </div>
              <div>
                <h3 style={{ marginBottom: 8 }}>Purity master</h3>
                <p className="small muted" style={{ marginBottom: 8 }}>Karat label and fineness are separate: “22K” prints as fineness 91.60 on the invoice.</p>
                <table className="table" style={{ maxWidth: 620 }}>
                  <thead><tr><th>Label</th><th>Metal</th><th>Fineness (%)</th><th /></tr></thead>
                  <tbody>
                    {j.purities.map((p, i) => (
                      <tr key={i}>
                        <td><input className="input" value={p.label} onChange={(e) => set('jewellery', { purities: j.purities.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)) })} /></td>
                        <td>
                          <select className="select" value={p.metal} onChange={(e) => set('jewellery', { purities: j.purities.map((x, k) => (k === i ? { ...x, metal: e.target.value } : x)) })}>
                            {METALS.map((m) => <option key={m}>{m}</option>)}
                          </select>
                        </td>
                        <td><input className="input num" value={p.fineness} onChange={(e) => set('jewellery', { purities: j.purities.map((x, k) => (k === i ? { ...x, fineness: e.target.value } : x)) })} /></td>
                        <td className="actions">
                          <button className="btn btn-sm btn-icon btn-danger" disabled={j.purities.filter((x) => x.metal === p.metal).length <= 1} onClick={() => set('jewellery', { purities: j.purities.filter((_, k) => k !== i) })}><Trash2 size={13} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button className="btn btn-sm" style={{ marginTop: 8 }} onClick={() => set('jewellery', { purities: [...j.purities, { label: '', metal: 'Gold', fineness: '' }] })}>
                  <Plus size={13} /> Add purity
                </button>
              </div>
            </div>
          )}

          {tab === 'data' && (
            <div className="stack">
              <div className="alert info">
                <Database size={16} />
                <div>
                  {dataMode === 'firebase'
                    ? 'Connected to Firebase Firestore. Data is shared across devices that use the same Firebase project.'
                    : 'Demo mode: data is saved only in this browser on this computer. Clearing browser data will erase it. Add Firebase credentials in .env.local (see README) for permanent multi-device storage.'}
                </div>
              </div>
              {dataMode === 'demo' && (
                <div className="row wrap">
                  <button className="btn" onClick={exportBackup}><Download size={15} /> Download backup (JSON)</button>
                  <label className="btn"><Upload size={15} /> Restore backup<input type="file" accept="application/json" hidden onChange={importBackup} /></label>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
