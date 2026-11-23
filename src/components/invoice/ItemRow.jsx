import { useState } from 'react';
import { Copy, Trash2, Calculator } from 'lucide-react';
import { JEWELLERY_CATEGORIES, METALS } from '../../constants/index.js';
import { MAKING_TYPES } from '../../utils/calculations.js';
import { formatINR, formatWeight } from '../../utils/currency.js';
import { formatScaled, toScaled, SCALE } from '../../utils/decimal.js';
import { formatDateTime } from '../../utils/dateUtils.js';
import { purityInfo, puritiesFor, autoDescription } from './formUtils.js';

/** One jewellery line of the invoice form. */
export default function ItemRow({ index, item, line, settings, products, getTodayRate, onChange, onRemove, onDuplicate, canRemove, showErrors }) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const err = showErrors ? line.errors : {};
  const today = getTodayRate(item.metal, item.purity);

  const set = (patch) => onChange({ ...item, ...patch });

  const withRate = (next) => {
    if (next.rateManual) return next;
    const r = getTodayRate(next.metal, next.purity);
    return { ...next, rate: r?.rate || '' };
  };

  const withDescription = (next) =>
    next.descriptionAuto ? { ...next, description: autoDescription(next.category, next.purity) } : next;

  const changeMetal = (metal) => {
    const purity = puritiesFor(settings, metal)[0]?.label || '';
    const category = metal === 'Silver' && item.category !== 'Silver Jewellery' ? 'Silver Jewellery' : item.category;
    onChange(withDescription(withRate({ ...item, metal, purity, category, fineness: purityInfo(settings, purity)?.fineness || '' })));
  };

  const changePurity = (purity) =>
    onChange(withDescription(withRate({ ...item, purity, fineness: purityInfo(settings, purity)?.fineness || item.fineness })));

  /** Typed product name. If it exactly matches a saved product, fill that product's details. */
  const changeName = (name) => {
    const match = products.find((x) => x.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (match && match.id !== item.productId) return applyProduct(match, name);
    return set({ description: name, descriptionAuto: false, productId: match ? item.productId : '' });
  };

  const applyProduct = (p, typedName) => {
    onChange(
      withRate({
        ...item,
        productId: p.id,
        category: p.category,
        metal: p.metal,
        purity: p.purity,
        fineness: purityInfo(settings, p.purity)?.fineness || item.fineness,
        hsn: p.hsn || item.hsn,
        huid: p.huid || item.huid,
        description: typedName ?? p.name,
        descriptionAuto: false,
        makingType: p.makingType || item.makingType,
        makingValue: p.makingValue !== '' && p.makingValue != null ? p.makingValue : item.makingValue,
        additionalType: p.additionalType || item.additionalType,
        additionalValue: p.additionalValue !== '' && p.additionalValue != null ? p.additionalValue : item.additionalValue,
      }),
    );
  };

  const computedNet = formatScaled(
    toScaled(item.grossWt, SCALE.WEIGHT) - toScaled(item.stoneWt, SCALE.WEIGHT),
    SCALE.WEIGHT,
  );

  const hasError = showErrors && !line.valid;

  return (
    <div className={`item-card ${hasError ? 'has-error' : ''}`} data-item-index={index}>
      <div className="item-card-head">
        <span className="item-no">{index + 1}</span>
        <span className="small muted">
          {item.metal} · {item.purity} · net {formatWeight(line.netMg)} g
        </span>
        <span className="total">₹{formatINR(line.totalPaise)}</span>
        <button type="button" className="btn btn-ghost btn-icon" title="Show calculation" onClick={() => setShowBreakdown((s) => !s)}>
          <Calculator size={15} />
        </button>
        <button type="button" className="btn btn-ghost btn-icon" title="Duplicate item" onClick={onDuplicate}>
          <Copy size={15} />
        </button>
        <button type="button" className="btn btn-ghost btn-icon" title="Remove item" onClick={onRemove} disabled={!canRemove}>
          <Trash2 size={15} color={canRemove ? 'var(--danger)' : undefined} />
        </button>
      </div>

      <div className="item-grid a">
        <div className="field desc-field">
          <label>Product name</label>
          <input
            className={`input ${err.description ? 'invalid' : ''}`}
            value={item.description}
            placeholder="e.g. Necklace Set 22k"
            onChange={(e) => changeName(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Category</label>
          <select className="select" value={item.category} onChange={(e) => onChange(withDescription({ ...item, category: e.target.value }))}>
            {JEWELLERY_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Metal</label>
          <select className="select" value={item.metal} onChange={(e) => changeMetal(e.target.value)}>
            {METALS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Purity</label>
          <select className="select" value={item.purity} onChange={(e) => changePurity(e.target.value)} title={`Fineness ${item.fineness}`}>
            {puritiesFor(settings, item.metal).map((p) => (
              <option key={p.label} value={p.label}>{p.label} ({p.fineness})</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>HSN/SAC</label>
          <input className="input" value={item.hsn} onChange={(e) => set({ hsn: e.target.value })} />
        </div>
        <div className="field">
          <label>HUID</label>
          <input className="input" value={item.huid} maxLength={20} onChange={(e) => set({ huid: e.target.value.toUpperCase() })} />
        </div>
      </div>

      <div className="item-grid b">
        <div className="field">
          <label>PC</label>
          <input className={`input num ${err.pcs ? 'invalid' : ''}`} inputMode="numeric" value={item.pcs} onChange={(e) => set({ pcs: e.target.value })} />
        </div>
        <div className="field">
          <label>Gross wt (g)</label>
          <input
            className={`input num ${err.grossWt ? 'invalid' : ''}`}
            inputMode="decimal"
            placeholder="0.000"
            value={item.grossWt}
            onChange={(e) => set({ grossWt: e.target.value })}
            data-autofocus={index}
          />
        </div>
        <div className="field">
          <label>Stone wt (g)</label>
          <input className={`input num ${err.stoneWt ? 'invalid' : ''}`} inputMode="decimal" placeholder="0.000" value={item.stoneWt} onChange={(e) => set({ stoneWt: e.target.value })} />
        </div>
        <div className="field">
          <label style={{ display: 'flex', justifyContent: 'space-between' }}>
            Net wt (g)
            <span className="checkbox" style={{ fontSize: 10.5, textTransform: 'none', letterSpacing: 0 }}>
              <input
                type="checkbox"
                tabIndex={-1}
                checked={!!item.netManual}
                onChange={(e) => set({ netManual: e.target.checked, netWt: e.target.checked ? computedNet : '' })}
              />
              manual
            </span>
          </label>
          <input
            className={`input num ${err.netWt ? 'invalid' : ''}`}
            inputMode="decimal"
            value={item.netManual ? item.netWt : item.grossWt ? computedNet : ''}
            readOnly={!item.netManual}
            tabIndex={item.netManual ? 0 : -1}
            onChange={(e) => set({ netWt: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Rate ₹/g</label>
          <input
            className={`input num ${err.rate ? 'invalid' : ''}`}
            inputMode="decimal"
            value={item.rate}
            onChange={(e) => set({ rate: e.target.value, rateManual: true })}
          />
          <span className="rate-hint">
            {item.rateManual ? (
              <>
                Manual
                {today && (
                  <button type="button" tabIndex={-1} onClick={() => set({ rate: today.rate, rateManual: false })}>
                    use today’s ₹{formatINR(toScaled(today.rate, SCALE.MONEY))}
                  </button>
                )}
              </>
            ) : today && toScaled(today.rate, SCALE.MONEY) === toScaled(item.rate, SCALE.MONEY) ? (
              <span title={`Set ${formatDateTime(today.effectiveAt)}`}>Today’s rate</span>
            ) : today && item.rate ? (
              <>
                Billed rate
                <button type="button" tabIndex={-1} onClick={() => set({ rate: today.rate, rateManual: false })}>
                  today ₹{formatINR(toScaled(today.rate, SCALE.MONEY))}
                </button>
              </>
            ) : (
              <span style={{ color: 'var(--warning)' }}>No rate set for {item.purity}</span>
            )}
          </span>
        </div>
        <div className="field">
          <label>Making</label>
          <div className="input-group">
            <select className="select" value={item.makingType} tabIndex={-1} onChange={(e) => set({ makingType: e.target.value })}>
              <option value={MAKING_TYPES.PERCENT}>%</option>
              <option value={MAKING_TYPES.PER_GRAM}>₹/g</option>
              <option value={MAKING_TYPES.FIXED}>₹ fixed</option>
            </select>
            <input className={`input num ${err.makingValue ? 'invalid' : ''}`} inputMode="decimal" value={item.makingValue} onChange={(e) => set({ makingValue: e.target.value })} />
          </div>
          <span className="rate-hint">= ₹{formatINR(line.makingPaise)}</span>
        </div>
        <div className="field">
          <label>Col. St &amp; Ot. Chg.</label>
          <div className="input-group">
            <select className="select" value={item.additionalType} tabIndex={-1} onChange={(e) => set({ additionalType: e.target.value })}>
              <option value="fixed">₹ fixed</option>
              <option value="perGram">₹/g</option>
              <option value="perPiece">₹/pc</option>
            </select>
            <input className={`input num ${err.additionalValue ? 'invalid' : ''}`} inputMode="decimal" value={item.additionalValue} onChange={(e) => set({ additionalValue: e.target.value })} />
          </div>
          <span className="rate-hint">= ₹{formatINR(line.additionalPaise)}</span>
        </div>
      </div>

      {showErrors && !line.valid && (
        <div className="field-error" style={{ padding: '0 10px 8px' }}>{Object.values(line.errors).join(' · ')}</div>
      )}
      {showBreakdown && (
        <div className="breakdown">
          {line.breakdown.map((b, i) => <div key={i}>{b}</div>)}
        </div>
      )}
    </div>
  );
}
