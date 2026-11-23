import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseScaled, formatScaled, mulDivRound } from '../src/utils/decimal.js';
import { calculateItem, calculateInvoice } from '../src/utils/calculations.js';
import { calculateGST, determineTaxMode, computeRoundOff } from '../src/utils/gstCalculations.js';
import { amountToIndianWords, integerToIndianWords } from '../src/utils/numberToWords.js';
import { formatINR } from '../src/utils/currency.js';
import { computeNextInvoiceNumber } from '../src/utils/invoiceNumber.js';
import { isValidGSTIN } from '../src/utils/validators.js';

const TAX = { cgstRate: '1.5', sgstRate: '1.5', igstRate: '3', roundOff: 'nearest' };

const item = (over = {}) => ({
  id: 'x',
  description: 'Necklace Set 22K',
  metal: 'Gold',
  pcs: '1',
  grossWt: '10',
  stoneWt: '0',
  netWt: '',
  netManual: false,
  rate: '10000',
  makingType: 'percent',
  makingValue: '0',
  additionalType: 'fixed',
  additionalValue: '0',
  ...over,
});

test('decimal parsing is exact and rounds half-up', () => {
  assert.equal(parseScaled('11.58', 3), 11580);
  assert.equal(parseScaled('0.1', 2), 10);
  assert.equal(parseScaled('1,64,834.95', 2), 16483495);
  assert.equal(parseScaled('2.0005', 3), 2001);
  assert.equal(parseScaled('2.0004', 3), 2000);
  assert.ok(Number.isNaN(parseScaled('abc', 2)));
  assert.ok(Number.isNaN(parseScaled('', 2)));
  assert.equal(formatScaled(11580, 3), '11.580');
  assert.equal(formatScaled(5, 2), '0.05');
  assert.equal(mulDivRound(5, 1, 10), 1); // 0.5 -> 1
  assert.equal(mulDivRound(4, 1, 10), 0);
});

test('floating point traps do not leak in (0.1 + 0.2 style)', () => {
  // 0.3 g at ₹0.10/g would be 0.03 exactly
  const r = calculateItem(item({ grossWt: '0.3', rate: '0.10' }));
  assert.equal(r.metalPaise, 3);
});

test('net weight = gross - stone, metal value', () => {
  const r = calculateItem(item({ grossWt: '12.500', stoneWt: '0.920', rate: '12700' }));
  assert.equal(r.netMg, 11580);
  assert.equal(r.metalPaise, 14706600); // 11.580 x 12700 = 147,066.00
  assert.equal(r.valid, true);
});

test('percentage making charge (9.25% on 11.880 g @ 12,700)', () => {
  const r = calculateItem(item({ grossWt: '11.880', rate: '12700', makingType: 'percent', makingValue: '9.25' }));
  assert.equal(r.metalPaise, 15087600); // 150,876.00
  assert.equal(r.makingPaise, 1395603); // 13,956.03 (13,956.03 exactly)
  assert.equal(r.totalPaise, 16483203); // 1,64,832.03
});

test('fixed per-gram making charge', () => {
  const r = calculateItem(item({ grossWt: '8.250', rate: '7000', makingType: 'perGram', makingValue: '450' }));
  assert.equal(r.metalPaise, 5775000); // 57,750.00
  assert.equal(r.makingPaise, 371250); // 8.25 x 450 = 3,712.50
  assert.equal(r.totalPaise, 6146250);
});

test('fixed total making charge and additional charges', () => {
  const fixed = calculateItem(
    item({ grossWt: '5', rate: '6000', makingType: 'fixed', makingValue: '1500', additionalType: 'fixed', additionalValue: '250.50' }),
  );
  assert.equal(fixed.totalPaise, 3000000 + 150000 + 25050);

  const perPiece = calculateItem(item({ pcs: '3', additionalType: 'perPiece', additionalValue: '100' }));
  assert.equal(perPiece.additionalPaise, 30000);

  const perGram = calculateItem(item({ grossWt: '2.5', additionalType: 'perGram', additionalValue: '40' }));
  assert.equal(perGram.additionalPaise, 10000);
});

test('silver item with different purity', () => {
  const r = calculateItem(item({ metal: 'Silver', grossWt: '250.000', stoneWt: '0', rate: '95.50', makingType: 'perGram', makingValue: '12' }));
  assert.equal(r.metalPaise, 2387500); // 23,875.00
  assert.equal(r.makingPaise, 300000); // 3,000.00
});

test('validation: net > gross, negatives, zero rate, bad pieces', () => {
  const a = calculateItem(item({ netManual: true, netWt: '11', grossWt: '10' }));
  assert.ok(a.errors.netWt);
  const b = calculateItem(item({ stoneWt: '-1' }));
  assert.ok(b.errors.stoneWt);
  const c = calculateItem(item({ rate: '0' }));
  assert.ok(c.errors.rate);
  const d = calculateItem(item({ pcs: '1.5' }));
  assert.ok(d.errors.pcs);
  const e = calculateItem(item({ makingValue: '-2' }));
  assert.ok(e.errors.makingValue);
  const f = calculateItem(item({ stoneWt: '12', grossWt: '10' }));
  assert.ok(f.errors.netWt);
});

test('reference invoice: CGST/SGST 1.5%, round-off and gross amount', () => {
  const t = calculateGST({ totalPaise: 16483495, taxablePaise: 16483495, mode: 'intra', ...TAX });
  assert.equal(t.cgstPaise, 247252); // 2,472.52
  assert.equal(t.sgstPaise, 247252);
  assert.equal(t.igstPaise, 0);
  assert.equal(t.roundOffPaise, 1); // 0.01
  assert.equal(t.grossPaise, 16978000); // 1,69,780.00
  assert.equal(formatINR(t.grossPaise), '1,69,780.00');
  assert.equal(amountToIndianWords(t.grossPaise), 'INR One Lakh Sixty Nine Thousand Seven Hundred Eighty Only');
});

test('IGST for inter-state supply, never together with CGST/SGST', () => {
  assert.equal(determineTaxMode('08', '24'), 'inter');
  assert.equal(determineTaxMode('08', '08'), 'intra');
  assert.equal(determineTaxMode('08', '24', 'intra'), 'intra');
  const t = calculateGST({ totalPaise: 10000000, taxablePaise: 10000000, mode: 'inter', ...TAX });
  assert.equal(t.igstPaise, 300000);
  assert.equal(t.cgstPaise + t.sgstPaise, 0);
  assert.equal(t.grossPaise, 10300000);
});

test('round-off modes', () => {
  assert.equal(computeRoundOff(10049, 'nearest'), -49);
  assert.equal(computeRoundOff(10050, 'nearest'), 50);
  assert.equal(computeRoundOff(10001, 'up'), 99);
  assert.equal(computeRoundOff(10099, 'down'), -99);
  assert.equal(computeRoundOff(10099, 'none'), 0);
  assert.equal(computeRoundOff(10000, 'up'), 0);
});

test('full invoice with multiple items and purities reconciles', () => {
  const items = [
    item({ id: 'a', metal: 'Gold', grossWt: '11.880', rate: '12700', makingType: 'percent', makingValue: '9.25' }),
    item({ id: 'b', metal: 'Gold', grossWt: '4.200', stoneWt: '0.200', rate: '10400', makingType: 'perGram', makingValue: '600' }),
    item({ id: 'c', metal: 'Silver', grossWt: '100', rate: '95', makingType: 'fixed', makingValue: '500', additionalType: 'fixed', additionalValue: '50' }),
  ];
  const inv = calculateInvoice(items, TAX, 'intra');
  // a: 1,64,832.03 ; b: 4.000 x 10400 = 41,600 + 2,400 = 44,000 ; c: 9,500 + 500 + 50 = 10,050
  assert.equal(inv.itemsTotalPaise, 16483203 + 4400000 + 1005000);
  assert.equal(inv.goldNetMg, 15880);
  assert.equal(inv.silverNetMg, 100000);
  assert.equal(inv.cgstPaise, mulDivRound(inv.taxablePaise, 15000, 1000000));
  assert.equal(inv.itemsTotalPaise + inv.totalTaxPaise + inv.roundOffPaise, inv.grossPaise);
  assert.equal(inv.grossPaise % 100, 0);
  assert.equal(inv.valid, true);
});

test('making charges can be excluded from the GST taxable value when configured', () => {
  const items = [item({ grossWt: '10', rate: '10000', makingType: 'fixed', makingValue: '1000' })];
  const inv = calculateInvoice(items, { ...TAX, includeMakingInTaxable: false }, 'intra');
  assert.equal(inv.itemsTotalPaise, 10100000);
  assert.equal(inv.taxablePaise, 10000000);
  assert.equal(inv.cgstPaise, 150000);
});

test('Indian number words: thousands, lakhs, crores, paise', () => {
  assert.equal(integerToIndianWords(0), 'Zero');
  assert.equal(integerToIndianWords(1005), 'One Thousand Five');
  assert.equal(integerToIndianWords(250000), 'Two Lakh Fifty Thousand');
  assert.equal(integerToIndianWords(123456789), 'Twelve Crore Thirty Four Lakh Fifty Six Thousand Seven Hundred Eighty Nine');
  assert.equal(amountToIndianWords(1234550), 'INR Twelve Thousand Three Hundred Forty Five and Fifty Paise Only');
  assert.equal(amountToIndianWords(75), 'INR Seventy Five Paise Only');
});

test('Indian currency formatting', () => {
  assert.equal(formatINR(16483495), '1,64,834.95');
  assert.equal(formatINR(1234567890), '1,23,45,678.90');
  assert.equal(formatINR(99), '0.99');
  assert.equal(formatINR(-150), '-1.50');
});

test('invoice numbers are sequential and never duplicated', () => {
  assert.equal(computeNextInvoiceNumber({ lastAllocated: 157, startNumber: 1, existingNumbers: [157] }), 158);
  assert.equal(computeNextInvoiceNumber({ lastAllocated: 0, startNumber: 158, existingNumbers: [] }), 158);
  assert.equal(computeNextInvoiceNumber({ lastAllocated: 158, startNumber: 100, existingNumbers: [159, 160] }), 161);
});

test('GSTIN format check (reference GSTIN is well-formed)', () => {
  assert.equal(isValidGSTIN('08ADSPS9102J1ZX'), true);
  assert.equal(isValidGSTIN('08ADSPS9102J1X'), false);
});

test('old gold deduction is applied after GST and does not change taxable value', () => {
  const items = [item({ grossWt: '10', rate: '10000' })]; // ₹1,00,000
  const oldMetal = {
    gold: { direction: 'less', weight: '5.250', rate: '9000', amount: '' }, // 47,250.00
    silver: { direction: 'less', weight: '', rate: '', amount: '' },
  };
  const inv = calculateInvoice(items, TAX, 'intra', oldMetal);
  assert.equal(inv.taxablePaise, 10000000);
  assert.equal(inv.cgstPaise, 150000);
  assert.equal(inv.sgstPaise, 150000);
  assert.equal(inv.adjustmentPaise, -4725000);
  assert.equal(inv.grossPaise, 10000000 + 300000 - 4725000); // 55,750.00
  assert.equal(inv.valid, true);
});

test('old silver can be added, manual amount used when weight/rate missing, round-off after adjustment', () => {
  const items = [item({ grossWt: '10', rate: '10000' })];
  const oldMetal = {
    gold: { direction: 'less', weight: '', rate: '', amount: '1000.40' },
    silver: { direction: 'add', weight: '', rate: '', amount: '250' },
  };
  const inv = calculateInvoice(items, TAX, 'intra', oldMetal);
  // 1,03,000.00 - 1,000.40 + 250.00 = 1,02,249.60 -> round +0.40
  assert.equal(inv.adjustmentPaise, -100040 + 25000);
  assert.equal(inv.roundOffPaise, 40);
  assert.equal(inv.grossPaise, 10225000);
});

test('old metal larger than the bill is invalid', () => {
  const items = [item({ grossWt: '1', rate: '1000' })];
  const inv = calculateInvoice(items, TAX, 'intra', {
    gold: { direction: 'less', weight: '', rate: '', amount: '5000' },
    silver: {},
  });
  assert.ok(inv.grossPaise < 0);
  assert.equal(inv.valid, false);
});

test('WhatsApp phone normalisation', async () => {
  const { waPhone } = await import('../src/utils/whatsapp.js');
  assert.equal(waPhone('9876543210'), '919876543210');
  assert.equal(waPhone('+91 98765-43210'), '919876543210');
  assert.equal(waPhone('09876543210'), '919876543210');
  assert.equal(waPhone('12345'), '');
});
