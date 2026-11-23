/**
 * Exact decimal helpers.
 *
 * Money, weights and percentages are never multiplied as JavaScript floats.
 * Every user-entered value is parsed from its decimal string into a scaled
 * integer, and every product/division goes through BigInt with explicit
 * half-up rounding.
 *
 *   weight      -> milligrams        (scale 3)   "11.580" -> 11580
 *   money       -> paise             (scale 2)   "12700"  -> 1270000
 *   percentage  -> 1/10000 of 1 %    (scale 4)   "9.25"   -> 92500
 *   fineness    -> 1/100             (scale 2)   "91.60"  -> 9160
 */

export const SCALE = Object.freeze({
  WEIGHT: 3,
  MONEY: 2,
  PERCENT: 4,
  FINENESS: 2,
});

/** Divisor that converts a percent value at SCALE.PERCENT into a fraction. */
export const PERCENT_DIVISOR = 100 * 10 ** SCALE.PERCENT; // 1,000,000

/**
 * Parse a decimal string/number into a scaled integer.
 * Extra fraction digits are rounded half-up. Returns NaN for invalid input.
 */
export function parseScaled(input, scale) {
  if (input === null || input === undefined) return NaN;
  let s = String(input).trim().replace(/,/g, '');
  if (s === '') return NaN;
  let negative = false;
  if (s[0] === '-') {
    negative = true;
    s = s.slice(1);
  } else if (s[0] === '+') {
    s = s.slice(1);
  }
  if (s === '' || s === '.' || !/^\d*\.?\d*$/.test(s)) return NaN;

  let [intPart = '', frac = ''] = s.split('.');
  let roundUp = false;
  if (frac.length > scale) {
    roundUp = frac.charCodeAt(scale) >= 53; // '5'
    frac = frac.slice(0, scale);
  }
  frac = frac.padEnd(scale, '0');
  let big = BigInt((intPart || '0') + frac);
  if (roundUp) big += 1n;
  const n = Number(big);
  return negative && n !== 0 ? -n : n;
}

/** Like parseScaled but returns `fallback` (default 0) when the input is blank/invalid. */
export function toScaled(input, scale, fallback = 0) {
  const n = parseScaled(input, scale);
  return Number.isFinite(n) ? n : fallback;
}

/** Format a scaled integer back to a plain decimal string ("11580", 3 -> "11.580"). */
export function formatScaled(value, scale, { trimZeros = false } = {}) {
  if (!Number.isFinite(value)) return '';
  const negative = value < 0;
  const digits = String(Math.abs(Math.trunc(value))).padStart(scale + 1, '0');
  const intPart = digits.slice(0, digits.length - scale);
  let frac = scale > 0 ? digits.slice(digits.length - scale) : '';
  if (trimZeros) frac = frac.replace(/0+$/, '');
  const out = frac ? `${intPart}.${frac}` : intPart;
  return negative ? `-${out}` : out;
}

/** Round-half-up (away from zero) of a * b / c using exact integer arithmetic. */
export function mulDivRound(a, b, c) {
  if (c === 0) throw new Error('mulDivRound: division by zero');
  const num = BigInt(a) * BigInt(b);
  const den = BigInt(c);
  const negative = (num < 0n) !== (den < 0n);
  const absNum = num < 0n ? -num : num;
  const absDen = den < 0n ? -den : den;
  let q = absNum / absDen;
  if ((absNum % absDen) * 2n >= absDen) q += 1n;
  return Number(negative ? -q : q);
}

/** Floor / ceil of a / b for integers (b > 0). */
export function divFloor(a, b) {
  return Math.floor(a / b);
}
export function divCeil(a, b) {
  return Math.ceil(a / b);
}
