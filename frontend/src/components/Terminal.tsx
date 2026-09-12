import { useState, useRef, useEffect } from 'react';
import { apiCall, getLogs, subscribe, summary, type RequestLog } from '../lib/api';
import { useWallet } from '../lib/walletContext';
import { shortAddress } from '../lib/wallet';

// ─────────────────────────────────────────────────────────────────────────────
//  Color tokens (0G purple palette)
// ─────────────────────────────────────────────────────────────────────────────
const LILAC = '#00E5FF';
const GREEN = '#3fb950';
const RED = '#f85149';
const YELLOW = '#febc2e';
const TEXT = '#e6edf3';
const DIM = 'rgba(254,254,254,0.5)';
const FAINT = 'rgba(254,254,254,0.25)';
const W12 = 'rgba(254,254,254,0.12)';
const W08 = 'rgba(254,254,254,0.08)';
const BG = '#08080d';
const BG2 = 'rgba(0,229,255,0.04)';
const BORDER = 'rgba(0,229,255,0.12)';

// ─────────────────────────────────────────────────────────────────────────────
//  Simulated commands (purely cosmetic — running these doesn't pay anything)
//  Free commands like `health` and `pricing` actually hit the live backend.
// ─────────────────────────────────────────────────────────────────────────────
type CardRow = { label: string; value: string; valueColor?: string; mono?: boolean };
type Card = {
  payment: 'free' | string; // 'free' or '3.0 0G' etc
  status: number;
  icon?: string; // emoji
  title?: string;
  titleSize?: 'lg' | 'md';
  rows?: CardRow[];
  badge?: { text: string; kind: 'ok' | 'info' | 'warn' | 'err' };
  note?: string;
};
type Line =
  | { type: 'cmd' | 'out' | 'ok' | 'err' | 'dim'; text: string }
  | { type: 'card'; card: Card };

const SIM: Record<string, Array<Line>> = {
  'help': [
    { type: 'out', text: 'wallet                         Show your wallet    free' },
    { type: 'out', text: 'health                         API status          free' },
    { type: 'out', text: 'pricing                        Service prices      free' },
    { type: 'out', text: 'phone countries                List supported      free' },
    { type: 'out', text: 'phone search --country US      Search numbers      free' },
    { type: 'out', text: 'phone provision                Provision phone     $3.00 USDC' },
    { type: 'out', text: 'phone sms <id>                 Send SMS            $0.05 USDC' },
    { type: 'out', text: 'email create --name agent      Create inbox        $2.00 USDC' },
    { type: 'out', text: 'email send <id>                Send email          $0.08 USDC' },
    { type: 'out', text: 'email read <id>                Read inbox          $0.02 USDC' },
    { type: 'out', text: 'identity mint                  Mint Agent NFT      $0.50 USDC' },
    { type: 'out', text: 'memory set <key> <value>       Persistent storage  free' },
  ],
  'phone provision': [
    { type: 'out', text: '→ POST /phone/provision' },
    { type: 'err', text: '402 Payment Required — $3.00 USDC' },
    { type: 'out', text: '→ USDC.approve → CeloAgentPayment.pay(nonce, "phone", 3000000)' },
    { type: 'ok', text: 'Payment verified on-chain' },
    { type: 'ok', text: 'Provisioned via Telnyx' },
    { type: 'ok', text: 'Registered on AgentRegistry' },
    { type: 'out', text: '' },
    { type: 'out', text: '  Number      +1 (415) 555-0142' },
    { type: 'out', text: '  Owner       0x742d...bD18' },
    { type: 'out', text: '  Resource ID 3' },
  ],
  'identity mint': [
    { type: 'out', text: '→ POST /identity/mint' },
    { type: 'err', text: '402 Payment Required — $0.50 USDC' },
    { type: 'out', text: '→ USDC.approve → CeloAgentPayment.pay(nonce, "identity", 500000)' },
    { type: 'ok', text: 'Payment verified' },
    { type: 'ok', text: 'ERC-8004 identity registered on Celo' },
    { type: 'out', text: '' },
    { type: 'out', text: '  Agent ID  |  0x742d...bD18  |  celoscan.io/tx/0x73fa…' },
  ],
  'email create --name agent': [
    { type: 'out', text: '→ POST /email/provision' },
    { type: 'err', text: '402 Payment Required — $2.00 USDC' },
    { type: 'out', text: '→ USDC.approve → CeloAgentPayment.pay(nonce, "email", 2000000)' },
    { type: 'ok', text: 'Payment verified' },
    { type: 'ok', text: 'Cloudflare routing rule created' },
    { type: 'ok', text: 'Registered on AgentRegistry' },
    { type: 'out', text: '' },
    { type: 'out', text: '  Address     agent@0gent.xyz' },
    { type: 'out', text: '  Owner       0x742d...bD18' },
  ],
};

const CHIPS = [
  'health',
  'pricing',
  'wallet',
  'phone countries',
  'phone search --country GB',
  'email create --name agent',
  'identity mint',
  'help',
];

// ─────────────────────────────────────────────────────────────────────────────
//  Status colors
// ─────────────────────────────────────────────────────────────────────────────
function statusColor(s: number): string {
  if (s === 0) return RED;
  if (s >= 500) return RED;
  if (s >= 400) return RED;
  if (s >= 300) return YELLOW;
  return GREEN;
}

function methodColor(_m: string): string {
  return LILAC;
}

function fmtTime(ts: number): string {
  const d = new Date(ts);
  return d.toTimeString().slice(0, 8);
}

// ─────────────────────────────────────────────────────────────────────────────
//  Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function WindowDots() {
  return (
    <div style={{ display: 'flex', gap: 5, padding: '14px 18px' }}>
      <div style={{ width: 11, height: 11, border: `1px solid ${RED}`, background: 'rgba(248,81,73,0.18)' }} />
      <div style={{ width: 11, height: 11, border: `1px solid ${YELLOW}`, background: 'rgba(254,188,46,0.18)' }} />
      <div style={{ width: 11, height: 11, border: `1px solid ${GREEN}`, background: 'rgba(63,185,80,0.18)' }} />
    </div>
  );
}

function Tab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '14px 20px',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'lowercase',
        letterSpacing: '0.04em',
        color: active ? LILAC : 'rgba(254,254,254,0.35)',
        borderBottom: active ? `2px solid ${LILAC}` : '2px solid transparent',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        transition: 'color 0.15s',
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = 'rgba(254,254,254,0.7)'; }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = 'rgba(254,254,254,0.35)'; }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          background: active ? LILAC : FAINT,
          display: 'inline-block',
        }}
      />
      {label}
    </button>
  );
}

function Waveform() {
  // 6 animated bars, fixed seed-ish heights
  const bars = [4, 9, 5, 11, 6, 8];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 14 }}>
      {bars.map((h, i) => (
        <span
          key={i}
          className="wave-bar"
          style={{
            width: 2,
            height: h,
            background: LILAC,
            opacity: 0.55,
            animation: `eqBar 0.8s ease-in-out ${i * 0.12}s infinite alternate`,
          }}
        />
      ))}
    </div>
  );
}

function ConnectionStatus({ connected }: { connected: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '0 16px',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 10,
        color: connected ? 'rgba(254,254,254,0.55)' : 'rgba(254,254,254,0.3)',
      }}
    >
      <span
        className="pulse"
        style={{
          width: 7,
          height: 7,
          background: connected ? GREEN : RED,
          display: 'inline-block',
        }}
      />
      {connected ? 'connected' : 'offline'}
    </div>
  );
}

function StatusBar({ requests, lineNum }: { requests: number; lineNum: number }) {
  return (
    <div
      className="terminal-status-bar"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '6px 14px',
        background: 'rgba(0,229,255,0.06)',
        borderTop: `1px solid ${BORDER}`,
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 10,
        color: DIM,
        gap: 10,
        flexWrap: 'wrap',
      }}
    >
      <div className="terminal-status-left" style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0, flexWrap: 'wrap' }}>
        <span
          style={{
            padding: '2px 7px',
            background: 'rgba(0,229,255,0.18)',
            color: LILAC,
            fontWeight: 700,
            letterSpacing: '0.04em',
            flexShrink: 0,
          }}
        >
          x402
        </span>
        <span style={{ color: 'rgba(254,254,254,0.4)' }}>Celo · 0G Chain</span>
        <span className="terminal-status-dot" style={{ color: 'rgba(254,254,254,0.25)' }}>·</span>
        <span style={{ color: 'rgba(254,254,254,0.4)' }}>multi-chain</span>
      </div>
      <div className="terminal-status-right" style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
        <span>{requests} {requests === 1 ? 'request' : 'requests'}</span>
        <span style={{ color: 'rgba(254,254,254,0.25)' }}>·</span>
        <span>Ln {lineNum}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Shell tab
// ─────────────────────────────────────────────────────────────────────────────

function ShellTab({
  lines,
  input,
  setInput,
  onRun,
  busy,
  onChip,
}: {
  lines: Line[];
  input: string;
  setInput: (s: string) => void;
  onRun: (s: string) => void;
  busy: boolean;
  onChip: (s: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [gutterLines, setGutterLines] = useState(20);

  // Recompute gutter length to fit the body's actual rendered height.
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    // Each gutter row is 22px high; pad enough to fill the body height.
    const n = Math.max(20, Math.ceil(el.scrollHeight / 22) + 2);
    if (n !== gutterLines) setGutterLines(n);
    // Auto-scroll to bottom on content change
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [lines, gutterLines]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Single scroll container: gutter + body share one scroll, page layout never grows */}
      <div
        ref={scrollRef}
        style={{
          display: 'flex',
          height: 380,
          overflowY: 'auto',
          background: 'transparent',
        }}
      >
        {/* Line number gutter (scrolls with body since they share parent) */}
        <div
          style={{
            width: 44,
            padding: '14px 0',
            textAlign: 'right',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11,
            color: 'rgba(254,254,254,0.18)',
            userSelect: 'none',
            borderRight: `1px solid ${W08}`,
            background: 'rgba(0,0,0,0.2)',
            flexShrink: 0,
          }}
        >
          {Array.from({ length: gutterLines }, (_, i) => (
            <div key={i} style={{ paddingRight: 12, lineHeight: '22px', height: 22 }}>
              {i + 1}
            </div>
          ))}
        </div>

        {/* Body + input */}
        <div
          ref={bodyRef}
          style={{
            flex: 1,
            padding: '14px 18px',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 13,
            lineHeight: '22px',
            color: TEXT,
            minHeight: '100%',
          }}
        >
          {lines.map((l, i) => {
            if (l.type === 'card') {
              return <CardOutput key={i} card={l.card} />;
            }
            if (l.type === 'cmd') {
              return (
                <div key={i} style={{ color: '#fff', marginBottom: 2 }}>
                  <span style={{ color: GREEN, fontWeight: 700 }}>agent</span>
                  <span style={{ color: 'rgba(254,254,254,0.4)' }}> @ </span>
                  <span style={{ color: LILAC, fontWeight: 700 }}>0gent</span>
                  <span style={{ color: 'rgba(254,254,254,0.4)' }}> ❯ </span>
                  <span>{l.text}</span>
                </div>
              );
            }
            if (l.type === 'ok') {
              return (
                <div key={i} className="fade-in" style={{ fontSize: 13, color: 'rgba(254,254,254,0.7)' }}>
                  <span style={{ color: GREEN, fontWeight: 700, marginRight: 8 }}>✓</span>
                  {l.text}
                </div>
              );
            }
            if (l.type === 'err') {
              return (
                <div key={i} className="fade-in" style={{ fontSize: 13, color: 'rgba(254,254,254,0.55)' }}>
                  <span style={{ color: RED, fontWeight: 700, marginRight: 8 }}>✗</span>
                  {l.text}
                </div>
              );
            }
            if (l.type === 'dim') {
              return (
                <div key={i} className="fade-in" style={{ fontSize: 13, color: FAINT, whiteSpace: 'pre-wrap' }}>
                  {l.text}
                </div>
              );
            }
            return (
              <div key={i} className="fade-in" style={{ fontSize: 13, color: 'rgba(254,254,254,0.7)', whiteSpace: 'pre-wrap' }}>
                {l.text}
              </div>
            );
          })}

          {/* Input on the same line treatment */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
            <span style={{ color: GREEN, fontWeight: 700 }}>agent</span>
            <span style={{ color: 'rgba(254,254,254,0.4)' }}>@</span>
            <span style={{ color: LILAC, fontWeight: 700 }}>0gent</span>
            <span style={{ color: 'rgba(254,254,254,0.4)' }}>❯</span>
            <input
              autoFocus
              spellCheck={false}
              disabled={busy}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && input.trim()) onRun(input); }}
              placeholder="type a command or click below…"
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                outline: 'none',
                color: TEXT,
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 13,
                caretColor: LILAC,
              }}
            />
            {busy && <span className="blink" style={{ display: 'inline-block', width: 8, height: 16, background: LILAC }} />}
          </div>
        </div>
      </div>

      {/* Suggestion chips — outside scroll container so they stay anchored */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          padding: '10px 18px 14px',
          borderTop: `1px solid ${W08}`,
        }}
      >
        {CHIPS.map(s => (
          <button
            key={s}
            onClick={() => onChip(s)}
            disabled={busy}
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
              padding: '5px 12px',
              background: 'rgba(0,229,255,0.06)',
              border: `1px solid ${BORDER}`,
              color: 'rgba(254,254,254,0.55)',
              cursor: busy ? 'not-allowed' : 'pointer',
              opacity: busy ? 0.4 : 1,
              transition: 'all 0.15s',
              borderRadius: 0,
            }}
            onMouseEnter={e => {
              if (busy) return;
              const el = e.currentTarget;
              el.style.borderColor = LILAC;
              el.style.color = LILAC;
              el.style.background = 'rgba(0,229,255,0.14)';
            }}
            onMouseLeave={e => {
              const el = e.currentTarget;
              el.style.borderColor = BORDER;
              el.style.color = 'rgba(254,254,254,0.55)';
              el.style.background = 'rgba(0,229,255,0.06)';
            }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Logs tab
// ─────────────────────────────────────────────────────────────────────────────

function LogsTab({ logs }: { logs: readonly RequestLog[] }) {
  return (
    <div
      style={{
        minHeight: 360,
        maxHeight: 360,
        padding: '16px 22px',
        overflowY: 'auto',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 13,
        lineHeight: '24px',
        color: TEXT,
      }}
    >
      {logs.length === 0 ? (
        <div style={{ color: FAINT, padding: 20, textAlign: 'center' }}>
          No requests yet — click a chip in the shell or wait for the health check
        </div>
      ) : (
        logs.map(l => (
          <div key={l.id} style={{ display: 'flex', gap: 14 }}>
            <span style={{ color: 'rgba(254,254,254,0.3)' }}>{fmtTime(l.timestamp)}</span>
            <span style={{ color: methodColor(l.method), fontWeight: 700, minWidth: 44 }}>{l.method}</span>
            <span style={{ color: '#79c0ff', flex: 1 }}>{l.path}</span>
            <span style={{ color: statusColor(l.status), fontWeight: 700 }}>{l.status || '--'}</span>
            <span style={{ color: 'rgba(254,254,254,0.4)', minWidth: 60, textAlign: 'right' }}>{l.durationMs}ms</span>
          </div>
        ))
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Network tab
// ─────────────────────────────────────────────────────────────────────────────

function NetworkTab({ stats }: { stats: ReturnType<typeof summary> }) {
  const max = Math.max(1, ...stats.buckets);
  return (
    <div className="terminal-network" style={{ minHeight: 360, padding: '24px 26px' }}>
      {/* Stat cards — auto-fit so on narrow screens they wrap to 2-col, then 1-col */}
      <div className="terminal-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14, marginBottom: 28 }}>
        <StatCard label="Requests / min" value={String(stats.requestsPerMin)} accent={false} />
        <StatCard label="Avg latency" value={stats.avgLatency + 'ms'} accent />
        <StatCard label="Uptime" value={stats.uptime.toFixed(1) + '%'} accent={false} />
      </div>

      {/* Traffic chart */}
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: FAINT, letterSpacing: '0.1em', marginBottom: 10, textTransform: 'uppercase' }}>
        Traffic — last 60s
      </div>
      <div
        style={{
          padding: '14px 16px',
          border: `1px solid ${BORDER}`,
          background: 'rgba(0,0,0,0.3)',
          height: 88,
          display: 'flex',
          alignItems: 'flex-end',
          gap: 4,
        }}
      >
        {stats.buckets.map((v, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              minHeight: 2,
              height: `${(v / max) * 100}%`,
              background: v > 0 ? LILAC : 'rgba(0,229,255,0.15)',
              opacity: v > 0 ? 0.85 : 1,
              transition: 'height 0.4s',
            }}
          />
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: boolean }) {
  return (
    <div
      className="terminal-stat-card"
      style={{
        border: `1px solid ${BORDER}`,
        padding: '18px 20px',
        background: 'rgba(0,229,255,0.03)',
        minWidth: 0,
      }}
    >
      <div
        className="terminal-stat-label"
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: FAINT,
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        className="terminal-stat-value"
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 'clamp(20px, 5vw, 28px)',
          fontWeight: 700,
          color: accent ? LILAC : '#fff',
          letterSpacing: '-0.01em',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  CardOutput — AgentOS-style payment+response card with key-value rows
// ─────────────────────────────────────────────────────────────────────────────

function CardOutput({ card }: { card: Card }) {
  const isPaid = card.payment !== 'free';
  const okStatus = card.status >= 200 && card.status < 400;

  const badgeColors = {
    ok:   { fg: GREEN,  bg: 'rgba(63,185,80,0.10)',  border: 'rgba(63,185,80,0.5)' },
    info: { fg: LILAC,  bg: 'rgba(0,229,255,0.14)', border: 'rgba(0,229,255,0.5)' },
    warn: { fg: YELLOW, bg: 'rgba(254,188,46,0.10)', border: 'rgba(254,188,46,0.5)' },
    err:  { fg: RED,    bg: 'rgba(248,81,73,0.10)',  border: 'rgba(248,81,73,0.5)' },
  };

  return (
    <div className="fade-in" style={{ margin: '8px 0 14px', maxWidth: 580 }}>
      {/* status header */}
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
        marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
      }}>
        {isPaid ? (
          <>
            <span style={{ color: RED, fontWeight: 700 }}>402</span>
            <span style={{ color: FAINT }}>·</span>
            <span style={{ color: TEXT }}>{card.payment}</span>
            <span style={{ color: FAINT }}>→</span>
            <span style={{ color: 'rgba(254,254,254,0.5)' }}>paid</span>
            <span style={{ color: okStatus ? GREEN : RED, fontWeight: 700 }}>
              {card.status} {okStatus ? 'OK' : ''}
            </span>
          </>
        ) : (
          <>
            <span style={{ color: 'rgba(254,254,254,0.5)' }}>free</span>
            <span style={{ color: FAINT }}>·</span>
            <span style={{ color: okStatus ? GREEN : RED, fontWeight: 700 }}>
              {card.status} {okStatus ? 'OK' : ''}
            </span>
          </>
        )}
      </div>

      {/* card body */}
      <div style={{
        border: `1px solid ${W12}`,
        background: 'rgba(0,0,0,0.35)',
        padding: '18px 20px',
      }}>
        {card.title && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            marginBottom: card.rows && card.rows.length ? 16 : 0,
          }}>
            {card.icon && (
              <span style={{ fontSize: card.titleSize === 'lg' ? 22 : 18 }}>{card.icon}</span>
            )}
            <span style={{
              color: TEXT,
              fontFamily: 'JetBrains Mono, monospace',
              fontWeight: 700,
              fontSize: card.titleSize === 'lg' ? 18 : 14,
              letterSpacing: '-0.005em',
            }}>{card.title}</span>
          </div>
        )}

        {card.rows && card.rows.length > 0 && (
          <div style={{ display: 'grid', gap: 8 }}>
            {card.rows.map((r, i) => (
              <div
                key={i}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '120px 1fr',
                  gap: 14,
                  alignItems: 'baseline',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 12,
                }}
              >
                <span style={{ color: FAINT, letterSpacing: '0.02em' }}>{r.label}</span>
                <span style={{
                  color: r.valueColor || TEXT,
                  fontFamily: r.mono === false ? 'inherit' : 'JetBrains Mono, monospace',
                  wordBreak: 'break-all',
                }}>{r.value}</span>
              </div>
            ))}
          </div>
        )}

        {card.note && (
          <div style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: `1px solid ${W08}`,
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11,
            color: FAINT,
            lineHeight: 1.6,
          }}>{card.note}</div>
        )}

        {card.badge && (
          <div style={{ marginTop: 16 }}>
            <span style={{
              display: 'inline-block',
              padding: '4px 12px',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.1em',
              color: badgeColors[card.badge.kind].fg,
              background: badgeColors[card.badge.kind].bg,
              border: `1px solid ${badgeColors[card.badge.kind].border}`,
            }}>{card.badge.text}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main Terminal
// ─────────────────────────────────────────────────────────────────────────────

type TabKey = 'shell' | 'logs' | 'network';

export function Terminal() {
  const wallet = useWallet();
  const [tab, setTab] = useState<TabKey>('shell');
  const [connected, setConnected] = useState(false);
  const [lines, setLines] = useState<Line[]>([
    { type: 'dim', text: '0GENT v0.3.0 — try a command below, or type one' },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [, forceTick] = useState(0);

  // Subscribe to log changes for re-render
  useEffect(() => {
    const unsub = subscribe(() => forceTick(t => t + 1));
    return unsub;
  }, []);

  // Periodic health check — populates connected state + logs
  useEffect(() => {
    let cancelled = false;
    const ping = async () => {
      const { status } = await apiCall('GET', '/health');
      if (!cancelled) setConnected(status >= 200 && status < 400);
    };
    ping();
    const id = setInterval(ping, 15_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Re-render network tab once per second so chart slides
  useEffect(() => {
    if (tab !== 'network') return;
    const id = setInterval(() => forceTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [tab]);

  const run = async (raw: string) => {
    if (busy) return;
    const cmd = raw.trim();
    setInput('');
    setLines(p => [...p, { type: 'cmd', text: cmd }]);

    // Live commands hit the real API
    if (cmd === 'health') {
      setBusy(true);
      const { status, data } = await apiCall('GET', '/health');
      const d = data as any;
      if (status === 200 && d) {
        const chainRows: CardRow[] = [];
        for (const c of d.chains || []) {
          chainRows.push(
            { label: 'chain',    value: `${c.name} · ${c.chainId}`, valueColor: LILAC },
            { label: 'currency', value: `${c.currency} (${c.paymentType})` },
            { label: 'payment',  value: c.contracts.payment },
            { label: 'registry', value: c.contracts.registry },
            { label: 'identity', value: c.contracts.identity },
            ...(c.paymentToken ? [{ label: 'token', value: c.paymentToken }] : []),
            { label: '', value: '' },
          );
        }
        if (chainRows.length) chainRows.pop();
        setLines(p => [
          ...p,
          {
            type: 'card',
            card: {
              payment: 'free',
              status,
              icon: '🟢',
              title: `${d.service} · v${d.version}`,
              titleSize: 'lg',
              rows: chainRows,
              badge: { text: 'ONLINE', kind: 'ok' },
            },
          },
        ]);
      } else {
        setLines(p => [
          ...p,
          {
            type: 'card',
            card: {
              payment: 'free',
              status: status || 0,
              icon: '⚠️',
              title: 'API unreachable',
              note: status ? `received ${status}` : 'no response — check network',
              badge: { text: 'OFFLINE', kind: 'err' },
            },
          },
        ]);
      }
      setBusy(false);
      return;
    }

    if (cmd === 'pricing') {
      setBusy(true);
      const { status, data } = await apiCall('GET', '/pricing');
      const d = data as any;
      if (status === 200 && d?.chains) {
        for (const chain of d.chains) {
          const s = chain.services;
          const cur = chain.currency;
          const rows: CardRow[] = [
            { label: 'identity mint',  value: `${s.identity?.mint} ${cur}`,   valueColor: LILAC },
            { label: 'phone provision',value: `${s.phone?.provision} ${cur}`, valueColor: LILAC },
            { label: 'sms send',       value: `${s.phone?.sms} ${cur}`,       valueColor: LILAC },
            { label: 'email inbox',    value: `${s.email?.provision} ${cur}`, valueColor: LILAC },
            { label: 'email send',     value: `${s.email?.send} ${cur}`,      valueColor: LILAC },
            { label: 'email read',     value: `${s.email?.read} ${cur}`,      valueColor: LILAC },
            { label: 'compute infer',  value: `${s.compute?.infer} ${cur}`,   valueColor: LILAC },
            { label: 'memory r/w',     value: s.memory?.read,                 valueColor: GREEN },
          ];
          setLines(p => [
            ...p,
            {
              type: 'card',
              card: {
                payment: 'free',
                status,
                icon: '💰',
                title: `${chain.network} · paid in ${cur}`,
                titleSize: 'lg',
                rows,
              },
            },
          ]);
        }
      } else {
        setLines(p => [...p, { type: 'err', text: 'pricing unavailable' }]);
      }
      setBusy(false);
      return;
    }

    // ── phone countries — live API call, lists ~50 supported countries ───
    if (cmd === 'phone countries') {
      setBusy(true);
      const { status, data } = await apiCall('GET', '/phone/countries');
      const d = data as any;
      if (status === 200 && d?.countries) {
        const popular = d.countries.filter((c: any) => c.popular).slice(0, 8);
        const rows: CardRow[] = popular.map((c: any) => ({
          label: c.code,
          value: c.name,
          valueColor: LILAC,
        }));
        setLines(p => [
          ...p,
          {
            type: 'card',
            card: {
              payment: 'free',
              status,
              icon: '🌍',
              title: `${d.count} curated picks · 170+ on Twilio`,
              titleSize: 'lg',
              rows,
              note: `★ popular · pass any ISO 3166-1 alpha-2 code (KE, NG, ZA, …) to "phone search" — even if not in this list`,
              badge: { text: `${d.count}+`, kind: 'ok' },
            },
          },
        ]);
      } else {
        setLines(p => [...p, { type: 'err', text: 'phone countries unavailable' }]);
      }
      setBusy(false);
      return;
    }

    // ── phone search — live, free; supports `phone search --country XX --area NNN` ──
    if (/^phone search(\s|$)/.test(cmd)) {
      const m = /(?:--country|-c)\s+(\S+)/.exec(cmd);
      const a = /(?:--area-code|--area|-a)\s+(\S+)/.exec(cmd);
      const country = (m?.[1] || 'US').toUpperCase();
      const areaCode = a?.[1];
      setBusy(true);
      const qs = areaCode
        ? `?country=${encodeURIComponent(country)}&areaCode=${encodeURIComponent(areaCode)}`
        : `?country=${encodeURIComponent(country)}`;
      const { status, data } = await apiCall('GET', `/phone/search${qs}`);
      const d = data as any;
      if (status === 200 && Array.isArray(d?.numbers)) {
        if (d.numbers.length === 0) {
          setLines(p => [
            ...p,
            { type: 'err', text: `No inventory in ${d.country?.name || country} right now — try a different region` },
            { type: 'dim', text: '   tip: "phone countries" lists all 50 supported codes' },
          ]);
        } else {
          const rows: CardRow[] = d.numbers.slice(0, 5).map((n: any) => ({
            label: n.region || country,
            value: n.phoneNumber,
            valueColor: LILAC,
            mono: true,
          }));
          setLines(p => [
            ...p,
            {
              type: 'card',
              card: {
                payment: 'free',
                status,
                icon: '📞',
                title: `${d.numbers.length} numbers in ${d.country?.name || country}`,
                titleSize: 'lg',
                rows,
                note: `provider: ${d.provider} · run "phone provision" to claim one for $3.00 USDC`,
                badge: { text: 'LIVE', kind: 'ok' },
              },
            },
          ]);
        }
      } else if (status === 400 && d?.suggestion) {
        setLines(p => [
          ...p,
          { type: 'err', text: d.error },
          { type: 'dim', text: `   did you mean "${d.suggestion.code}" (${d.suggestion.name})?` },
          { type: 'dim', text: `   or run "phone countries" to see all` },
        ]);
      } else {
        setLines(p => [...p, { type: 'err', text: d?.error || 'phone search failed' }]);
      }
      setBusy(false);
      return;
    }

    // Wallet — uses the unlocked wallet from the page's WalletProvider
    if (cmd === 'wallet') {
      if (wallet.state.kind === 'none') {
        setLines(p => [
          ...p,
          {
            type: 'card',
            card: {
              payment: 'free',
              status: 200,
              icon: '👛',
              title: 'No wallet yet',
              note: 'scroll up to "Create your agent\'s wallet" — generates locally, server never touches your keys',
              badge: { text: 'NONE', kind: 'warn' },
            },
          },
        ]);
        setBusy(false);
        return;
      }
      const addr =
        wallet.state.kind === 'unlocked' ? wallet.state.wallet.address : wallet.state.stored.address;
      const name =
        wallet.state.kind === 'unlocked' ? wallet.state.wallet.name : wallet.state.stored.name;
      setLines(p => [
        ...p,
        {
          type: 'card',
          card: {
            payment: 'free',
            status: 200,
            icon: wallet.state.kind === 'unlocked' ? '🟢' : '🔒',
            title: `${name} · ${shortAddress(addr)}`,
            titleSize: 'lg',
            rows: [
              { label: 'address', value: addr },
              { label: 'balance', value: wallet.balance ? `${Number(wallet.balance.zg).toFixed(4)} native` : '…', valueColor: LILAC },
              { label: 'chains',  value: 'Celo (USDC) · 0G Chain (0G)' },
              { label: 'storage', value: 'browser localStorage · AES-256-GCM' },
            ],
            badge: wallet.state.kind === 'unlocked'
              ? { text: 'ACTIVE', kind: 'ok' }
              : { text: 'LOCKED', kind: 'warn' },
          },
        },
      ]);
      setBusy(false);
      return;
    }

    // Simulated commands
    const out = SIM[cmd.toLowerCase()] || [{ type: 'err' as const, text: `unknown command: ${cmd} — try "help"` }];
    setBusy(true);
    for (const l of out) {
      await new Promise(r => setTimeout(r, l.type === 'ok' || l.type === 'err' ? 320 : 80));
      setLines(p => [...p, l]);
    }
    setBusy(false);
  };

  const stats = summary();
  const logs = getLogs();

  return (
    <section
      id="terminal"
      className="terminal-section"
      style={{
        maxWidth: 1100,
        margin: '0 auto',
        padding: '40px 24px 100px',
        position: 'relative',
      }}
    >
      {/* Subtle bg glow — top-right */}
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background: 'radial-gradient(ellipse 45% 40% at 80% 25%, rgba(0,229,255,0.06), transparent 70%)',
      }} />

      {/* Section kicker — first numbered step on the page */}
      <div className="reveal-up" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <span className="step-badge">01</span>
        <span style={{
          fontSize: 12,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#00E5FF',
          fontWeight: 500,
        }}>try it live</span>
      </div>
      <h2 className="reveal-up" style={{
        fontSize: 'min(40px, 3.4vw)',
        fontWeight: 500,
        letterSpacing: '-0.03em',
        lineHeight: 1.1,
        maxWidth: 640,
        margin: 0,
        marginBottom: 16,
        color: '#fefefe',
        transitionDelay: '60ms',
      }}>The actual API, in your browser.</h2>
      <p className="reveal-up" style={{
        fontSize: 15,
        color: 'rgba(254,254,254,0.5)',
        maxWidth: 540,
        lineHeight: 1.7,
        margin: 0,
        marginBottom: 36,
        transitionDelay: '120ms',
      }}>
        Free commands run live against <span style={{ color: '#00E5FF' }}>api.0gent.xyz</span> right
        now. Paid commands work the same way once your wallet is funded.
      </p>

      <div className="glow-border" style={{ borderRadius: 14, maxWidth: 980, margin: '0 auto' }}>
        <div
          style={{
            background: BG,
            border: `1px solid ${BORDER}`,
            borderRadius: 14,
            overflow: 'hidden',
            textAlign: 'left',
            boxShadow: '0 30px 80px -30px rgba(0,229,255,0.35)',
          }}
        >
          {/* ─── Header bar ─── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              borderBottom: `1px solid ${BORDER}`,
              background: BG2,
              minHeight: 44,
            }}
          >
            <WindowDots />

            <div style={{ display: 'flex', flex: 1 }}>
              <Tab label="shell" active={tab === 'shell'} onClick={() => setTab('shell')} />
              <Tab label="logs" active={tab === 'logs'} onClick={() => setTab('logs')} />
              <Tab label="network" active={tab === 'network'} onClick={() => setTab('network')} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingRight: 16 }}>
              <Waveform />
              <ConnectionStatus connected={connected} />
            </div>
          </div>

          {/* ─── Body (per tab) ─── */}
          {tab === 'shell' && (
            <ShellTab
              lines={lines}
              input={input}
              setInput={setInput}
              onRun={run}
              busy={busy}
              onChip={run}
            />
          )}
          {tab === 'logs' && <LogsTab logs={logs} />}
          {tab === 'network' && <NetworkTab stats={stats} />}

          {/* ─── Status bar ─── */}
          <StatusBar requests={logs.length} lineNum={lines.length + 1} />
        </div>
      </div>
    </section>
  );
}
