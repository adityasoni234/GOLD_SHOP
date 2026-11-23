import { buildRecord } from '../services/invoiceService.js';
import { todayISO } from './dateUtils.js';

/** A sample invoice for the print-alignment test page (never saved). */
export function buildSampleInvoice(settings) {
  const form = {
    id: 'sample',
    date: todayISO(),
    customer: {
      name: 'SAMPLE CUSTOMER',
      phone: '',
      address: 'Ashoknagar',
      city: 'Udaipur',
      state: 'Rajasthan',
      stateCode: '08',
      pin: '',
      gstin: '',
      panAadhaar: '',
    },
    placeOfSupply: 'Rajasthan',
    placeOfSupplyCode: '08',
    taxModeOverride: 'auto',
    orderReference: 'Yes',
    ewayBillDateTime: '',
    notes: 'Old Gold & Silver Purchase',
    items: [
      {
        id: 's1', metal: 'Gold', category: 'Necklace Set', description: 'Necklace Set 22k', hsn: '7113', huid: '00',
        pcs: '3', purity: '22K', fineness: '91.60', grossWt: '11.880', stoneWt: '0', netWt: '', netManual: false,
        rate: '12700', makingType: 'percent', makingValue: '9.25', additionalType: 'fixed', additionalValue: '0',
      },
    ],
  };
  const record = buildRecord(form, { settings, status: 'final' });
  return { ...record, invoiceNo: '000' };
}
