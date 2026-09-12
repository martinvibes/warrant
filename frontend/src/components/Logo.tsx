/**
 * 0GENT brand mark — "Glyph 0G" (concept #5).
 * A typographic "0" with a horizontal notch suggesting the "G".
 *
 * Use this everywhere we need the logo. `color` defaults to the brand cyan
 * `#00E5FF`; pass `color="#00B8D4"` for the deeper cyan, or any color when
 * placing on light backgrounds.
 */

interface LogoProps {
  size?: number;
  color?: string;
  /** Stroke width — defaults to 3.2 which works from ~24px upward. Bump for very small renders. */
  strokeWidth?: number;
}

export function Glyph0G({ size = 24, color = '#00E5FF', strokeWidth = 3.2 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-label="0GENT">
      <path
        d="M24 6
           C 14 6, 6 14, 6 24
           C 6 34, 14 42, 24 42
           C 30 42, 35 39, 38 35
           L 38 26
           L 28 26"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Full lockup: mark + wordmark.
 */
export function LogoLockup({
  size = 24,
  color = '#00E5FF',
  textColor = '#fefefe',
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
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap,
    }}>
      <Glyph0G size={size} color={color} />
      <span style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: fontSize ?? Math.round(size * 0.7),
        fontWeight: 600,
        letterSpacing: '-0.01em',
        color: textColor,
      }}>0GENT</span>
    </span>
  );
}
