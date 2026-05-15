export default function BroadcastBanner({ banner, onDismiss }) {
  if (!banner) return null

  return (
    <div style={{
      position: 'fixed',
      top: '60px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 200,
      width: 'calc(100% - 2rem)',
      maxWidth: '560px',
      background: '#1e3a5f',
      border: '1.5px solid #3b82f6',
      borderRadius: '0.75rem',
      padding: '0.875rem 1rem',
      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.75rem',
      animation: 'slideDown 0.25s ease',
    }}>
      <div style={{ fontSize: '1.2rem', flexShrink: 0 }}>📢</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '0.9rem', marginBottom: '0.2rem' }}>
          {banner.title}
        </div>
        <div style={{ color: '#93c5fd', fontSize: '0.82rem', lineHeight: 1.5 }}>
          {banner.body}
        </div>
      </div>
      <button
        onClick={onDismiss}
        style={{
          background: 'none', border: 'none', color: '#64748b', cursor: 'pointer',
          fontSize: '1rem', padding: '2px 4px', borderRadius: '4px', flexShrink: 0,
        }}
      >
        ✕
      </button>

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-12px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  )
}
