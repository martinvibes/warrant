import { useEffect, useState } from 'react';
import Orb from './Orb';

const API = (import.meta.env.VITE_API_URL as string) || 'https://api.0gent.xyz';

interface HeadlineStats {
  wallets: number;
  resources: number;
}

function fmtN(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

// Smooth count-up animation from 0 to target on first reveal.
function useCountUp(target: number, durationMs = 900): number {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target === 0) { setVal(0); return; }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return val;
}

export function Hero() {
  const [stats, setStats] = useState<HeadlineStats | null>(null);
  const [txCount, setTxCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const fetchStats = async () => {
      try {
        const r = await fetch(API + '/stats');
        if (!r.ok) return;
        const d = await r.json();
        if (!cancelled) {
          setStats(d.headline);
          setTxCount(d.totals?.transactions ?? 0);
        }
      } catch { /* silent — Hero falls back to "—" */ }
    };
    fetchStats();
    const id = setInterval(fetchStats, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const wallets      = useCountUp(stats?.wallets   ?? 0);
  const resources    = useCountUp(stats?.resources ?? 0);
  const transactions = useCountUp(txCount);

  return (
    <section className="hero-section" style={{
      paddingTop:180, paddingBottom:170, position:'relative', textAlign:'center', overflow:'hidden',
    }}>
      {/* Orb Background */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '100%',
        height: '100%',
        minHeight: '800px',
        zIndex: 0,
      }}>
        <Orb
          hoverIntensity={2}
          rotateOnHover={true}
          hue={0}
          forceHoverState={false}
          backgroundColor="#000000"
        />
      </div>

      {/* Purple glow */}
      <div style={{
        position:'absolute', top:-300, left:'50%', transform:'translateX(-50%)',
        width:1200, height:900, pointerEvents:'none',
        background:'radial-gradient(ellipse 50% 50%, rgba(0, 229, 255,0.12) 0%, rgba(0, 229, 255,0.04) 40%, transparent 70%)',
        zIndex: 0,
      }} />

      {/* Grid lines */}
      <div style={{
        position:'absolute', inset:0, pointerEvents:'none',
        backgroundImage:'linear-gradient(rgba(0, 229, 255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 229, 255,0.04) 1px, transparent 1px)',
        backgroundSize:'60px 60px',
        maskImage:'linear-gradient(to bottom, transparent 10%, black 30%, black 70%, transparent 90%)',
        WebkitMaskImage:'linear-gradient(to bottom, transparent 10%, black 30%, black 70%, transparent 90%)',
        zIndex: 0,
      }} />

      <div style={{ position:'relative', zIndex:1, maxWidth:1100, margin:'0 auto', padding:'0 24px', pointerEvents: 'none' }}>
        {/* Badge */}
        <div style={{
          display:'inline-flex', alignItems:'center', gap:8, padding:'8px 18px', marginBottom:32,
          background:'rgba(0, 229, 255,0.1)', border:'1px solid rgba(0, 229, 255,0.25)', borderRadius:100,
          fontSize:13, fontWeight:500, color:'#00E5FF',
          pointerEvents: 'auto',
        }}>
          <span className="pulse" style={{ width:6, height:6, borderRadius:'50%', background:'#00E5FF', display:'inline-block' }} />
          Built on Celo & 0G Chain
        </div>

        {/* Heading */}
        <h1 className="hero-h1" style={{
          fontSize:'clamp(40px, 6vw, 72px)', fontWeight:500, letterSpacing:'-0.04em', lineHeight:1.05,
          marginBottom:24,
          background:'linear-gradient(180deg, #FEFEFE 30%, rgba(254,254,254,0.5))',
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
          pointerEvents: 'auto',
        }}>
          Infrastructure for<br />Autonomous AI Agents
        </h1>

        <p className="hero-sub" style={{ fontSize:17, color:'rgba(254,254,254,0.7)', maxWidth:520, margin:'0 auto 40px', lineHeight:1.7, pointerEvents: 'auto' }}>
          Your AI agent gets real phone numbers, email inboxes, AI brain, and persistent memory, and pays for everything itself using crypto. No accounts. No humans needed.
        </p>

        {/* Buttons — Dashboard is the primary CTA. Mobile users can't see the
            nav links, so this is the way they reach the app from the top. */}
        <div className="hero-buttons" style={{ display:'flex', gap:14, justifyContent:'center', marginBottom:56, pointerEvents: 'auto', flexWrap: 'wrap' }}>
          <a href="/dashboard" style={{
            display:'inline-flex', alignItems:'center', gap:8, height:48, padding:'0 28px',
            background:'#00B8D4', color:'#fff', fontSize:14, fontWeight:500, borderRadius:100,
            transition:'all 0.2s', border:'none', textDecoration: 'none'
          }}>Open Dashboard →</a>
          <a href="#terminal" style={{
            display:'inline-flex', alignItems:'center', gap:8, height:48, padding:'0 28px',
            background:'rgba(254,254,254,0.04)', color:'#fff', fontSize:14, fontWeight:500,
            borderRadius:100, border:'1px solid rgba(0, 229, 255,0.15)', transition:'all 0.2s', textDecoration: 'none'
          }}>See it run</a>
        </div>

        {/* Quick-jump chips — visible on mobile where the nav links are hidden,
            so users always have a way to reach the key pages from the top. */}
        <div className="hero-chips" style={{
          display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 36,
          flexWrap: 'wrap', pointerEvents: 'auto',
        }}>
          {[
            ['Stats',  '/stats'],
            ['Docs',   '/docs'],
            ['Skill manifest', '/skill.md'],
          ].map(([l, h]) => (
            <a
              key={h}
              href={h}
              style={{
                fontSize: 11, fontFamily: 'JetBrains Mono, monospace',
                padding: '6px 12px',
                color: 'rgba(254,254,254,0.55)',
                border: '1px solid rgba(0, 229, 255,0.18)',
                textDecoration: 'none',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(0, 229, 255,0.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(254,254,254,0.55)'; e.currentTarget.style.borderColor = 'rgba(0, 229, 255,0.18)'; }}
            >
              {l}
            </a>
          ))}
        </div>

        {/* Stats — live counters from /stats. Each animates 0 → target on mount. */}
        <div className="hero-stats" style={{ display:'flex', justifyContent:'center', gap:56, pointerEvents: 'auto' }}>
          {([
            [stats ? fmtN(Math.round(wallets))      : '—', 'Wallets'],
            [stats ? fmtN(Math.round(resources))     : '—', 'Resources On-Chain'],
            [stats ? fmtN(Math.round(transactions))  : '—', 'Paid Transactions'],
          ] as const).map(([v, l]) => (
            <a key={l} href="/stats" style={{ textAlign:'center', textDecoration:'none' }}>
              <div className="mono hero-stats-num" style={{ fontSize:28, fontWeight:600, color:'#00E5FF', fontVariantNumeric:'tabular-nums' }}>{v}</div>
              <div style={{ fontSize:11, color:'rgba(254,254,254,0.4)', textTransform:'uppercase', letterSpacing:'0.1em', marginTop:4 }}>{l}</div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
