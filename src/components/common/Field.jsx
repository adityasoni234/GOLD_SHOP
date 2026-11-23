/** Label + control + error/hint wrapper. */
export default function Field({ label, required, error, hint, className = '', children, htmlFor }) {
  return (
    <div className={`field ${className}`}>
      {label && (
        <label htmlFor={htmlFor}>
          {label} {required && <span className="req">*</span>}
        </label>
      )}
      {children}
      {error ? <span className="field-error">{error}</span> : hint ? <span className="field-hint">{hint}</span> : null}
    </div>
  );
}
