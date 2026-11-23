export default function EmptyState({ icon: Icon, title, children }) {
  return (
    <div className="empty">
      {Icon && <Icon size={34} strokeWidth={1.4} />}
      <div className="strong" style={{ color: 'var(--brown)' }}>{title}</div>
      {children && <div className="small" style={{ marginTop: 6 }}>{children}</div>}
    </div>
  );
}
