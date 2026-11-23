import { useState } from 'react';
import { Coins, Save, History, Info } from 'lucide-react';
import { useGoldRates } from '../hooks/useGoldRates.js';
import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../components/common/Toast.jsx';
import PageHeader from '../components/common/PageHeader.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { formatINR } from '../utils/currency.js';
import { formatDateTime } from '../utils/dateUtils.js';
import { parseScaled, toScaled, SCALE } from '../utils/decimal.js';

function RateCard({ metal, purities, current, history, onSave }) {
  const [values, setValues] = useState(() => Object.fromEntries(purities.map((p) => [p.label, current[p.label]?.rate || ''])));
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const bad = Object.entries(values).filter(([, v]) => String(v).trim() !== '' && !(parseScaled(v, SCALE.MONEY) > 0));
    if (bad.length) return setError(`Rate must be greater than zero (${bad.map(([k]) => k).join(', ')}).`);
    if (!Object.values(values).some((v) => String(v).trim())) return setError('Enter at least one rate.');
    setError('');
    setBusy(true);
    try {
      await onSave(metal, values, note);
      setNote('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header"><h3><Coins size={16} /> {metal} rates (₹ per gram)</h3></div>
      <form className="card-body stack" onSubmit={submit}>
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
          {purities.map((p) => (
            <div className="field" key={p.label}>
              <label>{p.label} <span className="muted" style={{ textTransform: 'none' }}>({p.fineness})</span></label>
              <input className="input num" inputMode="decimal" value={values[p.label]} onChange={(e) => setValues({ ...values, [p.label]: e.target.value })} placeholder="0.00" />
              <span className="field-hint">
                {current[p.label] ? `Current ₹${formatINR(toScaled(current[p.label].rate, SCALE.MONEY))}` : 'Not set'}
              </span>
            </div>
          ))}
        </div>
        <div className="row wrap">
          <input className="input" style={{ maxWidth: 360 }} placeholder="Note (optional), e.g. morning rate" value={note} onChange={(e) => setNote(e.target.value)} />
          <button className="btn btn-primary" disabled={busy}><Save size={15} /> Save as today’s {metal.toLowerCase()} rates</button>
        </div>
        {error && <div className="field-error">{error}</div>}
        <div className="small muted">Last updated: {history[0] ? formatDateTime(history[0].effectiveAt) : 'never'}</div>
      </form>
    </div>
  );
}

export default function GoldRates() {
  const { goldRates, silverRates, current, saveRates } = useGoldRates();
  const { settings } = useApp();
  const toast = useToast();
  const gold = settings.jewellery.purities.filter((p) => p.metal === 'Gold');
  const silver = settings.jewellery.purities.filter((p) => p.metal === 'Silver');
  const history = [...goldRates, ...silverRates].sort((a, b) => (a.effectiveAt < b.effectiveAt ? 1 : -1)).slice(0, 40);

  const save = async (metal, values, note) => {
    await saveRates(metal, values, note);
    toast(`${metal} rates saved.`, 'success');
  };

  return (
    <>
      <PageHeader title="Gold & silver rates" subtitle="Enter rates manually. Live market prices are never fetched automatically." />
      <div className="alert info" style={{ marginBottom: 16 }}>
        <Info size={16} />
        <div>New invoices pick up the latest rate for each purity, and you can override the rate on any item. Finalized invoices keep the rate they were billed at — changing today’s rate never changes an old invoice. Add more purities (e.g. 14K) in Settings → Jewellery.</div>
      </div>
      <div className="grid cols-2" style={{ marginBottom: 16 }}>
        <RateCard key={`g-${goldRates.length}`} metal="Gold" purities={gold} current={current} history={goldRates} onSave={save} />
        <RateCard key={`s-${silverRates.length}`} metal="Silver" purities={silver} current={current} history={silverRates} onSave={save} />
      </div>
      <div className="card">
        <div className="card-header"><h3><History size={16} /> Rate history</h3></div>
        {history.length === 0 ? (
          <EmptyState icon={History} title="No rates saved yet" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Date &amp; time</th><th>Metal</th><th>Rates (₹/g)</th><th>Note</th><th>By</th></tr></thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td className="nowrap">{formatDateTime(h.effectiveAt)}</td>
                    <td>{h.metal}</td>
                    <td className="small">{Object.entries(h.rates).map(([k, v]) => `${k}: ₹${formatINR(toScaled(v, SCALE.MONEY))}`).join(' · ')}</td>
                    <td className="small">{h.note}</td>
                    <td className="small muted">{h.user}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
