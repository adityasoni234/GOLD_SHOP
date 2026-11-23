import { getOne, saveOne, COLLECTIONS } from './db.js';
import { deepMerge } from '../utils/misc.js';
import { DEFAULT_PURITIES } from '../constants/index.js';

const SETTINGS_ID = 'app';

/**
 * Defaults taken from the shop's reference invoice.
 * Items flagged in `verification` (GSTIN, IFSC, tax rates) must be confirmed by the
 * shopkeeper/accountant before issuing live tax invoices; the app shows a warning until then.
 */
export const DEFAULT_SETTINGS = {
  business: {
    name: 'AMBALAL BHANWARLAL SARUPARIA',
    address: '10-C NORTH PART, OPP. ARTH DIAGNOSTICS, MADHUBAN, UDAIPUR, RAJASTHAN - 313001.',
    contacts: '9414166467, 8107727819',
    gstin: '08ADSPS9102J1ZX',
    state: 'Rajasthan',
    stateCode: '08',
    logoDataUrl: '',
    watermarkMode: 'monogram', // 'monogram' | 'logo' | 'none'
    monogramText: 'ABS',
    operatorName: 'Shop Operator',
  },
  bank: {
    holder: 'AMBALAL BHANWARLAL SARUPARIA',
    bankName: 'ICICI BANK 0651',
    accountNo: '693405600651',
    branch: 'UDAIPUR',
    ifsc: '', // left blank on purpose: verify exact IFSC before use
  },
  invoice: {
    startNumber: 158,
    prefix: '',
    dateFormat: 'dd-MM-yyyy',
    paperSize: 'A4',
    printOffsetTopMm: 0,
    printOffsetLeftMm: 0,
    footerText: 'This is a Computer Generated Invoice',
    terms: [
      'The Jurisdiction Of All Disputes Will Be Udaipur.',
      'Shop Opening Time Is 10:30 AM.',
      'Errors & Omissions Excepted.',
      'Interest May Be Charged On The Remaining Amount As Per Shop Policy.',
      'Deposit The Amount And Collect An Official Receipt.',
      'There Is No Guarantee Against Breakage Of Artificial Fancy Goods.',
      'Old Jewellery Acceptance Is Subject To Shop Policy And Verification.',
      'Jewellery Is Checked Before Delivery.',
    ],
  },
  tax: {
    cgstRate: '1.50',
    sgstRate: '1.50',
    igstRate: '3.00',
    roundOff: 'nearest',
    includeMakingInTaxable: true,
    includeAdditionalInTaxable: true,
  },
  jewellery: {
    defaultMetal: 'Gold',
    defaultPurity: '22K',
    defaultHsn: '7113',
    defaultMakingType: 'percent',
    defaultMakingValue: '0',
    defaultAdditionalType: 'fixed',
    purities: DEFAULT_PURITIES,
  },
  verification: {
    gstin: false,
    ifsc: false,
    taxRates: false,
  },
};

export async function loadSettings() {
  const stored = await getOne(COLLECTIONS.SETTINGS, SETTINGS_ID);
  const { id, ...rest } = stored || {};
  return deepMerge(DEFAULT_SETTINGS, rest);
}

export async function saveSettings(settings) {
  const saved = await saveOne(COLLECTIONS.SETTINGS, SETTINGS_ID, { ...settings, updatedAt: new Date().toISOString() });
  const { id, ...rest } = saved;
  return deepMerge(DEFAULT_SETTINGS, rest);
}
