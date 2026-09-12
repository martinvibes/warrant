/**
 * What a warrant actually enforces.
 *
 * Each card is one signed field, the check it produces, and the refusal an
 * agent sees when it crosses that field. The refusal codes are the real ones
 * the gate emits, so this section doubles as the error reference.
 */
import type { ReactNode } from 'react';

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const AgentIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
    <circle cx="12" cy="8" r="3.4" />
    <path d="M5.5 20c1.3-3.2 3.7-4.8 6.5-4.8s5.2 1.6 6.5 4.8" />
  </svg>
);

const ListIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
    <path d="M4 7h9M4 12h9M4 17h5" />
    <path d="M16.5 16.5l2 2 3.5-4" />
  </svg>
);

const CapIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
    <rect x="3" y="10" width="18" height="6" rx="1" />
    <path d="M3 13h7" strokeWidth="3.4" />
    <path d="M16 6v12" />
  </svg>
);

const ClockIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);

const TagIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
    <path d="M20.5 13.5 13 21a2 2 0 0 1-2.8 0l-7-7a2 2 0 0 1-.6-1.6l.6-6.2A2 2 0 0 1 5 4.4l6.2-.6a2 2 0 0 1 1.6.6l7 7a2 2 0 0 1 .7 2.1z" />
    <circle cx="8" cy="8" r="1.4" />
  </svg>
);

const RevokeIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M6.5 6.5l11 11" />
  </svg>
);

const CoinIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M14.8 9.2a3 3 0 1 0 0 5.6M12 6.5v11" />
  </svg>
);

const SealIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
    <path d="M8.5 5H5v14h3.5M15.5 5H19v14h-3.5" />
    <circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none" />
  </svg>
);

interface Enforced {
  icon: ReactNode;
  field: string;
  desc: string;
  code: string;
  refusal: string;
}

const enforced: Enforced[] = [
  {
    icon: AgentIcon,
    field: 'One agent',
    desc: 'A warrant names a single Hedera account. The payer is checked against that name after the payment is signed and before it settles, so a second agent holding a copy of the warrant cannot spend under it.',
    code: 'payer_mismatch',
    refusal: 'This warrant authorises 0.0.4242. The payment was signed by 0.0.9001.',
  },
  {
    icon: ListIcon,
    field: 'Named resources',
    desc: 'An allowlist, not a budget. The agent may buy inference and nothing else, or email and nothing else. A request for anything unlisted never reaches the payment challenge.',
    code: 'resource_not_authorised',
    refusal: 'This warrant covers inference. It does not cover email.send.',
  },
  {
    icon: CapIcon,
    field: 'A ceiling',
    desc: 'Spend is summed from settled receipts on every request rather than kept in a counter. A cap is only as trustworthy as the number it is compared against, and a counter can drift.',
    code: 'cap_exceeded',
    refusal: 'This purchase would take spend to $1.02 against a cap of $1.00.',
  },
  {
    icon: ClockIcon,
    field: 'An expiry',
    desc: 'Authority that ends by itself. A warrant signed for a Tuesday campaign is dead on Wednesday whether or not anyone remembered to withdraw it.',
    code: 'expired',
    refusal: 'This warrant expired 3h ago.',
  },
  {
    icon: RevokeIcon,
    field: 'Revocable in a second',
    desc: 'Revoking is a second signed message, not a transaction. No gas, no block time, effective on the agent’s next request. Killing a warrant has to be cheaper than issuing one or nobody does it in the moment that matters.',
    code: 'revoked',
    refusal: 'This warrant was revoked by its owner. Ask for a new one.',
  },
  {
    icon: SealIcon,
    field: 'A known owner',
    desc: 'The signature is recovered and checked against the owner the warrant names, then against the owners this service accepts. Editing a signed warrant changes the address it recovers to, so tampering reads as forgery rather than as a valid warrant.',
    code: 'bad_signature',
    refusal: 'That signature does not belong to 0xF246c348. It recovers to 0x7510DD17.',
  },
  {
    icon: CoinIcon,
    field: 'One asset',
    desc: 'The settlement token is part of what was signed. A warrant for USDC cannot be spent against a service that quotes in something else, so a cap cannot be walked past by changing the unit.',
    code: 'asset_mismatch',
    refusal: 'This warrant is denominated in 0.0.429274, and this service settles in 0.0.456858.',
  },
  {
    icon: TagIcon,
    field: 'A stated purpose',
    desc: 'Free text the owner writes once and every receipt carries. It is the field that makes a line of spend explicable to somebody reading it a month later, which is when the question is actually asked.',
    code: 'written to receipts',
    refusal: 'purpose "support triage for the September backlog"',
  },
];

const S = {
  section: { padding: '120px 0' } as const,
  container: { maxWidth: 1100, margin: '0 auto', padding: '0 24px' } as const,
  h2: { fontSize: 'min(44px, 4vw)', fontWeight: 500, letterSpacing: '-0.025em', lineHeight: 1.12, maxWidth: 620, marginBottom: 20 },
  sub: { fontSize: 16, color: 'rgba(247,246,243,0.5)', maxWidth: 560, lineHeight: 1.75, marginBottom: 56 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: 1, background: 'rgba(232,181,92,0.1)' } as const,
  card: { background: '#070707', position: 'relative' as const, overflow: 'hidden' as const, transition: 'all 0.3s' },
  inner: { padding: 30, display: 'flex', flexDirection: 'column' as const, height: '100%' },
  iconBox: {
    width: 38, height: 38, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '1px solid rgba(232,181,92,0.18)',
    background: 'linear-gradient(135deg, rgba(232,181,92,0.08) 0%, rgba(232,181,92,0.02) 100%)',
    color: '#E8B55C',
    transition: 'all 0.3s',
  },
};

export function Features() {
  return (
    <section id="refusals" className="section-pad" style={{ ...S.section, position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 45% 35% at 25% 55%, rgba(232,181,92,0.06), transparent 70%)',
      }} />
      <div style={{ ...S.container, position: 'relative' }}>
        <div className="reveal-up label" style={{ color: '#E8B55C', marginBottom: 16 }}>Enforcement</div>
        <h2 className="reveal-up section-h2 display" style={S.h2}>Eight fields, and a refusal for each</h2>
        <p className="reveal-up" style={S.sub}>
          A warrant is a short document: one agent, some resources, a ceiling, a purpose, an
          expiry. Each field is a check the service runs at the earliest moment it can be run,
          which for most of them is before the agent has been asked to pay anything.
        </p>

        <div style={S.grid}>
          {enforced.map((f, i) => (
            <div key={f.field} className="reveal-up feature-card" style={{ ...S.card, transitionDelay: `${i * 60}ms` }}>
              <div style={S.inner}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                  <div className="feature-icon" style={S.iconBox}>{f.icon}</div>
                  <h3 style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em', flex: 1 }}>{f.field}</h3>
                </div>

                <p style={{ fontSize: 13, color: 'rgba(247,246,243,0.5)', lineHeight: 1.75, marginBottom: 22 }}>{f.desc}</p>

                <div style={{
                  marginTop: 'auto', padding: 14,
                  background: 'rgba(0,0,0,0.5)',
                  borderLeft: '2px solid rgba(229,72,77,0.45)',
                }}>
                  <div className="mono" style={{ fontSize: 10.5, color: '#E5484D', letterSpacing: '0.04em', marginBottom: 6 }}>
                    {f.code}
                  </div>
                  <div className="mono" style={{ fontSize: 11.5, color: 'rgba(247,246,243,0.45)', lineHeight: 1.65 }}>
                    {f.refusal}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
