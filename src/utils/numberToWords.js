/**
 * Indian currency to words (lakh / crore system).
 *   16978000 paise -> "INR One Lakh Sixty Nine Thousand Seven Hundred Eighty Only"
 */

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n) {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return o ? `${TENS[t]} ${ONES[o]}` : TENS[t];
}

function threeDigits(n) {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const parts = [];
  if (h) parts.push(`${ONES[h]} Hundred`);
  if (rest) parts.push(twoDigits(rest));
  return parts.join(' ');
}

/** Whole number (non-negative integer) to Indian words. 0 -> "Zero". */
export function integerToIndianWords(num) {
  if (!Number.isInteger(num) || num < 0) throw new Error('integerToIndianWords expects a non-negative integer');
  if (num === 0) return 'Zero';

  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const rest = num % 1000;

  const parts = [];
  if (crore) parts.push(`${integerToIndianWords(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (rest) parts.push(threeDigits(rest));
  return parts.join(' ');
}

/** Paise (integer) -> "INR ... Only" with optional "and NN Paise". */
export function amountToIndianWords(paise, { prefix = 'INR' } = {}) {
  if (!Number.isFinite(paise)) return '';
  const negative = paise < 0;
  const abs = Math.abs(Math.round(paise));
  const rupees = Math.floor(abs / 100);
  const p = abs % 100;

  let words = integerToIndianWords(rupees);
  if (p) words = rupees ? `${words} and ${twoDigits(p)} Paise` : `${twoDigits(p)} Paise`;
  return `${prefix ? `${prefix} ` : ''}${negative ? 'Minus ' : ''}${words} Only`;
}
