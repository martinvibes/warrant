/**
 * /docs — single-page developer documentation.
 *
 * Mirrors the dark / cyan theme of the rest of the site. Single-file by
 * design (one canonical source of truth, easy to scan, easy to keep in sync
 * with skill.md and the README).
 */

import { type ReactNode, type CSSProperties, useState, useEffect } from 'react';
import { Nav } from './Nav';
import { Footer } from './Footer';
import { LogoLockup } from './Logo';

// ─── Tokens (match Features.tsx vibe) ────────────────────────────────
const LILAC = '#00E5FF';
const TEXT = '#fefefe';
const TEXT_DIM = 'rgba(254,254,254,0.7)';
const TEXT_FAINT = 'rgba(254,254,254,0.5)';
const TEXT_GHOST = 'rgba(254,254,254,0.35)';
const BG_PAGE = '#050508';
const BG_CARD = '#0c0c14';
const BG_CODE = 'rgba(0,0,0,0.55)';
const BORDER = 'rgba(0,229,255,0.12)';
const BORDER_HOVER = 'rgba(0,229,255,0.30)';
const GREEN = '#7DEFB1';
const AMBER = '#FFC97A';

// ─── Sub-components ──────────────────────────────────────────────────

function Section({
  id,
  kicker,
  title,
  intro,
  children,
}: {
  id: string;
  kicker?: string;
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} style={{ padding: '64px 0', borderTop: `1px solid ${BORDER}`, scrollMarginTop: 80 }}>
      {kicker && (
        <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: LILAC, marginBottom: 14, fontFamily: 'JetBrains Mono, monospace' }}>
          {kicker}
        </div>
      )}
      <h2 style={{ fontSize: 'clamp(28px, 4vw, 38px)', fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 16 }}>
        {title}
      </h2>
      {intro && (
        <div style={{ fontSize: 15, color: TEXT_DIM, lineHeight: 1.75, maxWidth: 720, marginBottom: 32 }}>
          {intro}
        </div>
      )}
      {children}
    </section>
  );
}

function Code({ children, lang }: { children: string; lang?: string }) {
  return (
    <pre style={{
      background: BG_CODE,
      border: `1px solid ${BORDER}`,
      padding: '16px 18px',
      fontSize: 12.5,
      lineHeight: 1.7,
      color: '#E6E1FF',
      fontFamily: 'JetBrains Mono, ui-monospace, monospace',
      overflow: 'auto',
      margin: '12px 0',
      whiteSpace: 'pre',
    }}>
      {lang && <div style={{ color: TEXT_GHOST, fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>{lang}</div>}
      <code>{children}</code>
    </pre>
  );
}

function Pill({ children, kind = 'live' }: { children: ReactNode; kind?: 'live' | 'dev' | 'free' | 'paid' }) {
  const styles: Record<string, CSSProperties> = {
    live:  { color: GREEN,  border: '1px solid rgba(125,239,177,0.30)', background: 'rgba(125,239,177,0.06)' },
    dev:   { color: AMBER,  border: '1px solid rgba(255,201,122,0.30)', background: 'rgba(255,201,122,0.05)' },
    free:  { color: TEXT_FAINT, border: `1px solid ${BORDER}`,         background: 'transparent' },
    paid:  { color: LILAC,  border: '1px solid rgba(0,229,255,0.30)', background: 'rgba(0,229,255,0.06)' },
  };
  return (
    <span style={{
      display: 'inline-block', fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
      letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 8px',
      ...(styles[kind] || styles.live),
    }}>
      {children}
    </span>
  );
}

function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{
      background: BG_CARD,
      border: `1px solid ${BORDER}`,
      padding: 24,
      ...style,
    }}>
      {children}
    </div>
  );
}

function Endpoint({
  method,
  path,
  cost,
  status,
  body,
  desc,
}: {
  method: 'GET' | 'POST' | 'DELETE';
  path: string;
  cost: string;
  status: 'live' | 'dev';
  body?: string;
  desc: ReactNode;
}) {
  const methodColor: Record<string, string> = { GET: GREEN, POST: LILAC, DELETE: '#f85149' };
  return (
    <Card style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, color: methodColor[method] }}>
          {method}
        </span>
        <code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, color: TEXT, flex: 1, wordBreak: 'break-all' }}>
          {path}
        </code>
        <Pill kind={cost === 'free' ? 'free' : 'paid'}>{cost}</Pill>
        <Pill kind={status}>{status === 'live' ? '● live' : '○ dev'}</Pill>
      </div>
      {body && (
        <code style={{ display: 'block', fontSize: 11.5, color: TEXT_FAINT, fontFamily: 'JetBrains Mono, monospace', marginTop: 4, marginBottom: 8 }}>
          body: {body}
        </code>
      )}
      <div style={{ fontSize: 13, color: TEXT_DIM, lineHeight: 1.7 }}>{desc}</div>
    </Card>
  );
}

// ─── Page ────────────────────────────────────────────────────────────

const SECTION_IDS = ['quick-start', 'concepts', 'services', 'x402-flow', 'sdk', 'http-api', 'contracts', 'faq', 'links'];

export function Docs() {
  const [pricingChain, setPricingChain] = useState<"0g" | "celo">("celo");
  const [activeSection, setActiveSection] = useState('quick-start');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: '-100px 0px -60% 0px', threshold: 0 }
    );
    for (const id of SECTION_IDS) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  const prices = pricingChain === "celo" ? {
    identity: "$0.50 USDC",
    emailProvision: "$2.00 USDC",
    emailSend: "$0.08 USDC",
    emailRead: "$0.02 USDC",
    phone: "$3.00 USDC",
    sms: "$0.05 USDC",
    compute: "$0.10 USDC",
    memory: "free",
  } : {
    identity: "0.5 0G",
    emailProvision: "2.0 0G",
    emailSend: "0.1 0G",
    emailRead: "0.05 0G",
    phone: "6.0 0G",
    sms: "0.1 0G",
    compute: "0.2 0G",
    memory: "free",
  };

  return (
    <div style={{ background: BG_PAGE, color: TEXT, minHeight: '100vh' }}>
      <Nav />

      {/* Sidebar + Content layout */}
      <div className="docs-layout" style={{ display: 'flex', maxWidth: 1120, margin: '0 auto', padding: '120px 24px 40px', gap: 48 }}>

        {/* Sidebar */}
        <nav className="docs-sidebar" style={{
          width: 200, flexShrink: 0, position: 'sticky', top: 100, alignSelf: 'flex-start',
          height: 'fit-content', display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: TEXT_GHOST, marginBottom: 12, fontFamily: 'JetBrains Mono, monospace' }}>
            Documentation
          </div>
          {[
            ['01', 'Quick start',    '#quick-start'],
            ['02', 'Three rules',    '#concepts'],
            ['03', 'Services',       '#services'],
            ['04', 'x402 flow',      '#x402-flow'],
            ['05', 'SDK',            '#sdk'],
            ['06', 'HTTP API',       '#http-api'],
            ['07', 'Contracts',      '#contracts'],
            ['08', 'FAQ',            '#faq'],
            ['09', 'Links',          '#links'],
          ].map(([num, label, href]) => {
            const sectionId = (href as string).replace('#', '');
            const isActive = activeSection === sectionId;
            return (
              <a key={href} href={href as string} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                fontSize: 13,
                color: isActive ? LILAC : TEXT_DIM,
                background: isActive ? 'rgba(0,229,255,0.08)' : 'transparent',
                borderLeft: isActive ? `2px solid ${LILAC}` : '2px solid transparent',
                textDecoration: 'none', borderRadius: '0 6px 6px 0',
                transition: 'all 0.15s', fontFamily: 'Inter, system-ui, sans-serif',
              }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.color = LILAC; e.currentTarget.style.background = 'rgba(0,229,255,0.06)'; } }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.color = TEXT_DIM; e.currentTarget.style.background = 'transparent'; } }}
              >
                <span style={{ fontSize: 10, color: isActive ? LILAC : TEXT_GHOST, fontFamily: 'JetBrains Mono, monospace', width: 18 }}>{num}</span>
                {label}
              </a>
            );
          })}

          <div style={{ borderTop: `1px solid ${BORDER}`, marginTop: 16, paddingTop: 16 }}>
            <a href="https://api.0gent.xyz/skill.md" target="_blank" rel="noreferrer" style={{
              display: 'block', padding: '8px 12px', fontSize: 12, color: TEXT_GHOST,
              textDecoration: 'none', transition: 'color 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.color = LILAC; }}
              onMouseLeave={e => { e.currentTarget.style.color = TEXT_GHOST; }}
            >
              skill.md ↗
            </a>
            <a href="https://api.0gent.xyz/pricing" target="_blank" rel="noreferrer" style={{
              display: 'block', padding: '8px 12px', fontSize: 12, color: TEXT_GHOST,
              textDecoration: 'none', transition: 'color 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.color = LILAC; }}
              onMouseLeave={e => { e.currentTarget.style.color = TEXT_GHOST; }}
            >
              /pricing ↗
            </a>
          </div>
        </nav>

        {/* Main content */}
        <div className="docs-content" style={{ flex: 1, minWidth: 0, maxWidth: 820 }}>

        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ marginBottom: 32 }}>
            <LogoLockup size={28} />
          </div>
          <h1 style={{ fontSize: 'clamp(36px, 5.5vw, 56px)', fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1.05, marginBottom: 20 }}>
            Build agents that pay their own way.
          </h1>
          <p style={{ fontSize: 17, color: TEXT_DIM, lineHeight: 1.7, maxWidth: 640 }}>
            0GENT is the SDK + backend that lets your AI agent provision real-world resources: email inboxes, phone numbers, AI inference,
            on-chain identity — with no human in the loop. Your agent's wallet pays per call via x402, and resources are
            owned by the wallet on-chain.
          </p>
        </div>

        {/* ── Quick start ───────────────────────────────────────── */}
        <Section
          id="quick-start"
          kicker="01"
          title="Quick start"
          intro={<>Zero-install via npx, or globally install the CLI and SDK. Requires Node ≥ 18.</>}
        >
          <Code lang="bash">{`# Run any command without installing
npx @0gent/core phone countries
npx @0gent/core compute infer "what is 0G Chain?"

# Or install globally
npm i -g @0gent/core
0gent setup`}</Code>

          <p style={{ fontSize: 14, color: TEXT_DIM, lineHeight: 1.7, marginTop: 24, marginBottom: 12 }}>
            Once <code style={{ color: LILAC }}>setup</code> finishes you have an encrypted local wallet at{' '}
            <code style={{ color: TEXT, background: BG_CODE, padding: '1px 6px' }}>~/.0gent/</code>. Fund it with testnet 0G:
          </p>

          <Code lang="bash">{`0gent wallet fund            # opens a faucet link + QR
0gent balance                # confirm the testnet 0G arrived
0gent identity mint          # mint your Agent NFT (0.5 0G)
0gent email create scout     # claim scout@0gent.xyz (2.0 0G)
0gent compute infer "explain x402 in one sentence"  # paid LLM call (0.2 0G)
0gent phone provision --country US -y               # real US number (6.0 0G + ~$2)
0gent phone sms <id> --to +<your-mobile> --body "from my agent"`}</Code>
        </Section>

        {/* ── Concepts ──────────────────────────────────────────── */}
        <Section
          id="concepts"
          kicker="02"
          title="Three rules"
          intro={<>Everything in 0GENT follows from these three principles. Read them once and the rest of the docs makes sense.</>}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
            <Card>
              <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: LILAC, marginBottom: 10 }}>RULE 1</div>
              <div style={{ fontSize: 17, fontWeight: 500, marginBottom: 10 }}>Wallet = identity</div>
              <div style={{ fontSize: 13, color: TEXT_DIM, lineHeight: 1.7 }}>
                There are no user accounts. The wallet that signs each x402 payment becomes the owner of the resource it bought.
                No login, no API keys, no tokens.
              </div>
            </Card>
            <Card>
              <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: LILAC, marginBottom: 10 }}>RULE 2</div>
              <div style={{ fontSize: 17, fontWeight: 500, marginBottom: 10 }}>Pay per call in 0G</div>
              <div style={{ fontSize: 13, color: TEXT_DIM, lineHeight: 1.7 }}>
                Every paid endpoint settles a real on-chain transaction in native 0G via the{' '}
                <a href="https://github.com/coinbase/x402" target="_blank" rel="noreferrer" style={{ color: LILAC, textDecoration: 'underline' }}>x402</a>{' '}
                HTTP payment standard. No subscriptions, no bridges, no USDC.
              </div>
            </Card>
            <Card>
              <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: LILAC, marginBottom: 10 }}>RULE 3</div>
              <div style={{ fontSize: 17, fontWeight: 500, marginBottom: 10 }}>Keys never leave you</div>
              <div style={{ fontSize: 13, color: TEXT_DIM, lineHeight: 1.7 }}>
                The seed is generated locally, encrypted at rest with AES-256-GCM, and the server only ever sees the public address.
                Lose the mnemonic, lose access — same trust model as MetaMask.
              </div>
            </Card>
          </div>
        </Section>

        {/* ── Services & pricing ────────────────────────────────── */}
        <Section
          id="services"
          kicker="03"
          title="Services & pricing"
          intro={<>What an agent can buy from the live API today.</>}
        >
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {(["celo", "0g"] as const).map(chain => (
              <button
                key={chain}
                onClick={() => setPricingChain(chain)}
                style={{
                  padding: "6px 16px",
                  borderRadius: 6,
                  border: `1px solid ${pricingChain === chain ? LILAC : "#333"}`,
                  background: pricingChain === chain ? LILAC + "22" : "transparent",
                  color: pricingChain === chain ? LILAC : "#888",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                {chain === "celo" ? "Celo" : "0G Chain"}
              </button>
            ))}
          </div>
          <div className="docs-services" style={{ border: `1px solid ${BORDER}` }}>
            <table className="docs-services-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: BG_CARD }}>
                  <th style={{ textAlign: 'left', padding: '12px 16px', color: TEXT_FAINT, fontWeight: 500, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Service</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', color: TEXT_FAINT, fontWeight: 500, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Cost</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', color: TEXT_FAINT, fontWeight: 500, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', color: TEXT_FAINT, fontWeight: 500, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Backed by</th>
                </tr>
              </thead>
              <tbody style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {([
                  ['Identity NFT mint',     prices.identity,       'live', '0G Chain · ZeroGentIdentity'],
                  ['Email inbox provision', prices.emailProvision,  'live', 'Cloudflare Email Workers'],
                  ['Send email',            prices.emailSend,       'live', 'Resend'],
                  ['Read inbox',            prices.emailRead,       'live', 'Cloudflare Worker → backend webhook'],
                  ['AI inference (LLM)',    prices.compute,         'live', '0G Compute Network · qwen-2.5-7b'],
                  ['Phone number',          prices.phone,           'live', 'Telnyx'],
                  ['Send SMS',              prices.sms,             'live', 'Telnyx'],
                  ['Persistent memory',     prices.memory,          'live', '0G Storage'],
                  ['Domain registration',   pricingChain === "celo" ? "$2.00 USDC" : '2.0 0G',    'dev',  'Namecheap'],
                  ['Compute VPS',           pricingChain === "celo" ? "$1.00 USDC/mo" : '1.0 0G/mo', 'dev',  'Hetzner Cloud'],
                  ['X account ops',         pricingChain === "celo" ? "$5.00 USDC" : '5.0 0G',    'dev',  'Roadmap Q3'],
                ] as [string, string, string, string][]).map(([svc, cost, st, by]) => (
                  <tr key={svc} className="docs-services-row" style={{ borderTop: `1px solid ${BORDER}` }}>
                    <td data-label="Service" style={{ padding: '12px 16px', color: TEXT }}>{svc}</td>
                    <td data-label="Cost"    style={{ padding: '12px 16px', color: LILAC }}>{cost}</td>
                    <td data-label="Status"  style={{ padding: '12px 16px' }}><Pill kind={st as any}>{st === 'live' ? '● live' : '○ dev'}</Pill></td>
                    <td data-label="Backed by" style={{ padding: '12px 16px', color: TEXT_FAINT, fontSize: 12 }}>{by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 12, color: TEXT_GHOST, marginTop: 14, fontStyle: 'italic' }}>
            Live pricing is always at <a href="/pricing" style={{ color: LILAC }}>/pricing</a> — never hardcode. Prices are set for mainnet.
          </p>
        </Section>

        {/* ── x402 flow ─────────────────────────────────────────── */}
        <Section
          id="x402-flow"
          kicker="04"
          title="How a paid call works"
          intro={<>Every paid endpoint follows the same shape — request, 402 challenge, on-chain payment, retry with proof, deliver. The SDK handles steps 2–4 transparently.</>}
        >
          <Code lang="flow">{`Agent                             0GENT API                       0G Chain
  │                                  │                                │
  │  POST /compute/infer  {prompt}   │                                │
  ├─────────────────────────────────▶│                                │
  │  ◀ 402 Payment Required          │                                │
  │    {contract, nonce, amount}     │                                │
  │                                  │                                │
  │  ZeroGentPayment.pay(nonce,      │                                │
  │   "compute-infer") with 0.2 0G   │                                │
  ├──────────────────────────────────┼───────────────────────────────▶│
  │                                  │                       ✓ Event  │
  │  POST /compute/infer +           │                                │
  │   X-Payment: {txHash, nonce}     │                                │
  ├─────────────────────────────────▶│  verify on-chain ──────────────▶│
  │                                  │  call broker, sign request     │
  │                                  │   to 0G Compute Network ──┐    │
  │                                  │                           ▼    │
  │                                  │              qwen-2.5-7b @ 0xa48f… │
  │                                  │              ◀ completion ─────┤
  │  ◀ 200 OK + LLM completion       │                                │
`}</Code>

          <p style={{ fontSize: 14, color: TEXT_DIM, lineHeight: 1.7, marginTop: 16 }}>
            <strong style={{ color: TEXT }}>The same flow drives every paid service</strong> — only the resource type and price change.
            Identity mints. Email sends. Phone provisions. SMS sends. Compute calls. One protocol, many resources.
          </p>
        </Section>

        {/* ── SDK reference ─────────────────────────────────────── */}
        <Section
          id="sdk"
          kicker="05"
          title="SDK reference"
          intro={<>Every CLI command has an equivalent SDK method. The SDK auto-signs x402 payments using the wallet you pass.</>}
        >
          <Code lang="typescript">{`import { ZeroGent } from '@0gent/core';

// 1. Generate a wallet locally — no network
const w = ZeroGent.createWallet('my-agent');

// 2. Construct a client that auto-pays x402 challenges
const z = new ZeroGent({
  privateKey: w.privateKey,
  api: 'https://api.0gent.xyz',                     // optional
  onPaymentStatus: (msg) => console.log('[pay]', msg),
});

// ── Free reads ──
await z.health();
await z.balance();
await z.pricing();
await z.computeProviders();
await z.computeStatus();
await z.phoneCountries();
await z.phoneSearch('US', '415');

// ── Identity (paid) ──
const id = await z.identityMint('support-bot');                // 0.5 0G

// ── Email (paid) ──
const inbox = await z.emailCreate('support');                  // 2.0 0G
await z.emailSend(inbox.id,
  'user@example.com', 'Receipt', 'Thanks!');                   // 0.1 0G
const messages = await z.emailRead(inbox.id);                  // 0.05 0G

// ── 0G Compute (paid) ──
const reply = await z.computeInfer(
  'What is 0G Chain in one sentence?', { maxTokens: 80 });     // 0.2 0G
// { response, model, provider, usage }

// ── Phone & SMS (paid) ──
const phone = await z.phoneProvision({ country: 'US' });       // 6.0 0G
//   or pass an exact number from a previous search:
//   await z.phoneProvision({ phoneNumber: '+18164961100' })
await z.phoneSms(phone.id, '+1...', 'Hello');                  // 0.1 0G

// ── Memory (free) ──
await z.memory.set('last_conv', { user: 'alice' });
const m = await z.memory.get('last_conv');

// ── On-chain reads (free) ──
const resources = await z.listResources();`}</Code>
        </Section>

        {/* ── HTTP API ──────────────────────────────────────────── */}
        <Section
          id="http-api"
          kicker="06"
          title="HTTP API"
          intro={<>Every endpoint speaks JSON. Free endpoints need no headers. Paid endpoints return 402 with payment instructions, then accept a retry with <code style={{ color: LILAC }}>X-Payment: {`{txHash, nonce}`}</code>.</>}
        >
          <h3 style={{ fontSize: 16, fontWeight: 500, color: LILAC, margin: '24px 0 12px' }}>System</h3>
          <Endpoint method="GET" path="/health" cost="free" status="live" desc="API + chain status, contract addresses, version." />
          <Endpoint method="GET" path="/pricing" cost="free" status="live" desc="Live price list — always pull from here, never hardcode." />
          <Endpoint method="GET" path="/skill.md" cost="free" status="live" desc="LLM-readable manifest of every endpoint." />

          <h3 style={{ fontSize: 16, fontWeight: 500, color: LILAC, margin: '24px 0 12px' }}>Identity</h3>
          <Endpoint method="POST" path="/identity/mint" cost="0.5 0G" status="live" body={`{ "name": "scout" }`} desc="ERC-721 NFT, one per wallet, metadata pinned to 0G Storage." />
          <Endpoint method="GET" path="/identity/:walletAddress" cost="free" status="live" desc="Lookup any agent's identity." />
          <Endpoint method="GET" path="/agent/:address" cost="free" status="live" desc="Aggregated public profile — identity + resources + balance — useful for inter-agent introspection." />

          <h3 style={{ fontSize: 16, fontWeight: 500, color: LILAC, margin: '24px 0 12px' }}>Email</h3>
          <Endpoint method="POST" path="/email/provision" cost="2.0 0G" status="live" body={`{ "name": "scout" }`} desc="Provision <name>@0gent.xyz inbox, owned by your wallet." />
          <Endpoint method="POST" path="/email/:id/send" cost="0.1 0G" status="live" body={`{ "to", "subject", "body" }`} desc="Send via Resend, with on-chain receipt." />
          <Endpoint method="GET" path="/email/:id/inbox" cost="0.05 0G" status="live" desc="Read inbound replies (Cloudflare Worker captures inbound MIME)." />
          <Endpoint method="GET" path="/email/:id/threads" cost="0.05 0G" status="live" desc="Conversation-grouped view of the inbox." />

          <h3 style={{ fontSize: 16, fontWeight: 500, color: LILAC, margin: '24px 0 12px' }}>0G Compute (AI inference)</h3>
          <Endpoint method="GET" path="/compute/providers" cost="free" status="live" desc="Live discovery of upstream inference providers on 0G Compute Network." />
          <Endpoint method="GET" path="/compute/status" cost="free" status="live" desc="Operator ledger balance, providers count, ready flag." />
          <Endpoint method="POST" path="/compute/infer" cost="0.2 0G" status="live" body={`{ "prompt", "model?", "maxTokens?", "system?" }`} desc="Pay-per-call LLM. Returns OpenAI-shape { response, model, provider, usage }." />

          <h3 style={{ fontSize: 16, fontWeight: 500, color: LILAC, margin: '24px 0 12px' }}>Phone & SMS</h3>
          <Endpoint method="GET" path="/phone/status" cost="free" status="live" desc="Active provider (Telnyx or Twilio) + capabilities." />
          <Endpoint method="GET" path="/phone/countries" cost="free" status="live" desc="50 curated country picks (Telnyx/Twilio support 170+; pass any 2-letter ISO code)." />
          <Endpoint method="GET" path={`/phone/search?country=US&areaCode=415`} cost="free" status="live" desc="Live inventory. Aliases like 'UK' resolve to 'GB' automatically." />
          <Endpoint method="POST" path="/phone/provision" cost="6.0 0G" status="live" body={`{ "country", "areaCode" }  or  { "phoneNumber": "+1..." }`} desc="Country mode: rotates 5 candidates if upstream churns. Specific-number mode: validates E.164 before x402 charges." />
          <Endpoint method="POST" path="/phone/:id/sms" cost="0.1 0G" status="live" body={`{ "to", "body" }`} desc="Pre-flight catches To==From, missing fields, malformed E.164 BEFORE x402 charges." />
          <Endpoint method="GET" path="/phone/:id/logs?owner=0x..." cost="free" status="live" desc="SMS history (owner-scoped)." />

          <h3 style={{ fontSize: 16, fontWeight: 500, color: LILAC, margin: '24px 0 12px' }}>Memory (0G Storage)</h3>
          <Endpoint method="POST" path="/memory/:walletAddress" cost="free" status="live" body={`{ "key", "value" }`} desc="Persist arbitrary JSON to 0G Storage, indexed by your wallet." />
          <Endpoint method="GET" path="/memory/:walletAddress?key=preferences" cost="free" status="live" desc="Read by key." />
          <Endpoint method="GET" path="/memory/:walletAddress" cost="free" status="live" desc="List all keys + 0G Storage root hashes." />
          <Endpoint method="DELETE" path="/memory/:walletAddress/key/:key" cost="free" status="live" desc="Remove a memory entry." />

          <h3 style={{ fontSize: 16, fontWeight: 500, color: LILAC, margin: '24px 0 12px' }}>Wallet</h3>
          <Endpoint method="POST" path="/wallet/create" cost="free" status="live" body={`{ "name": "optional" }`} desc="Server-side BIP-39 generation. Server forgets the mnemonic immediately. Most users go through the SDK's createWallet() instead, which never round-trips." />
          <Endpoint method="GET" path="/wallet/:address/balance" cost="free" status="live" desc="Live read from 0G Chain RPC." />
        </Section>

        {/* ── Smart contracts ──────────────────────────────────── */}
        <Section
          id="contracts"
          kicker="07"
          title="Smart contracts"
          intro={<>Smart contracts deployed on Celo and 0G Chain. 127 unit + fuzz tests passing.</>}
        >
          <div className="docs-services" style={{ border: `1px solid ${BORDER}` }}>
            <table className="docs-services-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: BG_CARD }}>
                  <th style={{ textAlign: 'left', padding: '12px 16px', color: TEXT_FAINT, fontWeight: 500, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Contract</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', color: TEXT_FAINT, fontWeight: 500, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Address</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', color: TEXT_FAINT, fontWeight: 500, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Purpose</th>
                </tr>
              </thead>
              <tbody style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {([
                  ['ZeroGentPayment',  '0x124aF88c004e9df6D444a0Afc0Fe7Ef215dc02A2', 'x402 treasury, nonce-replay protected'],
                  ['AgentRegistry',    '0x49589C475BBB418B0E069010C923ed18D00E275b', 'Wallet → owned resources mapping'],
                  ['ZeroGentIdentity', '0xa601C569FD008DEd545531a5d3245B2C68ac591d', 'ERC-721 agent NFT, metadata on 0G Storage'],
                ] as const).map(([n, a, p]) => (
                  <tr key={a} className="docs-services-row" style={{ borderTop: `1px solid ${BORDER}` }}>
                    <td data-label="Contract" style={{ padding: '12px 16px', color: TEXT }}>{n}</td>
                    <td data-label="Address"  style={{ padding: '12px 16px' }}>
                      <a href={`https://chainscan.0g.ai/address/${a}`} target="_blank" rel="noreferrer" style={{ color: LILAC, textDecoration: 'underline', fontSize: 11, wordBreak: 'break-all' }}>{a}</a>
                    </td>
                    <td data-label="Purpose"  style={{ padding: '12px 16px', color: TEXT_FAINT }}>{p}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 12, color: TEXT_GHOST, marginTop: 14, fontStyle: 'italic' }}>
            0G Storage flow contract used for memory + NFT metadata: <code style={{ color: LILAC }}>0x62D4144dB0F0a6fBBaeb6296c785C71B3D57C526</code>
          </p>
        </Section>

        {/* ── FAQ ──────────────────────────────────────────────── */}
        <Section
          id="faq"
          kicker="08"
          title="FAQ"
        >
          {([
            ['Is this real or a simulation?', <>Real. Real on-chain payments, real emails delivered, real phone numbers, real LLM completions. Just on testnet for now, where 0G has no dollar value.</>],
            ['What if I lose my mnemonic?', <>You lose access — same as MetaMask. Save it when <code style={{ color: LILAC }}>0gent setup</code> shows it. There is no reset.</>],
            ['Can I run this on 0G mainnet?', <>Live on 0G mainnet (chain 16661).</>],
            ['How does the server verify my payment?', <>By reading <code style={{ color: LILAC }}>PaymentReceived</code> events from <code style={{ color: LILAC }}>ZeroGentPayment</code> on-chain, matching the nonce you signed. No cookies, no API keys, no sessions.</>],
            ['Why ERC-721 and not ERC-7857 (INFT)?', <>ERC-7857 wasn't documented in 0G's docs when this project shipped. We use vanilla ERC-721 on 0G Chain with metadata on 0G Storage. Migration to ERC-7857 is a one-contract swap when the standard is finalized.</>],
            ['What happens if a paid call fails upstream?', <>Pre-flight checks (E.164 shape, To==From, missing fields) reject *before* x402 charges, so most user errors cost zero 0G. Other upstream rejections (Telnyx region locks, etc.) currently cost the agent the call fee — automatic on-chain refunds are on the roadmap.</>],
            ['What about A2P 10DLC for US SMS?', <>For demo-volume traffic, sending without 10DLC registration generally works. For production-volume US SMS you'd register via Telnyx's compliance flow. Non-US SMS skips this entirely.</>],
            ['My agent is in Python — can I use this?', <>The CLI is Node, but every paid action is just an HTTP request + an EVM signature. The skill manifest at <a href="/skill.md" style={{ color: LILAC }}>/skill.md</a> documents the raw HTTP API. Any language with <code style={{ color: LILAC }}>eth_signTransaction</code> works.</>],
          ] as const).map(([q, a], i) => (
            <Card key={i} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>{q}</div>
              <div style={{ fontSize: 13, color: TEXT_DIM, lineHeight: 1.7 }}>{a}</div>
            </Card>
          ))}
        </Section>

        {/* ── Links ────────────────────────────────────────────── */}
        <Section id="links" kicker="09" title="Links">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            {([
              ['npm package',          'https://www.npmjs.com/package/@0gent/core'],
              ['GitHub source',        'https://github.com/0GENT-Labs/0gent'],
              ['Skill manifest (LLM)', '/skill.md'],
              ['Live API health',      'https://api.0gent.xyz/health'],
              ['Live pricing',         'https://api.0gent.xyz/pricing'],
              ['0G faucet',            'https://faucet.0g.ai'],
              ['0G explorer',          'https://chainscan.0g.ai'],
              ['Hackathon (HackQuest)','https://www.hackquest.io/hackathons/0G-APAC-Hackathon'],
            ] as const).map(([l, h]) => (
              <a key={h} href={h} target={h.startsWith('http') ? '_blank' : undefined} rel="noreferrer" style={{
                display: 'block', padding: '14px 16px', background: BG_CARD, border: `1px solid ${BORDER}`,
                color: TEXT, textDecoration: 'none', fontSize: 13, transition: 'all 0.2s',
                fontFamily: 'JetBrains Mono, monospace',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = BORDER_HOVER; e.currentTarget.style.color = LILAC; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = TEXT; }}
              >
                {l} <span style={{ color: TEXT_GHOST, marginLeft: 6 }}>↗</span>
              </a>
            ))}
          </div>
        </Section>

        </div>{/* end docs-content */}
      </div>{/* end docs-layout */}

      <Footer />
    </div>
  );
}
