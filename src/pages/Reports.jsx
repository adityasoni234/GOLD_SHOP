import { useMemo, useState } from 'react';
import { Download, BarChart3, Info } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import PageHeader from '../components/common/PageHeader.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { REPORT_TYPES, buildReport, formatCell, csvValue } from '../utils/reports.js';
import { downloadCSV } from '../utils/misc.js';
import { format, startOfMonth, startOfYear, subDays } from 'date-fns';

const iso = (d) => format(d, 'yyyy-MM-dd');

export default function Reports() {
  const { invoices, payments } = useApp();
  const [type, setType] = useState('daily');
  const [from, setFrom] = useState(iso(startOfMonth(new Date())));
  const [to, setTo] = useState(iso(new Date()));

  const report = useMemo(() => buildReport(type, { invoices, payments, from, to }), [type, invoices, payments, from, to]);
  const label = REPORT_TYPES.find((r) => r.id === type)?.label;

  const presets = [
    ['Today', iso(new Date()), iso(new Date())],
    ['Last 7 days', iso(subDays(new Date(), 6)), iso(new Date())],
    ['This month', iso(startOfMonth(new Date())), iso(new Date())],
    ['This year', iso(startOfYear(new Date())), iso(new Date())],
    ['All time', '', ''],
  ];

  const exportCsv = () =>
    downloadCSV(
      `${type}-report${from ? `-${from}` : ''}${to ? `-to-${to}` : ''}.csv`,
      report.columns.map((c) => ({ label: c.label, csv: (r) => csvValue(c, r[c.key]) })),
      [...report.rows, { ...Object.fromEntries(report.columns.map((c) => [c.key, ''])), ...report.totals, [report.columns[0].key]: 'TOTAL' }],
    );

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Sales figures are revenue from finalized invoices. They are not profit: purchase cost and inventory are not tracked."
        actions={<button className="btn btn-primary" onClick={exportCsv} disabled={!report.rows.length}><Download size={15} /> Export CSV</button>}
      />
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body stack">
          <div className="tabs">
            {REPORT_TYPES.map((r) => (
              <button key={r.id} className={type === r.id ? 'active' : ''} onClick={() => setType(r.id)}>{r.label}</button>
            ))}
          </div>
          <div className="filters">
            <div className="field"><label>From</label><input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div className="field"><label>To</label><input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
            <div className="row wrap">
              {presets.map(([l, f, t]) => (
                <button key={l} className="btn btn-sm" onClick={() => { setFrom(f); setTo(t); }}>{l}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3><BarChart3 size={16} /> {label}</h3><span className="small muted">{report.rows.length} rows</span></div>
        {report.rows.length === 0 ? (
          <EmptyState icon={BarChart3} title="No data for this period" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>{report.columns.map((c) => <th key={c.key} className={c.align === 'right' ? 'num' : ''}>{c.label}</th>)}</tr>
              </thead>
              <tbody>
                {report.rows.map((r) => (
                  <tr key={r.key}>
                    {report.columns.map((c) => <td key={c.key} className={c.align === 'right' ? 'num' : ''}>{formatCell(c, r[c.key])}</td>)}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  {report.columns.map((c, i) => (
                    <td key={c.key} className={c.align === 'right' ? 'num' : ''}>
                      {i === 0 ? 'Total' : c.key in report.totals ? formatCell(c, report.totals[c.key]) : ''}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
      {type === 'gst' && (
        <div className="alert info" style={{ marginTop: 16 }}>
          <Info size={16} />
          <div>Use this as a working summary for your accountant. Confirm GST return figures against your official books.</div>
        </div>
      )}
    </>
  );
}
