import { useEffect, useRef, useState } from 'react';

/**
 * A recorded run.
 *
 * These are the lines `npm run agent` prints, in the order it prints them.
 * Nothing here is invented for the page: the shape of the trace, the timings
 * and the refusal wording all come from the CLI, so what a viewer sees is what
 * they get when they run it.
 */

type LineKind = 'goal' | 'meta' | 'buy' | 'paid' | 'refused' | 'result' | 'rule' | 'total';

interface Line {
  kind: LineKind;
  label?: string;
  text: string;
  detail?: string;
  /** Milliseconds before the next line appears. */
  pause?: number;
}

const RUN: Line[] = [
  { kind: 'goal', label: 'goal', text: 'introduce yourself to agent 0x7510 and keep a note of it', pause: 400 },
  { kind: 'meta', text: 'paying from 0.0.4242, drawing as 0x9aE1…c3', pause: 120 },
  { kind: 'meta', text: 'budget  $1.00 this window, $5.00 remaining overall', pause: 700 },

  { kind: 'buy', label: 'identity.mint', text: '$0.1', pause: 900 },
  { kind: 'paid', text: '2841ms', detail: 'token #7, soulbound · key published', pause: 500 },

  { kind: 'buy', label: 'email.inbox', text: '$1', pause: 700 },
  { kind: 'paid', text: '1104ms', detail: 'scout@0gent.xyz', pause: 500 },

  { kind: 'buy', label: 'email.sealed', text: '$0.25', pause: 800 },
  { kind: 'paid', text: '967ms', detail: 'sealed to 0x7510 · we never saw the body', pause: 500 },

  { kind: 'buy', label: 'memory.write', text: '$0.05', pause: 700 },
  { kind: 'paid', text: '3218ms', detail: 'file 0.0.6841923, immutable', pause: 600 },

  { kind: 'buy', label: 'inference', text: '$0.02', pause: 600 },
  {
    kind: 'refused',
    label: 'inference',
    text: 'The daily limit is spent. $0.00 left, $0.02 needed.',
    detail: 'It reopens at 2026-09-13T00:00:00Z',
    pause: 900,
  },

  {
    kind: 'result',
    label: 'result',
    text: 'Minted my identity, took the address scout@0gent.xyz, sent 0x7510 a sealed introduction and wrote a note about it to permanent storage. I stopped before the summary: the daily limit is spent until midnight.',
    pause: 600,
  },
  { kind: 'rule', text: '' },
  { kind: 'total', label: 'total', text: '$1.40', detail: 'over 4 purchases' },
];

const COLOURS: Record<LineKind, string> = {
  goal: 'var(--color-text)',
  meta: 'var(--color-muted)',
  buy: 'var(--color-accent-light)',
  paid: 'var(--color-settled)',
  refused: 'var(--color-refused)',
  result: 'var(--color-text)',
  rule: 'var(--color-faint)',
  total: 'var(--color-text)',
};

function Row({ line }: { line: Line }) {
  if (line.kind === 'rule') {
    return <div style={{ height: 1, background: 'var(--color-faint)', margin: '14px 0' }} />;
  }

  const isVerb = line.kind === 'buy' || line.kind === 'paid' || line.kind === 'refused';

  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'baseline', lineHeight: 1.9 }}>
      {line.kind === 'buy' && (
        <span style={{ color: COLOURS.buy, width: 62, flexShrink: 0 }}>BUY</span>
      )}
      {line.kind === 'paid' && (
        <span style={{ color: COLOURS.paid, width: 62, flexShrink: 0 }}>PAID</span>
      )}
      {line.kind === 'refused' && (
        <span style={{ color: COLOURS.refused, width: 62, flexShrink: 0 }}>REFUSED</span>
      )}
      {!isVerb && line.label && (
        <span style={{ color: 'var(--color-muted)', width: 62, flexShrink: 0 }}>{line.label}</span>
      )}
      {!isVerb && !line.label && <span style={{ width: 62, flexShrink: 0 }} />}

      {isVerb && line.label && (
        <span style={{ color: 'var(--color-text)', minWidth: 132 }}>{line.label}</span>
      )}

      <span
        style={{
          color: line.kind === 'total' ? 'var(--color-accent-light)' : COLOURS[line.kind],
          flex: line.kind === 'result' ? '1 1 320px' : undefined,
        }}
      >
        {line.text}
      </span>

      {line.detail && <span style={{ color: 'var(--color-muted)' }}>{line.detail}</span>}
    </div>
  );
}

export function Terminal() {
  const [shown, setShown] = useState(0);
  const started = useRef(false);
  const host = useRef<HTMLDivElement>(null);

  // Plays once, when the section is actually on screen. A trace that has
  // already finished by the time the reader scrolls to it shows them nothing.
  useEffect(() => {
    const node = host.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      entries => {
        if (!entries[0].isIntersecting || started.current) return;
        started.current = true;

        let index = 0;
        const step = () => {
          setShown(++index);
          if (index < RUN.length) {
            window.setTimeout(step, RUN[index - 1].pause ?? 300);
          }
        };
        step();
      },
      { threshold: 0.25 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section style={{ padding: '110px 24px', borderTop: '1px solid var(--color-line)' }}>
      <div style={{ maxWidth: 980, margin: '0 auto' }} ref={host}>
        <header style={{ marginBottom: 36, maxWidth: 620 }}>
          <span className="label" style={{ color: 'var(--color-accent)' }}>
            A recorded run
          </span>
          <h2 className="display" style={{ fontSize: 40, marginTop: 14, lineHeight: 1.15 }}>
            Four purchases, no approvals, one refusal.
          </h2>
          <p style={{ marginTop: 16, fontSize: 15.5, lineHeight: 1.7, color: 'var(--color-dim)' }}>
            The agent was given a sentence and left alone. The only thing that stopped it was the
            daily limit, and the chain is what said no.
          </p>
        </header>

        <div
          className="mono"
          style={{
            padding: '26px 28px',
            fontSize: 13,
            background: 'var(--color-bg)',
            border: '1px solid var(--color-line)',
            minHeight: 420,
            overflowX: 'auto',
          }}
        >
          {RUN.slice(0, shown).map((line, i) => (
            <Row key={i} line={line} />
          ))}
          {shown < RUN.length && (
            <span
              style={{
                display: 'inline-block',
                width: 7,
                height: 14,
                background: 'var(--color-accent)',
                verticalAlign: 'middle',
              }}
            />
          )}
        </div>

        <p className="label" style={{ marginTop: 16, color: 'var(--color-muted)' }}>
          npm run agent -- "introduce yourself to agent 0x7510 and keep a note of it"
        </p>
      </div>
    </section>
  );
}
