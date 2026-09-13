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
  ['01', 'Quick start', 'quick-start'],
  ['02', 'What is for sale', 'catalogue'],
  ['03', 'The limit', 'limit'],
  ['04', 'Sealed mail', 'sealed'],
  ['05', 'HTTP API', 'api'],
  ['06', 'Receipts', 'receipts'],
  ['07', 'Settlement', 'settlement'],
  ['08', 'Contracts', 'contracts'],
  ['09', 'What this does not do', 'bounds'],
];

/**
 * Which section the reader is in.
 *
 * Reported from the section nearest the top of the viewport rather than from
 * whatever is merely intersecting, because several sections are on screen at
 * once and only one of them is the one being read.
 */
function useActiveSection(ids: string[]): string {
  const [active, setActive] = useState(ids[0]);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      let current = ids[0];
      for (const id of ids) {
        const node = document.getElementById(id);
        if (node && node.getBoundingClientRect().top <= 140) current = id;
      }
      setActive(current);
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
  }, [ids]);

  return active;
}

const SECTION_IDS = NAV.map(([, , id]) => id);

export function Docs() {
  const active = useActiveSection(SECTION_IDS);

  return (
    <>
      <Nav />
      <main style={{ background: BG_PAGE, color: TEXT, minHeight: '100vh' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '120px 24px 80px' }}>
          <header style={{ maxWidth: 720, marginBottom: 8 }}>
            <div className="label" style={{ color: BRASS, marginBottom: 14 }}>Documentation</div>
            <h1 className="display" style={{ fontSize: 'clamp(34px, 5vw, 50px)', lineHeight: 1.1, marginBottom: 18 }}>
              Buying things with an agent.
            </h1>
            <p style={{ fontSize: 16, color: TEXT_DIM, lineHeight: 1.75 }}>
              Warrant sells real resources to agents over HTTP, one payment per request, settled in
              USDC on Hedera. There is no account to open and no key to apply for. An agent that can
              pay can buy, and the only thing that stops it is a limit enforced by a contract.
            </p>
          </header>

          <div className="docs-split">
            <aside className="docs-side" aria-label="Sections">
              <div className="label" style={{ color: TEXT_GHOST, padding: '0 12px 10px' }}>
                On this page
              </div>
              {NAV.map(([n, title, id]) => (
                <a key={id} href={`#${id}`} data-active={active === id}>
                  <span className="mono docs-side-n">{n}</span>
                  {title}
                </a>
              ))}
            </aside>

            <div className="docs-body">
          <Section
            id="quick-start"
            kicker="01"
            title="Quick start"
            intro="Three commands. The first two are setup and happen once; the third is the thing itself."
          >
            <Code lang="shell">{`git clone https://github.com/martinvibes/warrant && cd warrant
npm install && cp .env.example .env     # fill in the Hedera keys
npm run dev                             # service and console on :8090

npm run agent -- "find out what x402 is and email me a summary"`}</Code>
            <p style={{ fontSize: 14, color: TEXT_DIM, lineHeight: 1.8, marginTop: 14 }}>
              The agent needs a Hedera account holding testnet USDC. It does not need HBAR: the
              facilitator sponsors the network fee, so stablecoin is the only balance it has to
              carry.
            </p>
          </Section>

          <Section
            id="catalogue"
            kicker="02"
            title="What is for sale"
            intro={<>Read <code className="mono">GET /v1/catalogue</code> for the live list and prices. It is the same list the server charges against, so it cannot advertise a price that will not be honoured.</>}
          >
            <Table
              head={['Kind', 'What you get', 'Price']}
              rows={[
                ['identity.mint', 'A soulbound token on Hedera, plus the public key others seal mail to.', '$0.10'],
                ['inference', 'One language model call, returned in OpenAI shape.', '$0.02'],
                ['email.inbox', 'An address the agent owns and receives replies at.', '$1.00'],
                ['email.send', 'Ordinary mail from an address the agent owns.', '$0.20'],
                ['email.sealed', 'Mail encrypted to another agent, unreadable by this service.', '$0.25'],
                ['memory.write', 'A permanent Hedera file that nobody, us included, can edit.', '$0.05'],
                ['phone.provision', 'A real number, SMS capable, in 170+ countries.', '$0.50'],
                ['sms.send', 'One text from a number the agent owns.', '$0.01'],
              ]}
            />
          </Section>

          <Section
            id="limit"
            kicker="03"
            title="The limit"
            intro="Fund an agent directly and its limit is a suggestion, because the agent holds the keys. The money sits in a contract instead, and the agent draws what it needs without asking anyone."
          >
            <Code lang="AgentTreasury.sol">{`setPolicy(agent, totalCap, windowCap, windowSeconds, expiry, kinds)

  totalCap       lifetime ceiling, atomic units
  windowCap      ceiling inside one window
  windowSeconds  window length, e.g. 86400 for a day
  expiry         unix seconds, 0 for never
  kinds          which listings the agent may draw against

draw(listingId, calls) -> (drawId, amount)

  amount is listingPrice * calls, read from the market.
  The agent names what it wants, never the sum.`}</Code>
            <Table
              head={['Refusal', 'Meaning']}
              rows={[
                ['TotalCapExceeded', 'The lifetime ceiling is spent. Raising it does not refund what already went.'],
                ['WindowCapExceeded', 'The daily ceiling is spent. The error carries the instant it reopens.'],
                ['KindNotAllowed', 'The agent may spend, but not on this kind of thing.'],
                ['PolicyExpired', 'The policy had an end date and it has passed.'],
                ['NoPolicy', 'No policy, or it was revoked. Revocation takes effect on the next draw.'],
              ]}
            />
          </Section>

          <Section
            id="sealed"
            kicker="04"
            title="Sealed mail"
            intro="Two agents can already pay each other. Sealed mail lets them say something the carrier cannot read, and it needs no key exchange because the recipient's key is already on chain beside its identity."
          >
            <Code lang="ECIES over secp256k1">{`ephemeral keypair
  -> ECDH with the recipient's published key
  -> HKDF-SHA256
  -> AES-256-GCM

{
  "algorithm": "ECIES-secp256k1-HKDF-SHA256-AES-256-GCM",
  "ephemeralPublicKey": "0x04…",
  "ciphertext": "…", "iv": "…", "tag": "…"
}`}</Code>
            <p style={{ fontSize: 14, color: TEXT_DIM, lineHeight: 1.8, marginTop: 14 }}>
              The recipient's key is read from the identity contract, never from the request, so a
              sender cannot be talked into sealing to an attacker's key. This service holds no
              private key, so being unable to read the traffic is a property of the construction
              rather than a promise about our conduct.
            </p>
          </Section>

          <Section id="api" kicker="05" title="HTTP API" intro="Paid routes answer 402 with terms. Reads are free and need no credentials.">
            <Endpoint method="POST" path="/v1/identity/mint" cost="$0.10" body='{ "metadataURI", "encryptionKey" }' desc="Mints to the address in x-agent-address. The service pays the gas." />
            <Endpoint method="POST" path="/v1/inference" cost="$0.02" body='{ "prompt", "model?", "maxTokens?" }' desc="One completion." />
            <Endpoint method="POST" path="/v1/email/inbox" cost="$1.00" body='{ "name" }' desc="Claims name@domain. Refused rather than renamed if taken." />
            <Endpoint method="POST" path="/v1/email/sealed" cost="$0.25" body='{ "from", "to", "toAgent", "subject", "body" }' desc="Encrypts to toAgent's on-chain key before sending." />
            <Endpoint method="POST" path="/v1/memory" cost="$0.05" body='{ "content" }' desc="Writes a keyless Hedera file. Permanent, 4096 bytes." />
            <Endpoint method="POST" path="/v1/phone/provision" cost="$0.50" body='{ "country?", "phoneNumber?" }' desc="Orders a number. Pass one from the search to get the number you were quoted." />
            <Endpoint method="GET" path="/v1/phone/search" cost="free" desc="Numbers available now, with region and monthly cost. Filters: country, area, limit." />
            <Endpoint method="GET" path="/v1/receipts" cost="free" desc="Receipts, newest first. Pass settlement=… to find the one for a payment you just made." />
            <Endpoint method="GET" path="/v1/receipts/:id" cost="free" desc="One receipt, in the form it was signed in." />
            <Endpoint method="GET" path="/v1/catalogue" cost="free" desc="What is for sale, and at what price." />
            <Endpoint method="GET" path="/v1/purchases" cost="free" desc="Everything sold, newest first. Optional agent filter." />
            <Endpoint method="GET" path="/v1/agents/:agent" cost="free" desc="One agent's spend and what it owns." />
            <Endpoint method="GET" path="/v1/contracts" cost="free" desc="The deployed addresses, with explorer links." />
          </Section>

          <Section id="receipts" kicker="06" title="Receipts" intro="Every settled purchase is signed. Checking one needs nothing from this service.">
            <p style={{ fontSize: 14, color: TEXT_DIM, lineHeight: 1.8 }}>
              A settlement id on its own is a pointer into a mirror node, and a row in this
              service's database is only our word for it. A receipt is the middle thing: what was
              bought, by whom, for how much, against which settlement, signed by the service's key
              over a canonical digest.
            </p>
            <Code lang="digest">{`sha256(
  version | id | agent | kind | resource |
  amount | asset | network | settlement | issuedAt
)`}</Code>
            <p style={{ fontSize: 14, color: TEXT_DIM, lineHeight: 1.8, marginTop: 14 }}>
              The signature is an ordinary personal_sign over that digest string. Recover the signer
              and compare it with <code className="mono">receiptIssuer</code> from{' '}
              <code className="mono">/v1/contracts</code>. Then read the settlement back from
              Hedera's mirror node rather than from us. <code className="mono">npm run verify -- rcp_…</code>{' '}
              does all four.
            </p>
            <p style={{ fontSize: 14, color: TEXT_DIM, lineHeight: 1.8, marginTop: 14 }}>
              A receipt is collected rather than returned with the goods, and that is the protocol
              rather than a shortcut. The payment middleware buffers the handler's response and
              settles afterwards, so at the moment a resource answers, the settlement it would be
              evidence of does not exist yet. The response carries that id in its{' '}
              <code className="mono">PAYMENT-RESPONSE</code> header, which is enough to collect the
              receipt a moment later.
            </p>
          </Section>

          <Section id="settlement" kicker="07" title="Settlement" intro="x402 version 2, exact scheme, on Hedera. The facilitator sponsors the network fee, so a paying agent needs USDC and no HBAR.">
            <Code lang="402 response">{`{
  "scheme":   "exact",
  "network":  "hedera:testnet",
  "amount":   "20000",
  "asset":    "0.0.429274",
  "payTo":    "0.0.…",
  "extra":    { "feePayer": "0.0.7162784" }
}`}</Code>
            <p style={{ fontSize: 14, color: TEXT_DIM, lineHeight: 1.8, marginTop: 14 }}>
              One check runs at the payment layer: the account an agent claims in{' '}
              <code className="mono">x-agent</code> has to be the account that signed. Everything an
              agent owns here is keyed to it, so without that check an agent could buy things into
              someone else's name. The refusal happens after signing and before settlement, so it
              costs nothing.
            </p>
          </Section>

          <Section id="contracts" kicker="08" title="Contracts" intro="Three, on Hedera's EVM. Twenty-eight tests, run with npm run contracts:test.">
            <Table
              head={['Contract', 'What it holds']}
              rows={[
                ['AgentIdentity', 'One soulbound token per agent, plus its encryption key. Anyone may register; nobody may transfer.'],
                ['ResourceMarket', 'Who sells what, at what price, and which URL to pay. Listing is permissionless.'],
                ['AgentTreasury', 'The money and the ceilings. Draws are priced from the market, so the agent cannot inflate them.'],
              ]}
            />
          </Section>

          <Section id="bounds" kicker="09" title="What this does not do" intro="The honest list. Each of these is a real bound, not a roadmap item dressed as one.">
            <Table
              head={['Bound', 'Why']}
              rows={[
                ['The limit binds draws, not the wallet', 'Once drawn, the float is the agent’s. Smaller tranches narrow the window; they do not close it.'],
                ['One service, one catalogue', 'The market is permissionless, but only this service is listed on it today.'],
                ['Memory is 4096 bytes', 'A permanent file is written in one transaction. Longer content has to be split and linked.'],
                ['Purchases are recorded here as well as on chain', 'The local row is fast to read. Anything you need to trust, read from the chain.'],
              ]}
            />
          </Section>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
