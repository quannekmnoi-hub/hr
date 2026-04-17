interface Props {
  pathname: string
  actionLabel: string
  onAction: () => void
}

export default function NotFoundPage({ pathname, actionLabel, onAction }: Props) {
  return (
    <div className="auth-page" style={{ padding: 24 }}>
      <div className="auth-card" style={{ maxWidth: 560 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'var(--primary-light)',
            color: 'var(--primary)',
            fontSize: 28,
            fontWeight: 900,
            marginBottom: 24,
          }}
        >
          404
        </div>

        <h1 style={{ fontSize: 36, marginBottom: 12 }}>Page Not Found</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 12 }}>
          The path you opened does not exist in this application.
        </p>
        <p
          style={{
            color: 'var(--text)',
            background: 'var(--input-bg)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: '12px 16px',
            marginBottom: 28,
            wordBreak: 'break-all',
            fontFamily: 'monospace',
            fontSize: 14,
          }}
        >
          {pathname}
        </p>

        <button type="button" className="btn btn-primary" onClick={onAction}>
          {actionLabel}
        </button>
      </div>
    </div>
  )
}
