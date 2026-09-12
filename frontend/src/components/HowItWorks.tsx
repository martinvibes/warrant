import { useEffect, useRef, useState } from 'react';

const STEP_DURATION_MS = 4500;

const steps = [
  {
    n: '01',
    title: 'A human signs',
    body: 'The owner signs a warrant naming one agent, the resources it may buy, a ceiling, a purpose and an expiry. No transaction, no gas, no funded account. The signature is the authorisation.',
    code: 'EIP-712 Warrant\n\n  agent      0.0.4242\n  resources  ["inference"]\n  cap        1000000   ($1.00)\n  purpose    "support triage"\n  expiry     +24h\n\n→ 0x07d266582acb47f6…7fe7edf0',
  },
  {
    n: '02',
    title: 'The gate reads it first',
    body: 'The agent presents the warrant on every request. Before the service quotes a price, it recovers the signature, checks the resource against the allowlist, sums what has already settled and compares it to the cap.',
    code: 'POST /v1/inference\nX-Warrant: eyJ3YXJyYW50Ijp7…\n\n  signature   recovers to owner ✓\n  inference   in allowlist   ✓\n  $0.05       under cap      ✓\n  expiry      21h remaining  ✓',
  },
  {
    n: '03',
    title: 'Only then, money',
    body: 'An authorised request gets an HTTP 402 with terms. The agent signs a USDC transfer on Hedera. After the signature and before settlement, the payer is checked against the agent the warrant names.',
    code: '← 402 Payment Required\n{\n  "scheme":  "exact",\n  "network": "hedera:testnet",\n  "amount":  "50000",\n  "asset":   "0.0.429274"\n}\n\n  payer 0.0.4242 = named agent ✓',
  },
  {
    n: '04',
    title: 'A receipt, or a reason',
    body: 'Settled purchases write a receipt binding agent, warrant, purpose, amount and transaction. Refused ones write the code and the reason. Both are readable without credentials.',
    code: '✓ settled  0.0.4242@1789189611.402118000\n✓ receipt  inference $0.05\n           purpose "support triage"\n\n✗ refused  resource_not_authorised\n           covers inference,\n           not email.send',
  },
];

export function HowItWorks() {
  const [active, setActive] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const sectionRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  // Pause when scrolled out of view, resume when in view
  useEffect(() => {
    if (!sectionRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.25 }
    );
    obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  // CSS animation runs while this is true; pause-state toggles via animation-play-state
  const animationsRunning = isPlaying && inView;

  const handleStepClick = (i: number) => {
    setActive(i);
    setIsPlaying(false); // user took control — stop auto-advance
  };

  // CSS keyframes are injected once below. Each animation runs for STEP_DURATION_MS,
  // and `onAnimationEnd` on the bar fires `nextStep`.
  const nextStep = () => setActive((a) => (a + 1) % steps.length);

  return (
    <section
      id="how-it-works"
      ref={sectionRef as any}
      className="section-pad"
      style={{ padding: '120px 0', position: 'relative', overflow: 'hidden' }}
    >
      {/* CSS keyframes scoped to this component */}
      <style>{`
        @keyframes howItWorks_barFill {
          from { width: 0%; }
          to   { width: 100%; }
        }
        @keyframes howItWorks_ringFill {
          from { stroke-dashoffset: 106.8146; }
          to   { stroke-dashoffset: 0; }
        }
        .hiw-bar-fill {
          animation-name: howItWorks_barFill;
          animation-duration: ${STEP_DURATION_MS}ms;
          animation-timing-function: linear;
          animation-fill-mode: forwards;
        }
        .hiw-ring-fill {
          animation-name: howItWorks_ringFill;
          animation-duration: ${STEP_DURATION_MS}ms;
          animation-timing-function: linear;
          animation-fill-mode: forwards;
        }
        .hiw-paused { animation-play-state: paused !important; }
      `}</style>

      {/* Subtle bg glow — bottom-right */}
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background: 'radial-gradient(ellipse 50% 40% at 80% 70%, rgba(232,181,92,0.06), transparent 70%)',
      }} />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', position: 'relative' }}>
        <div className="reveal-up" style={{ fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#E8B55C', marginBottom: 16, fontWeight: 500 }}>
          The path of one purchase
        </div>
        <h2 className="reveal-up section-h2 display" style={{ fontSize: 'min(44px, 4vw)', fontWeight: 500, letterSpacing: '-0.025em', lineHeight: 1.12, marginBottom: 20, transitionDelay: '60ms' }}>
          Every check at the earliest moment it can be made
        </h2>
        <div className="reveal-up" style={{
          display: 'flex', alignItems: 'center', gap: 14,
          maxWidth: 520, marginBottom: 56,
          fontSize: 16, color: 'rgba(247,246,243,0.5)', lineHeight: 1.7,
          transitionDelay: '120ms',
        }}>
          <span>
            The order is the design. Asking whether a purchase is authorised costs nothing, so
            it happens before the agent is asked to pay. Checking who paid needs a signature,
            so it happens after one and before the money moves.
          </span>
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            title={isPlaying ? 'Pause auto-advance' : 'Resume auto-advance'}
            style={{
              marginLeft: 'auto',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 30, height: 30,
              border: '1px solid rgba(232,181,92,0.2)',
              background: 'transparent',
              color: '#E8B55C',
              cursor: 'pointer',
              transition: 'all 0.2s',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#E8B55C'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(232,181,92,0.2)'; }}
          >
            {isPlaying ? (
              <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor"><rect x="2" y="2" width="3" height="8" /><rect x="7" y="2" width="3" height="8" /></svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor"><polygon points="3,2 10,6 3,10" /></svg>
            )}
          </button>
        </div>

        <div className="reveal-up hiw-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'start', transitionDelay: '180ms' }}>
          <div>
            {steps.map((s, i) => {
              const isActive = active === i;
              return (
                <div
                  key={s.n}
                  onClick={() => handleStepClick(i)}
                  style={{
                    padding: '24px 0',
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(232,181,92,0.1)',
                    position: 'relative',
                    ...(i === 0 ? { borderTop: '1px solid rgba(232,181,92,0.1)' } : {}),
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    {/* Number badge with circular progress ring */}
                    <div style={{
                      position: 'relative',
                      width: 40, height: 40,
                      flexShrink: 0,
                    }}>
                      {/* Inner number */}
                      <div style={{
                        position: 'absolute',
                        inset: 4,
                        borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 600, fontFamily: 'IBM Plex Mono, monospace',
                        transition: 'all 0.3s',
                        ...(isActive
                          ? { background: '#C98A2E', color: '#000' }
                          : { color: '#E8B55C', border: '1px solid rgba(232,181,92,0.3)' }),
                      }}>{s.n}</div>

                      {/* Progress ring (active only) — keyed so it restarts on step change */}
                      {isActive && (
                        <svg
                          key={`ring-${active}-${animationsRunning}`}
                          width="40" height="40" viewBox="0 0 40 40"
                          style={{
                            position: 'absolute', inset: 0,
                            transform: 'rotate(-90deg)',
                            pointerEvents: 'none',
                          }}
                        >
                          {/* Track */}
                          <circle
                            cx="20" cy="20" r="17"
                            fill="none"
                            stroke="rgba(232,181,92,0.18)"
                            strokeWidth="2"
                          />
                          {/* Filled portion */}
                          <circle
                            className={`hiw-ring-fill ${animationsRunning ? '' : 'hiw-paused'}`}
                            cx="20" cy="20" r="17"
                            fill="none"
                            stroke="#E8B55C"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeDasharray="106.8146"
                            strokeDashoffset="106.8146"
                            style={{
                              filter: 'drop-shadow(0 0 4px rgba(232,181,92,0.4))',
                            }}
                          />
                        </svg>
                      )}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 500, flex: 1, marginLeft: 4 }}>{s.title}</div>
                  </div>
                  <div style={{
                    paddingLeft: 56, marginTop: 12,
                    fontSize: 14, color: 'rgba(247,246,243,0.55)', lineHeight: 1.7,
                    maxHeight: isActive ? 200 : 0, overflow: 'hidden',
                    transition: 'max-height 0.4s ease, opacity 0.3s ease',
                    opacity: isActive ? 1 : 0,
                  }}>
                    {s.body}
                  </div>

                  {/* Bottom progress bar — visible on active step */}
                  {isActive && (
                    <>
                      {/* Track */}
                      <div style={{
                        position: 'absolute',
                        bottom: 0, left: 0, right: 0,
                        height: 2,
                        background: 'rgba(232,181,92,0.10)',
                      }} />
                      {/* Fill — keyed so it restarts on step change. onAnimationEnd advances. */}
                      <div
                        key={`bar-${active}-${animationsRunning}`}
                        className={`hiw-bar-fill ${animationsRunning ? '' : 'hiw-paused'}`}
                        onAnimationEnd={() => {
                          if (animationsRunning) nextStep();
                        }}
                        style={{
                          position: 'absolute',
                          bottom: 0, left: 0,
                          height: 2,
                          width: 0,
                          background: 'linear-gradient(90deg, rgba(232,181,92,0.4), #E8B55C, #D9A85C)',
                          boxShadow: '0 0 8px rgba(232,181,92,0.5)',
                        }}
                      />
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div className="hiw-preview" style={{
            border: '1px solid rgba(232,181,92,0.1)',
            borderRadius: 12,
            minHeight: 380,
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(0,0,0,0.3)',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Inner gradient on the code panel */}
            <div style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background: 'radial-gradient(ellipse at top left, rgba(232,181,92,0.06), transparent 60%)',
            }} />
            <pre
              key={active}
              className="mono fade-in"
              style={{
                fontSize: 12, color: 'rgba(247,246,243,0.5)',
                padding: 28, lineHeight: 2, width: '100%',
                whiteSpace: 'pre-wrap', margin: 0,
                position: 'relative',
              }}
            >
              {steps[active].code.split('\n').map((l, i) => (
                <div key={i}>
                  {l.startsWith('✓') ? <><span style={{ color: '#46B860', fontWeight: 700 }}>✓</span>{l.slice(1)}</> :
                   l.startsWith('←') ? <><span style={{ color: '#E5484D', fontWeight: 700 }}>←</span>{l.slice(1)}</> :
                   l.startsWith('→') ? <><span style={{ color: '#E8B55C', fontWeight: 700 }}>→</span>{l.slice(1)}</> :
                   l.startsWith('#') ? <span style={{ color: 'rgba(247,246,243,0.2)' }}>{l}</span> : l}
                </div>
              ))}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
