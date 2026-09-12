import { useEffect, useRef, useState } from 'react';

const STEP_DURATION_MS = 4500;

const steps = [
  { n: '01', title: 'Agent reads skill.md',     body: 'Fetches GET /skill.md — a plain text file describing every endpoint, cost, and how to pay.', code: 'GET /skill.md\n\n# 0GENT — Real-World Infrastructure\n# for AI Agents\n#\n# Wallet = identity. Pay via x402.' },
  { n: '02', title: 'Agent calls paid endpoint', body: 'Requests a resource. Without payment, server responds HTTP 402 with payment instructions.',  code: 'POST /phone/provision\n\n← 402 Payment Required\n{\n  "contract": "0x3F2a...91cB",\n  "value": "500000000000000000",\n  "nonce": "0xf7a3..."\n}' },
  { n: '03', title: 'Payment on-chain',         body: 'Agent calls the payment contract with nonce + tokens. Verified on-chain.',                     code: 'ZeroGentPayment.pay(\n  nonce: 0xf7a3...,\n  type: "phone"\n) → $3.00 USDC\n\n✓ PaymentReceived emitted\n✓ Nonce marked used' },
  { n: '04', title: 'Resource provisioned',     body: 'Backend verifies payment, provisions via Web2 API, registers on AgentRegistry.',              code: '✓ Payment verified on-chain\n✓ Telnyx: +1 (415) 555-0142\n✓ AgentRegistry.registerResource()\n\n→ owner: 0x742d...bD18\n→ resourceId: 3' },
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
        background: 'radial-gradient(ellipse 50% 40% at 80% 70%, rgba(0,229,255,0.06), transparent 70%)',
      }} />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', position: 'relative' }}>
        <div className="reveal-up" style={{ fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#00E5FF', marginBottom: 16, fontWeight: 500 }}>
          x402 Protocol
        </div>
        <h2 className="reveal-up section-h2" style={{ fontSize: 'min(48px, 4vw)', fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 20, transitionDelay: '60ms' }}>
          How it works
        </h2>
        <div className="reveal-up" style={{
          display: 'flex', alignItems: 'center', gap: 14,
          maxWidth: 520, marginBottom: 56,
          fontSize: 16, color: 'rgba(254,254,254,0.5)', lineHeight: 1.7,
          transitionDelay: '120ms',
        }}>
          <span>Call API → get 402 → pay on-chain → resource is yours.</span>
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            title={isPlaying ? 'Pause auto-advance' : 'Resume auto-advance'}
            style={{
              marginLeft: 'auto',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 30, height: 30,
              border: '1px solid rgba(0,229,255,0.2)',
              background: 'transparent',
              color: '#00E5FF',
              cursor: 'pointer',
              transition: 'all 0.2s',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#00E5FF'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(0,229,255,0.2)'; }}
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
                    borderBottom: '1px solid rgba(0,229,255,0.1)',
                    position: 'relative',
                    ...(i === 0 ? { borderTop: '1px solid rgba(0,229,255,0.1)' } : {}),
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
                        fontSize: 13, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace',
                        transition: 'all 0.3s',
                        ...(isActive
                          ? { background: '#00B8D4', color: '#000' }
                          : { color: '#00E5FF', border: '1px solid rgba(0,229,255,0.3)' }),
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
                            stroke="rgba(0,229,255,0.18)"
                            strokeWidth="2"
                          />
                          {/* Filled portion */}
                          <circle
                            className={`hiw-ring-fill ${animationsRunning ? '' : 'hiw-paused'}`}
                            cx="20" cy="20" r="17"
                            fill="none"
                            stroke="#00E5FF"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeDasharray="106.8146"
                            strokeDashoffset="106.8146"
                            style={{
                              filter: 'drop-shadow(0 0 4px rgba(0,229,255,0.4))',
                            }}
                          />
                        </svg>
                      )}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 500, flex: 1, marginLeft: 4 }}>{s.title}</div>
                  </div>
                  <div style={{
                    paddingLeft: 56, marginTop: 12,
                    fontSize: 14, color: 'rgba(254,254,254,0.55)', lineHeight: 1.7,
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
                        background: 'rgba(0,229,255,0.10)',
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
                          background: 'linear-gradient(90deg, rgba(0,229,255,0.4), #00E5FF, #4DD0E1)',
                          boxShadow: '0 0 8px rgba(0,229,255,0.5)',
                        }}
                      />
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div className="hiw-preview" style={{
            border: '1px solid rgba(0,229,255,0.1)',
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
              background: 'radial-gradient(ellipse at top left, rgba(0,229,255,0.06), transparent 60%)',
            }} />
            <pre
              key={active}
              className="mono fade-in"
              style={{
                fontSize: 12, color: 'rgba(254,254,254,0.5)',
                padding: 28, lineHeight: 2, width: '100%',
                whiteSpace: 'pre-wrap', margin: 0,
                position: 'relative',
              }}
            >
              {steps[active].code.split('\n').map((l, i) => (
                <div key={i}>
                  {l.startsWith('✓') ? <><span style={{ color: '#3fb950', fontWeight: 700 }}>✓</span>{l.slice(1)}</> :
                   l.startsWith('←') ? <><span style={{ color: '#f85149', fontWeight: 700 }}>←</span>{l.slice(1)}</> :
                   l.startsWith('→') ? <><span style={{ color: '#00E5FF', fontWeight: 700 }}>→</span>{l.slice(1)}</> :
                   l.startsWith('#') ? <span style={{ color: 'rgba(254,254,254,0.2)' }}>{l}</span> : l}
                </div>
              ))}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
