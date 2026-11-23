import './invoice-print.css';
import Watermark from './Watermark.jsx';
import { formatINR, formatWeight, formatPercent } from '../utils/currency.js';
import { formatDate, formatDateTime } from '../utils/dateUtils.js';
import { toScaled, SCALE } from '../utils/decimal.js';
import { INVOICE_STATUS } from '../constants/index.js';

/** Column widths in mm (sum = 194 mm frame width), matching the reference invoice. */
const COLS = [
  { key: 'sr', label: ['Sr.', 'No'], w: 6 },
  { key: 'hsn', label: ['HSN', '/SAC'], w: 9 },
  { key: 'huid', label: ['Huid'], w: 16 },
  { key: 'desc', label: ['Description'], w: 48 },
  { key: 'pc', label: ['PC'], w: 6 },
  { key: 'purity', label: ['Purity'], w: 10 },
  { key: 'net', label: ['Net', 'Wt'], w: 14 },
  { key: 'grs', label: ['Grs', 'Wt'], w: 14 },
  { key: 'stone', label: ['Stone', 'Wt'], w: 11 },
  { key: 'rate', label: ['Rate'], w: 15 },
  { key: 'making', label: ['Making'], w: 12 },
  { key: 'addl', label: ['Col.St &', 'Ot.Chg.'], w: 12 },
  { key: 'total', label: ['Total Amount'], w: 21 },
];

const AREA_MM = 126;
const HEAD_MM = 6;
const ROW_MM = 7.5;
const FOOT_MM = 5;

function makingText(item, line) {
  if (item.makingType === 'percent') {
    const v = toScaled(item.makingValue, SCALE.PERCENT);
    return v ? `${formatPercent(v)}%` : '';
  }
  if (item.makingType === 'perGram') {
    const v = toScaled(item.makingValue, SCALE.MONEY);
    return v ? `${formatINR(v).replace(/\.00$/, '')}/g` : '';
  }
  return line.makingPaise ? formatINR(line.makingPaise) : '';
}

function addressText(c) {
  const parts = [c.address, [c.city, c.pin].filter(Boolean).join(' - ')].filter((s) => String(s || '').trim());
  return parts.join('\n');
}

/**
 * The customer-facing A4 tax invoice.
 * @param invoice  an invoice record (see services/invoiceService.buildRecord)
 * @param print    { offsetTopMm, offsetLeftMm } printer calibration
 * @param logoDataUrl  optional uploaded logo for the watermark
 * @param sample   render a "SAMPLE" stamp (alignment test page)
 */
export default function PrintableInvoice({ invoice, print = {}, logoDataUrl = '', sample = false }) {
  const shop = invoice.shop;
  const b = shop.business;
  const bank = shop.bank;
  const c = invoice.customer || {};
  const t = invoice.totals;
  const items = invoice.items || [];
  const lines = invoice.lines || [];
  const dateFmt = shop.dateFormat || 'dd-MM-yyyy';
  const fillerMm = Math.max(AREA_MM - HEAD_MM - FOOT_MM - items.length * ROW_MM, 0);

  const intra = t.taxMode !== 'inter';
  const stamp = sample
    ? { text: 'SAMPLE', sub: 'Alignment test — not a tax invoice' }
    : invoice.status === INVOICE_STATUS.CANCELLED
      ? { text: 'CANCELLED', sub: invoice.cancelReason }
      : invoice.status === INVOICE_STATUS.DRAFT
        ? { text: 'DRAFT', sub: 'Not a valid tax invoice' }
        : null;

  const style = {
    '--inv-offset-x': `${Number(print.offsetLeftMm) || 0}mm`,
    '--inv-offset-y': `${Number(print.offsetTopMm) || 0}mm`,
  };

  return (
    <div className="inv-page" style={style}>
      <div className="inv-frame">
        {/* 1. Header */}
        <header className="inv-header">
          <div className="inv-shop-name">{b.name}</div>
          <div className="inv-shop-address">{b.address}</div>
          <div className="inv-shop-contact">CONTACT NO: {b.contacts}</div>
          {b.gstin && <div className="inv-shop-gstin">GSTIN: {b.gstin}</div>}
        </header>

        {/* 2. Party + TAX INVOICE */}
        <section className="inv-party">
          <div className="inv-party-left">
            <div className="inv-kv">
              <span className="k">Name</span><span>:</span><span className="v">{c.name}</span>
              <span className="k">Address</span><span>:</span><span className="v addr">{addressText(c)}</span>
              {c.phone ? (<><span className="k">Mobile</span><span>:</span><span className="v">{c.phone}</span></>) : null}
            </div>
            <div className="inv-kv">
              <span className="k">State Name</span><span>:</span>
              <span className="v">{c.state}{c.stateCode ? ` Code:- (${c.stateCode})` : ''}</span>
              <span className="k">Place Of Supply</span><span>:</span><span className="v">{invoice.placeOfSupply}</span>
              {c.gstin ? (<><span className="k">GSTIN</span><span>:</span><span className="v">{c.gstin}</span></>) : null}
              <span className="k">Pan/Aadhaar</span><span>:</span><span className="v">{c.panAadhaar}</span>
            </div>
          </div>
          <div className="inv-party-right">
            <div className="inv-title">TAX INVOICE</div>
            <div className="inv-meta">
              <span className="k">Invoice No</span><span>:</span><span>{invoice.invoiceNo || (invoice.number ?? '—')}</span>
              <span className="k">Date</span><span>:</span><span>{formatDate(invoice.date, dateFmt)}</span>
              {invoice.revision ? <span className="rev">Revised invoice (Rev. {invoice.revision})</span> : null}
            </div>
          </div>
        </section>

        {/* 3. Items */}
        <section className="inv-items-area">
          <Watermark mode={b.watermarkMode} text={b.monogramText} name={b.name} logoDataUrl={logoDataUrl} />
          <table className="inv-items">
            <colgroup>
              {COLS.map((col) => <col key={col.key} style={{ width: `${((col.w / 194) * 100).toFixed(3)}%` }} />)}
            </colgroup>
            <thead>
              <tr>
                {COLS.map((col) => (
                  <th key={col.key}>
                    {col.label.map((l, i) => <span key={i} style={{ display: 'block' }}>{l}</span>)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => {
                const ln = lines[i] || {};
                return (
                  <tr className="item" key={it.id || i}>
                    <td className="c">{i + 1}</td>
                    <td className="c">{it.hsn}</td>
                    <td className="huid">{it.huid}</td>
                    <td className="desc">
                      <span className="metal">{it.metal}</span>
                      <span className="name">{it.description}</span>
                    </td>
                    <td className="c">{ln.pieces}</td>
                    <td className="c">{it.fineness}</td>
                    <td className="n">{formatWeight(ln.netMg)}</td>
                    <td className="n">{formatWeight(ln.grossMg)}</td>
                    <td className="n">{ln.stoneMg ? formatWeight(ln.stoneMg) : ''}</td>
                    <td className="n">{formatINR(ln.ratePaise)}</td>
                    <td className="n">{makingText(it, ln)}</td>
                    <td className="n">{formatINR(ln.additionalPaise, { blankZero: true })}</td>
                    <td className="n">{formatINR(ln.totalPaise)}</td>
                  </tr>
                );
              })}
              <tr className="filler">
                <td colSpan={COLS.length} style={{ height: `${fillerMm}mm` }} />
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td /><td /><td />
                <td className="c">Total</td>
                <td className="c">{t.pieces}</td>
                <td />
                <td className="n">{formatWeight(t.netMg)}</td>
                <td className="n">{formatWeight(t.grossMg)}</td>
                <td className="n">{t.stoneMg ? formatWeight(t.stoneMg) : ''}</td>
                <td /><td /><td />
                <td className="n">{formatINR(t.itemsTotalPaise)}</td>
              </tr>
            </tfoot>
          </table>
        </section>

        {/* 4. Summary */}
        <section className="inv-summary">
          <div className="inv-sum-left">
            <div className="inv-box-title">Invoice Value In (Words)</div>
            <div className="body">
              <div className="inv-words">{invoice.amountInWords}.</div>
              <div className="ref"><b>Order Reference</b> : {invoice.orderReference}</div>
              <div className="ref">
                <b>EWay Bill Date &amp; Time</b> : {invoice.ewayBillDateTime ? formatDateTime(invoice.ewayBillDateTime, `${dateFmt} hh:mm a`) : ''}
              </div>
              {invoice.notes ? <div className="inv-notes">{invoice.notes}</div> : null}
            </div>
          </div>
          <div className="inv-sum-mid">
            <div className="inv-box-title">Company&apos;s Bank Details</div>
            <div className="inv-bank">
              <span>A/c Holder&apos;s Name</span><span>:</span><span className="v">{bank.holder}</span>
              <span>Bank Name</span><span>:</span><span className="v">{bank.bankName}</span>
              <span>A/c No.</span><span>:</span><span className="v">{bank.accountNo}</span>
              <span>Branch &amp; IFS Code</span><span>:</span>
              <span className="v">{[bank.branch, bank.ifsc].filter(Boolean).join(' & ')}</span>
            </div>
          </div>
          <div className="inv-sum-right">
            <table className={`inv-totals ${(t.oldMetal || []).some((l) => l.amountPaise > 0) ? 'dense' : ''}`}>
              <tbody>
                <tr><td>Total Amount</td><td className="n">{formatINR(t.itemsTotalPaise)}</td></tr>
                {intra ? (
                  <>
                    <tr><td>CGST {formatPercent(t.cgstRateScaled)}%</td><td className="n">{formatINR(t.cgstPaise)}</td></tr>
                    <tr><td>SGST {formatPercent(t.sgstRateScaled)}%</td><td className="n">{formatINR(t.sgstPaise)}</td></tr>
                  </>
                ) : (
                  <tr><td>IGST {formatPercent(t.igstRateScaled)}%</td><td className="n">{formatINR(t.igstPaise)}</td></tr>
                )}
                {(t.oldMetal || []).filter((l) => l.amountPaise > 0).map((l) => (
                  <tr className="adj" key={l.key}>
                    <td>
                      {l.direction === 'add' ? 'Add' : 'Less'}: {l.label}
                      {l.weightMg ? <small> {formatWeight(l.weightMg)}g</small> : null}
                    </td>
                    <td className="n">{l.direction === 'add' ? '' : '-'}{formatINR(l.amountPaise)}</td>
                  </tr>
                ))}
                <tr><td>Round Off</td><td className="n">{formatINR(t.roundOffPaise)}</td></tr>
                <tr className="gross"><td>Gross Amount</td><td className="n"><span>{formatINR(t.grossPaise)}</span></td></tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 5. Terms + signature */}
        <section className="inv-bottom">
          <div className="inv-terms">
            <h4>Terms &amp; Conditions of sale</h4>
            <ol>
              {(shop.terms || []).map((term, i) => <li key={i}>{term}</li>)}
            </ol>
            <div className="foot">{shop.footerText}</div>
          </div>
          <div className="inv-sign">
            <div className="for">{b.name}</div>
            <div className="auth">Authorised Signatory</div>
          </div>
        </section>
      </div>

      {stamp && (
        <div className="inv-stamp">
          {stamp.text}
          {stamp.sub && <small>{stamp.sub}</small>}
        </div>
      )}
    </div>
  );
}
