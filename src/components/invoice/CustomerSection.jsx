import { useMemo, useState } from 'react';
import { User, UserCheck, UserPlus, Search } from 'lucide-react';
import Field from '../common/Field.jsx';
import { INDIAN_STATES, stateCodeFor } from '../../constants/index.js';
import { EMPTY_CUSTOMER } from '../../services/customerService.js';

/** Customer block of the invoice form: search existing customers or type a new one. */
export default function CustomerSection({ form, setForm, customers, errors = {} }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const c = form.customer;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers.slice(0, 8);
    return customers
      .filter((x) => x.name.toLowerCase().includes(q) || String(x.phone || '').includes(q) || String(x.city || '').toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, customers]);

  const setCustomer = (patch) => setForm((f) => ({ ...f, customer: { ...f.customer, ...patch } }));

  const pick = (cust) => {
    const { id, stats, createdAt, updatedAt, ...fields } = cust;
    setForm((f) => ({ ...f, customerId: id, customer: { ...EMPTY_CUSTOMER, ...fields } }));
    setQuery('');
    setOpen(false);
  };

  const clearLink = () => setForm((f) => ({ ...f, customerId: '' }));

  return (
    <div className="card">
      <div className="card-header">
        <h3><User size={16} /> Customer</h3>
        {form.customerId ? (
          <span className="linked-cust">
            <UserCheck size={14} /> Existing customer
            <button type="button" className="btn btn-ghost btn-sm" onClick={clearLink} title="Save as a new customer instead">
              <UserPlus size={13} /> New
            </button>
          </span>
        ) : (
          <span className="small muted">New customers are saved automatically</span>
        )}
      </div>
      <div className="card-body stack">
        <div className="cust-search">
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: 9, color: 'var(--text-muted)' }} />
            <input
              className="input"
              style={{ paddingLeft: 32 }}
              placeholder="Find existing customer by name, phone or city…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
                setActive(0);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              onKeyDown={(e) => {
                if (!open || !matches.length) return;
                if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, matches.length - 1)); }
                if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
                if (e.key === 'Enter') { e.preventDefault(); pick(matches[active]); }
                if (e.key === 'Escape') setOpen(false);
              }}
            />
          </div>
          {open && matches.length > 0 && (
            <div className="cust-results">
              {matches.map((m, i) => (
                <button type="button" key={m.id} className={i === active ? 'active' : ''} onMouseDown={() => pick(m)}>
                  <div className="strong">{m.name}</div>
                  <div className="meta">{[m.phone, m.city, m.address].filter(Boolean).join(' · ')}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="form-grid">
          <Field label="Customer name" required error={errors.name} className="span-2">
            <input className={`input ${errors.name ? 'invalid' : ''}`} value={c.name} onChange={(e) => setCustomer({ name: e.target.value })} placeholder="e.g. MANJU LODHA" />
          </Field>
          <Field label="Phone">
            <input className="input" type="tel" inputMode="numeric" value={c.phone} onChange={(e) => setCustomer({ phone: e.target.value })} placeholder="10-digit mobile" />
          </Field>
          <Field label="City">
            <input className="input" value={c.city} onChange={(e) => setCustomer({ city: e.target.value })} />
          </Field>
          <Field label="Address" className="span-2">
            <input className="input" value={c.address} onChange={(e) => setCustomer({ address: e.target.value })} placeholder="e.g. Ashoknagar" />
          </Field>
          <Field label="State">
            <select
              className="select"
              value={c.state}
              onChange={(e) => setCustomer({ state: e.target.value, stateCode: stateCodeFor(e.target.value) })}
            >
              {INDIAN_STATES.map((s) => <option key={s.code} value={s.name}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="State code">
            <input className="input" value={c.stateCode} readOnly />
          </Field>
          <Field label="PIN code">
            <input className="input" inputMode="numeric" maxLength={6} value={c.pin} onChange={(e) => setCustomer({ pin: e.target.value })} />
          </Field>
          <Field label="GSTIN (optional)">
            <input className="input" value={c.gstin} onChange={(e) => setCustomer({ gstin: e.target.value.toUpperCase() })} maxLength={15} />
          </Field>
          <Field label="PAN / Aadhaar ref. (optional)">
            <input className="input" value={c.panAadhaar} onChange={(e) => setCustomer({ panAadhaar: e.target.value.toUpperCase() })} />
          </Field>
        </div>
      </div>
    </div>
  );
}
