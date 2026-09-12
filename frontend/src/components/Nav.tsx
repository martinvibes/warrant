import { WarrantMark } from './Logo';

export function Nav() {
  return (
    <nav style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 100, maxWidth: 'calc(100vw - 24px)' }}>
      <div className="nav-pill" style={{
        display: 'inline-flex', alignItems: 'center', gap: 28, padding: '12px 22px',
        background: 'rgba(14,14,15,0.9)', backdropFilter: 'blur(24px)',
        border: '1px solid rgba(232, 181, 92,0.15)', borderRadius: 100,
      }}>
        <a
          href="/"
          className="nav-brand"
          style={{
            display: 'flex', alignItems: 'center', gap: 9,
            fontFamily: "'IBM Plex Serif', Georgia, serif",
            fontWeight: 500, fontSize: 16, letterSpacing: '-0.015em',
            color: '#f7f6f3', textDecoration: 'none',
          }}
        >
          <WarrantMark size={20} color="#E8B55C" strokeWidth={3.6} />
          Warrant
        </a>

        <div className="nav-links" style={{ display: 'flex', gap: 22 }}>
          {[
            ['How it works', '#how-it-works'],
            ['Refusals',     '#refusals'],
            ['Settlement',   '#settlement'],
            ['Audit',        '/audit'],
            ['Docs',         '/docs'],
          ].map(([label, href]) => (
            <a
              key={label}
              href={href}
              style={{ fontSize: 13, color: 'rgba(247,246,243,0.5)', transition: 'color 0.2s', textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(247,246,243,0.5)')}
            >
              {label}
            </a>
          ))}
        </div>

        <a
          href="/console"
          className="nav-cta"
          style={{
            display: 'inline-flex', alignItems: 'center', height: 32, padding: '0 16px',
            background: '#C98A2E', color: '#0b0b0b', fontSize: 11, fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.06em', borderRadius: 100, border: 'none',
            transition: 'filter 0.2s', whiteSpace: 'nowrap', textDecoration: 'none',
          }}
        >
          Console
        </a>
      </div>
    </nav>
  );
}
