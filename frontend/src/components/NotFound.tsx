/**
 * 404 fallback for any route that doesn't match a known surface.
 * Quietly themed, gives the user a way back instead of a dead-end.
 */

import { Nav } from './Nav';
import { Footer } from './Footer';
import { LogoLockup } from './Logo';

const LILAC = '#00E5FF';
const TEXT = '#fefefe';
const TEXT_DIM = 'rgba(254,254,254,0.7)';
const TEXT_FAINT = 'rgba(254,254,254,0.5)';
const BG_PAGE = '#050508';
const BG_CARD = '#0c0c14';
const BORDER = 'rgba(0,229,255,0.12)';
const PURPLE = '#00B8D4';

export function NotFound() {
  const path = typeof window !== 'undefined' ? window.location.pathname : '';

  return (
    <div style={{ background: BG_PAGE, color: TEXT, minHeight: '100vh' }}>
      <Nav />

      <div className="page-wrap" style={{
        maxWidth: 720, margin: '0 auto',
        padding: '160px 16px 80px',
        textAlign: 'center',
      }}>
        <div style={{ marginBottom: 36 }}>
          <LogoLockup size={28} />
        </div>

        {/* Big 404 */}
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 'clamp(72px, 18vw, 140px)',
          fontWeight: 600,
          color: LILAC,
          letterSpacing: '-0.04em',
          lineHeight: 1,
          marginBottom: 12,
          background: 'linear-gradient(180deg, #00E5FF 30%, rgba(0,229,255,0.4))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          404
        </div>

        <h1 style={{
          fontSize: 'clamp(24px, 4.5vw, 36px)',
          fontWeight: 500,
          letterSpacing: '-0.02em',
          marginBottom: 14,
        }}>
          Path not found.
        </h1>

        <p style={{
          fontSize: 15,
          color: TEXT_DIM,
          lineHeight: 1.7,
          maxWidth: 520,
          margin: '0 auto 32px',
        }}>
          {path && (
            <>
              Nothing lives at{' '}
              <code style={{
                color: LILAC,
                background: BG_CARD,
                padding: '2px 8px',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 13,
                wordBreak: 'break-all',
              }}>
                {path}
              </code>
              .{' '}
            </>
          )}
          The agent might have wandered off — try one of the working surfaces below.
        </p>

        {/* Known-good destinations */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 10,
          maxWidth: 580,
          margin: '0 auto 28px',
          textAlign: 'left',
        }}>
          {([
            ['Home',       '/',          'Landing page'],
            ['Dashboard',  '/dashboard', 'Mint, send email, ask AI'],
            ['Stats',      '/stats',     'Live activity & transaction log'],
            ['Docs',       '/docs',      'Full developer reference'],
          ] as const).map(([label, href, sub]) => (
            <a
              key={href}
              href={href}
              style={{
                display: 'block',
                padding: '14px 16px',
                background: BG_CARD,
                border: `1px solid ${BORDER}`,
                color: TEXT,
                textDecoration: 'none',
                transition: 'all 0.18s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(0,229,255,0.40)';
                e.currentTarget.style.background = 'rgba(0,229,255,0.04)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = BORDER;
                e.currentTarget.style.background = BG_CARD;
              }}
            >
              <div style={{
                fontSize: 14, fontWeight: 500, color: LILAC,
                fontFamily: 'JetBrains Mono, monospace',
                marginBottom: 4,
              }}>
                {label} →
              </div>
              <div style={{ fontSize: 12, color: TEXT_FAINT }}>{sub}</div>
            </a>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
          <a
            href="/dashboard"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              height: 44, padding: '0 22px',
              background: PURPLE, color: '#fff', fontSize: 13, fontWeight: 500,
              borderRadius: 100, textDecoration: 'none',
              transition: 'filter 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}
          >
            Open Dashboard →
          </a>
        </div>
      </div>

      <Footer />
    </div>
  );
}
