import { useEffect, useState } from 'react';
import { getCatalogue, type Offer } from '../lib/api';

/**
 * What an agent can buy here, and what it cannot buy yet.
 *
 * The prices and the live flags come from the same catalogue the server
 * charges against, so this page cannot advertise a price the service will not
 * honour. The unfinished resources sit in the same grid rather than in their
 * own section, but a card with no endpoint also has no price and says in its
 * own words what is in the way. A grid full of promises is how a demo starts
 * lying; a grid that marks which cards are promises does not.
 */

/** What a successful call returns, so the card shows the shape of the answer. */
const RETURNS: Record<string, string[]> = {
  'identity.mint': ['token #1, soulbound to your address', 'encryption key published on chain'],
  inference: ['an OpenAI-shaped completion', 'gpt-4o-mini by default'],
  'email.inbox': ['scout@0gent.xyz, yours to keep', 'replies land in your inbox'],
  'email.send': ['provider id, delivery confirmed'],
  'email.sealed': ['ciphertext only; we never see the body'],
  'memory.write': ['file 0.0.6841923, immutable forever'],
  'phone.provision': ['+1 (816) 496-1100, SMS capable'],
  'sms.send': ['message id, delivered'],
};

const GLYPHS: Record<string, string> = {
  'identity.mint': 'M8 2l5 3v6l-5 3-5-3V5z',
  inference: 'M8 1v14M1 8h14M3.5 3.5l9 9M12.5 3.5l-9 9',
  'email.inbox': 'M1 4h14v8H1zM1 4l7 5 7-5',
  'email.send': 'M1 8l14-6-5 14-3-5z',
  'email.sealed': 'M3 7V5a5 5 0 0110 0v2M2 7h12v8H2z',
  'memory.write': 'M2 3h12v4H2zM2 9h12v4H2z',
  'phone.provision': 'M4 1h8v14H4zM7 13h2',
  'sms.send': 'M1 3h14v9H5l-4 3z',
  domains: 'M8 1a7 7 0 100 14A7 7 0 008 1zM1 8h14M8 1c2 2 2 12 0 14M8 1C6 3 6 13 8 15',
  compute: 'M2 2h12v5H2zM2 9h12v5H2zM4.5 4.5h1M4.5 11.5h1',
  social: 'M11 5.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zM2 14c0-2.8 2.7-4.5 5.5-4.5S13 11.2 13 14',
  refill: 'M8 2v5l3 2M14 8A6 6 0 112 8M12 3.5V6h-2.5',
  delegation: 'M8 2v4M4 14v-3M12 14v-3M4 11h8M8 6v5',
};

function Glyph({ kind, dim }: { kind: string; dim?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d={GLYPHS[kind] ?? GLYPHS.inference}
        stroke={dim ? 'var(--color-muted)' : 'var(--color-accent-light)'}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Card({ offer }: { offer: Offer }) {
  const returns = RETURNS[offer.kind] ?? [];

  return (
    <article
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        padding: '28px 26px',
        borderTop: '1px solid var(--color-line)',
        borderLeft: '1px solid var(--color-line)',
        background: 'var(--color-surface)',
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span
          style={{
            display: 'grid',
            placeItems: 'center',
            width: 34,
            height: 34,
            background: 'var(--color-accent-glow)',
            border: '1px solid var(--color-line)',
          }}
        >
          <Glyph kind={offer.kind} />
        </span>
        <h3 className="display" style={{ fontSize: 19, flex: 1 }}>
          {offer.title}
        </h3>
        <span
          className="label"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '3px 9px',
            color: 'var(--color-settled)',
            border: '1px solid rgba(111,227,165,0.3)',
          }}
        >
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: 'var(--color-settled)',
            }}
          />
          LIVE
        </span>
      </header>

      <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--color-dim)' }}>{offer.blurb}</p>

      <div
        className="mono"
        style={{
          marginTop: 'auto',
          padding: '14px 16px',
          fontSize: 12.5,
          lineHeight: 1.85,
          background: 'var(--color-bg)',
          border: '1px solid var(--color-faint)',
          overflowX: 'auto',
        }}
      >
        <div style={{ color: 'var(--color-accent-light)', whiteSpace: 'nowrap' }}>
          {offer.method} {offer.path}
        </div>
        <div style={{ color: 'var(--color-dim)', whiteSpace: 'nowrap' }}>
          <span style={{ color: 'var(--color-muted)' }}>→ </span>
          402: pay {offer.price} USDC
        </div>
        {returns.map(line => (
          <div key={line} style={{ color: 'var(--color-dim)', whiteSpace: 'nowrap' }}>
            <span style={{ color: 'var(--color-muted)' }}>→ </span>
            {line}
          </div>
        ))}
      </div>

      <span className="label" style={{ color: 'var(--color-muted)' }}>
        {offer.poweredBy}
      </span>
    </article>
  );
}

/**
 * A resource being built. Same card as a live one so the grid stays regular,
 * with the endpoint block replaced by what is in the way, because that is the
 * only honest thing to put where a price would go.
 */
interface Planned {
  kind: string;
  title: string;
  blurb: string;
  blocker: string;
  poweredBy: string;
}

const PLANNED: Planned[] = [
  {
    kind: 'domains',
    title: 'Domains',
    blurb: 'A domain the agent registers and owns outright, with DNS it can edit itself.',
    blocker: 'A registrar whose API takes a machine buyer with no human account behind it.',
    poweredBy: 'Registrar API',
  },
  {
    kind: 'compute',
    title: 'Compute',
    blurb: 'A server by the hour, so an agent can run something longer than one request.',
    blocker: 'Metering. A ceiling that counts purchases cannot bound a thing billed while it runs.',
    poweredBy: 'Metered by the hour',
  },
  {
    kind: 'social',
    title: 'Social account',
    blurb: 'A posting identity tied to the same soulbound token, so the agent speaks as itself.',
    blocker: 'Every platform of consequence requires a human to accept its terms.',
    poweredBy: 'Platform APIs',
  },
  {
    kind: 'refill',
    title: 'Refilling budgets',
    blurb: 'A policy that tops itself back up on a schedule instead of needing a person weekly.',
    blocker: 'The treasury takes one policy per address today. This is the next contract change.',
    poweredBy: 'AgentTreasury',
  },
  {
    kind: 'delegation',
    title: 'Delegation',
    blurb: 'An agent granting part of its own ceiling to a sub-agent it hired, with no human between.',
    blocker: 'Needs a draw that can be attributed to two addresses at once.',
    poweredBy: 'AgentTreasury',
  },
];

function PlannedCard({ item }: { item: Planned }) {
  return (
    <article
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        padding: '28px 26px',
        borderTop: '1px solid var(--color-line)',
        borderLeft: '1px solid var(--color-line)',
        background: 'transparent',
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span
          style={{
            display: 'grid',
            placeItems: 'center',
            width: 34,
            height: 34,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-faint)',
          }}
        >
          <Glyph kind={item.kind} dim />
        </span>
        <h3 className="display" style={{ fontSize: 19, flex: 1, color: 'var(--color-dim)' }}>
          {item.title}
        </h3>
        <span
          className="label"
          style={{
            padding: '3px 9px',
            color: 'var(--color-muted)',
            border: '1px dashed var(--color-line)',
          }}
        >
          IN DEV
        </span>
      </header>

      <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--color-dim)' }}>{item.blurb}</p>

      <div
        className="mono"
        style={{
          marginTop: 'auto',
          padding: '14px 16px',
          fontSize: 12.5,
          lineHeight: 1.75,
          border: '1px dashed var(--color-line)',
          color: 'var(--color-dim)',
        }}
      >
        <div className="label" style={{ color: 'var(--color-muted)', marginBottom: 6 }}>
          Blocked on
        </div>
        {item.blocker}
      </div>

      <span className="label" style={{ color: 'var(--color-muted)' }}>
        {item.poweredBy}
      </span>
    </article>
  );
}

export function Resources() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [error, setError] = useState<string>();

  useEffect(() => {
    getCatalogue()
      .then(c => setOffers(c.offers.filter(o => o.live)))
      .catch(e => setError((e as Error).message));
  }, []);

  return (
    <section id="resources" style={{ padding: '112px 24px', borderTop: '1px solid var(--color-line)' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <header style={{ marginBottom: 48, maxWidth: 640 }}>
          <span className="label" style={{ color: 'var(--color-accent)' }}>
            The catalogue
          </span>
          <h2 className="display" style={{ fontSize: 40, marginTop: 14, lineHeight: 1.15 }}>
            Everything an agent can buy, priced per call.
          </h2>
          <p style={{ marginTop: 16, fontSize: 15.5, lineHeight: 1.7, color: 'var(--color-dim)' }}>
            Each live resource answers a payment challenge, takes stablecoin and hands back the real
            thing. The ones still in development carry no endpoint and no price.
          </p>
        </header>

        {error && (
          <p className="mono" style={{ fontSize: 13, color: 'var(--color-refused)' }}>
            The catalogue could not be read: {error}
          </p>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            borderRight: '1px solid var(--color-line)',
            borderBottom: '1px solid var(--color-line)',
          }}
        >
          {offers.map(offer => (
            <Card key={offer.kind} offer={offer} />
          ))}
          {PLANNED.map(item => (
            <PlannedCard key={item.kind} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
