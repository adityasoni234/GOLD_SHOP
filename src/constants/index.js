export const INDIAN_STATES = [
  { code: '01', name: 'Jammu and Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra and Nagar Haveli and Daman and Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman and Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '38', name: 'Ladakh' },
  { code: '97', name: 'Other Territory' },
];

export const stateCodeFor = (name) => INDIAN_STATES.find((s) => s.name === name)?.code || '';
export const stateNameFor = (code) => INDIAN_STATES.find((s) => s.code === code)?.name || '';

export const JEWELLERY_CATEGORIES = [
  'Necklace',
  'Necklace Set',
  'Ring',
  'Gold Chain',
  'Bracelet',
  'Bangles',
  'Earrings',
  'Pendant',
  'Mangalsutra',
  'Silver Jewellery',
  'Other',
];

export const METALS = ['Gold', 'Silver'];

/** Default purity master. Karat label and fineness are kept separately (22K != 22). */
export const DEFAULT_PURITIES = [
  { label: '24K', metal: 'Gold', fineness: '99.90' },
  { label: '22K', metal: 'Gold', fineness: '91.60' },
  { label: '20K', metal: 'Gold', fineness: '83.30' },
  { label: '18K', metal: 'Gold', fineness: '75.00' },
  { label: '14K', metal: 'Gold', fineness: '58.50' },
  { label: 'Silver 999', metal: 'Silver', fineness: '99.90' },
  { label: 'Silver 925', metal: 'Silver', fineness: '92.50' },
];

export const PAYMENT_MODES = [
  'Cash',
  'UPI',
  'Bank Transfer',
  'Debit/Credit Card',
  'Cheque',
  'Old Gold/Silver Exchange',
  'Mixed Payment',
];

export const PAYMENT_STATUS = Object.freeze({
  PAID: 'Paid',
  PARTIAL: 'Partially Paid',
  UNPAID: 'Unpaid',
});

export const INVOICE_STATUS = Object.freeze({
  DRAFT: 'draft',
  FINAL: 'final',
  CANCELLED: 'cancelled',
});

export const NOTE_PRESETS = [
  'Old Gold & Silver Purchase',
  'Exchange Details',
  'Advance Payment',
  'Special Discount',
  'Custom Order',
];

export const DATE_FORMATS = ['dd-MM-yyyy', 'dd/MM/yyyy', 'dd.MM.yyyy', 'yyyy-MM-dd'];

/** Rows that fit on the single A4 page. Enforced by the invoice form. */
export const MAX_ITEMS_PER_INVOICE = 14;
