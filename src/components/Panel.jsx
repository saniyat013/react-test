export default function Panel({ title, packages = [], children, footer }) {
  return (
    <div className="panel panel-default demo-panel">
      <div className="panel-heading">
        <h3 className="panel-title">{title}</h3>
        <div className="pkg-tags">
          {packages.map((p) => (
            <span key={p} className="label label-default pkg-tag">{p}</span>
          ))}
        </div>
      </div>
      <div className="panel-body">{children}</div>
      {footer && <div className="panel-footer small text-muted">{footer}</div>}
    </div>
  );
}
