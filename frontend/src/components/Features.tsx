import type { ReactNode } from 'react';

// ─── Inline SVG icons (cyan, stroke-based, consistent line weight) ──

const PhoneIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" />
  </svg>
);

const EmailIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <polyline points="3 7 12 13 21 7" />
  </svg>
);

const ServerIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="7" rx="1.5" />
    <rect x="3" y="14" width="18" height="7" rx="1.5" />
    <line x1="7" y1="6.5" x2="7.01" y2="6.5" />
    <line x1="7" y1="17.5" x2="7.01" y2="17.5" />
  </svg>
);

const GlobeIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
  </svg>
);

const SparkIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IdentityIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="12" cy="11" r="3" />
    <path d="M7 17c1.2-2 3-3 5-3s3.8 1 5 3" />
  </svg>
);

const SocialIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <path d="M8 9h8M8 13h5" />
  </svg>
);

interface Feature {
  icon: ReactNode;
  title: string;
  desc: string;
  code: string;
  tag: string;
  status: 'live' | 'dev';
}

const features: Feature[] = [
  { icon: IdentityIcon, title: 'Agent Identity',     desc: 'On-chain ERC-721 NFT. The token is the agent\'s permanent identity.', code: 'POST /identity/mint\n→ 402: pay $0.50 USDC\n→ token #1 (your agent NFT)',   tag: 'ERC-721 · ERC-8004',  status: 'live' },
  { icon: EmailIcon,    title: 'Email Inboxes',      desc: 'Dedicated <name>@0gent.xyz inbox. Send via Resend. Inbound replies parsed by Cloudflare Worker, full thread preserved.', code: 'POST /email/provision\n→ 402: pay $1.00 USDC\n→ scout@0gent.xyz',           tag: 'Cloudflare · Resend', status: 'live' },
  { icon: SparkIcon,    title: 'AI Inference',       desc: 'Pay-per-call LLM inference via the 0G Compute Network. Real on-chain micropayments, returns OpenAI-format completions.', code: 'POST /compute/infer\n→ 402: pay $0.10 USDC\n→ qwen-2.5-7b reply',          tag: '0G Compute Network', status: 'live' },
  { icon: ServerIcon,   title: 'Memory (Storage)',   desc: 'Persistent agent memory backed by 0G Storage — write once, read forever, indexed by your wallet.',                       code: 'POST /memory/<wallet>\n→ free\n→ 0G Storage rootHash',                  tag: '0G Storage',          status: 'live' },
  { icon: PhoneIcon,    title: 'Phone & SMS',        desc: 'Real phone numbers across 170+ countries. Send SMS to anywhere. Provisioning + SMS verified end-to-end on Telnyx.',         code: 'POST /phone/provision\n→ 402: pay $3.00 USDC\n→ +1 (816) 496-1100',       tag: 'Telnyx',              status: 'live' },
  { icon: GlobeIcon,    title: 'Domains',            desc: 'Register domains with full DNS control. .com, .dev, .ai — hundreds of TLDs.',                                              code: 'POST /domain/register\n→ 402: pay $1.00 USDC\n→ agent-alpha.dev',           tag: 'Namecheap',           status: 'dev'  },
  { icon: ServerIcon,   title: 'Compute VPS',        desc: 'Hardened VPS instances. SSH key-only, UFW firewall, Node.js 22 pre-installed. Wired to Hetzner Cloud, awaiting credit.',  code: 'POST /compute/provision\n→ 402: pay $0.50 USDC\n→ 49.12.218.44 (cx22)',    tag: 'Hetzner',             status: 'dev'  },
  { icon: SocialIcon,   title: 'X Account',          desc: 'Agents own and operate their own X accounts — post, reply, follow, build an audience. Each action paid for and authenticated on-chain.', code: 'POST /x/buy\n→ 402: pay $2.50 USDC\n→ ready X account, posting',    tag: 'Coming soon',         status: 'dev'  },
];

const S = {
  section: { padding: '120px 0' } as const,
  container: { maxWidth: 1100, margin: '0 auto', padding: '0 24px' } as const,
  label: { fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#00E5FF', marginBottom: 16, fontWeight: 500 },
  h2: { fontSize: 'min(48px, 4vw)', fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1.1, maxWidth: 600, marginBottom: 20 },
  sub: { fontSize: 16, color: 'rgba(254,254,254,0.5)', maxWidth: 500, lineHeight: 1.7, marginBottom: 56 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 2, background: 'rgba(0,229,255,0.06)' } as const,
  card: { background: '#050508', padding: 0, position: 'relative' as const, overflow: 'hidden' as const, transition: 'all 0.3s' },
  inner: { padding: 32, display: 'flex', flexDirection: 'column' as const, height: '100%' },
  iconBox: {
    width: 40, height: 40,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '1px solid rgba(0,229,255,0.18)',
    background: 'linear-gradient(135deg, rgba(0,229,255,0.08) 0%, rgba(0,229,255,0.02) 100%)',
    color: '#00E5FF',
    transition: 'all 0.3s',
  },
  code: { marginTop: 'auto', paddingTop: 20, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'rgba(254,254,254,0.4)', lineHeight: 1.8, padding: 16, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(0,229,255,0.08)', marginBlockStart: 24 },
  tag: { display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 16, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'rgba(254,254,254,0.35)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', border: '1px solid rgba(0,229,255,0.08)', padding: '3px 10px', width: 'fit-content' },
};

export function Features() {
  return (
    <section id="features" className="section-pad" style={{ ...S.section, position: 'relative', overflow: 'hidden' }}>
      {/* Subtle bg glow — center-left */}
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background: 'radial-gradient(ellipse 45% 35% at 25% 55%, rgba(0,229,255,0.06), transparent 70%)',
      }} />
      <div style={{ ...S.container, position: 'relative' }}>
        <div className="reveal-up" style={S.label}>Services</div>
        <h2 className="reveal-up section-h2" style={S.h2}>Everything an agent needs</h2>
        <p className="reveal-up" style={S.sub}>Real-world infrastructure via API, paid on-chain, owned by your wallet.</p>

        <div style={S.grid}>
          {features.map((f, i) => (
            <div
              key={f.title}
              className="reveal-up feature-card"
              style={{
                ...S.card,
                transitionDelay: `${i * 80}ms`,
              }}
            >
              <div style={S.inner}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                  <div className="feature-icon" style={S.iconBox}>{f.icon}</div>
                  <h3 style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', flex: 1 }}>{f.title}</h3>
                  <span
                    title={f.status === 'live' ? 'Live in production' : 'Code wired, awaiting external credentials'}
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 9,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      padding: '3px 7px',
                      border: f.status === 'live' ? '1px solid rgba(80,220,140,0.35)' : '1px solid rgba(255,180,80,0.30)',
                      color: f.status === 'live' ? '#7DEFB1' : '#FFC97A',
                      background: f.status === 'live' ? 'rgba(80,220,140,0.06)' : 'rgba(255,180,80,0.05)',
                    }}
                  >
                    {f.status === 'live' ? '● live' : '○ in dev'}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: 'rgba(254,254,254,0.5)', lineHeight: 1.7 }}>{f.desc}</p>

                <div style={S.code}>
                  {f.code.split('\n').map((line, idx) => (
                    <div key={idx}>
                      {line.startsWith('→') ? (
                        <>
                          <span style={{ color: '#00E5FF', fontWeight: 700 }}>→</span>
                          {line.slice(1)}
                        </>
                      ) : (
                        <span style={{ color: '#00E5FF', fontWeight: 700 }}>{line}</span>
                      )}
                    </div>
                  ))}
                </div>

                <div style={S.tag}>
                  <span style={{ width: 5, height: 5, background: '#00B8D4', display: 'inline-block' }} />
                  Powered by {f.tag}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
