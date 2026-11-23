import { useMemo } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { findLatestRate } from '../services/rateService.js';

/** Latest rate per purity label (gold + silver), with the time it was set. */
export function useGoldRates() {
  const { goldRates, silverRates, saveRates, getTodayRate, settings } = useApp();
  const current = useMemo(() => {
    const out = {};
    settings.jewellery.purities.forEach((p) => {
      out[p.label] = findLatestRate(p.metal === 'Silver' ? silverRates : goldRates, p.label);
    });
    return out;
  }, [goldRates, silverRates, settings.jewellery.purities]);
  const lastUpdated = [goldRates[0]?.effectiveAt, silverRates[0]?.effectiveAt].filter(Boolean).sort().pop() || '';
  return { goldRates, silverRates, current, lastUpdated, saveRates, getTodayRate };
}
