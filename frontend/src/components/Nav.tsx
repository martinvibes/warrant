import { useEffect, useState } from 'react';
import { WarrantMark } from './Logo';

const LINKS: [string, string][] = [
  ['How it works', '#how-it-works'],
  ['Refusals', '#limits'],
  ['Settlement', '#settlement'],
  ['Ledger', '/ledger'],
  ['Docs', '/docs'],
];

/**
 * The pill.
 *
 * Over the hero it sits light: wide, barely there, the page showing through.
 * Once the reader has left the hero it is floating over content and has to say
 * so, so it tightens, the ground goes opaque and it picks up a shadow. The
 * brass hairline along the bottom is read progress, which on a page that ends
 * in a ledger is worth knowing.
 */
export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const y = window.scrollY;
      setScrolled(y > 40);
      const span = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(span > 0 ? Math.min(1, y / span) : 0);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';

  return (
    <nav
      style={{
        position: 'fixed',
        top: scrolled ? 12 : 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        maxWidth: 'calc(100vw - 24px)',
        transition: `top 0.45s ${ease}`,
      }}
    >
      <div
        className="nav-pill"
        style={{
          position: 'relative',
          overflow: 'hidden',
          display: 'inline-flex',
          alignItems: 'center',
          gap: scrolled ? 22 : 28,
          padding: scrolled ? '9px 16px' : '12px 22px',
          background: scrolled ? 'rgba(10,10,11,0.82)' : 'rgba(14,14,15,0.9)',
          backdropFilter: 'blur(24px) saturate(150%)',
          WebkitBackdropFilter: 'blur(24px) saturate(150%)',
          border: `1px solid ${scrolled ? 'rgba(232,181,92,0.28)' : 'rgba(232,181,92,0.15)'}`,
          borderRadius: 100,
          boxShadow: scrolled ? '0 10px 34px -14px rgba(0,0,0,0.8)' : 'none',
          transition: `gap 0.45s ${ease}, padding 0.45s ${ease}, background 0.45s ${ease}, border-color 0.45s ${ease}, box-shadow 0.45s ${ease}`,
        }}
      >
        <a
          href="/"
          className="nav-brand"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            fontFamily: "'IBM Plex Serif', Georgia, serif",
            fontWeight: 500,
            fontSize: 16,
            letterSpacing: '-0.015em',
            color: '#f7f6f3',
            textDecoration: 'none',
          }}
        >
          <WarrantMark size={20} color="#E8B55C" strokeWidth={3.6} />
          Warrant
        </a>

        <div className="nav-links" style={{ display: 'flex', gap: 22 }}>
          {LINKS.map(([label, href]) => (
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
          href="/ledger"
          className="nav-cta"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            height: scrolled ? 29 : 32,
            padding: scrolled ? '0 14px' : '0 16px',
            background: '#C98A2E',
            color: '#0b0b0b',
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            borderRadius: 100,
            border: 'none',
            transition: `height 0.45s ${ease}, padding 0.45s ${ease}, filter 0.2s`,
            whiteSpace: 'nowrap',
            textDecoration: 'none',
          }}
        >
          Ledger
        </a>

        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 0,
            bottom: 0,
            width: '100%',
            height: 1.5,
            background: 'var(--color-accent-light)',
            transformOrigin: 'left',
            transform: `scaleX(${progress})`,
            opacity: scrolled ? 0.55 : 0,
            transition: 'opacity 0.4s ease',
          }}
        />
      </div>
    </nav>
  );
}
