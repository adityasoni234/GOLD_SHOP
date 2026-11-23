import { uid } from '../../utils/misc.js';
import { todayISO } from '../../utils/dateUtils.js';
import { EMPTY_CUSTOMER } from '../../services/customerService.js';
import { INVOICE_STATUS } from '../../constants/index.js';
import { emptyOldMetal } from '../../utils/calculations.js';

export function purityInfo(settings, label) {
  return settings.jewellery.purities.find((p) => p.label === label);
}

export function puritiesFor(settings, metal) {
  return settings.jewellery.purities.filter((p) => p.metal === metal);
}

export function autoDescription(category, purity) {
  const p = String(purity || '').replace(/^Silver\s*/i, '');
  return [category, p].filter(Boolean).join(' ');
}

export function emptyItem(settings, getTodayRate) {
  const j = settings.jewellery;
  const metal = j.defaultMetal || 'Gold';
  const purity = purityInfo(settings, j.defaultPurity)?.metal === metal ? j.defaultPurity : puritiesFor(settings, metal)[0]?.label;
  const today = getTodayRate?.(metal, purity);
  return {
    id: uid('itm_'),
    productId: '',
    category: 'Necklace',
    metal,
    description: autoDescription('Necklace', purity),
    descriptionAuto: true,
    hsn: j.defaultHsn || '7113',
    huid: '',
    pcs: '1',
    purity,
    fineness: purityInfo(settings, purity)?.fineness || '',
    grossWt: '',
    stoneWt: '',
    netWt: '',
    netManual: false,
    rate: today?.rate || '',
    rateManual: false,
    makingType: j.defaultMakingType || 'percent',
    makingValue: j.defaultMakingValue || '',
    additionalType: j.defaultAdditionalType || 'fixed',
    additionalValue: '',
  };
}

export function emptyForm(settings, getTodayRate) {
  return {
    id: uid('inv_'), // stable id = idempotency key; prevents duplicate invoices on double-submit
    status: INVOICE_STATUS.DRAFT,
    date: todayISO(),
    customerId: '',
    customer: { ...EMPTY_CUSTOMER, state: settings.business.state, stateCode: settings.business.stateCode },
    placeOfSupply: settings.business.state,
    placeOfSupplyCode: settings.business.stateCode,
    taxModeOverride: 'auto',
    orderReference: 'No',
    ewayBillDateTime: '',
    notes: '',
    oldMetal: emptyOldMetal(),
    items: [emptyItem(settings, getTodayRate)],
  };
}

/** Load an invoice into the form. `duplicate` creates a fresh draft copy. */
export function formFromInvoice(invoice, { duplicate = false } = {}) {
  const base = {
    id: duplicate ? uid('inv_') : invoice.id,
    status: duplicate ? INVOICE_STATUS.DRAFT : invoice.status,
    number: duplicate ? null : invoice.number,
    date: duplicate ? todayISO() : invoice.date,
    customerId: invoice.customerId || '',
    customer: { ...EMPTY_CUSTOMER, ...invoice.customer },
    placeOfSupply: invoice.placeOfSupply,
    placeOfSupplyCode: invoice.placeOfSupplyCode,
    taxModeOverride: invoice.taxModeOverride || 'auto',
    orderReference: invoice.orderReference || 'No',
    ewayBillDateTime: duplicate ? '' : invoice.ewayBillDateTime || '',
    notes: invoice.notes || '',
    oldMetal: { ...emptyOldMetal(), ...(invoice.oldMetal || {}) },
    items: invoice.items.map((it) => ({ ...it, id: duplicate ? uid('itm_') : it.id })),
  };
  return base;
}
