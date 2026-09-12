/**
 * What is being built, stated as such.
 *
 * Deliberately not cards. The catalogue above is a price list: everything on
 * it answers a payment challenge and delivers. Nothing here does, so it gets a
 * different shape on the page, no endpoint, and no price. A roadmap dressed to
 * look like inventory is how a demo starts lying.
 */

interface Planned {
  title: string;
  blurb: string;
  /** What has to be true before it can be sold. */
  blocker: string;
}

const PLANNED: Planned[] = [
  {
    title: 'Domains',
    blurb: 'A domain the agent registers and owns outright, with DNS it can edit to point at what it rents.',
    blocker: 'Waiting on a registrar whose API takes a machine buyer without a human account behind it.',
  },
  {
    title: 'Compute',
    blurb: 'A server by the hour, so an agent can run something longer than one request.',
    blocker: 'Metering. A ceiling that only counts purchases cannot bound a thing billed while it runs.',
  },
  {
    title: 'Social account',
    blurb: 'A posting identity tied to the same soulbound token, so the agent speaks as itself.',
    blocker: 'Every platform of consequence requires a human to accept its terms.',
  },
  {
    title: 'Refilling budgets',
    blurb: 'A policy that tops itself back up on a schedule instead of needing a person once a week.',
    blocker: 'The treasury takes one policy per address today. This is the next contract change.',
  },
  {
    title: 'Delegation',
    blurb: 'An agent granting part of its own ceiling to a sub-agent it hired, without a human in between.',
    blocker: 'Needs a draw that can be attributed to two addresses at once.',
  },
];

export function Upcoming() {
  return (
    <section id="upcoming" style={{ padding: '96px 24px', borderTop: '1px solid var(--color-line)' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <header style={{ marginBottom: 40, maxWidth: 660 }}>
          <span className="label" style={{ color: 'var(--color-muted)' }}>
            In development
          </span>
          <h2 className="display" style={{ fontSize: 34, marginTop: 14, lineHeight: 1.15 }}>
            Not for sale yet.
          </h2>
          <p style={{ marginTop: 14, fontSize: 15, lineHeight: 1.7, color: 'var(--color-dim)' }}>
            None of these have an endpoint, a price or a listing on chain, because none of them work
            yet. What stands in the way of each is written next to it.
          </p>
        </header>

        <div style={{ borderTop: '1px solid var(--color-line)' }}>
          {PLANNED.map(item => (
            <article
              key={item.title}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(140px, 200px) minmax(0, 1fr)',
                gap: 24,
                padding: '26px 0',
                borderBottom: '1px solid var(--color-line)',
                alignItems: 'start',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <h3 className="display" style={{ fontSize: 19, color: 'var(--color-dim)' }}>
                  {item.title}
                </h3>
                <span
                  className="label"
                  style={{
                    alignSelf: 'start',
                    padding: '3px 9px',
                    fontSize: 10,
                    color: 'var(--color-muted)',
                    border: '1px dashed var(--color-line)',
                  }}
                >
                  IN DEVELOPMENT
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ fontSize: 14.5, lineHeight: 1.65, color: 'var(--color-dim)' }}>{item.blurb}</p>
                <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--color-muted)' }}>
                  <span className="label" style={{ color: 'var(--color-accent)', marginRight: 8 }}>
                    Blocked on
                  </span>
                  {item.blocker}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
