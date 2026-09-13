import { useEffect, useState } from 'react';
import Orb from './Orb';
import { HeroField } from './HeroField';
import { getCatalogue, getStats, type Stats } from '../lib/api';

/**
 * Counts up from zero on first paint. Reads better than a number that simply
 * appears, and the easing is short enough not to delay the figure.
 */
function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) {
      setValue(0);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setValue(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return value;
}

/**
 * The install line, which is the shortest true answer to "how do I use this".
 * Click copies it, because a line meant to be pasted should not have to be
 * selected by hand.
 */
function Install() {
  const [copied, setCopied] = useState(false);
  const line = 'npm i warrant-client';
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(line).then(
          () => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          },
          () => undefined,
        );
      }}
      aria-label={copied ? 'Copied' : `Copy ${line}`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 12,
        margin: '22px auto 0', padding: '9px 16px',
        fontFamily: 'IBM Plex Mono, ui-monospace, monospace',
        fontSize: 13, color: 'var(--color-dim)',
        background: 'var(--color-surface)', border: '1px solid var(--color-line)',
        cursor: 'pointer', transition: 'color 0.2s ease, border-color 0.2s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(232,181,92,0.3)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-line)'; }}
    >
      <span style={{ color: 'var(--color-muted)' }}>$</span>
      <span style={{ color: 'var(--color-text)' }}>{line}</span>
      <span className="label" style={{ fontSize: 10, color: copied ? 'var(--color-settled)' : 'var(--color-muted)' }}>
        {copied ? 'copied' : 'copy'}
      </span>
    </button>
  );
}

function Figure({ value, label }: { value: number; label: string }) {
  const shown = useCountUp(value);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span
        className="mono"
        style={{
          fontSize: 36,
          fontWeight: 600,
          lineHeight: 1,
          letterSpacing: '-0.03em',
          color: 'var(--color-accent-light)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {Math.round(shown)}
      </span>
      <span className="label" style={{ color: 'var(--color-muted)' }}>
        {label}
      </span>
    </div>
  );
}

export function Hero() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [selling, setSelling] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      getStats()
        .then(s => !cancelled && setStats(s))
        .catch(() => undefined);
      getCatalogue()
        .then(c => !cancelled && setSelling(c.offers.filter(o => o.live).length))
        .catch(() => undefined);
    };
    load();
    const timer = setInterval(load, 8000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return (
    <header
      style={{
        position: 'relative',
        minHeight: 640,
        display: 'grid',
        placeItems: 'center',
        padding: '140px 24px 90px',
        overflow: 'hidden',
      }}
    >
      <HeroField />

      <div style={{ position: 'absolute', inset: 0, opacity: 0.5, pointerEvents: 'none' }}>
        <Orb hoverIntensity={2} rotateOnHover hue={0} forceHoverState={false} backgroundColor="#000000" />
      </div>

      <div style={{ position: 'relative', maxWidth: 860, textAlign: 'center' }}>
        <span className="label" style={{ color: 'var(--color-accent)' }}>
          Pay-per-call resources on Hedera
        </span>

        <h1
          className="display"
          style={{ fontSize: 'clamp(38px, 6vw, 66px)', lineHeight: 1.06, marginTop: 20 }}
        >
          Your agent buys
          <br />
          what it needs.
        </h1>

        <p
          style={{
            margin: '26px auto 0',
            maxWidth: 620,
            fontSize: 17,
            lineHeight: 1.65,
            color: 'var(--color-dim)',
          }}
        >
          A name, an inbox, a phone number, inference, memory that outlives it. Bought per call in
          stablecoin, in under a second, with nobody to ask.
        </p>

        <p
          style={{
            margin: '18px auto 0',
            maxWidth: 560,
            fontSize: 15,
            lineHeight: 1.6,
            color: 'var(--color-muted)',
          }}
        >
          The spending limit lives in a contract, not in our database. It holds even if this service
          goes away.
        </p>

        <div
          style={{
            display: 'flex',
            gap: 12,
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginTop: 36,
          }}
        >
          <a
            href="#resources"
            className="label"
            style={{
              padding: '13px 26px',
              background: 'var(--color-accent)',
              color: '#000',
              border: '1px solid var(--color-accent)',
            }}
          >
            See what it can buy
          </a>
          <a
            href="/ledger"
            className="label"
            style={{
              padding: '13px 26px',
              color: 'var(--color-text)',
              border: '1px solid var(--color-line)',
            }}
          >
            Read the ledger
          </a>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Install />
        </div>

        <div
          style={{
            display: 'flex',
            gap: 52,
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginTop: 56,
            paddingTop: 34,
            borderTop: '1px solid var(--color-line)',
          }}
        >
          <Figure value={selling} label="Resources for sale" />
          <Figure value={stats?.total ?? 0} label="Purchases settled" />
          <Figure value={stats?.agents ?? 0} label="Agents buying" />
        </div>
      </div>
    </header>
  );
}
