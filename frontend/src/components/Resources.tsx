import { useEffect, useState } from 'react';
import { getCatalogue, type Offer } from '../lib/api';

/**
 * What an agent can buy here.
 *
 * The prices and the live flags come from the same catalogue the server
 * charges against, so this page cannot advertise a price the service will not
 * honour. Nothing is listed as coming soon: an offer whose provider is not
 * configured is not shown, because a grid full of promises is how a demo
 * starts lying.
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
};

function Glyph({ kind }: { kind: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d={GLYPHS[kind] ?? GLYPHS.inference}
        stroke="var(--color-accent-light)"
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

export function Resources() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [error, setError] = useState<string>();

  useEffect(() => {
    getCatalogue()
      .then(c => setOffers(c.offers.filter(o => o.live)))
      .catch(e => setError((e as Error).message));
  }, []);

  return (
    <section id="resources" style={{ padding: '110px 24px', borderTop: '1px solid var(--color-line)' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <header style={{ marginBottom: 48, maxWidth: 640 }}>
          <span className="label" style={{ color: 'var(--color-accent)' }}>
            The catalogue
          </span>
          <h2 className="display" style={{ fontSize: 40, marginTop: 14, lineHeight: 1.15 }}>
            Everything an agent can buy, priced per call.
          </h2>
          <p style={{ marginTop: 16, fontSize: 15.5, lineHeight: 1.7, color: 'var(--color-dim)' }}>
            Each of these answers a payment challenge, takes stablecoin, and hands back the real
            thing. No trials, no keys to apply for, no account to open first.
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
        </div>
      </div>
    </section>
  );
}
