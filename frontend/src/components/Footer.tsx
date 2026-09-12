import { LogoLockup } from './Logo';
import { XIcon, TelegramIcon } from './Icons';

// Telegram URL is a placeholder — swap when the real group link is ready.
// Keep `#tg` so the link renders but doesn't go anywhere unexpected.
const TG_URL = 'https://t.me/Ogentss/1';
const X_URL  = 'https://x.com/0xgents';

export function Footer() {
  return (
    <>
      <section className="final-cta" style={{ padding: '140px 0', textAlign: 'center' }}>
        <h2 className="final-cta-h2" style={{ fontSize: 'min(48px, 4vw)', fontWeight: 500, letterSpacing: '-0.03em', marginBottom: 20 }}>
          Give your agent superpowers
        </h2>
        <p style={{ fontSize: 17, color: 'rgba(254,254,254,0.5)', maxWidth: 500, margin: '0 auto 36px', lineHeight: 1.7 }}>
          Real infrastructure. On-chain identity. Persistent memory. Multi-chain.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', padding: '0 24px' }}>
          <a
            href="https://www.npmjs.com/package/@0gent/core"
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', height: 48, padding: '0 28px',
              background: '#00B8D4', color: '#fff', fontSize: 14, fontWeight: 500, borderRadius: 100,
              border: 'none', transition: 'filter 0.2s', textDecoration: 'none',
            }}
          >
            Install the CLI →
          </a>
          <a
            href="https://www.npmjs.com/package/@0gent/core"
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, height: 48, padding: '0 24px',
              background: 'transparent', color: '#fff', fontSize: 14, fontWeight: 500,
              borderRadius: 100, border: '1px solid rgba(0, 229, 255,0.25)',
              transition: 'border-color 0.2s', textDecoration: 'none',
              fontFamily: 'JetBrains Mono, monospace',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#00E5FF'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0, 229, 255,0.25)'; }}
          >
            npm i -g @0gent/core
          </a>
        </div>
      </section>

      <footer className="footer-row" style={{ borderTop: '1px solid rgba(0, 229, 255,0.1)', padding: '48px 24px' }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          gap: 24, flexWrap: 'wrap',
        }}>
          <a href="/" style={{ textDecoration: 'none' }}>
            <LogoLockup size={22} color="#00E5FF" />
          </a>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
            {[
              ['Dashboard',  '/dashboard',                                  false],
              ['Stats',      '/stats',                                      false],
              ['Docs',       '/docs',                                       false],
              ['skill.md',   '/skill.md',                                   false],
              ['npm',        'https://www.npmjs.com/package/@0gent/core',  true],
              ['GitHub',     'https://github.com/0GENT-Labs/0gent',        true],
              ['0G Docs',    'https://docs.0g.ai',                          true],
            ].map(([l, h, ext]) => (
              <a
                key={l as string}
                href={h as string}
                target={ext ? '_blank' : undefined}
                rel={ext ? 'noreferrer' : undefined}
                style={{ fontSize: 14, color: 'rgba(254,254,254,0.35)', transition: 'color 0.2s', textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(254,254,254,0.35)')}
              >
                {l}
              </a>
            ))}
          </div>

          {/* Socials — small icon buttons on the right of the link row */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <a
              href={X_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="Follow 0GENT on X"
              title="X · @0xgents"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 34, height: 34,
                color: 'rgba(254,254,254,0.45)',
                border: '1px solid rgba(0, 229, 255,0.15)',
                transition: 'all 0.2s ease',
                textDecoration: 'none',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(0, 229, 255,0.40)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(254,254,254,0.45)'; e.currentTarget.style.borderColor = 'rgba(0, 229, 255,0.15)'; }}
            >
              <XIcon size={13} />
            </a>
            <a
              href={TG_URL}
              target={TG_URL.startsWith('http') ? '_blank' : undefined}
              rel={TG_URL.startsWith('http') ? 'noreferrer' : undefined}
              aria-label="Join 0GENT on Telegram"
              title={TG_URL.startsWith('http') ? 'Telegram group' : 'Telegram group · coming soon'}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 34, height: 34,
                color: 'rgba(254,254,254,0.45)',
                border: '1px solid rgba(0, 229, 255,0.15)',
                transition: 'all 0.2s ease',
                textDecoration: 'none',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(0, 229, 255,0.40)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(254,254,254,0.45)'; e.currentTarget.style.borderColor = 'rgba(0, 229, 255,0.15)'; }}
            >
              <TelegramIcon size={14} />
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
