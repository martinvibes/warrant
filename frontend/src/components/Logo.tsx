/**
 * The Warrant mark.
 *
 * A warrant is a boundary before it is a payment: these things, this agent,
 * this much, until then. So the mark is a bracket pair enclosing a seal — the
 * brackets are the scope, the seal is the signature that makes it binding.
 * Both halves survive down to 16px, which is the only size a favicon gets.
 */

interface MarkProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function WarrantMark({ size = 24, color = '#E8B55C', strokeWidth = 3.4 }: MarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-label="Warrant">
      {/* Left bracket */}
      <path
        d="M17 9 H10 V39 H17"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Right bracket */}
      <path
        d="M31 9 H38 V39 H31"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* The seal */}
      <circle cx="24" cy="24" r="5.2" fill={color} />
    </svg>
  );
}

/** Mark plus wordmark. The word is set in the serif, because a warrant is a document. */
export function LogoLockup({
  size = 24,
  color = '#E8B55C',
  textColor = '#F7F6F3',
  gap = 10,
  fontSize,
}: {
  size?: number;
  color?: string;
  textColor?: string;
  gap?: number;
  fontSize?: number;
}) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap }}>
      <WarrantMark size={size} color={color} />
      <span
        style={{
          fontFamily: "'IBM Plex Serif', Georgia, serif",
          fontSize: fontSize ?? Math.round(size * 0.82),
          fontWeight: 500,
          letterSpacing: '-0.015em',
          color: textColor,
        }}
      >
        Warrant
      </span>
    </span>
  );
}
