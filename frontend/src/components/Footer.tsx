import { LogoLockup } from './Logo';
import { XIcon } from './Icons';

const X_URL = 'https://x.com/0xgents';
const REPO_URL = 'https://github.com/martinvibes/warrant';

const iconButton: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 34, height: 34,
  color: 'rgba(247,246,243,0.45)',
  border: '1px solid rgba(232, 181, 92,0.15)',
  transition: 'all 0.2s ease',
  textDecoration: 'none',
};

export function Footer() {
  return (
    <>
      <section className="final-cta" style={{ padding: '140px 0', textAlign: 'center' }}>
        <h2 className="final-cta-h2 display" style={{ fontSize: 'min(44px, 4vw)', fontWeight: 500, letterSpacing: '-0.025em', marginBottom: 20 }}>
          Authorise the purchase, not the wallet
        </h2>
        <p style={{ fontSize: 17, color: 'rgba(247,246,243,0.5)', maxWidth: 520, margin: '0 auto 36px', lineHeight: 1.75, padding: '0 24px' }}>
          Sign one warrant, hand it to an agent, and watch what it bought and what it was
          stopped from buying. Signing costs nothing and revoking costs nothing.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', padding: '0 24px' }}>
          <a
            href="/console"
            style={{
              display: 'inline-flex', alignItems: 'center', height: 48, padding: '0 28px',
              background: '#C98A2E', color: '#0b0b0b', fontSize: 14, fontWeight: 600, borderRadius: 100,
              border: 'none', transition: 'filter 0.2s', textDecoration: 'none',
            }}
          >
            Sign a warrant →
          </a>
          <a
            href="/audit"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, height: 48, padding: '0 24px',
              background: 'transparent', color: '#fff', fontSize: 14, fontWeight: 500,
              borderRadius: 100, border: '1px solid rgba(232, 181, 92,0.25)',
              transition: 'border-color 0.2s', textDecoration: 'none',
              fontFamily: 'IBM Plex Mono, monospace',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#E8B55C'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(232, 181, 92,0.25)'; }}
          >
            Read the ledger
          </a>
        </div>
      </section>

      <footer className="footer-row" style={{ borderTop: '1px solid rgba(232, 181, 92,0.1)', padding: '48px 24px' }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          gap: 24, flexWrap: 'wrap',
        }}>
          <a href="/" style={{ textDecoration: 'none' }}>
            <LogoLockup size={22} color="#E8B55C" />
          </a>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
            {[
              ['Console', '/console', false],
              ['Audit', '/audit', false],
              ['Docs', '/docs', false],
              ['GitHub', REPO_URL, true],
              ['x402', 'https://x402.org', true],
              ['Hedera', 'https://hedera.com', true],
            ].map(([l, h, ext]) => (
              <a
                key={l as string}
                href={h as string}
                target={ext ? '_blank' : undefined}
                rel={ext ? 'noreferrer' : undefined}
                style={{ fontSize: 14, color: 'rgba(247,246,243,0.35)', transition: 'color 0.2s', textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(247,246,243,0.35)')}
              >
                {l}
              </a>
            ))}
          </div>

          <a
            href={X_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Follow the author on X"
            title="X · @0xgents"
            style={iconButton}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(232, 181, 92,0.40)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(247,246,243,0.45)'; e.currentTarget.style.borderColor = 'rgba(232, 181, 92,0.15)'; }}
          >
            <XIcon size={13} />
          </a>
        </div>
      </footer>
    </>
  );
}
