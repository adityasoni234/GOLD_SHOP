import { useEffect, useRef, useState } from 'react';
import PrintableInvoice from './PrintableInvoice.jsx';

const A4_WIDTH_PX = (210 / 25.4) * 96; // 793.7px at CSS 96dpi
const A4_HEIGHT_PX = (297 / 25.4) * 96;

/**
 * Physical-size A4 invoice scaled down to fit its container on screen.
 * The invoice itself is always laid out at 210 x 297 mm.
 */
export default function A4Preview(props) {
  const ref = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!ref.current) return undefined;
    const ro = new ResizeObserver(([entry]) => {
      setScale(Math.min(1, entry.contentRect.width / A4_WIDTH_PX));
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="a4-preview" ref={ref} style={{ height: A4_HEIGHT_PX * scale }}>
      <div className="a4-scaler" style={{ transform: `scale(${scale})`, width: A4_WIDTH_PX }}>
        <PrintableInvoice {...props} />
      </div>
    </div>
  );
}
