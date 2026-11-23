import { useMemo, useState } from 'react';
import { Gem, Plus, Pencil, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../components/common/Toast.jsx';
import PageHeader from '../components/common/PageHeader.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import ProductForm from '../components/products/ProductForm.jsx';
import { JEWELLERY_CATEGORIES } from '../constants/index.js';
import { MAKING_TYPE_LABELS } from '../utils/calculations.js';

export default function Products() {
  const { products, saveProduct, deleteProduct, settings } = useApp();
  const toast = useToast();
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [category, setCategory] = useState('');
  const [q, setQ] = useState('');

  const filtered = useMemo(
    () =>
      products.filter(
        (p) => (!category || p.category === category) && (!q || `${p.name} ${p.huid} ${p.description}`.toLowerCase().includes(q.toLowerCase())),
      ),
    [products, category, q],
  );

  return (
    <>
      <PageHeader
        title="Jewellery products"
        subtitle="Optional product master. Selecting a product on an invoice fills its details; you can always type items directly."
        actions={<button className="btn btn-primary" onClick={() => setEditing({})}><Plus size={15} /> Add product</button>}
      />
      <div className="card">
        <div className="card-header filters" style={{ justifyContent: 'flex-start' }}>
          <input className="input" style={{ maxWidth: 300 }} placeholder="Search name, HUID…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="select" style={{ maxWidth: 200 }} value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {JEWELLERY_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon={Gem} title={products.length ? 'No matching products' : 'No products yet'}>
            Add frequently sold designs to speed up billing.
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Product</th><th>Category</th><th>Metal / purity</th><th>HSN</th><th>HUID</th><th>Default making</th><th>Default addl.</th><th /></tr></thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td className="strong">{p.name}<div className="small muted">{p.description}</div></td>
                    <td>{p.category}</td>
                    <td>{p.metal} · {p.purity}</td>
                    <td>{p.hsn}</td>
                    <td>{p.huid}</td>
                    <td>{p.makingValue ? `${p.makingValue} (${MAKING_TYPE_LABELS[p.makingType]})` : '—'}</td>
                    <td>{p.additionalValue ? `₹${p.additionalValue}` : '—'}</td>
                    <td className="actions">
                      <button className="btn btn-sm btn-icon" title="Edit" onClick={() => setEditing(p)}><Pencil size={14} /></button>
                      <button className="btn btn-sm btn-icon btn-danger" title="Delete" onClick={() => setDeleting(p)}><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {editing && (
        <ProductForm
          product={editing}
          settings={settings}
          onClose={() => setEditing(null)}
          onSave={async (p) => { await saveProduct(p); toast('Product saved.', 'success'); }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={`Delete ${deleting.name}?`}
          message="Invoices already created with this product are not affected."
          danger
          confirmLabel="Delete product"
          onConfirm={async () => { await deleteProduct(deleting.id); toast('Product deleted.', 'success'); }}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  );
}
