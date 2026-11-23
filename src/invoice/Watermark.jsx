/**
 * Central watermark: large, very light monogram with the shop name below,
 * drawn in mm units (viewBox = 194 x 108 mm) so it prints at a fixed size.
 */
export default function Watermark({ mode = 'monogram', text = 'ABS', name = '', logoDataUrl = '' }) {
  if (mode === 'none') return null;

  if (mode === 'logo' && logoDataUrl) {
    return (
      <div className="inv-watermark" aria-hidden="true">
        <img src={logoDataUrl} alt="" />
      </div>
    );
  }

  const letters = String(text || 'ABS').slice(0, 4).split('');
  const words = String(name || 'AMBALAL BHANWARLAL SARUPARIA').trim().split(/\s+/);
  const line1 = words.length > 1 ? words.slice(0, -1).join(' ') : words[0];
  const line2 = words.length > 1 ? words[words.length - 1] : '';
  const mark = 'var(--inv-wm-mark)';
  const ink = 'var(--inv-wm-text)';

  return (
    <div className="inv-watermark" aria-hidden="true">
      <svg viewBox="0 0 194 108" xmlns="http://www.w3.org/2000/svg">
        {/* thin vertical rules either side of the monogram */}
        <line x1="35" y1="4" x2="35" y2="60" stroke={ink} strokeWidth="0.35" />
        <line x1="159" y1="4" x2="159" y2="60" stroke={ink} strokeWidth="0.35" />

        <text x="97" y="57" textAnchor="middle" className="wm-serif" fill={mark} fontWeight="500">
          {letters.map((ch, i) => (
            <tspan key={i} dx={i === 0 ? 0 : -7} fontSize={i === 0 ? 68 : 60}>
              {ch}
            </tspan>
          ))}
        </text>

        {/* ™ mark */}
        <circle cx="168" cy="7" r="2.8" fill="none" stroke={mark} strokeWidth="0.35" />
        <text x="168" y="7.9" textAnchor="middle" fontSize="2.2" fill={mark} fontFamily="Arial, sans-serif">TM</text>

        <text
          x="97"
          y="79"
          textAnchor="middle"
          className="wm-serif"
          fontSize="11.5"
          fontWeight="600"
          fill={ink}
          textLength="172"
          lengthAdjust="spacing"
        >
          {line1}
        </text>

        {line2 && <line x1="14" y1="91.6" x2="47" y2="91.6" stroke={ink} strokeWidth="0.4" />}
        {line2 && <line x1="147" y1="91.6" x2="180" y2="91.6" stroke={ink} strokeWidth="0.4" />}
        {line2 && <text
          x="97"
          y="94.2"
          textAnchor="middle"
          className="wm-serif"
          fontSize="7.8"
          fontWeight="600"
          fill={ink}
          textLength="88"
          lengthAdjust="spacing"
        >
          {line2}
        </text>}
      </svg>
    </div>
  );
}
