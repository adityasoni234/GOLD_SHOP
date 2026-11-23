import { Scale } from 'lucide-react';
import { OLD_METALS } from '../../utils/calculations.js';
import { formatINR, paiseToPlain } from '../../utils/currency.js';

/**
 * Old gold / old silver received from (or added for) the customer.
 * Applied after GST: it changes the amount payable, never the taxable value.
 */
export default function OldMetalSection({ oldMetal, setOldMetal, computedLines }) {
  // functional update so quick successive edits never overwrite each other
  const update = (key, patch) => setOldMetal((om) => ({ ...om, [key]: { ...om[key], ...patch } }));

  return (
    <div className="card">
      <div className="card-header">
        <h3><Scale size={16} /> Old gold / old silver</h3>
        <span className="small muted">Printed after GST · cut off or add on the bill</span>
      </div>
      <div className="card-body">
        {OLD_METALS.map(({ key, label }) => {
          const e = oldMetal[key];
          const line = computedLines.find((l) => l.key === key) || {};
          return (
            <div className="old-metal-row" key={key}>
              <div className="strong old-metal-label">{label}</div>
              <div className="field">
                <label>Cut off / Add on</label>
                <div className="segmented">
                  <button type="button" className={e.direction !== 'add' ? 'active' : ''} onClick={() => update(key, { direction: 'less' })}>− Cut off</button>
                  <button type="button" className={e.direction === 'add' ? 'active' : ''} onClick={() => update(key, { direction: 'add' })}>+ Add on</button>
                </div>
              </div>
              <div className="field">
                <label>Weight (g)</label>
                <input className="input num" inputMode="decimal" placeholder="0.000" value={e.weight} onChange={(ev) => update(key, { weight: ev.target.value })} />
              </div>
              <div className="field">
                <label>Rate ₹/g</label>
                <input className="input num" inputMode="decimal" placeholder="0.00" value={e.rate} onChange={(ev) => update(key, { rate: ev.target.value })} />
              </div>
              <div className="field">
                <label>Amount ₹</label>
                <input
                  className="input num"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={line.computed ? paiseToPlain(line.amountPaise) : e.amount}
                  readOnly={line.computed}
                  tabIndex={line.computed ? -1 : 0}
                  title={line.computed ? 'Weight × rate' : 'Enter the amount directly, or fill weight and rate'}
                  onChange={(ev) => update(key, { amount: ev.target.value })}
                />
              </div>
              <div className={`old-metal-effect ${line.amountPaise ? (line.direction === 'add' ? 'add' : 'less') : ''}`}>
                {line.amountPaise ? `${line.direction === 'add' ? '+' : '−'} ₹${formatINR(line.amountPaise)}` : '—'}
              </div>
            </div>
          );
        })}
        <div className="field-hint" style={{ marginTop: 8 }}>
          Fill weight and rate to calculate the amount, or type the amount directly. GST is still charged on the full jewellery value.
        </div>
      </div>
    </div>
  );
}
