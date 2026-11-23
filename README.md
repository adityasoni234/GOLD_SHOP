# ABS Jewellery Billing

Gold & silver jewellery billing and management software for **Ambalal Bhanwarlal Saruparia**, Udaipur.
React + Vite + JavaScript, with Firebase Firestore when it's configured and a localStorage demo mode when it isn't. There is no separate backend server.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # calculation unit tests (Node built-in test runner)
npm run test:print   # real-browser print test (needs `npm run dev` running + Google Chrome)
npm run build        # production build in dist/
```

Without Firebase credentials the app runs in **demo mode**: everything is saved in this browser's localStorage, and a "Demo mode" badge shows in the sidebar. Use *Settings → Data & backup* to download a JSON backup.

## Before issuing live invoices

These values were copied from the reference invoice. Each one needs confirming:

1. **Shop GSTIN** (`08ADSPS9102J1ZX`): confirm it, then tick it in *Settings*.
2. **Bank IFSC**: left blank on purpose. Enter the exact code in *Settings → Bank details*.
3. **GST rates** (CGST 1.5% + SGST 1.5%, IGST 3%) and whether making/additional charges are taxable: check these with your accountant.
4. **Starting invoice number**: the default is **158** (the reference bill was 157). Change it in *Settings → Invoice & print* before the first real invoice.
5. **Making-charge method**: the reference line (11.88 g × ₹12,700 at 9.25% making) works out to ₹1,64,832.03 with a plain percentage. The reference bill shows ₹1,64,834.95. Check how the shop actually computes making; the app supports % of metal value, ₹/gram and a fixed amount.

The dashboard and invoice form show a warning until items 1–3 are ticked.

## Printing (A4)

The printed invoice is a fixed 210 × 297 mm canvas built to match the reference bill's layout. In the browser print dialog, set:

- Paper **A4**, **Portrait**, Margins **None**, Scale **100%**
- **Background graphics: on** (needed for the watermark)
- **Headers and footers: off**

*Download PDF* saves a real A4 PDF file of the bill (`Invoice-<no>-<customer>.pdf`).
If your printer shifts the page, open *Settings → Invoice & print → Print alignment test* and adjust the top/left offsets.
One invoice holds up to **14 items** so it always fits on one page.

## WhatsApp

- **Send bill on WhatsApp** (invoice page, All Invoices rows, after saving, and offered automatically after printing) creates the A4 bill as a PDF.
  - Phones, Safari and other browsers that can share files: the share menu opens with the PDF attached. Choose WhatsApp, then the customer.
  - Other browsers: the PDF downloads and the customer's WhatsApp chat opens with the bill summary. Attach the PDF with 📎 → Document.
- **Reminder** (invoice page and Payments → Outstanding) sends a balance-due message.
- Every send is recorded in the invoice's audit trail.

## Connecting Firebase

1. Create a Firebase project and a Web app, then enable **Firestore**. Optionally enable **Authentication → Email/Password**.
2. Copy `.env.example` to `.env.local` and fill in the `VITE_FIREBASE_*` values. `.env.local` is git-ignored.
3. Optional: set `VITE_FIREBASE_REQUIRE_AUTH=true` and create operator accounts in Firebase Auth.
4. Deploy the starter security rules in `firestore.rules`. Review them before going live.
5. Restart `npm run dev`. The sidebar badge changes to "Firebase connected".

Collections: `invoices`, `customers`, `products`, `goldRates`, `silverRates`, `settings`, `payments`, `auditLogs`, plus `invoiceNumbers` (one reservation document per number).
Invoice numbers are allocated in a **Firestore transaction**. The transaction reads `settings/counters` and creates `invoiceNumbers/{n}`, so two counters can't issue the same number.
Demo data in localStorage is **not** copied to Firestore automatically.

## How the data stays correct

- **Exact arithmetic**: weights are stored as integer milligrams, money as integer paise and percentages as scaled integers. Products are computed with BigInt and half-up rounding. No floating-point maths is used for money (`src/utils/decimal.js`).
- **Per item**: Net = Gross − Stone (or a manual net, checked to be ≤ gross). Metal = Net × Rate. Making = % / ₹ per g / fixed. Additional = fixed / ₹ per g / ₹ per piece.
- **GST**: CGST + SGST within the state, IGST between states, never both. The mode is decided automatically from the place of supply and can be overridden per invoice. Each tax is rounded to the paisa, then the total is rounded off (nearest/up/down/none).
- **Snapshots**: a finalized invoice stores its own copy of the customer, shop details, bank details, terms, tax settings, item rates and every computed figure. Changing today's rate or settings never changes an old invoice.
- **No silent overwrites**: editing a finalized invoice needs a reason and creates *Rev N*; the previous version is kept in `auditLogs`. Cancelling needs a reason, keeps the invoice and never reuses its number.
- **Duplicate protection**: each form has a fixed id, so a double-click or retry returns the invoice that already exists instead of creating a second one.
- **Payments** live in their own collection and only update paid/balance/status. They never change GST.

## Project structure

```
src/
  components/   common, layout, invoice (form), customers, products, payments
  pages/        Dashboard, CreateInvoice, InvoiceHistory, InvoiceDetails, Customers,
                Products, GoldRates, Payments, Reports, Settings, PrintSample
  invoice/      PrintableInvoice.jsx, invoice-print.css, Watermark, A4Preview, PrintPortal
  services/     invoice/customer/product/rate/settings/payment/audit services, db adapter, localAdapter
  firebase/     firebase.js (init from env), firestore.js (Firestore adapter + transactions)
  utils/        decimal, calculations, gstCalculations, currency, numberToWords, validators,
                invoiceNumber, dateUtils, reports
  context/      AppContext.jsx
  hooks/        useInvoices, useCustomers, useGoldRates
tests/          calculation tests with known expected values
scripts/        print-test.mjs (headless Chrome → PDF, checks one A4 page)
```

## Known limitations

- Demo mode keeps data in one browser profile only. Use Firebase for real multi-device use.
- With Firebase, all collections are loaded when the app starts. This suits a single shop; very large histories will want paging.
- WhatsApp click-to-chat links cannot attach files, so on browsers without file sharing you attach the downloaded PDF yourself.
- Reports show **revenue**, not profit. Purchase cost and inventory are not tracked.
