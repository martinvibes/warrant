/**
 * /docs — the whole developer reference on one page.
 *
 * Single file on purpose. There is one canonical description of the warrant
 * model and it needs to stay in step with the README and the code, which is
 * easier when it is one thing to edit rather than nine.
 */
import { type ReactNode, type CSSProperties, useEffect, useState } from 'react';
import { Nav } from './Nav';
import { Footer } from './Footer';

const BRASS = '#E8B55C';
const TEXT = '#f7f6f3';
const TEXT_DIM = 'rgba(247,246,243,0.7)';
const TEXT_FAINT = 'rgba(247,246,243,0.5)';
const TEXT_GHOST = 'rgba(247,246,243,0.35)';
const BG_PAGE = '#070707';
const BG_CARD = '#0e0e0f';
const BG_CODE = 'rgba(0,0,0,0.55)';
const BORDER = 'rgba(232,181,92,0.12)';
const GREEN = '#6FE3A5';
const RED = '#E5484D';

// ─── primitives ──────────────────────────────────────────────────────

function Section({ id, kicker, title, intro, children }: {
  id: string; kicker?: string; title: string; intro?: ReactNode; children: ReactNode;
}) {
  return (
    <section id={id} style={{ padding: '64px 0', borderTop: `1px solid ${BORDER}`, scrollMarginTop: 80 }}>
      {kicker && (
        <div className="label" style={{ color: BRASS, marginBottom: 14 }}>{kicker}</div>
      )}
      <h2 className="display" style={{ fontSize: 'clamp(26px, 3.6vw, 36px)', fontWeight: 500, lineHeight: 1.15, marginBottom: 16 }}>
        {title}
      </h2>
      {intro && (
        <div style={{ fontSize: 15, color: TEXT_DIM, lineHeight: 1.8, maxWidth: 720, marginBottom: 32 }}>{intro}</div>
      )}
      {children}
    </section>
  );
}

function Code({ children, lang }: { children: string; lang?: string }) {
  return (
    <pre style={{
      background: BG_CODE, border: `1px solid ${BORDER}`, padding: '16px 18px',
      fontSize: 12.5, lineHeight: 1.75, color: 'rgba(247,246,243,0.82)',
      fontFamily: 'IBM Plex Mono, ui-monospace, monospace',
      overflowX: 'auto', margin: '14px 0', whiteSpace: 'pre',
    }}>
      {lang && <div className="label" style={{ color: TEXT_GHOST, marginBottom: 9, fontSize: 10 }}>{lang}</div>}
      <code>{children}</code>
    </pre>
  );
}

function Pill({ children, kind = 'free' }: { children: ReactNode; kind?: 'free' | 'paid' | 'bad' }) {
  const styles: Record<string, CSSProperties> = {
    free: { color: TEXT_FAINT, border: `1px solid ${BORDER}`, background: 'transparent' },
    paid: { color: BRASS, border: '1px solid rgba(232,181,92,0.30)', background: 'rgba(232,181,92,0.06)' },
    bad: { color: RED, border: '1px solid rgba(229,72,77,0.30)', background: 'rgba(229,72,77,0.06)' },
  };
  return (
    <span className="label" style={{ display: 'inline-block', fontSize: 10, padding: '3px 8px', ...styles[kind] }}>
      {children}
    </span>
  );
}

function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, padding: 24, ...style }}>{children}</div>;
}

function Endpoint({ method, path, cost, body, desc }: {
  method: 'GET' | 'POST'; path: string; cost: string; body?: string; desc: ReactNode;
}) {
  const methodColor: Record<string, string> = { GET: GREEN, POST: BRASS };
  return (
    <Card style={{ marginBottom: 12, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
        <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: methodColor[method] }}>{method}</span>
        <code className="mono" style={{ fontSize: 13.5, color: TEXT, flex: 1, wordBreak: 'break-all' }}>{path}</code>
        <Pill kind={cost === 'free' ? 'free' : 'paid'}>{cost}</Pill>
      </div>
      {body && (
        <code className="mono" style={{ display: 'block', fontSize: 11.5, color: TEXT_FAINT, margin: '6px 0 8px' }}>
          body: {body}
        </code>
      )}
      <div style={{ fontSize: 13, color: TEXT_DIM, lineHeight: 1.7 }}>{desc}</div>
    </Card>
  );
}

function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div style={{ overflowX: 'auto', margin: '14px 0' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {head.map(h => (
              <th key={h} className="label" style={{ textAlign: 'left', padding: '0 16px 10px 0', color: TEXT_GHOST, borderBottom: `1px solid ${BORDER}`, whiteSpace: 'nowrap' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} style={{
                  padding: '12px 16px 12px 0',
                  borderBottom: '1px solid rgba(247,246,243,0.05)',
                  color: j === 0 ? TEXT : TEXT_DIM,
                  fontFamily: j === 0 ? 'IBM Plex Mono, monospace' : undefined,
                  fontSize: j === 0 ? 12 : 13,
                  lineHeight: 1.65,
                  verticalAlign: 'top',
                }}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── page ────────────────────────────────────────────────────────────

const NAV: [string, string, string][] = [
  ['01', 'Quick start', '#quick-start'],
  ['02', 'The warrant', '#warrant'],
  ['03', 'Where checks run', '#stages'],
  ['04', 'Refusal codes', '#refusals'],
  ['05', 'HTTP API', '#api'],
  ['06', 'Settlement', '#settlement'],
  ['07', 'Revocation', '#revocation'],
  ['08', 'Limits', '#limits'],
];

export function Docs() {
  const [active, setActive] = useState('quick-start');

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id); }),
      { rootMargin: '-100px 0px -60% 0px', threshold: 0 }
    );
    NAV.forEach(([, , href]) => {
      const el = document.getElementById(href.slice(1));
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div style={{ background: BG_PAGE, color: TEXT, minHeight: '100vh' }}>
      <Nav />

      <div className="docs-layout" style={{ display: 'flex', maxWidth: 1120, margin: '0 auto', padding: '120px 24px 40px', gap: 48 }}>
        <nav className="docs-sidebar" style={{
          width: 200, flexShrink: 0, position: 'sticky', top: 100, alignSelf: 'flex-start',
          height: 'fit-content', display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          <div className="label" style={{ color: TEXT_GHOST, marginBottom: 12 }}>Reference</div>
          {NAV.map(([num, label, href]) => {
            const isActive = active === href.slice(1);
            return (
              <a key={href} href={href} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                fontSize: 13, textDecoration: 'none',
                color: isActive ? BRASS : TEXT_DIM,
                borderLeft: `2px solid ${isActive ? BRASS : 'transparent'}`,
                background: isActive ? 'rgba(232,181,92,0.05)' : 'transparent',
                transition: 'all 0.15s',
              }}>
                <span className="mono" style={{ fontSize: 10, color: TEXT_GHOST }}>{num}</span>
                {label}
              </a>
            );
          })}
        </nav>

        <main style={{ flex: 1, minWidth: 0 }}>
          <header style={{ paddingBottom: 20 }}>
            <div className="label" style={{ color: BRASS, marginBottom: 14 }}>Documentation</div>
            <h1 className="display" style={{ fontSize: 'clamp(32px, 5vw, 46px)', fontWeight: 500, lineHeight: 1.1, marginBottom: 18 }}>
              Spending authority an agent cannot widen
            </h1>
            <p style={{ fontSize: 16, color: TEXT_DIM, lineHeight: 1.8, maxWidth: 700 }}>
              Warrant sells resources to agents over HTTP, one payment per request, settled in
              USDC on Hedera. What makes it more than a paywall is that no payment is accepted
              unless it is covered by a warrant a human signed: one agent, named resources, a
              ceiling, a purpose, an expiry.
            </p>
          </header>

          <Section
            id="quick-start"
            kicker="01"
            title="Quick start"
            intro="Four commands. The third one is the interesting one."
          >
            <Code lang="shell">{`git clone https://github.com/martinvibes/warrant && cd warrant
npm install
cp .env.example .env      # add a Hedera account and an owner key
npm run dev               # the service, on :8090`}</Code>

            <p style={{ fontSize: 14, color: TEXT_DIM, lineHeight: 1.8, marginTop: 24 }}>
              Then, as the human, authorise one agent to buy one thing:
            </p>
            <Code lang="shell">{`npm run sign -- --agent 0.0.4242 --cap 1.00 \\
                --resources inference \\
                --purpose "support triage" --hours 24

warrant  0x07d266582acb47f6…7fe7edf0
covers   inference
cap      1.00 (1000000 atomic)`}</Code>

            <p style={{ fontSize: 14, color: TEXT_DIM, lineHeight: 1.8, marginTop: 24 }}>
              As the agent, buy something inside the warrant, then something outside it:
            </p>
            <Code lang="shell">{`npm run agent -- inference "summarise ticket #8812"
  BOUGHT   inference  $0.05
  tx       0.0.4242@1789189611.402118000

npm run agent -- injected
  REFUSED  403  resource_not_authorised
  This warrant covers inference. It does not cover email.send.
  No payment was attempted.`}</Code>

            <Card style={{ marginTop: 24, borderLeft: `2px solid ${BRASS}` }}>
              <p style={{ fontSize: 14, color: TEXT_DIM, lineHeight: 1.8, margin: 0 }}>
                The second request was well formed and the agent’s wallet was funded. A
                wallet-level spending cap would have allowed it, because the amount was small
                and the balance was sufficient. It was refused on scope, not on price.
              </p>
            </Card>
          </Section>

          <Section
            id="warrant"
            kicker="02"
            title="The warrant"
            intro={
              <>
                A warrant is an EIP-712 typed message. Its identifier is the hash of its own
                contents, so two parties can name the same warrant without coordinating, and an
                edited warrant is a different warrant rather than a tampered one.
              </>
            }
          >
            <Code lang="typescript">{`const WARRANT_TYPES = {
  Warrant: [
    { name: 'owner',     type: 'address'  },
    { name: 'agent',     type: 'string'   },
    { name: 'asset',     type: 'string'   },
    { name: 'cap',       type: 'uint256'  },
    { name: 'resources', type: 'string[]' },
    { name: 'purpose',   type: 'string'   },
    { name: 'expiry',    type: 'uint256'  },
    { name: 'nonce',     type: 'uint256'  },
  ],
};

const domain = { name: 'Warrant', version: '1', chainId: 296 };`}</Code>

            <Table
              head={['Field', 'Meaning']}
              rows={[
                ['owner', 'EVM address of the human who signed. All authority derives from this signature.'],
                ['agent', 'The one Hedera account id this warrant authorises, e.g. 0.0.4242.'],
                ['asset', 'HTS token id of the settlement asset. Part of what is signed, so a cap cannot be walked past by changing the unit.'],
                ['cap', 'Total ceiling across the warrant’s life, in the asset’s smallest unit. Atomic, not decimal, because a cap that drifts by a rounding step is a cap that can be walked past.'],
                ['resources', 'Allowlist of resource types. An empty list authorises nothing.'],
                ['purpose', 'Free text, copied onto every receipt written under this warrant.'],
                ['expiry', 'Unix seconds. The warrant is dead at and after this instant.'],
                ['nonce', 'Per-owner replay guard. It is also what makes two otherwise identical warrants distinct documents.'],
              ]}
            />

            <p style={{ fontSize: 14, color: TEXT_DIM, lineHeight: 1.8, marginTop: 24 }}>
              The agent presents the signed warrant, base64 encoded, on every request:
            </p>
            <Code lang="http">{`POST /v1/inference
X-Warrant: eyJ3YXJyYW50Ijp7Im93bmVyIjoiMHhGMjQ2YzM0…
Content-Type: application/json

{ "prompt": "summarise ticket #8812" }`}</Code>
            <p style={{ fontSize: 13, color: TEXT_FAINT, lineHeight: 1.75 }}>
              The header is not a secret. It authorises one named agent to buy named things up
              to a ceiling, and holding a copy grants nobody else anything, because the payer is
              checked against the agent the warrant names.
            </p>
          </Section>

          <Section
            id="stages"
            kicker="03"
            title="Where the checks run"
            intro="Each check happens at the earliest moment it is possible to make it. That ordering is the design, not an optimisation."
          >
            <Table
              head={['Stage', 'State of the money', 'What is checked']}
              rows={[
                [
                  'onProtectedRequest',
                  'Nothing has been asked for or paid.',
                  'Is this purchase authorised at all? Signature, owner, revocation, expiry, asset, resource, and spend against the cap. A refusal here is an HTTP 403 and the agent is never even quoted a price.',
                ],
                [
                  'onAfterVerify',
                  'The payment is signed but has not settled.',
                  'Is the payer the agent this warrant names? This cannot be asked earlier, because before a signature there is no payer. A mismatch aborts before the transfer.',
                ],
                [
                  'onAfterSettle',
                  'The money has moved.',
                  'Write the receipt: agent, warrant, purpose, amount, asset, network, transaction id. Nothing is recorded as bought before it is paid for.',
                ],
              ]}
            />
            <Card style={{ marginTop: 20 }}>
              <p style={{ fontSize: 14, color: TEXT_DIM, lineHeight: 1.8, margin: 0 }}>
                Spend is recomputed on every request by summing settled receipts, rather than
                read from a running counter. A cap is only as trustworthy as the number it is
                compared against, and a counter can drift away from what actually happened.
              </p>
            </Card>
          </Section>

          <Section
            id="refusals"
            kicker="04"
            title="Refusal codes"
            intro="Every refusal is recorded with a machine-readable code and a sentence written for the human who will read it later. Both are public."
          >
            <Table
              head={['Code', 'Raised when']}
              rows={[
                ['no_warrant', 'A paid endpoint was called with no warrant at all.'],
                ['malformed_warrant', 'The header was present but will not parse as a warrant.'],
                ['bad_signature', 'The signature does not recover to the owner the warrant names. The recovered address is reported, because a mismatch is an attempt rather than a typo.'],
                ['owner_mismatch', 'The warrant and the revocation disagree about who the owner is.'],
                ['unknown_owner', 'A valid warrant, signed by somebody this service does not accept warrants from.'],
                ['revoked', 'The owner withdrew this warrant.'],
                ['expired', 'The warrant’s expiry has passed.'],
                ['resource_not_authorised', 'The resource requested is not in the warrant’s allowlist.'],
                ['asset_mismatch', 'The warrant is denominated in a different token than this service settles in.'],
                ['cap_exceeded', 'This purchase would take total settled spend past the ceiling.'],
                ['payer_mismatch', 'The payment was signed by an account other than the agent named in the warrant.'],
              ]}
            />
          </Section>

          <Section
            id="api"
            kicker="05"
            title="HTTP API"
            intro="Two paid endpoints and six free ones. The free ones are the audit surface, which is why they need no credentials: anything the console shows, anyone can curl."
          >
            <Endpoint
              method="POST" path="/v1/inference" cost="$0.05"
              body={`{ "prompt": string, "model"?: string, "maxTokens"?: number }`}
              desc="Language-model inference. Requires a warrant covering the inference resource."
            />
            <Endpoint
              method="POST" path="/v1/email/send" cost="$0.02"
              body={`{ "to": string, "subject": string, "body": string }`}
              desc="Sends an email. Requires a warrant covering email.send."
            />
            <Endpoint
              method="GET" path="/health" cost="free"
              desc="Network, settlement asset, facilitator and the account payments go to."
            />
            <Endpoint
              method="GET" path="/v1/pricing" cost="free"
              desc="What this service sells and what each resource costs, in both display and atomic units."
            />
            <Endpoint
              method="POST" path="/v1/warrants" cost="free"
              body={`{ "warrant": {…}, "signature": "0x…" }`}
              desc="Registers a signed warrant so the owner can see it before the agent spends. Grants nothing: the gate re-verifies the signature on every request regardless."
            />
            <Endpoint
              method="GET" path="/v1/warrants" cost="free"
              desc="Every warrant this service has seen, with spend summed from settled receipts and remaining headroom."
            />
            <Endpoint
              method="GET" path="/v1/receipts?warrant=0x…" cost="free"
              desc="Settled purchases, each binding agent, warrant, purpose, amount and Hedera transaction id."
            />
            <Endpoint
              method="GET" path="/v1/refusals" cost="free"
              desc="Every refused attempt, with its code and its reason."
            />
            <Endpoint
              method="POST" path="/v1/warrants/:id/revoke" cost="free"
              body={`{ "revocation": { "warrantId", "owner", "issuedAt" }, "signature": "0x…" }`}
              desc="Withdraws a warrant on the owner's signature. Idempotent: revoking an already-revoked warrant returns 200, because the caller asked for it to be dead and it is dead."
            />
          </Section>

          <Section
            id="settlement"
            kicker="06"
            title="Settlement"
            intro="Pay-per-request only works where the fee is not the purchase. Five cents of inference cannot carry a cent of gas."
          >
            <Table
              head={['Piece', 'Detail']}
              rows={[
                ['protocol', 'x402 v2. The price travels in the HTTP 402 response; the agent retries with a signed payment.'],
                ['network', 'hedera:testnet (CAIP-2). Mainnet is hedera:mainnet.'],
                ['asset', 'USDC as a Hedera token: 0.0.429274 on testnet, 0.0.456858 on mainnet. Six decimal places.'],
                ['facilitator', 'api.testnet.blocky402.com verifies and settles, and sponsors the network fee.'],
                ['fee payer', '0.0.7162784 on testnet. A paying agent needs USDC and no HBAR, which is the difference between an agent that can pay and one that gets stuck holding the wrong asset.'],
              ]}
            />
            <Code lang="http">{`← 402 Payment Required
Payment-Required: <base64 of>
{
  "x402Version": 2,
  "accepts": [{
    "scheme":  "exact",
    "network": "hedera:testnet",
    "amount":  "50000",
    "asset":   "0.0.429274",
    "payTo":   "0.0.6789",
    "maxTimeoutSeconds": 120,
    "extra": { "feePayer": "0.0.7162784" }
  }]
}`}</Code>
          </Section>

          <Section
            id="revocation"
            kicker="07"
            title="Revocation"
            intro="Killing a warrant has to be faster and cheaper than issuing one, or nobody does it in the moment that matters."
          >
            <p style={{ fontSize: 15, color: TEXT_DIM, lineHeight: 1.8 }}>
              So a revocation is a second signed message rather than a transaction. No gas, no
              block time, and the agent’s next request under that warrant is refused. It is
              signed rather than merely asserted because “stop this agent spending” is exactly
              the instruction an attacker would like to be able to forge in the other direction.
            </p>
            <Code lang="typescript">{`const REVOCATION_TYPES = {
  Revocation: [
    { name: 'warrantId', type: 'bytes32' },
    { name: 'owner',     type: 'address' },
    { name: 'issuedAt',  type: 'uint256' },
  ],
};`}</Code>
            <p style={{ fontSize: 14, color: TEXT_FAINT, lineHeight: 1.8 }}>
              Revocations older than five minutes are rejected, so a leaked one cannot be held
              and replayed against a warrant issued later.
            </p>
          </Section>

          <Section
            id="limits"
            kicker="08"
            title="What this does not do"
            intro="Worth stating plainly, because the gaps are where the next version goes."
          >
            <Table
              head={['Limit', 'Consequence']}
              rows={[
                ['Enforcement is per service', 'A warrant binds spending at the service that reads it. Two services each honouring a $1 cap can cost the owner $2. Caps across services need a shared ledger, which this does not have.'],
                ['Spend is recorded locally', 'Receipts live in the service’s own database. They reference real Hedera transactions and can be checked against the ledger, but the tally itself is not on-chain.'],
                ['The cap is a total, not a rate', 'A warrant can be spent to its ceiling in a second. It has no notion of per-hour or per-day.'],
                ['One agent per warrant', 'Authorising a fleet means one warrant each. That is deliberate, since it is what makes payer binding meaningful, but it does mean issuing many documents.'],
              ]}
            />
          </Section>
        </main>
      </div>

      <Footer />
    </div>
  );
}
