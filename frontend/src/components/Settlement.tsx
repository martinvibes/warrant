import type { ReactNode } from 'react';

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const ProtocolIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" {...stroke}>
    <path d="M4 8h16M4 16h16" />
    <circle cx="9" cy="8" r="2.2" />
    <circle cx="15" cy="16" r="2.2" />
  </svg>
);

const LedgerIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" {...stroke}>
    <path d="M12 3 3 7.5v9L12 21l9-4.5v-9z" />
    <path d="M3 7.5 12 12l9-4.5M12 12v9" />
  </svg>
);

const SponsorIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" {...stroke}>
    <path d="M12 20s-7-4.3-7-9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7 3.5C19 15.7 12 20 12 20z" />
  </svg>
);

const ReceiptIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" {...stroke}>
    <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
    <path d="M9 8h6M9 12h6" />
  </svg>
);

interface Item {
  title: string;
  desc: string;
  detail: string;
  icon: ReactNode;
}

const items: Item[] = [
  {
    title: 'x402, pay per request',
    desc: 'An HTTP 402 carries the terms, the agent signs a transfer, the request is retried with proof. No API key, no account, no invoice at the end of the month.',
    detail: '@x402/express · @x402/hedera',
    icon: ProtocolIcon,
  },
  {
    title: 'Hedera, final in seconds',
    desc: 'USDC as a native token with fixed, fractions-of-a-cent fees and consensus finality in seconds. A $0.05 purchase is only worth making where the fee is not the purchase.',
    detail: 'hedera:testnet · USDC 0.0.429274',
    icon: LedgerIcon,
  },
  {
    title: 'The fee is sponsored',
    desc: 'The facilitator pays the network fee, so a paying agent needs stablecoin and nothing else. One funded asset instead of two is the difference between an agent that can pay and one that gets stuck.',
    detail: 'Blocky402 facilitator · feePayer 0.0.7162784',
    icon: SponsorIcon,
  },
  {
    title: 'Receipts, not log lines',
    desc: 'Settlement writes a row binding the agent, the warrant, the purpose, the amount and the transaction id. That row is what turns a balance that went down into a purchase somebody can explain.',
    detail: 'GET /v1/receipts',
    icon: ReceiptIcon,
  },
];

export function Settlement() {
  return (
    <section id="settlement" className="section-pad" style={{ padding: '120px 0', borderTop: '1px solid rgba(232,181,92,0.1)', position: 'relative', overflow: 'hidden' }}>
      {/* subtle decorative grid in the background */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(232,181,92,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(232,181,92,0.03) 1px, transparent 1px)',
        backgroundSize: '80px 80px',
        maskImage: 'radial-gradient(ellipse at center, black 0%, transparent 70%)',
        WebkitMaskImage: 'radial-gradient(ellipse at center, black 0%, transparent 70%)',
      }} />
      {/* Subtle center glow (sits above the grid) */}
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background: 'radial-gradient(ellipse 50% 40% at 50% 35%, rgba(232,181,92,0.08), transparent 70%)',
      }} />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', textAlign: 'center', position: 'relative' }}>
        <div className="reveal-up" style={{ fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#E8B55C', marginBottom: 16, fontWeight: 500 }}>
          Settlement
        </div>
        <h2 className="reveal-up section-h2 display" style={{ fontSize: 'min(44px, 4vw)', fontWeight: 500, letterSpacing: '-0.025em', lineHeight: 1.12, marginBottom: 20 }}>
          Small enough payments to be worth refusing
        </h2>
        <p className="reveal-up" style={{ fontSize: 16, color: 'rgba(247,246,243,0.5)', maxWidth: 540, margin: '0 auto 56px', lineHeight: 1.7 }}>
          A warrant is only interesting where the purchases are small and frequent. That needs a
          rail where five cents is a sensible amount to move, and a protocol where the price
          travels with the request rather than through a billing relationship.
        </p>

        <div className="settle-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, textAlign: 'left' }}>
          {items.map((it, i) => (
            <div
              key={it.title}
              className="reveal-up settle-card"
              style={{
                background: 'linear-gradient(180deg, #0e0e0f 0%, #0a0a0b 100%)',
                border: '1px solid rgba(232,181,92,0.10)',
                borderRadius: 12,
                padding: 28,
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                transitionDelay: `${i * 100}ms`,
              }}
            >
              {/* subtle top-edge gradient accent that lights up on hover */}
              <div className="settle-top-edge" style={{
                position: 'absolute',
                top: 0, left: 0, right: 0,
                height: 1,
                background: 'linear-gradient(90deg, transparent, rgba(232,181,92,0.5), transparent)',
                opacity: 0.3,
                transition: 'opacity 0.3s',
              }} />

              <div style={{
                width: 44, height: 44,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 20,
                border: '1px solid rgba(232,181,92,0.18)',
                background: 'linear-gradient(135deg, rgba(232,181,92,0.10) 0%, rgba(232,181,92,0.02) 100%)',
                color: '#E8B55C',
                borderRadius: 10,
              }}>{it.icon}</div>

              <div style={{
                fontSize: 10, letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'rgba(247,246,243,0.3)',
                marginBottom: 10, fontWeight: 500,
              }}>Layer</div>

              <h3 style={{
                fontSize: 18, fontWeight: 600,
                letterSpacing: '-0.02em',
                marginBottom: 10,
              }}>{it.title}</h3>

              <p style={{
                fontSize: 13, color: 'rgba(247,246,243,0.5)',
                lineHeight: 1.65, marginBottom: 18,
              }}>{it.desc}</p>

              <div style={{
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 10,
                color: 'rgba(232,181,92,0.55)',
                paddingTop: 14,
                borderTop: '1px solid rgba(232,181,92,0.08)',
                wordBreak: 'break-all',
              }}>{it.detail}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
