import { useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import PageHeader from '../components/common/PageHeader.jsx';
import A4Preview from '../invoice/A4Preview.jsx';
import PrintPortal from '../invoice/PrintPortal.jsx';
import { printInvoice } from '../invoice/printInvoice.js';
import { buildSampleInvoice } from '../utils/sampleInvoice.js';

/** Printer alignment test: prints a sample invoice stamped SAMPLE. */
export default function PrintSample() {
  const { settings } = useApp();
  const [params] = useSearchParams();
  const invoice = useMemo(() => buildSampleInvoice(settings), [settings]);
  const printProps = { invoice, print: settings.invoice, logoDataUrl: settings.business.logoDataUrl, sample: true };

  useEffect(() => {
    if (params.get('autoprint') === '1') printInvoice(invoice);
  }, [params, invoice]);

  return (
    <>
      <PageHeader
        title="Print alignment test"
        subtitle="Print this on plain A4 paper to check margins. Adjust print offsets in Settings if your printer shifts the page."
        actions={
          <>
            <Link className="btn" to="/settings"><ArrowLeft size={15} /> Settings</Link>
            <button className="btn btn-primary" onClick={() => printInvoice(invoice)}><Printer size={15} /> Print test page</button>
          </>
        }
      />
      <div style={{ maxWidth: 820 }}>
        <A4Preview {...printProps} />
      </div>
      <PrintPortal {...printProps} />
    </>
  );
}
