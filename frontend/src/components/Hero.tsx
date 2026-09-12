import { useEffect, useState } from 'react';
import Orb from './Orb';
import { formatUsdc, listRefusals, listWarrants, listReceipts } from '../lib/api';

interface Headline {
  live: number;
  settled: string;
  refused: number;
}

// Counts up from zero on first paint. Reads better than a number that simply
// appears, and the easing is short enough not to delay the figure.
function useCountUp(target: number, durationMs = 900): number {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target === 0) { setVal(0); return; }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setVal(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return val;
}

export function Hero() {
  const [stats, setStats] = useState<Headline | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [warrants, receipts, refusals] = await Promise.all([
          listWarrants(),
          listReceipts(),
          listRefusals(),
        ]);
        if (cancelled) return;
        setStats({
          live: warrants.filter(w => w.status === 'live').length,
          settled: receipts.reduce((a, r) => a + BigInt(r.amount), 0n).toString(),
          refused: refusals.length,
        });
      } catch {
        /* the figures fall back to em dashes rather than blocking the page */
      }
    };
    load();
    const id = setInterval(load, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const live = useCountUp(stats?.live ?? 0);
  const refused = useCountUp(stats?.refused ?? 0);

  return (
    <section className="hero-section" style={{
      paddingTop: 180, paddingBottom: 150, position: 'relative', textAlign: 'center', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: '100%', height: '100%', minHeight: 800, zIndex: 0,
      }}>
        <Orb hoverIntensity={2} rotateOnHover hue={0} forceHoverState={false} backgroundColor="#000000" />
      </div>

      <div style={{
        position: 'absolute', top: -300, left: '50%', transform: 'translateX(-50%)',
        width: 1200, height: 900, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 50% 50%, rgba(232, 181, 92,0.12) 0%, rgba(232, 181, 92,0.04) 40%, transparent 70%)',
        zIndex: 0,
      }} />

      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(232, 181, 92,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(232, 181, 92,0.04) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
        maskImage: 'linear-gradient(to bottom, transparent 10%, black 30%, black 70%, transparent 90%)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 10%, black 30%, black 70%, transparent 90%)',
        zIndex: 0,
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '0 24px', pointerEvents: 'none' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 18px', marginBottom: 32,
          background: 'rgba(232, 181, 92,0.1)', border: '1px solid rgba(232, 181, 92,0.25)', borderRadius: 100,
          fontSize: 13, fontWeight: 500, color: '#E8B55C', pointerEvents: 'auto',
        }}>
          <span className="pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: '#E8B55C', display: 'inline-block' }} />
          Pay-per-request over x402, settled in USDC on Hedera
        </div>

        <h1 className="hero-h1 display" style={{
          fontSize: 'clamp(38px, 5.6vw, 68px)', fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1.06,
          marginBottom: 24,
          background: 'linear-gradient(180deg, #F7F6F3 30%, rgba(247,246,243,0.55))',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          pointerEvents: 'auto',
        }}>
          Your agent can pay.<br />You decide what it may buy.
        </h1>

        <p className="hero-sub" style={{ fontSize: 17, color: 'rgba(247,246,243,0.7)', maxWidth: 580, margin: '0 auto 18px', lineHeight: 1.75, pointerEvents: 'auto' }}>
          Warrant puts a signed purchase order in front of every payment an agent makes.
          One agent, named resources, a cap, a purpose, an expiry. Anything outside it is
          refused before the money moves. Everything inside it leaves a receipt.
        </p>

        <p style={{ fontSize: 14, color: 'rgba(247,246,243,0.4)', maxWidth: 520, margin: '0 auto 40px', lineHeight: 1.7, pointerEvents: 'auto' }}>
          A spending cap is a fuel gauge. This is a purchase order.
        </p>

        <div className="hero-buttons" style={{ display: 'flex', gap: 14, justifyContent: 'center', marginBottom: 52, pointerEvents: 'auto', flexWrap: 'wrap' }}>
          <a href="/console" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, height: 48, padding: '0 28px',
            background: '#C98A2E', color: '#0b0b0b', fontSize: 14, fontWeight: 600, borderRadius: 100,
            transition: 'all 0.2s', border: 'none', textDecoration: 'none',
          }}>Open the console →</a>
          <a href="#terminal" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, height: 48, padding: '0 28px',
            background: 'rgba(247,246,243,0.04)', color: '#fff', fontSize: 14, fontWeight: 500,
            borderRadius: 100, border: '1px solid rgba(232, 181, 92,0.15)', transition: 'all 0.2s', textDecoration: 'none',
          }}>Watch it refuse</a>
        </div>

        <div className="hero-stats" style={{ display: 'flex', justifyContent: 'center', gap: 56, pointerEvents: 'auto', flexWrap: 'wrap' }}>
          {([
            [stats ? String(Math.round(live)) : '—', 'Live warrants', '#E8B55C'],
            [stats ? formatUsdc(stats.settled) : '—', 'Settled', '#6FE3A5'],
            [stats ? String(Math.round(refused)) : '—', 'Refused', stats && stats.refused > 0 ? '#E5484D' : '#E8B55C'],
          ] as const).map(([v, l, c]) => (
            <a key={l} href="/audit" style={{ textAlign: 'center', textDecoration: 'none' }}>
              <div className="mono hero-stats-num" style={{ fontSize: 26, fontWeight: 500, color: c, fontVariantNumeric: 'tabular-nums' }}>{v}</div>
              <div className="label" style={{ color: 'rgba(247,246,243,0.4)', marginTop: 5 }}>{l}</div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
