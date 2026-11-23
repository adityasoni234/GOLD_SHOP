/**
 * Indian GST engine.
 *
 *  Intra-state (place of supply = shop state):  CGST + SGST
 *  Inter-state:                                 IGST only
 *
 *  Tax amounts are rounded to the paisa individually (as printed on the invoice).
 *  Gross Amount = Total Amount + taxes ± old gold/silver adjustment + round-off.
 *  The old-metal adjustment is applied AFTER tax: it never changes the GST taxable value.
 *
 * Rates are configuration, not law: verify current rates with your accountant.
 */

import { mulDivRound, parseScaled, SCALE, PERCENT_DIVISOR } from './decimal.js';

export const TAX_MODES = Object.freeze({ INTRA: 'intra', INTER: 'inter' });

export const ROUND_OFF_MODES = Object.freeze({
  NEAREST: 'nearest', // nearest rupee, 50 paise rounds up
  UP: 'up',
  DOWN: 'down',
  NONE: 'none',
});

export const ROUND_OFF_LABELS = {
  nearest: 'Nearest rupee',
  up: 'Always round up',
  down: 'Always round down',
  none: 'No round-off',
};

/**
 * Decide CGST+SGST vs IGST.
 * @param override 'auto' | 'intra' | 'inter'
 */
export function determineTaxMode(shopStateCode, placeOfSupplyCode, override = 'auto') {
  if (override === TAX_MODES.INTRA || override === TAX_MODES.INTER) return override;
  const a = String(shopStateCode ?? '').padStart(2, '0');
  const b = String(placeOfSupplyCode ?? '').padStart(2, '0');
  if (!placeOfSupplyCode) return TAX_MODES.INTRA;
  return a === b ? TAX_MODES.INTRA : TAX_MODES.INTER;
}

/** Validate a percentage string (0 – 100, up to 4 decimals). */
export function isValidRate(rate) {
  const v = parseScaled(rate, SCALE.PERCENT);
  return Number.isFinite(v) && v >= 0 && v <= 100 * 10 ** SCALE.PERCENT;
}

export function computeRoundOff(paise, mode = ROUND_OFF_MODES.NEAREST) {
  const remainder = ((paise % 100) + 100) % 100;
  switch (mode) {
    case ROUND_OFF_MODES.NONE:
      return 0;
    case ROUND_OFF_MODES.UP:
      return remainder === 0 ? 0 : 100 - remainder;
    case ROUND_OFF_MODES.DOWN:
      return -remainder;
    case ROUND_OFF_MODES.NEAREST:
    default:
      return remainder >= 50 ? 100 - remainder : -remainder;
  }
}

/**
 * @param totalPaise    sum of item totals (printed as "Total Amount")
 * @param taxablePaise  value on which GST is charged (usually equal to totalPaise)
 */
export function calculateGST({ totalPaise, taxablePaise, mode, cgstRate, sgstRate, igstRate, roundOff, adjustmentPaise = 0 }) {
  const errors = [];
  const taxable = Number.isFinite(taxablePaise) ? taxablePaise : totalPaise;
  const intra = mode !== TAX_MODES.INTER;

  const cg = parseScaled(cgstRate ?? '0', SCALE.PERCENT);
  const sg = parseScaled(sgstRate ?? '0', SCALE.PERCENT);
  const ig = parseScaled(igstRate ?? '0', SCALE.PERCENT);
  if (intra && (!isValidRate(cgstRate ?? '0') || !isValidRate(sgstRate ?? '0'))) errors.push('CGST/SGST rate is invalid');
  if (!intra && !isValidRate(igstRate ?? '0')) errors.push('IGST rate is invalid');

  const cgstPaise = intra && Number.isFinite(cg) ? mulDivRound(taxable, cg, PERCENT_DIVISOR) : 0;
  const sgstPaise = intra && Number.isFinite(sg) ? mulDivRound(taxable, sg, PERCENT_DIVISOR) : 0;
  const igstPaise = !intra && Number.isFinite(ig) ? mulDivRound(taxable, ig, PERCENT_DIVISOR) : 0;
  const totalTaxPaise = cgstPaise + sgstPaise + igstPaise;

  const afterTaxPaise = totalPaise + totalTaxPaise;
  const beforeRoundPaise = afterTaxPaise + (adjustmentPaise || 0);
  const roundOffPaise = computeRoundOff(beforeRoundPaise, roundOff);
  const grossPaise = beforeRoundPaise + roundOffPaise;

  return {
    taxMode: intra ? TAX_MODES.INTRA : TAX_MODES.INTER,
    cgstRate: intra ? String(cgstRate ?? '0') : '0',
    sgstRate: intra ? String(sgstRate ?? '0') : '0',
    igstRate: intra ? '0' : String(igstRate ?? '0'),
    cgstRateScaled: intra ? cg : 0,
    sgstRateScaled: intra ? sg : 0,
    igstRateScaled: intra ? 0 : ig,
    cgstPaise,
    sgstPaise,
    igstPaise,
    totalTaxPaise,
    afterTaxPaise,
    adjustmentPaise: adjustmentPaise || 0,
    beforeRoundPaise,
    roundOffPaise,
    grossPaise,
    taxErrors: errors,
    valid: errors.length === 0,
  };
}
