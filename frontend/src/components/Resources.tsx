import { useEffect, useState } from 'react';
import { getCatalogue, type Offer } from '../lib/api';
import { Mark } from './marks';

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

function LiveBadge() {
  return (
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
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--color-settled)' }} />
      LIVE
    </span>
  );
}

/**
 * The call, written out.
 *
 * The lines brighten one after another on hover, in the order the call
 * actually happens: the request, the challenge, then what comes back. Hovering
 * a card replays what buying from it does.
 */
function Trace({ offer, animate }: { offer: Offer; animate?: boolean }) {
  return (
    <div className={`mono resource-trace${animate ? ' fade-in' : ''}`}>
      <div className="trace-line" style={{ color: 'var(--color-accent-light)', whiteSpace: 'nowrap' }}>
        {offer.method} {offer.path}
      </div>
      <div className="trace-line" style={{ whiteSpace: 'nowrap' }}>
        <span className="trace-arrow">→ </span>
        402: pay {offer.price} USDC
      </div>
      {(RETURNS[offer.kind] ?? []).map(line => (
        <div key={line} className="trace-line" style={{ whiteSpace: 'nowrap' }}>
          <span className="trace-arrow">→ </span>
          {line}
        </div>
      ))}
    </div>
  );
}

function Card({ offer }: { offer: Offer }) {
  return (
    <article className="resource-card">
      <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span className="resource-glyph">
          <Mark kind={offer.kind} />
        </span>
        <h3 className="display" style={{ fontSize: 19, flex: 1 }}>
          {offer.title}
        </h3>
        <LiveBadge />
      </header>

      <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--color-dim)' }}>{offer.blurb}</p>

      <Trace offer={offer} />

      <span className="label" style={{ color: 'var(--color-muted)' }}>
        {offer.poweredBy}
      </span>
    </article>
  );
}

/**
 * The phone line, which is two purchases.
 *
 * A number and the texts sent from it are one thing an agent owns and two
 * things it pays for, so they share a card and the card carries both prices.
 * The switch is what keeps it from being crowded: one call is shown at a time,
 * and the prices sit on the switch itself, where they are the label rather
 * than an extra line of text.
 */
function PhoneCard({ number, sms }: { number: Offer; sms: Offer }) {
  const [showing, setShowing] = useState<'number' | 'message'>('number');
  const active = showing === 'number' ? number : sms;

  const tabs: [typeof showing, string, string][] = [
    ['number', 'Number', number.price],
    ['message', 'Message', sms.price],
  ];

  return (
    <article className="resource-card">
      <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span className="resource-glyph">
          <Mark kind="phone.provision" />
        </span>
        <h3 className="display" style={{ fontSize: 19, flex: 1 }}>
          Phone &amp; SMS
        </h3>
        <LiveBadge />
      </header>

      <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--color-dim)' }}>
        A real number the agent owns, in any of 170+ countries, and the texts it sends from it.
      </p>

      <div className="resource-switch" role="tablist" aria-label="Phone and SMS">
        {tabs.map(([key, label, price]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={showing === key}
            data-active={showing === key}
            onClick={() => setShowing(key)}
            onMouseEnter={() => setShowing(key)}
          >
            <span>{label}</span>
            <span className="mono">{price}</span>
          </button>
        ))}
      </div>

      <Trace key={active.kind} offer={active} animate />

      <span className="label" style={{ color: 'var(--color-muted)' }}>
        {number.poweredBy}
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
    <article className="resource-card" data-dim="true">
      <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span className="resource-glyph">
          <Mark kind={item.kind} dim />
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

      <div className="mono resource-trace resource-trace-dev">
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

/**
 * Follows the pointer across the grid so each card can light where the cursor
 * is. One listener on the container rather than one per card, and it writes
 * straight to the element, so hovering never costs a render.
 */
function trackPointer(event: React.MouseEvent<HTMLDivElement>) {
  const card = (event.target as HTMLElement).closest('.resource-card');
  if (!(card instanceof HTMLElement)) return;
  const rect = card.getBoundingClientRect();
  card.style.setProperty('--mx', `${event.clientX - rect.left}px`);
  card.style.setProperty('--my', `${event.clientY - rect.top}px`);
}

export function Resources() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [error, setError] = useState<string>();

  useEffect(() => {
    getCatalogue()
      .then(c => setOffers(c.offers.filter(o => o.live)))
      .catch(e => setError((e as Error).message));
  }, []);

  // A number and the texts sent from it share one card, so sms.send is drawn
  // where phone.provision sits and never on its own.
  const number = offers.find(o => o.kind === 'phone.provision');
  const sms = offers.find(o => o.kind === 'sms.send');
  const paired = Boolean(number && sms);

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
          onMouseMove={trackPointer}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            borderRight: '1px solid var(--color-line)',
            borderBottom: '1px solid var(--color-line)',
          }}
        >
          {offers.map(offer => {
            if (paired && offer.kind === 'sms.send') return null;
            if (paired && offer.kind === 'phone.provision') {
              return <PhoneCard key="phone" number={number!} sms={sms!} />;
            }
            return <Card key={offer.kind} offer={offer} />;
          })}
          {PLANNED.map(item => (
            <PlannedCard key={item.kind} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
