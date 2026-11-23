/**
 * Jewellery calculation engine (pure functions, no UI).
 *
 * Per item:
 *   Net Weight      = Gross Weight - Stone Weight      (or a manually entered net weight)
 *   Metal Value     = Net Weight x Rate per gram
 *   Making Charges  = % of metal value | amount per gram of net weight | fixed amount
 *   Additional      = fixed amount | amount per gram of net weight | amount per piece
 *   Item Total      = Metal Value + Making + Additional
 *
 * All values are integers: weights in milligrams, money in paise, percentages at SCALE.PERCENT.
 * Rounding to paise happens once per component (metal, making, additional).
 */

import { mulDivRound, toScaled, parseScaled, SCALE, PERCENT_DIVISOR } from './decimal.js';
import { formatINR, formatWeight, formatPercent } from './currency.js';
import { calculateGST } from './gstCalculations.js';

export const MAKING_TYPES = Object.freeze({
  PERCENT: 'percent',
  PER_GRAM: 'perGram',
  FIXED: 'fixed',
});

export const MAKING_TYPE_LABELS = {
  percent: '% of metal value',
  perGram: '₹ per gram',
  fixed: '₹ fixed total',
};

export const ADDITIONAL_TYPES = Object.freeze({
  FIXED: 'fixed',
  PER_GRAM: 'perGram',
  PER_PIECE: 'perPiece',
});

export const ADDITIONAL_TYPE_LABELS = {
  fixed: '₹ fixed total',
  perGram: '₹ per gram',
  perPiece: '₹ per piece',
};

const MG_PER_GRAM = 1000;

/** Pieces: positive integer, or NaN. */
export function parsePieces(value) {
  const s = String(value ?? '').trim();
  if (!/^\d+$/.test(s)) return NaN;
  return parseInt(s, 10);
}

/** Net weight that the engine will use for an item (in mg). */
export function resolveNetWeight(item) {
  const grossMg = toScaled(item.grossWt, SCALE.WEIGHT);
  const stoneMg = toScaled(item.stoneWt, SCALE.WEIGHT);
  if (item.netManual) return toScaled(item.netWt, SCALE.WEIGHT);
  return grossMg - stoneMg;
}

export function calculateMaking(type, value, { metalPaise, netMg }) {
  switch (type) {
    case MAKING_TYPES.PERCENT:
      return mulDivRound(metalPaise, toScaled(value, SCALE.PERCENT), PERCENT_DIVISOR);
    case MAKING_TYPES.PER_GRAM:
      return mulDivRound(netMg, toScaled(value, SCALE.MONEY), MG_PER_GRAM);
    case MAKING_TYPES.FIXED:
      return toScaled(value, SCALE.MONEY);
    default:
      return 0;
  }
}

export function calculateAdditional(type, value, { netMg, pieces }) {
  switch (type) {
    case ADDITIONAL_TYPES.PER_GRAM:
      return mulDivRound(netMg, toScaled(value, SCALE.MONEY), MG_PER_GRAM);
    case ADDITIONAL_TYPES.PER_PIECE:
      return toScaled(value, SCALE.MONEY) * (Number.isFinite(pieces) ? pieces : 0);
    case ADDITIONAL_TYPES.FIXED:
    default:
      return toScaled(value, SCALE.MONEY);
  }
}

/**
 * Calculate one jewellery line.
 * Returns integers plus a human-readable breakdown and per-field errors.
 */
export function calculateItem(item) {
  const errors = {};
  const pieces = parsePieces(item.pcs);
  const grossMg = toScaled(item.grossWt, SCALE.WEIGHT);
  const stoneMg = toScaled(item.stoneWt, SCALE.WEIGHT);
  const netMg = resolveNetWeight(item);
  const ratePaise = toScaled(item.rate, SCALE.MONEY);

  // ---- validation -------------------------------------------------------
  if (!Number.isFinite(pieces) || pieces <= 0) errors.pcs = 'PC must be a positive whole number';
  if (!Number.isFinite(parseScaled(item.grossWt, SCALE.WEIGHT)) || grossMg <= 0)
    errors.grossWt = 'Enter gross weight';
  if (String(item.stoneWt ?? '').trim() !== '' && !Number.isFinite(parseScaled(item.stoneWt, SCALE.WEIGHT)))
    errors.stoneWt = 'Invalid stone weight';
  else if (stoneMg < 0) errors.stoneWt = 'Stone weight cannot be negative';
  if (item.netManual && !Number.isFinite(parseScaled(item.netWt, SCALE.WEIGHT))) errors.netWt = 'Enter net weight';
  else if (netMg < 0) errors.netWt = 'Net weight cannot be negative';
  else if (netMg > grossMg) errors.netWt = 'Net weight cannot exceed gross weight';
  else if (item.netManual && netMg + stoneMg > grossMg)
    errors.netWt = 'Net + stone weight exceeds gross weight';
  if (!Number.isFinite(parseScaled(item.rate, SCALE.MONEY)) || ratePaise <= 0) errors.rate = 'Rate must be greater than zero';
  const makingRaw = parseScaled(item.makingValue, item.makingType === MAKING_TYPES.PERCENT ? SCALE.PERCENT : SCALE.MONEY);
  if (String(item.makingValue ?? '').trim() !== '' && !Number.isFinite(makingRaw)) errors.makingValue = 'Invalid making charge';
  else if (makingRaw < 0) errors.makingValue = 'Making charges cannot be negative';
  const addRaw = parseScaled(item.additionalValue, SCALE.MONEY);
  if (String(item.additionalValue ?? '').trim() !== '' && !Number.isFinite(addRaw))
    errors.additionalValue = 'Invalid additional charge';
  else if (addRaw < 0) errors.additionalValue = 'Additional charges cannot be negative';
  if (!String(item.description ?? '').trim()) errors.description = 'Enter a description';

  // ---- calculation ------------------------------------------------------
  const safeNet = Math.max(netMg, 0);
  const metalPaise = mulDivRound(safeNet, Math.max(ratePaise, 0), MG_PER_GRAM);
  const makingPaise = Math.max(calculateMaking(item.makingType, item.makingValue, { metalPaise, netMg: safeNet }), 0);
  const additionalPaise = Math.max(
    calculateAdditional(item.additionalType, item.additionalValue, { netMg: safeNet, pieces }),
    0,
  );
  const totalPaise = metalPaise + makingPaise + additionalPaise;

  // ---- breakdown --------------------------------------------------------
  const breakdown = [];
  breakdown.push(
    item.netManual
      ? `Net weight (entered manually) = ${formatWeight(safeNet)} g`
      : `Net weight = ${formatWeight(grossMg)} g gross − ${formatWeight(stoneMg)} g stone = ${formatWeight(safeNet)} g`,
  );
  breakdown.push(`Metal value = ${formatWeight(safeNet)} g × ₹${formatINR(ratePaise)}/g = ₹${formatINR(metalPaise)}`);
  if (item.makingType === MAKING_TYPES.PERCENT) {
    breakdown.push(
      `Making = ${formatPercent(toScaled(item.makingValue, SCALE.PERCENT))}% of ₹${formatINR(metalPaise)} = ₹${formatINR(makingPaise)}`,
    );
  } else if (item.makingType === MAKING_TYPES.PER_GRAM) {
    breakdown.push(
      `Making = ${formatWeight(safeNet)} g × ₹${formatINR(toScaled(item.makingValue, SCALE.MONEY))}/g = ₹${formatINR(makingPaise)}`,
    );
  } else {
    breakdown.push(`Making (fixed) = ₹${formatINR(makingPaise)}`);
  }
  if (additionalPaise) {
    const v = formatINR(toScaled(item.additionalValue, SCALE.MONEY));
    const how =
      item.additionalType === ADDITIONAL_TYPES.PER_GRAM
        ? `${formatWeight(safeNet)} g × ₹${v}/g`
        : item.additionalType === ADDITIONAL_TYPES.PER_PIECE
          ? `${pieces} pc × ₹${v}`
          : 'fixed';
    breakdown.push(`Additional charges (${how}) = ₹${formatINR(additionalPaise)}`);
  }
  breakdown.push(
    `Item total = ₹${formatINR(metalPaise)} + ₹${formatINR(makingPaise)} + ₹${formatINR(additionalPaise)} = ₹${formatINR(totalPaise)}`,
  );

  return {
    id: item.id,
    pieces: Number.isFinite(pieces) ? pieces : 0,
    grossMg,
    stoneMg,
    netMg: safeNet,
    ratePaise,
    metalPaise,
    makingPaise,
    additionalPaise,
    totalPaise,
    errors,
    valid: Object.keys(errors).length === 0,
    breakdown,
  };
}

export const OLD_METALS = Object.freeze([
  { key: 'gold', label: 'Old Gold' },
  { key: 'silver', label: 'Old Silver' },
]);

export const emptyOldMetal = () => ({
  gold: { direction: 'less', weight: '', rate: '', amount: '' },
  silver: { direction: 'less', weight: '', rate: '', amount: '' },
});

/**
 * Old gold / old silver taken from (or added for) the customer.
 * Amount = weight x rate when both are entered, otherwise the amount typed in.
 * direction 'less' deducts from the bill, 'add' adds to it.
 */
export function calculateOldMetal(oldMetal) {
  const errors = [];
  const lines = OLD_METALS.map(({ key, label }) => {
    const e = oldMetal?.[key] || {};
    const hasWeight = String(e.weight ?? '').trim() !== '';
    const hasRate = String(e.rate ?? '').trim() !== '';
    const hasAmount = String(e.amount ?? '').trim() !== '';
    const weightMg = toScaled(e.weight, SCALE.WEIGHT);
    const ratePaise = toScaled(e.rate, SCALE.MONEY);
    if (hasWeight && !(parseScaled(e.weight, SCALE.WEIGHT) >= 0)) errors.push(`${label}: weight is invalid.`);
    if (hasRate && !(parseScaled(e.rate, SCALE.MONEY) >= 0)) errors.push(`${label}: rate is invalid.`);
    if (!(hasWeight && hasRate) && hasAmount && !(parseScaled(e.amount, SCALE.MONEY) >= 0))
      errors.push(`${label}: amount is invalid.`);
    const computed = hasWeight && hasRate;
    const amountPaise = Math.max(computed ? mulDivRound(weightMg, ratePaise, MG_PER_GRAM) : toScaled(e.amount, SCALE.MONEY), 0);
    const direction = e.direction === 'add' ? 'add' : 'less';
    return {
      key,
      label,
      direction,
      weightMg: Math.max(weightMg, 0),
      ratePaise: Math.max(ratePaise, 0),
      computed,
      amountPaise,
      signedPaise: direction === 'add' ? amountPaise : -amountPaise,
    };
  });
  return {
    lines,
    active: lines.filter((l) => l.amountPaise > 0),
    netPaise: lines.reduce((a, l) => a + l.signedPaise, 0),
    errors,
  };
}

/**
 * Calculate a whole invoice.
 * @param items      invoice items (string fields as entered)
 * @param taxConfig  { cgstRate, sgstRate, igstRate, roundOff, includeMakingInTaxable, includeAdditionalInTaxable }
 * @param taxMode    'intra' | 'inter'
 * @param oldMetal   optional old gold / old silver adjustment (applied after GST)
 */
export function calculateInvoice(items, taxConfig, taxMode, oldMetal) {
  const lines = (items || []).map(calculateItem);
  const sum = (key) => lines.reduce((acc, l) => acc + l[key], 0);
  const sumMetal = (metal, key) =>
    lines.reduce((acc, l, i) => (items[i].metal === metal ? acc + l[key] : acc), 0);

  const metalPaise = sum('metalPaise');
  const makingPaise = sum('makingPaise');
  const additionalPaise = sum('additionalPaise');
  const itemsTotalPaise = metalPaise + makingPaise + additionalPaise;

  const includeMaking = taxConfig?.includeMakingInTaxable !== false;
  const includeAdditional = taxConfig?.includeAdditionalInTaxable !== false;
  const taxablePaise =
    metalPaise + (includeMaking ? makingPaise : 0) + (includeAdditional ? additionalPaise : 0);

  const old = calculateOldMetal(oldMetal);

  const tax = calculateGST({
    adjustmentPaise: old.netPaise,
    totalPaise: itemsTotalPaise,
    taxablePaise,
    mode: taxMode,
    cgstRate: taxConfig?.cgstRate,
    sgstRate: taxConfig?.sgstRate,
    igstRate: taxConfig?.igstRate,
    roundOff: taxConfig?.roundOff,
  });

  return {
    lines,
    pieces: sum('pieces'),
    grossMg: sum('grossMg'),
    stoneMg: sum('stoneMg'),
    netMg: sum('netMg'),
    goldNetMg: sumMetal('Gold', 'netMg'),
    silverNetMg: sumMetal('Silver', 'netMg'),
    goldValuePaise: sumMetal('Gold', 'totalPaise'),
    silverValuePaise: sumMetal('Silver', 'totalPaise'),
    metalPaise,
    makingPaise,
    additionalPaise,
    itemsTotalPaise,
    taxablePaise,
    ...tax,
    oldMetal: old.lines,
    oldMetalErrors: old.errors,
    valid: lines.length > 0 && lines.every((l) => l.valid) && tax.valid && old.errors.length === 0 && tax.grossPaise >= 0,
  };
}
