import Modal from '../common/Modal.jsx';
import { formatINR, formatWeight, formatPercent } from '../../utils/currency.js';
import { amountToIndianWords } from '../../utils/numberToWords.js';
import { formatDate } from '../../utils/dateUtils.js';

/** Final calculation summary shown before an invoice is saved. */
export default function FinalizeDialog({ form, computed, payments, nextNumber, mode, busy, onConfirm, onClose }) {
  const t = computed;
  const paid = payments.reduce((a, p) => a + p.amountPaise, 0);
  const intra = t.taxMode !== 'inter';
  const isRevision = mode === 'revise';
  return (
    <Modal
      size="wide"
      title={isRevision ? 'Confirm revised invoice' : 'Confirm & finalize invoice'}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={busy}>Back to editing</button>
          <button className="btn btn-primary btn-lg" onClick={onConfirm} disabled={busy} autoFocus>
            {busy ? 'Saving…' : isRevision ? 'Save revision' : `Finalize invoice ${nextNumber ? `#${nextNumber}` : ''}`}
          </button>
        </>
      }
    >
      <div className="stack">
        <div className="spread">
          <div>
            <div className="strong" style={{ fontSize: 16 }}>{form.customer.name}</div>
            <div className="small muted">{[form.customer.phone, form.customer.address, form.customer.city].filter(Boolean).join(' · ')}</div>
          </div>
          <div className="right small">
            <div>Date: <b>{formatDate(form.date)}</b></div>
            <div>{intra ? 'Intra-state (CGST + SGST)' : 'Inter-state (IGST)'} · Place of supply {form.placeOfSupply}</div>
          </div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>#</th><th>Description</th><th>Purity</th><th className="num">Net wt</th><th className="num">Rate</th>
                <th className="num">Metal</th><th className="num">Making</th><th className="num">Addl.</th><th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {form.items.map((it, i) => {
                const l = t.lines[i];
                return (
                  <tr key={it.id}>
                    <td>{i + 1}</td><td>{it.metal} {it.description}</td><td>{it.purity}</td>
                    <td className="num">{formatWeight(l.netMg)}</td><td className="num">{formatINR(l.ratePaise)}</td>
                    <td className="num">{formatINR(l.metalPaise)}</td><td className="num">{formatINR(l.makingPaise)}</td>
                    <td className="num">{formatINR(l.additionalPaise)}</td><td className="num strong">{formatINR(l.totalPaise)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="grid cols-2">
          <div className="kv">
            <dt>Total Amount</dt><dd className="right num">₹{formatINR(t.itemsTotalPaise)}</dd>
            {intra ? (
              <>
                <dt>CGST {formatPercent(t.cgstRateScaled)}%</dt><dd className="right num">₹{formatINR(t.cgstPaise)}</dd>
                <dt>SGST {formatPercent(t.sgstRateScaled)}%</dt><dd className="right num">₹{formatINR(t.sgstPaise)}</dd>
              </>
            ) : (
              <><dt>IGST {formatPercent(t.igstRateScaled)}%</dt><dd className="right num">₹{formatINR(t.igstPaise)}</dd></>
            )}
            {t.oldMetal?.filter((l) => l.amountPaise > 0).map((l) => (
              <span key={l.key} style={{ display: 'contents' }}>
                <dt>{l.direction === 'add' ? 'Add' : 'Less'}: {l.label}{l.weightMg ? ` (${formatWeight(l.weightMg)} g)` : ''}</dt>
                <dd className="right num">{l.direction === 'add' ? '' : '-'}₹{formatINR(l.amountPaise)}</dd>
              </span>
            ))}
            <dt>Round Off</dt><dd className="right num">{formatINR(t.roundOffPaise)}</dd>
            <dt className="strong">{t.adjustmentPaise ? 'Net payable (Gross Amount)' : 'Gross Amount'}</dt><dd className="right num strong" style={{ fontSize: 17 }}>₹{formatINR(t.grossPaise)}</dd>
          </div>
          <div className="kv">
            {!isRevision && (
              <>
                <dt>Paid now</dt><dd className="right num">₹{formatINR(paid)}</dd>
                <dt>Balance due</dt><dd className="right num strong">₹{formatINR(Math.max(t.grossPaise - paid, 0))}</dd>
              </>
            )}
            <dt>In words</dt><dd className="small">{amountToIndianWords(t.grossPaise)}</dd>
          </div>
        </div>
        {!isRevision && (
          <div className="alert info small">
            The invoice number is assigned when you finalize. Rates, taxes and shop details are frozen on the invoice and will not change if today’s rates or settings change later.
          </div>
        )}
      </div>
    </Modal>
  );
}
