import { useState, type ReactNode } from 'react';
import { Glyph0G as SharedGlyph0G } from './Logo';

// ─── Color tokens ─────────────────────────────────────────────────────

const PURPLE = '#00B8D4';
const LILAC = '#00E5FF';
const TEXT = '#fefefe';
const TEXT_DIM = 'rgba(254,254,254,0.55)';
const TEXT_FAINT = 'rgba(254,254,254,0.32)';
const BG_PAGE = '#08080d';
const BG_CARD = '#0a0a12';
const BG_INVERT = '#fefefe';
const BORDER = 'rgba(0,229,255,0.14)';
const BORDER_HOVER = 'rgba(0,229,255,0.45)';

// ─────────────────────────────────────────────────────────────────────────
//  Eight logo concepts. Each is a React component that takes `size` and
//  optional `color` so the same SVG can render at any scale.
// ─────────────────────────────────────────────────────────────────────────

type LogoProps = { size?: number; color?: string };

// 01 — Aperture: concentric arcs forming a "0" with an inner dot
const Aperture = ({ size = 48, color = LILAC }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <circle cx="24" cy="24" r="20" stroke={color} strokeWidth="2" opacity="0.35" />
    <path d="M24 4 a20 20 0 0 1 0 40" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
    <path d="M24 12 a12 12 0 0 1 12 12" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
    <circle cx="24" cy="24" r="3" fill={color} />
  </svg>
);

// 02 — Cell: hexagon with central node, evokes decentralized network
const Cell = ({ size = 48, color = LILAC }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <polygon
      points="24,4 42,14 42,34 24,44 6,34 6,14"
      stroke={color}
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <circle cx="24" cy="24" r="5" fill={color} />
    <circle cx="24" cy="24" r="9" stroke={color} strokeWidth="1.2" opacity="0.4" />
  </svg>
);

// 03 — Stack: three layers, visualizing chain → storage → agents
const Stack = ({ size = 48, color = LILAC }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <rect x="6"  y="34" width="36" height="4" fill={color} opacity="0.45" />
    <rect x="10" y="22" width="28" height="4" fill={color} opacity="0.7" />
    <rect x="14" y="10" width="20" height="4" fill={color} />
    <circle cx="40" cy="12" r="2" fill={color} />
  </svg>
);

// 04 — Orbit: outer ring + offset moon, suggests agent + chain
const Orbit = ({ size = 48, color = LILAC }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <circle cx="24" cy="24" r="18" stroke={color} strokeWidth="1.5" opacity="0.4" />
    <ellipse
      cx="24"
      cy="24"
      rx="18"
      ry="7"
      stroke={color}
      strokeWidth="2"
      transform="rotate(-25 24 24)"
    />
    <circle cx="24" cy="24" r="4.5" fill={color} />
    <circle cx="40" cy="18" r="2.2" fill={color} />
  </svg>
);

// 05 — Glyph 0G: typographic mark, "0" with a notch where "G" cuts (the chosen brand mark)
const Glyph0G = (props: LogoProps) => <SharedGlyph0G {...props} />;

// 06 — Pulse: looping waveform, suggests AI heartbeat / live API
const Pulse = ({ size = 48, color = LILAC }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <path
      d="M4 24 L14 24 L18 14 L24 34 L30 18 L34 24 L44 24"
      stroke={color}
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="44" cy="24" r="2.4" fill={color} />
  </svg>
);

// 07 — Diamond: rotated square with internal grid, evokes "infrastructure"
const Diamond = ({ size = 48, color = LILAC }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <rect
      x="9" y="9" width="30" height="30"
      stroke={color}
      strokeWidth="2"
      transform="rotate(45 24 24)"
    />
    <line x1="24" y1="3" x2="24" y2="45" stroke={color} strokeWidth="1.2" opacity="0.5" />
    <line x1="3" y1="24" x2="45" y2="24" stroke={color} strokeWidth="1.2" opacity="0.5" />
    <circle cx="24" cy="24" r="3.5" fill={color} />
  </svg>
);

// 08 — Spark: stylized lightning bolt, fast + agentic
const Spark = ({ size = 48, color = LILAC }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <path
      d="M27 4 L10 26 L20 26 L17 44 L36 20 L26 20 L29 4 Z"
      fill={color}
    />
    <path
      d="M27 4 L10 26 L20 26 L17 44 L36 20 L26 20 L29 4 Z"
      stroke={color}
      strokeWidth="1.4"
      strokeLinejoin="round"
      opacity="0.5"
    />
  </svg>
);

interface LogoConcept {
  id: string;
  name: string;
  desc: string;
  Mark: (props: LogoProps) => ReactNode;
}

const LOGOS: LogoConcept[] = [
  { id: '01', name: 'Aperture',  desc: 'Concentric arcs + center node — "agent looking out".',  Mark: Aperture },
  { id: '02', name: 'Cell',      desc: 'Hexagonal network cell with central node.',             Mark: Cell },
  { id: '03', name: 'Stack',     desc: 'Layered architecture: chain → storage → agents.',       Mark: Stack },
  { id: '04', name: 'Orbit',     desc: 'Wallet at the center, agent on its orbital path.',      Mark: Orbit },
  { id: '05', name: 'Glyph 0G',  desc: 'Typographic mark: a "0" interrupted by a "G" notch.',    Mark: Glyph0G },
  { id: '06', name: 'Pulse',     desc: 'A live waveform — the API is breathing.',                Mark: Pulse },
  { id: '07', name: 'Diamond',   desc: 'Geometric infrastructure mark with crosshair.',           Mark: Diamond },
  { id: '08', name: 'Spark',     desc: 'Lightning bolt — speed + autonomy.',                     Mark: Spark },
];

// ─── Wordmark — sets the typography next to a chosen mark ─────────────

function Wordmark({ size = 18, color = TEXT, weight = 600 }: { size?: number; color?: string; weight?: number }) {
  return (
    <span style={{
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: size,
      fontWeight: weight,
      color,
      letterSpacing: '-0.01em',
    }}>
      0GENT
    </span>
  );
}

// ─── Single card showing one logo concept in 4 contexts ───────────────

function LogoCard({
  concept,
  selected,
  onSelect,
}: {
  concept: LogoConcept;
  selected: boolean;
  onSelect: () => void;
}) {
  const { id, name, desc, Mark } = concept;
  const [hover, setHover] = useState(false);

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: BG_CARD,
        border: `1px solid ${selected ? LILAC : (hover ? BORDER_HOVER : BORDER)}`,
        padding: 28,
        cursor: 'pointer',
        transition: 'border-color 0.2s, transform 0.2s',
        transform: hover ? 'translateY(-2px)' : 'translateY(0)',
        position: 'relative',
      }}
    >
      {/* Number + name + selected indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <span style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 11,
          color: TEXT_FAINT,
          letterSpacing: '0.06em',
        }}>{id}</span>
        <span style={{
          fontSize: 16,
          fontWeight: 600,
          color: TEXT,
          letterSpacing: '-0.01em',
        }}>{name}</span>
        {selected && (
          <span style={{
            marginLeft: 'auto',
            fontSize: 10,
            color: LILAC,
            background: 'rgba(0,229,255,0.14)',
            padding: '3px 9px',
            border: `1px solid ${LILAC}`,
            fontFamily: 'JetBrains Mono, monospace',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}>
            ✓ selected
          </span>
        )}
      </div>

      {/* Big mark on dark */}
      <div style={{
        background: '#000',
        border: `1px solid ${BORDER}`,
        padding: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        minHeight: 130,
      }}>
        <Mark size={72} />
      </div>

      {/* Lockup row (mark + wordmark on dark) */}
      <div style={{
        background: 'rgba(0,0,0,0.4)',
        border: `1px solid ${BORDER}`,
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
      }}>
        <Mark size={28} />
        <Wordmark />
      </div>

      {/* Lockup row (mark + wordmark on light, for contrast test) */}
      <div style={{
        background: BG_INVERT,
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
      }}>
        <Mark size={24} color={PURPLE} />
        <Wordmark color="#101015" />
      </div>

      {/* Tiny / favicon size preview — proves it works at small sizes */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '10px 12px',
        background: 'rgba(255,255,255,0.02)',
        border: `1px solid ${BORDER}`,
        marginBottom: 16,
      }}>
        <span style={{ fontSize: 10, color: TEXT_FAINT, fontFamily: 'JetBrains Mono, monospace' }}>favicon</span>
        <Mark size={16} />
        <span style={{ fontSize: 10, color: TEXT_FAINT, fontFamily: 'JetBrains Mono, monospace' }}>nav</span>
        <Mark size={20} />
        <span style={{ fontSize: 10, color: TEXT_FAINT, fontFamily: 'JetBrains Mono, monospace' }}>large</span>
        <Mark size={36} />
      </div>

      <p style={{
        fontSize: 12,
        color: TEXT_DIM,
        lineHeight: 1.6,
        margin: 0,
      }}>{desc}</p>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────

export function Logos() {
  const [selected, setSelected] = useState<string | null>(null);
  const chosen = LOGOS.find((l) => l.id === selected);

  return (
    <div style={{
      minHeight: '100vh',
      background: BG_PAGE,
      color: TEXT,
      padding: '60px 24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Subtle bg glow */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 50% 35% at 50% 20%, rgba(0,229,255,0.10), transparent 70%)',
      }} />

      <div style={{ maxWidth: 1280, margin: '0 auto', position: 'relative' }}>
        {/* Header */}
        <div style={{ marginBottom: 56 }}>
          <a href="/" style={{
            display: 'inline-block',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11,
            color: TEXT_FAINT,
            marginBottom: 20,
            textDecoration: 'none',
            letterSpacing: '0.06em',
          }}>← back to 0gent.xyz</a>

          <div style={{
            fontSize: 12,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: LILAC,
            marginBottom: 14,
            fontWeight: 500,
          }}>logo concepts</div>

          <h1 style={{
            fontSize: 'min(46px, 4vw)',
            fontWeight: 500,
            letterSpacing: '-0.03em',
            lineHeight: 1.05,
            marginBottom: 16,
            margin: 0,
          }}>Pick the mark for 0GENT.</h1>

          <p style={{
            fontSize: 15,
            color: TEXT_DIM,
            maxWidth: 640,
            lineHeight: 1.7,
            marginTop: 16,
            marginBottom: 0,
          }}>
            Eight directions. Click one to mark it as your pick. Each card shows the mark large,
            paired with the wordmark on dark and on light, plus tiny / nav / large size previews so
            you can see how it holds up across contexts.
          </p>
        </div>

        {/* Selected banner */}
        {chosen && (
          <div style={{
            background: 'rgba(0,229,255,0.08)',
            border: `1px solid ${LILAC}`,
            padding: '14px 20px',
            marginBottom: 32,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            flexWrap: 'wrap',
          }}>
            <span style={{
              fontSize: 11,
              color: LILAC,
              fontFamily: 'JetBrains Mono, monospace',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}>your pick</span>
            <chosen.Mark size={32} />
            <Wordmark />
            <span style={{ fontSize: 13, color: TEXT_DIM }}>
              <span style={{ color: TEXT, fontWeight: 600 }}>{chosen.name}</span> · {chosen.desc}
            </span>
            <button
              onClick={() => setSelected(null)}
              style={{
                marginLeft: 'auto',
                fontSize: 11,
                padding: '6px 12px',
                background: 'transparent',
                border: `1px solid ${BORDER_HOVER}`,
                color: TEXT_DIM,
                cursor: 'pointer',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >clear</button>
          </div>
        )}

        {/* Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 20,
        }}>
          {LOGOS.map((c) => (
            <LogoCard
              key={c.id}
              concept={c}
              selected={selected === c.id}
              onSelect={() => setSelected(c.id)}
            />
          ))}
        </div>

        {/* Footer hint */}
        <div style={{
          marginTop: 56,
          padding: '20px 24px',
          background: 'rgba(0,0,0,0.4)',
          border: `1px solid ${BORDER}`,
          fontSize: 13,
          color: TEXT_DIM,
          lineHeight: 1.7,
        }}>
          Once you pick one, tell me the number (e.g. "going with 04 Orbit") and I'll wire it into
          the nav / favicon / OG image / README.
        </div>
      </div>
    </div>
  );
}
