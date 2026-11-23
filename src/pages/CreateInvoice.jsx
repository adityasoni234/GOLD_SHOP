import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { Plus, Save, CheckCircle2, Eye, FileText, StickyNote, Wallet, RefreshCw, AlertTriangle, RotateCcw } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../components/common/Toast.jsx';
import PageHeader from '../components/common/PageHeader.jsx';
import Field from '../components/common/Field.jsx';
import Modal from '../components/common/Modal.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import CustomerSection from '../components/invoice/CustomerSection.jsx';
import ItemRow from '../components/invoice/ItemRow.jsx';
import TotalsPanel from '../components/invoice/TotalsPanel.jsx';
import FinalizeDialog from '../components/invoice/FinalizeDialog.jsx';
import PaymentEntries from '../components/payments/PaymentEntries.jsx';
import OldMetalSection from '../components/invoice/OldMetalSection.jsx';
import { emptyOldMetal } from '../utils/calculations.js';
import A4Preview from '../invoice/A4Preview.jsx';
import { emptyForm, emptyItem, formFromInvoice } from '../components/invoice/formUtils.js';
import { buildRecord, computeForm } from '../services/invoiceService.js';
import { validateInvoice } from '../utils/validators.js';
import { computeNextInvoiceNumber } from '../utils/invoiceNumber.js';
import { parseScaled, SCALE } from '../utils/decimal.js';
import { uid } from '../utils/misc.js';
import { INDIAN_STATES, stateCodeFor, NOTE_PRESETS, MAX_ITEMS_PER_INVOICE, INVOICE_STATUS } from '../constants/index.js';
import '../components/invoice/invoice-form.css';

const WORKING_KEY = 'abs-billing:working-invoice';

function loadWorkingCopy() {
  try {
    const raw = localStorage.getItem(WORKING_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function CreateInvoice() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const app = useApp();
  const { settings, invoices, customers, products, getTodayRate } = app;

  const existing = id ? invoices.find((i) => i.id === id) : null;
  const mode = !id ? 'new' : existing?.status === INVOICE_STATUS.DRAFT ? 'draft' : 'revise';
  const fromId = params.get('from');

  const [restored, setRestored] = useState(false);
  const [initial] = useState(() => {
    if (id && existing) return { form: formFromInvoice(existing), payments: [] };
    if (fromId) {
      const src = invoices.find((i) => i.id === fromId);
      if (src) return { form: formFromInvoice(src, { duplicate: true }), payments: [] };
    }
    const saved = !id && loadWorkingCopy();
    if (saved?.form?.items?.length) return { ...saved, form: { oldMetal: emptyOldMetal(), ...saved.form }, restored: true };
    return { form: emptyForm(settings, getTodayRate), payments: [] };
  });
  const [form, setForm] = useState(initial.form);
  const [paymentEntries, setPaymentEntries] = useState(initial.payments || []);
  const [showErrors, setShowErrors] = useState(false);
  const [dialog, setDialog] = useState(null); // 'finalize' | 'preview' | 'reason'
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  useEffect(() => setRestored(!!initial.restored), [initial]);

  // Preserve unsaved work for new invoices when navigating away.
  useEffect(() => {
    if (mode !== 'new') return;
    try {
      localStorage.setItem(WORKING_KEY, JSON.stringify({ form, payments: paymentEntries }));
    } catch {
      /* storage full or unavailable: ignore */
    }
  }, [form, paymentEntries, mode]);

  const revising = mode === 'revise' && !!existing;
  const taxConfig = revising ? existing.taxConfig : settings.tax;
  const shopStateCode = revising ? existing.shop.business.stateCode : settings.business.stateCode;
  const computed = useMemo(() => computeForm(form, taxConfig, shopStateCode), [form, taxConfig, shopStateCode]);
  const errors = useMemo(() => validateInvoice(form, computed, { invoices }), [form, computed, invoices]);

  const payments = useMemo(
    () =>
      paymentEntries
        .map((p) => ({ ...p, amountPaise: parseScaled(p.amount, SCALE.MONEY) }))
        .filter((p) => Number.isFinite(p.amountPaise) && p.amountPaise > 0),
    [paymentEntries],
  );
  const paidPaise = payments.reduce((a, p) => a + p.amountPaise, 0);
  const paymentErrors = paymentEntries.some((p) => String(p.amount).trim() && !(parseScaled(p.amount, SCALE.MONEY) >= 0))
    ? ['A payment amount is invalid.']
    : [];
  const allErrors = [...errors, ...paymentErrors];

  const nextNumber = useMemo(
    () =>
      computeNextInvoiceNumber({
        startNumber: settings.invoice.startNumber,
        existingNumbers: invoices.map((i) => i.number),
      }),
    [settings.invoice.startNumber, invoices],
  );

  // ------------------------------------------------------------ item actions
  // Focus the new row's gross-weight field right after it renders.
  const pendingFocus = useRef(null);
  useEffect(() => {
    if (pendingFocus.current === null) return;
    document.querySelector(`[data-autofocus="${pendingFocus.current}"]`)?.focus();
    pendingFocus.current = null;
  }, [form.items.length]);

  const addItem = useCallback(() => {
    setForm((f) => {
      if (f.items.length >= MAX_ITEMS_PER_INVOICE) return f;
      const last = f.items[f.items.length - 1];
      const fresh = emptyItem(settings, getTodayRate);
      // carry over metal/purity/making from the previous row for faster entry
      const item = last
        ? { ...fresh, metal: last.metal, purity: last.purity, fineness: last.fineness, category: last.category, description: last.description, descriptionAuto: last.descriptionAuto, makingType: last.makingType, makingValue: last.makingValue, hsn: last.hsn, rate: last.rateManual ? fresh.rate : getTodayRate(last.metal, last.purity)?.rate || last.rate }
        : fresh;
      pendingFocus.current = f.items.length;
      return { ...f, items: [...f.items, item] };
    });
  }, [settings, getTodayRate]);

  const updateItem = (index, item) => setForm((f) => ({ ...f, items: f.items.map((it, i) => (i === index ? item : it)) }));
  const removeItem = (index) => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== index) }));
  const duplicateItem = (index) =>
    setForm((f) => {
      if (f.items.length >= MAX_ITEMS_PER_INVOICE) return f;
      const copy = { ...f.items[index], id: uid('itm_'), huid: '' };
      const items = [...f.items];
      items.splice(index + 1, 0, copy);
      return { ...f, items };
    });

  const applyTodayRates = () => {
    let missing = 0;
    setForm((f) => ({
      ...f,
      items: f.items.map((it) => {
        const r = getTodayRate(it.metal, it.purity);
        if (!r) {
          missing += 1;
          return it;
        }
        return { ...it, rate: r.rate, rateManual: false };
      }),
    }));
    setTimeout(() => toast(missing ? `${missing} item(s) have no rate set for their purity.` : 'Today’s rates applied.', missing ? 'error' : 'success'), 0);
  };

  // ------------------------------------------------------------ save actions
  const saveDraft = async () => {
    if (mode === 'revise' || busyRef.current) return;
    if (!form.customer.name.trim()) {
      toast('Enter the customer name before saving a draft.', 'error');
      return;
    }
    busyRef.current = true;
    setBusy(true);
    try {
      const saved = await app.saveDraft(form);
      localStorage.removeItem(WORKING_KEY);
      toast('Draft saved.', 'success');
      if (mode === 'new') navigate(`/invoices/${saved.id}/edit`, { replace: true });
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const requestFinalize = () => {
    setShowErrors(true);
    if (allErrors.length) {
      toast(`Please fix ${allErrors.length} issue(s) before saving.`, 'error');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setDialog('finalize');
  };

  const confirmFinalize = async (reason) => {
    if (busyRef.current) return; // guard against double submit
    busyRef.current = true;
    setBusy(true);
    try {
      if (mode === 'revise') {
        const saved = await app.reviseInvoice(form, reason);
        toast(`Invoice ${saved.invoiceNo} revised.`, 'success');
        navigate(`/invoices/${saved.id}`);
      } else {
        const inv = await app.finalizeInvoice(form, payments);
        localStorage.removeItem(WORKING_KEY);
        toast(`Invoice ${inv.invoiceNo} saved.`, 'success');
        navigate(`/invoices/${inv.id}`, { state: { justCreated: true } });
      }
    } catch (err) {
      toast(err.message, 'error');
      busyRef.current = false;
      setBusy(false);
      throw err;
    }
  };

  const discardWorkingCopy = () => {
    localStorage.removeItem(WORKING_KEY);
    setForm(emptyForm(settings, getTodayRate));
    setPaymentEntries([]);
    setRestored(false);
    setShowErrors(false);
  };

  // ------------------------------------------------------------ keyboard
  useEffect(() => {
    const onKey = (e) => {
      if (dialog) return;
      const mod = e.ctrlKey || e.metaKey;
      if (e.altKey && e.code === 'KeyN') {
        e.preventDefault();
        addItem();
      } else if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveDraft();
      } else if (mod && e.key === 'Enter') {
        e.preventDefault();
        requestFinalize();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (id && !existing) {
    return (
      <div className="alert danger">
        Invoice not found. <Link to="/invoices">Back to invoices</Link>
      </div>
    );
  }
  if (existing?.status === INVOICE_STATUS.CANCELLED) {
    return <div className="alert danger">Cancelled invoices cannot be edited.</div>;
  }

  const previewRecord = dialog === 'preview' ? buildRecord(form, { settings, existing, status: mode === 'revise' ? existing.status : INVOICE_STATUS.DRAFT }) : null;
  if (previewRecord && mode === 'revise') previewRecord.invoiceNo = existing.invoiceNo;
  const noRates = !app.goldRates.length && !app.silverRates.length;
  const verification = settings.verification;
  const unverified = !verification.gstin || !verification.ifsc || !verification.taxRates;

  const title =
    mode === 'revise' ? `Edit invoice ${existing.invoiceNo}` : mode === 'draft' ? 'Draft invoice' : 'Create new invoice';

  return (
    <>
      <PageHeader
        title={title}
        subtitle={
          mode === 'revise'
            ? 'Changes are saved as a new revision; the previous version is kept in the audit trail.'
            : <>Shortcuts: <kbd>Alt</kbd>+<kbd>N</kbd> add item · <kbd>Ctrl</kbd>+<kbd>S</kbd> save draft · <kbd>Ctrl</kbd>+<kbd>Enter</kbd> finalize</>
        }
        actions={
          <div className="sticky-actions">
            <button className="btn" onClick={() => setDialog('preview')}><Eye size={15} /> Preview invoice</button>
            {mode !== 'revise' && (
              <button className="btn" onClick={saveDraft} disabled={busy}><Save size={15} /> Save draft</button>
            )}
            <button className="btn btn-primary" onClick={requestFinalize} disabled={busy}>
              <CheckCircle2 size={15} /> {mode === 'revise' ? 'Save revision' : 'Save & finalize'}
            </button>
          </div>
        }
      />

      <div className="stack" style={{ marginBottom: 16 }}>
        {restored && (
          <div className="alert info">
            <RotateCcw size={16} />
            <div className="grow">Restored the invoice you were working on.</div>
            <button className="btn btn-sm" onClick={discardWorkingCopy}>Discard &amp; start fresh</button>
          </div>
        )}
        {mode !== 'revise' && unverified && (
          <div className="alert warning">
            <AlertTriangle size={16} />
            <div>Shop GSTIN, IFSC and GST rates have not been marked as verified. <Link to="/settings">Verify in Settings</Link> before issuing live tax invoices.</div>
          </div>
        )}
        {mode !== 'revise' && noRates && (
          <div className="alert warning">
            <AlertTriangle size={16} />
            <div>No gold/silver rates entered yet. <Link to="/rates">Enter today’s rates</Link> or type a rate on each item.</div>
          </div>
        )}
        {showErrors && allErrors.length > 0 && (
          <div className="alert danger">
            <AlertTriangle size={16} />
            <div>
              <b>Please fix the following:</b>
              <ul>{allErrors.slice(0, 12).map((e, i) => <li key={i}>{e}</li>)}</ul>
            </div>
          </div>
        )}
      </div>

      <div className="inv-form-layout">
        <div className="inv-form-main">
          {/* Invoice details */}
          <div className="card">
            <div className="card-header"><h3><FileText size={16} /> Invoice details</h3></div>
            <div className="card-body">
              <div className="form-grid">
                <Field label="Invoice no." hint={mode === 'revise' ? 'Cannot be changed' : 'Assigned automatically on finalize'}>
                  <input className="input" readOnly value={mode === 'revise' ? existing.invoiceNo : `${settings.invoice.prefix || ''}${nextNumber} (next)`} />
                </Field>
                <Field label="Invoice date" required>
                  <input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </Field>
                <Field label="Place of supply">
                  <select
                    className="select"
                    value={form.placeOfSupply}
                    onChange={(e) => setForm({ ...form, placeOfSupply: e.target.value, placeOfSupplyCode: stateCodeFor(e.target.value) })}
                  >
                    {INDIAN_STATES.map((s) => <option key={s.code} value={s.name}>{s.name} ({s.code})</option>)}
                  </select>
                </Field>
                <Field label="Tax treatment" hint={computed.taxMode === 'inter' ? 'IGST will be charged' : 'CGST + SGST will be charged'}>
                  <select className="select" value={form.taxModeOverride} onChange={(e) => setForm({ ...form, taxModeOverride: e.target.value })}>
                    <option value="auto">Automatic (from place of supply)</option>
                    <option value="intra">Intra-state: CGST + SGST</option>
                    <option value="inter">Inter-state: IGST</option>
                  </select>
                </Field>
                <Field label="Order reference">
                  <div className="segmented">
                    {['Yes', 'No'].map((v) => (
                      <button type="button" key={v} className={form.orderReference === v ? 'active' : ''} onClick={() => setForm({ ...form, orderReference: v })}>{v}</button>
                    ))}
                  </div>
                </Field>
                <Field label="E-Way bill date & time">
                  <input className="input" type="datetime-local" value={form.ewayBillDateTime} onChange={(e) => setForm({ ...form, ewayBillDateTime: e.target.value })} />
                </Field>
              </div>
            </div>
          </div>

          <CustomerSection
            form={form}
            setForm={setForm}
            customers={customers}
            errors={showErrors && !form.customer.name.trim() ? { name: 'Customer name cannot be empty' } : {}}
          />

          {/* Items */}
          <div className="card">
            <div className="card-header">
              <h3>Jewellery items <span className="badge neutral">{form.items.length}/{MAX_ITEMS_PER_INVOICE}</span></h3>
              <div className="row">
                <button type="button" className="btn btn-sm" onClick={applyTodayRates} title="Replace item rates with today's saved rates">
                  <RefreshCw size={13} /> Apply today’s rates
                </button>
              </div>
            </div>
            <div className="card-body">
              {form.items.map((item, i) => (
                <ItemRow
                  key={item.id}
                  index={i}
                  item={item}
                  line={computed.lines[i]}
                  settings={settings}
                  products={products}
                  getTodayRate={getTodayRate}
                  onChange={(it) => updateItem(i, it)}
                  onRemove={() => removeItem(i)}
                  onDuplicate={() => duplicateItem(i)}
                  canRemove={form.items.length > 1}
                  showErrors={showErrors}
                />
              ))}
              <button
                type="button"
                className="btn btn-gold"
                style={{ marginTop: 12 }}
                onClick={addItem}
                disabled={form.items.length >= MAX_ITEMS_PER_INVOICE}
              >
                <Plus size={15} /> Add item <kbd style={{ marginLeft: 4 }}>Alt+N</kbd>
              </button>
              {form.items.length >= MAX_ITEMS_PER_INVOICE && (
                <div className="field-hint" style={{ marginTop: 6 }}>Maximum {MAX_ITEMS_PER_INVOICE} items fit on one A4 invoice. Create a second invoice for more items.</div>
              )}
            </div>
          </div>

          <OldMetalSection
            oldMetal={form.oldMetal || emptyOldMetal()}
            setOldMetal={(oldMetal) => setForm((f) => ({ ...f, oldMetal }))}
            computedLines={computed.oldMetal}
          />

          {/* Notes */}
          <div className="card">
            <div className="card-header"><h3><StickyNote size={16} /> Transaction notes</h3><span className="small muted">Printed under the amount in words</span></div>
            <div className="card-body stack">
              <div className="row wrap">
                {NOTE_PRESETS.map((n) => (
                  <button
                    type="button"
                    key={n}
                    className="chip"
                    onClick={() => setForm((f) => ({ ...f, notes: f.notes ? `${f.notes}, ${n}` : n }))}
                  >
                    + {n}
                  </button>
                ))}
              </div>
              <textarea className="textarea" maxLength={120} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. Old Gold & Silver Purchase" />
              <span className="field-hint">{form.notes.length}/120 characters (one printed line)</span>
            </div>
          </div>

          {/* Payment at billing time */}
          {mode !== 'revise' ? (
            <div className="card">
              <div className="card-header"><h3><Wallet size={16} /> Payment received</h3><span className="small muted">Optional · does not affect GST</span></div>
              <div className="card-body">
                <PaymentEntries entries={paymentEntries} setEntries={setPaymentEntries} remainingPaise={Math.max(computed.grossPaise - paidPaise, 0)} />
              </div>
            </div>
          ) : (
            <div className="alert info">Payments for this invoice are managed from the invoice page.</div>
          )}
        </div>

        <aside className="inv-side">
          <TotalsPanel computed={computed} paidPaise={mode === 'revise' ? 0 : paidPaise} />
          <button className="btn btn-primary btn-lg" onClick={requestFinalize} disabled={busy}>
            <CheckCircle2 size={16} /> {mode === 'revise' ? 'Save revision' : 'Save & finalize invoice'}
          </button>
          <button className="btn" onClick={() => setDialog('preview')}><Eye size={15} /> Preview A4 invoice</button>
        </aside>
      </div>

      {dialog === 'finalize' && (
        <FinalizeDialog
          form={form}
          computed={computed}
          payments={mode === 'revise' ? [] : payments}
          nextNumber={mode === 'revise' ? null : `${settings.invoice.prefix || ''}${nextNumber}`}
          mode={mode === 'revise' ? 'revise' : 'final'}
          busy={busy}
          onClose={() => setDialog(null)}
          onConfirm={() => (mode === 'revise' ? setDialog('reason') : confirmFinalize().catch(() => {}))}
        />
      )}
      {dialog === 'reason' && (
        <ConfirmDialog
          title={`Revise invoice ${existing.invoiceNo}`}
          message="Finalized invoices are never silently overwritten. The current version will be stored in the audit trail."
          requireReason
          reasonLabel="Reason for editing"
          confirmLabel="Save revision"
          onConfirm={confirmFinalize}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'preview' && previewRecord && (
        <Modal size="xwide" title="Invoice preview (A4)" onClose={() => setDialog(null)}
          footer={
            <>
              <button className="btn" onClick={() => setDialog(null)}>Back to editing</button>
              <button className="btn btn-primary" onClick={() => { setDialog(null); requestFinalize(); }}>
                <CheckCircle2 size={15} /> {mode === 'revise' ? 'Save revision' : 'Finalize to print'}
              </button>
            </>
          }
        >
          <div className="preview-modal-body">
            <A4Preview invoice={previewRecord} print={settings.invoice} logoDataUrl={settings.business.logoDataUrl} />
          </div>
        </Modal>
      )}
    </>
  );
}
