#!/usr/bin/env node
/**
 * Real-browser print test.
 *
 * Builds test invoices with the app's own calculation code, loads them into a
 * headless Chrome profile, opens each invoice page and prints it to PDF using
 * the page's print CSS. Verifies every PDF is exactly ONE A4 portrait page.
 *
 * Usage:  npm run dev   (in another terminal)
 *         npm run test:print
 * Env:    APP_URL (default http://localhost:5173), CHROME_PATH, OUT_DIR
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildRecord } from '../src/services/invoiceService.js';
import { DEFAULT_SETTINGS } from '../src/services/settingsService.js';

const APP = process.env.APP_URL || 'http://localhost:5173';
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = process.env.OUT_DIR || join(process.cwd(), 'print-test-output');
const PORT = 9333;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function item(i, over = {}) {
  return {
    id: `t${i}`, metal: 'Gold', category: 'Ring', description: `Ring 22K design ${i + 1}`, hsn: '7113', huid: `HU${String(i).padStart(4, '0')}`,
    pcs: '1', purity: '22K', fineness: '91.60', grossWt: `${5 + i}.125`, stoneWt: i % 3 ? '0.125' : '', netWt: '', netManual: false,
    rate: '12700', makingType: i % 2 ? 'perGram' : 'percent', makingValue: i % 2 ? '450' : '9.25', additionalType: 'fixed', additionalValue: i % 4 === 0 ? '350' : '',
    ...over,
  };
}

function invoice(id, number, items, over = {}) {
  const form = {
    id, date: '2026-11-23',
    customer: { name: 'MANJU LODHA', phone: '9876543210', address: 'Ashoknagar', city: 'Udaipur', state: 'Rajasthan', stateCode: '08', pin: '313001', gstin: '', panAadhaar: '' },
    placeOfSupply: 'Rajasthan', placeOfSupplyCode: '08', taxModeOverride: 'auto', orderReference: 'Yes', ewayBillDateTime: '',
    notes: 'Old Gold & Silver Purchase', items, ...over,
  };
  const rec = buildRecord(form, { settings: DEFAULT_SETTINGS, status: over.status || 'final' });
  return { ...rec, number, invoiceNo: String(number), ...(over.status === 'cancelled' ? { cancelReason: 'Test cancellation' } : {}) };
}

const cases = [
  invoice('inv_one', 158, [item(0, { description: 'Necklace Set 22k', pcs: '3', grossWt: '11.880', stoneWt: '', huid: '00', makingType: 'percent', makingValue: '9.25', additionalValue: '' })]),
  invoice('inv_oldmetal', 162, [item(0, { description: 'Necklace Set 22k', pcs: '3', grossWt: '11.880', stoneWt: '', huid: '00', makingType: 'percent', makingValue: '9.25', additionalValue: '' })], {
    oldMetal: {
      gold: { direction: 'less', weight: '5.250', rate: '11500', amount: '' },
      silver: { direction: 'less', weight: '', rate: '', amount: '2500' },
    },
  }),
  invoice('inv_max', 159, Array.from({ length: 14 }, (_, i) => item(i))),
  invoice('inv_igst', 160, [item(0), item(1, { metal: 'Silver', purity: 'Silver 925', fineness: '92.50', description: 'Silver Payal', rate: '95', grossWt: '120.500' })], {
    placeOfSupply: 'Gujarat', placeOfSupplyCode: '24', customer: { name: 'TEST GUJARAT CUSTOMER', phone: '', address: 'CG Road', city: 'Ahmedabad', state: 'Gujarat', stateCode: '24', pin: '', gstin: '24ABCDE1234F1Z5', panAadhaar: '' },
  }),
  invoice('inv_cancel', 161, [item(2)], { status: 'cancelled' }),
];

async function cdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0;
  const pending = new Map();
  const listeners = [];
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
    } else listeners.forEach((l) => l(msg));
  };
  const send = (method, params = {}) => new Promise((res, rej) => { id += 1; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
  const waitFor = (method) => new Promise((res) => { const l = (m) => { if (m.method === method) { listeners.splice(listeners.indexOf(l), 1); res(m); } }; listeners.push(l); });
  return { send, waitFor, close: () => ws.close() };
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const profile = mkdtempSync(join(tmpdir(), 'abs-print-'));
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
  try {
    let targets;
    for (let i = 0; i < 50; i += 1) {
      try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (targets.length) break; } catch { /* starting */ }
      await sleep(200);
    }
    const page = targets.find((t) => t.type === 'page');
    const c = await cdp(page.webSocketDebuggerUrl);
    await c.send('Page.enable');

    const go = async (url) => { const loaded = c.waitFor('Page.loadEventFired'); await c.send('Page.navigate', { url }); await loaded; await sleep(1500); };

    await go(`${APP}/`);
    const store = Object.fromEntries(cases.map((x) => [x.id, x]));
    await c.send('Runtime.evaluate', { expression: `localStorage.setItem('abs-billing:v1:invoices', ${JSON.stringify(JSON.stringify(store))}); true` });

    let failures = 0;
    for (const inv of cases) {
      await go(`${APP}/invoices/${inv.id}`);
      const { data } = await c.send('Page.printToPDF', { preferCSSPageSize: true, printBackground: true, displayHeaderFooter: false });
      const pdf = Buffer.from(data, 'base64');
      const file = join(OUT, `${inv.id}.pdf`);
      writeFileSync(file, pdf);
      const text = pdf.toString('latin1');
      const pages = (text.match(/\/Type\s*\/Page[^s]/g) || []).length;
      const box = (text.match(/\/MediaBox\s*\[([^\]]*)\]/) || [])[1]?.trim().split(/\s+/).map(Number) || [];
      const a4 = Math.abs(box[2] - 595.28) < 1.5 && Math.abs(box[3] - 841.89) < 1.5;
      const ok = pages === 1 && a4;
      if (!ok) failures += 1;
      console.log(`${ok ? 'PASS' : 'FAIL'}  ${inv.id.padEnd(13)} items=${String(inv.items.length).padStart(2)}  pages=${pages}  size=${box.slice(2).map((n) => n.toFixed(1)).join('x')}pt  ${file}`);
    }
    // WhatsApp / Download PDF export (generated in the browser by src/invoice/invoicePdf.js)
    for (const inv of cases.filter((x) => ['inv_oldmetal', 'inv_max'].includes(x.id))) {
      await go(`${APP}/invoices/${inv.id}`);
      const { result } = await c.send('Runtime.evaluate', {
        awaitPromise: true,
        returnByValue: true,
        expression: `(async () => {
          const { createInvoicePdf } = await import('/src/invoice/invoicePdf.js');
          const inv = JSON.parse(localStorage.getItem('abs-billing:v1:invoices'))['${inv.id}'];
          const file = await createInvoicePdf({ invoice: inv });
          const buf = new Uint8Array(await file.arrayBuffer());
          let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
          return { name: file.name, type: file.type, b64: btoa(bin) };
        })()`,
      });
      const v = result.value;
      const pdf = Buffer.from(v.b64, 'base64');
      const file = join(OUT, `export-${v.name}`);
      writeFileSync(file, pdf);
      const text = pdf.toString('latin1');
      const pages = (text.match(/\/Type\s*\/Page[^s]/g) || []).length;
      const box = (text.match(/\/MediaBox\s*\[([^\]]*)\]/) || [])[1]?.trim().split(/\s+/).map(Number) || [];
      const ok = pages === 1 && v.type === 'application/pdf' && Math.abs(box[2] - 595.28) < 1.5 && Math.abs(box[3] - 841.89) < 1.5;
      if (!ok) failures += 1;
      console.log(`${ok ? 'PASS' : 'FAIL'}  PDF export ${inv.id.padEnd(13)} pages=${pages}  ${Math.round(pdf.length / 1024)} KB  ${file}`);
    }

    c.close();
    if (failures) process.exitCode = 1;
  } finally {
    chrome.kill();
    await sleep(300);
    rmSync(profile, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
