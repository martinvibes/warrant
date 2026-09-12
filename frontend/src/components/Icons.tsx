/**
 * Shared icon set — purple stroke, consistent line weight.
 * Used across Dashboard, Stats, and anywhere else we need a service icon.
 */

import { type CSSProperties } from 'react';

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: CSSProperties;
}

const base = (size: number, color: string, strokeWidth: number, style?: CSSProperties): React.SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: color,
  strokeWidth,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  style,
});

export function IdentityIcon({ size = 18, color = 'currentColor', strokeWidth = 1.6, style }: IconProps) {
  return (
    <svg {...base(size, color, strokeWidth, style)}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="11" r="3" />
      <path d="M5 18c1-2 2.4-3 4-3s3 1 4 3" />
      <line x1="15" y1="9" x2="19" y2="9" />
      <line x1="15" y1="13" x2="18" y2="13" />
    </svg>
  );
}

export function EmailIcon({ size = 18, color = 'currentColor', strokeWidth = 1.6, style }: IconProps) {
  return (
    <svg {...base(size, color, strokeWidth, style)}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <polyline points="3 7 12 13 21 7" />
    </svg>
  );
}

export function SendIcon({ size = 18, color = 'currentColor', strokeWidth = 1.6, style }: IconProps) {
  return (
    <svg {...base(size, color, strokeWidth, style)}>
      <path d="M22 2 11 13" />
      <path d="M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  );
}

export function InboxIcon({ size = 18, color = 'currentColor', strokeWidth = 1.6, style }: IconProps) {
  return (
    <svg {...base(size, color, strokeWidth, style)}>
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.5 5h13l3 7v6a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2v-6l3-7z" />
    </svg>
  );
}

export function ThreadIcon({ size = 18, color = 'currentColor', strokeWidth = 1.6, style }: IconProps) {
  return (
    <svg {...base(size, color, strokeWidth, style)}>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

export function PhoneIcon({ size = 18, color = 'currentColor', strokeWidth = 1.6, style }: IconProps) {
  return (
    <svg {...base(size, color, strokeWidth, style)}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" />
    </svg>
  );
}

export function SmsIcon({ size = 18, color = 'currentColor', strokeWidth = 1.6, style }: IconProps) {
  return (
    <svg {...base(size, color, strokeWidth, style)}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <path d="M8 9h8M8 13h5" />
    </svg>
  );
}

export function BrainIcon({ size = 18, color = 'currentColor', strokeWidth = 1.6, style }: IconProps) {
  return (
    <svg {...base(size, color, strokeWidth, style)}>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function ServerIcon({ size = 18, color = 'currentColor', strokeWidth = 1.6, style }: IconProps) {
  return (
    <svg {...base(size, color, strokeWidth, style)}>
      <rect x="3" y="3" width="18" height="7" rx="1.5" />
      <rect x="3" y="14" width="18" height="7" rx="1.5" />
      <line x1="7" y1="6.5" x2="7.01" y2="6.5" />
      <line x1="7" y1="17.5" x2="7.01" y2="17.5" />
    </svg>
  );
}

export function GlobeIcon({ size = 18, color = 'currentColor', strokeWidth = 1.6, style }: IconProps) {
  return (
    <svg {...base(size, color, strokeWidth, style)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}

export function DatabaseIcon({ size = 18, color = 'currentColor', strokeWidth = 1.6, style }: IconProps) {
  return (
    <svg {...base(size, color, strokeWidth, style)}>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v6c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
      <path d="M3 11v6c0 1.66 4.03 3 9 3s9-1.34 9-3v-6" />
    </svg>
  );
}

export function CopyIcon({ size = 14, color = 'currentColor', strokeWidth = 1.6, style }: IconProps) {
  return (
    <svg {...base(size, color, strokeWidth, style)}>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function CheckIcon({ size = 14, color = 'currentColor', strokeWidth = 1.8, style }: IconProps) {
  return (
    <svg {...base(size, color, strokeWidth, style)}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function ExternalIcon({ size = 12, color = 'currentColor', strokeWidth = 1.6, style }: IconProps) {
  return (
    <svg {...base(size, color, strokeWidth, style)}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

export function LockIcon({ size = 14, color = 'currentColor', strokeWidth = 1.6, style }: IconProps) {
  return (
    <svg {...base(size, color, strokeWidth, style)}>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export function PackageIcon({ size = 18, color = 'currentColor', strokeWidth = 1.6, style }: IconProps) {
  return (
    <svg {...base(size, color, strokeWidth, style)}>
      <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

// Filled monochrome marks for socials — match X/Telegram brand silhouette.
export function XIcon({ size = 14, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={style} aria-label="X">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function TelegramIcon({ size = 14, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={style} aria-label="Telegram">
      <path d="M21.198 2.433a2.242 2.242 0 0 0-1.022.215l-16.5 7.5a2.25 2.25 0 0 0 .126 4.139l3.732 1.343 1.27 4.317a2.083 2.083 0 0 0 3.471.776l2.118-2.07 4.06 2.917a2.25 2.25 0 0 0 3.516-1.36l2.563-13.502a2.25 2.25 0 0 0-3.334-2.275zM7.846 13.916l8.74-4.61-7.236 6.605-.137 2.84-1.367-4.835zm2.62 5.083 1.51-3.118 4.12 2.96-5.63.158z" />
    </svg>
  );
}

export function CloseIcon({ size = 16, color = 'currentColor', strokeWidth = 1.8, style }: IconProps) {
  return (
    <svg {...base(size, color, strokeWidth, style)}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
