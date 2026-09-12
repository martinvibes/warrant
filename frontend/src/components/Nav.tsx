import { Glyph0G } from './Logo';

export function Nav() {
  return (
    <nav style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 100, maxWidth: 'calc(100vw - 24px)' }}>
      <div className="nav-pill" style={{
        display: 'inline-flex', alignItems: 'center', gap: 28, padding: '12px 22px',
        background: 'rgba(12,12,20,0.9)', backdropFilter: 'blur(24px)',
        border: '1px solid rgba(0, 229, 255,0.15)', borderRadius: 100,
      }}>
        <a
          href="/"
          className="nav-brand"
          style={{
            display: 'flex', alignItems: 'center', gap: 9,
            fontWeight: 600, fontSize: 15, letterSpacing: '-0.01em',
            color: '#fefefe', textDecoration: 'none',
          }}
        >
          <Glyph0G size={22} color="#00E5FF" strokeWidth={3.6} />
          0GENT
        </a>

        <div className="nav-links" style={{ display: 'flex', gap: 22 }}>
          {[
            ['Dashboard',    '/dashboard'],
            ['Stats',        '/stats'],
            ['Features',     '#features'],
            ['How it Works', '#how-it-works'],
            ['Docs',         '/docs'],
          ].map(([label, href]) => (
            <a
              key={label}
              href={href}
              style={{ fontSize: 13, color: 'rgba(254,254,254,0.5)', transition: 'color 0.2s', textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(254,254,254,0.5)')}
            >
              {label}
            </a>
          ))}
        </div>

        <a
          href="/skill.md"
          className="nav-cta"
          style={{
            display: 'inline-flex', alignItems: 'center', height: 32, padding: '0 16px',
            background: '#00B8D4', color: '#fff', fontSize: 11, fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.06em', borderRadius: 100, border: 'none',
            transition: 'filter 0.2s',
            whiteSpace: 'nowrap',
          }}
        >
          Try it
        </a>
      </div>
    </nav>
  );
}
