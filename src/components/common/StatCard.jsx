export default function StatCard({ icon: Icon, label, value, meta }) {
  return (
    <div className="card stat">
      <div className="label">
        {Icon && <Icon size={15} />} {label}
      </div>
      <div className="value">{value}</div>
      {meta && <div className="meta">{meta}</div>}
    </div>
  );
}
