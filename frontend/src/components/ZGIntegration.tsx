import type { ReactNode } from 'react';

// ─── Icons (purple, consistent line weight) ───────────────────────────

const ChainIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const StorageIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5v6c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
    <path d="M3 11v6c0 1.66 4.03 3 9 3s9-1.34 9-3v-6" />
  </svg>
);

const IdentityIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="8" r="4" />
    <circle cx="12" cy="8" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);

const PaymentIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="6" width="18" height="13" rx="2" />
    <line x1="3" y1="11" x2="21" y2="11" />
    <line x1="7" y1="15" x2="11" y2="15" />
  </svg>
);

const ComputeIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

interface Item {
  title: string;
  desc: string;
  detail: string;
  icon: ReactNode;
}

const items: Item[] = [
  { title: 'On-Chain Payments · x402', desc: 'Token payments via the x402 protocol. USDC on Celo, native tokens on 0G.',                  detail: 'Celo · 0G Chain',            icon: ChainIcon },
  { title: '0G Storage',               desc: 'Agent memory, NFT metadata, session state on decentralized storage.',                        detail: '@0glabs/0g-ts-sdk',          icon: StorageIcon },
  { title: '0G Compute Network',       desc: 'Pay-per-call AI inference via the 0G Compute serving network.',                              detail: '@0glabs/0g-serving-broker',  icon: ComputeIcon },
  { title: 'Agent Identity',           desc: 'ERC-8004 on Celo, ERC-721 on 0G Chain. On-chain and permanent.',                             detail: 'ERC-8004 · ERC-721',         icon: IdentityIcon },
];

export function ZGIntegration() {
  return (
    <section id="stack" className="section-pad" style={{ padding: '120px 0', borderTop: '1px solid rgba(0,229,255,0.1)', position: 'relative', overflow: 'hidden' }}>
      {/* subtle decorative grid in the background */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(0,229,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.03) 1px, transparent 1px)',
        backgroundSize: '80px 80px',
        maskImage: 'radial-gradient(ellipse at center, black 0%, transparent 70%)',
        WebkitMaskImage: 'radial-gradient(ellipse at center, black 0%, transparent 70%)',
      }} />
      {/* Subtle center glow (sits above the grid) */}
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background: 'radial-gradient(ellipse 50% 40% at 50% 35%, rgba(0,229,255,0.08), transparent 70%)',
      }} />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', textAlign: 'center', position: 'relative' }}>
        <div className="reveal-up" style={{ fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#00E5FF', marginBottom: 16, fontWeight: 500 }}>
          Deep Integration
        </div>
        <h2 className="reveal-up section-h2" style={{ fontSize: 'min(48px, 4vw)', fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 20 }}>
          Deep Chain Integration
        </h2>
        <p className="reveal-up" style={{ fontSize: 16, color: 'rgba(254,254,254,0.5)', maxWidth: 540, margin: '0 auto 56px', lineHeight: 1.7 }}>
          Multi-chain infrastructure — payments, storage, compute, identity — all on-chain.
        </p>

        <div className="zg-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, textAlign: 'left' }}>
          {items.map((it, i) => (
            <div
              key={it.title}
              className="reveal-up zg-card"
              style={{
                background: 'linear-gradient(180deg, #0c0c14 0%, #08080d 100%)',
                border: '1px solid rgba(0,229,255,0.10)',
                borderRadius: 12,
                padding: 28,
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                transitionDelay: `${i * 100}ms`,
              }}
            >
              {/* subtle top-edge gradient accent that lights up on hover */}
              <div className="zg-top-edge" style={{
                position: 'absolute',
                top: 0, left: 0, right: 0,
                height: 1,
                background: 'linear-gradient(90deg, transparent, rgba(0,229,255,0.5), transparent)',
                opacity: 0.3,
                transition: 'opacity 0.3s',
              }} />

              <div style={{
                width: 44, height: 44,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 20,
                border: '1px solid rgba(0,229,255,0.18)',
                background: 'linear-gradient(135deg, rgba(0,229,255,0.10) 0%, rgba(0,229,255,0.02) 100%)',
                color: '#00E5FF',
                borderRadius: 10,
              }}>{it.icon}</div>

              <div style={{
                fontSize: 10, letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'rgba(254,254,254,0.3)',
                marginBottom: 10, fontWeight: 500,
              }}>Component</div>

              <h3 style={{
                fontSize: 18, fontWeight: 600,
                letterSpacing: '-0.02em',
                marginBottom: 10,
              }}>{it.title}</h3>

              <p style={{
                fontSize: 13, color: 'rgba(254,254,254,0.5)',
                lineHeight: 1.65, marginBottom: 18,
              }}>{it.desc}</p>

              <div style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 10,
                color: 'rgba(0,229,255,0.55)',
                paddingTop: 14,
                borderTop: '1px solid rgba(0,229,255,0.08)',
                wordBreak: 'break-all',
              }}>{it.detail}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
