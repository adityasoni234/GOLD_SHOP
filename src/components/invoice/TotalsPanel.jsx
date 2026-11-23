import { formatINR, formatWeight, formatPercent } from '../../utils/currency.js';
import { amountToIndianWords } from '../../utils/numberToWords.js';

/** Live calculation summary shown beside the invoice form. */
export default function TotalsPanel({ computed, paidPaise = 0 }) {
  const t = computed;
  const intra = t.taxMode !== 'inter';
  const balance = Math.max(t.grossPaise - paidPaise, 0);
  return (
    <div className="card totals-panel">
      <div className="card-header"><h3>Calculation summary</h3><span className="badge">{intra ? 'CGST + SGST' : 'IGST'}</span></div>
      <div className="card-body">
        <div className="line sub"><span>Items / pieces</span><span>{t.lines.length} / {t.pieces}</span></div>
        <div className="line sub"><span>Gross / net weight</span><span>{formatWeight(t.grossMg)} / {formatWeight(t.netMg)} g</span></div>
        <div className="line sub"><span>Metal value</span><span>₹{formatINR(t.metalPaise)}</span></div>
        <div className="line sub"><span>Making charges</span><span>₹{formatINR(t.makingPaise)}</span></div>
        <div className="line sub"><span>Additional charges</span><span>₹{formatINR(t.additionalPaise)}</span></div>
        <div className="line strong"><span>Total Amount</span><span>₹{formatINR(t.itemsTotalPaise)}</span></div>
        {t.taxablePaise !== t.itemsTotalPaise && (
          <div className="line sub"><span>GST taxable value</span><span>₹{formatINR(t.taxablePaise)}</span></div>
        )}
        {intra ? (
          <>
            <div className="line"><span>CGST {formatPercent(t.cgstRateScaled)}%</span><span>₹{formatINR(t.cgstPaise)}</span></div>
            <div className="line"><span>SGST {formatPercent(t.sgstRateScaled)}%</span><span>₹{formatINR(t.sgstPaise)}</span></div>
          </>
        ) : (
          <div className="line"><span>IGST {formatPercent(t.igstRateScaled)}%</span><span>₹{formatINR(t.igstPaise)}</span></div>
        )}
        {t.oldMetal?.filter((l) => l.amountPaise > 0).map((l) => (
          <div className="line" key={l.key} style={{ color: l.direction === 'add' ? 'var(--success)' : 'var(--danger)' }}>
            <span>{l.direction === 'add' ? 'Add' : 'Less'}: {l.label}</span>
            <span>{l.direction === 'add' ? '' : '-'}₹{formatINR(l.amountPaise)}</span>
          </div>
        ))}
        <div className="line"><span>Round Off</span><span>{formatINR(t.roundOffPaise)}</span></div>
        <div className="line grand"><span>Gross Amount</span><span>₹{formatINR(t.grossPaise)}</span></div>
        <div className="words">{amountToIndianWords(t.grossPaise)}</div>
        {paidPaise > 0 && (
          <>
            <div className="divider" />
            <div className="line"><span>Paid now</span><span>₹{formatINR(paidPaise)}</span></div>
            <div className="line strong"><span>Balance due</span><span>₹{formatINR(balance)}</span></div>
          </>
        )}
      </div>
    </div>
  );
}
