import { formatScaled, SCALE } from './decimal.js';

/** Insert Indian digit grouping into an integer string: 16483495 -> 1,64,83,495 */
function groupIndian(intStr) {
  if (intStr.length <= 3) return intStr;
  const last3 = intStr.slice(-3);
  let rest = intStr.slice(0, -3);
  const parts = [];
  while (rest.length > 2) {
    parts.unshift(rest.slice(-2));
    rest = rest.slice(0, -2);
  }
  if (rest) parts.unshift(rest);
  return `${parts.join(',')},${last3}`;
}

/**
 * Format paise as Indian currency: 16483495 -> "1,64,834.95".
 * Pass { symbol: true } for "₹1,64,834.95".
 */
export function formatINR(paise, { symbol = false, blankZero = false } = {}) {
  if (!Number.isFinite(paise)) return '';
  if (blankZero && paise === 0) return '';
  const negative = paise < 0;
  const [intPart, frac] = formatScaled(Math.abs(paise), SCALE.MONEY).split('.');
  const out = `${symbol ? '₹' : ''}${groupIndian(intPart)}.${frac}`;
  return negative ? `-${out}` : out;
}

/** Paise -> plain decimal string without grouping ("164834.95"), used for CSV and inputs. */
export function paiseToPlain(paise) {
  return formatScaled(paise, SCALE.MONEY);
}

/** Milligrams -> "11.580" */
export function formatWeight(mg, { unit = false } = {}) {
  if (!Number.isFinite(mg)) return '';
  return `${formatScaled(mg, SCALE.WEIGHT)}${unit ? ' g' : ''}`;
}

/** Percent at SCALE.PERCENT -> "1.50" (at least 2 decimals, trailing zeros beyond trimmed). */
export function formatPercent(scaled) {
  if (!Number.isFinite(scaled)) return '';
  const full = formatScaled(scaled, SCALE.PERCENT);
  const [i, f] = full.split('.');
  const trimmed = f.replace(/0+$/, '').padEnd(2, '0');
  return `${i}.${trimmed}`;
}
