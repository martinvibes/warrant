import { useState, useEffect } from 'react';
import { useWallet } from '../lib/walletContext';
import { shortAddress, FAUCET_URL, EXPLORER_BASE } from '../lib/wallet';

// ─── Tokens (matches Features.tsx vibe — quiet, minimal, subtle accent) ──

const LILAC = '#00E5FF';
const GREEN = '#3fb950';
const RED = '#f85149';
const AMBER = '#febc2e';
const TEXT = '#fefefe';
const TEXT_DIM = 'rgba(254,254,254,0.7)';
const TEXT_FAINT = 'rgba(254,254,254,0.45)';
const TEXT_GHOST = 'rgba(254,254,254,0.25)';
const BG_PAGE = '#08080d';
const BG_CARD = '#050508';
const BG_INPUT = 'rgba(0,0,0,0.45)';
const BORDER = 'rgba(0,229,255,0.10)';
const BORDER_HOVER = 'rgba(0,229,255,0.28)';

// ─── Section + heading wrappers (mirrors Features.tsx layout) ───────────

const sectionStyle: React.CSSProperties = {
  position: 'relative',
  padding: '120px 24px 80px',
  background: BG_PAGE,
  overflow: 'hidden',
};

// Subtle bg glow div — placed top-left
const sectionGlow: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  background: 'radial-gradient(ellipse 50% 40% at 20% 30%, rgba(0,229,255,0.07), transparent 70%)',
};

const containerStyle: React.CSSProperties = {
  maxWidth: 1100,
  margin: '0 auto',
  position: 'relative',
};

const kickerStyle: React.CSSProperties = {
  fontSize: 12,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: LILAC,
  marginBottom: 16,
  fontWeight: 500,
};

const h2Style: React.CSSProperties = {
  fontSize: 'min(40px, 3.4vw)',
  fontWeight: 500,
  letterSpacing: '-0.03em',
  lineHeight: 1.1,
  maxWidth: 640,
  margin: 0,
  marginBottom: 16,
  color: TEXT,
};

const subStyle: React.CSSProperties = {
  fontSize: 15,
  color: 'rgba(254,254,254,0.5)',
  maxWidth: 540,
  lineHeight: 1.7,
  margin: 0,
  marginBottom: 48,
};

// ─── Card chrome — single thin border, no glow, no terminal dots ──────

const cardStyle: React.CSSProperties = {
  background: BG_CARD,
  border: `1px solid ${BORDER}`,
  padding: '36px 36px 32px',
  maxWidth: 640,
};

// ─── Form bits ────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  color: TEXT_FAINT,
  marginBottom: 8,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  fontWeight: 500,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  background: BG_INPUT,
  border: `1px solid ${BORDER}`,
  color: TEXT,
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: 13,
  outline: 'none',
  borderRadius: 0,
  transition: 'border-color 0.15s, background 0.15s',
};

// ─── Buttons ──────────────────────────────────────────────────────────

const primaryBtn: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  padding: '12px 22px',
  border: `1px solid ${LILAC}`,
  background: 'linear-gradient(180deg, #00B8D4 0%, #6a00a8 100%)',
  color: TEXT,
  cursor: 'pointer',
  letterSpacing: '0.01em',
  borderRadius: 0,
  transition: 'background 0.15s, border-color 0.15s, box-shadow 0.15s',
  boxShadow: '0 0 0 transparent',
};

const PRIMARY_BTN_HOVER_BG = 'linear-gradient(180deg, #a30dff 0%, #7a13c0 100%)';
const PRIMARY_BTN_HOVER_SHADOW = '0 0 24px rgba(0,229,255,0.35)';

const ghostBtn: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  padding: '9px 14px',
  border: `1px solid ${BORDER}`,
  background: 'transparent',
  color: TEXT_DIM,
  cursor: 'pointer',
  borderRadius: 0,
  transition: 'all 0.15s',
};

// ─── Tiny helpers ─────────────────────────────────────────────────────

function StatusTag({
  kind,
  children,
}: {
  kind: 'idle' | 'active' | 'locked' | 'warn';
  children: React.ReactNode;
}) {
  const colors = {
    idle:   { dot: TEXT_GHOST, fg: TEXT_FAINT },
    active: { dot: GREEN, fg: GREEN },
    locked: { dot: AMBER, fg: AMBER },
    warn:   { dot: RED, fg: RED },
  }[kind];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      fontSize: 11, color: colors.fg, fontFamily: 'JetBrains Mono, monospace',
      letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 500,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: colors.dot, display: 'inline-block',
      }} />
      {children}
    </span>
  );
}

function CopyButton({ text, label = 'copy', size = 'sm' as 'sm' | 'md' }: { text: string; label?: string; size?: 'sm' | 'md' }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(id);
  }, [copied]);

  const base: React.CSSProperties = {
    ...ghostBtn,
    padding: size === 'sm' ? '5px 10px' : '8px 14px',
    fontSize: size === 'sm' ? 11 : 12,
    display: 'inline-flex', alignItems: 'center', gap: 6,
  };
  const styled: React.CSSProperties = copied
    ? { ...base, color: GREEN, borderColor: 'rgba(63,185,80,0.3)' }
    : base;

  return (
    <button
      type="button"
      style={styled}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
        } catch {}
      }}
    >
      {copied ? '✓ copied' : label}
    </button>
  );
}

// ─── Tiny SVG icons (stroke-based, 12px) ──────────────────────────────

const KeyIcon = (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6" cy="10" r="3" />
    <path d="M9 9l5-5m-2 2l1.5 1.5M11 6l1.5 1.5" />
  </svg>
);

const ShieldIcon = (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 1.5l5.5 2v4.2c0 3.4-2.3 6.1-5.5 6.8-3.2-.7-5.5-3.4-5.5-6.8V3.5l5.5-2z" />
    <path d="M5.5 8l1.7 1.7L10.5 6.5" />
  </svg>
);

const VaultIcon = (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="12" height="10" rx="1" />
    <circle cx="10" cy="8" r="1.6" />
    <path d="M10 9.6V11" />
  </svg>
);

const ZapIcon = (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="9,1.5 3,9 7,9 6,14.5 13,7 9,7" />
  </svg>
);

const WarnIcon = (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 1.5l7 12.5H1z" />
    <line x1="8" y1="6" x2="8" y2="9.5" />
    <line x1="8" y1="11.5" x2="8" y2="11.7" />
  </svg>
);

const trustPills: { label: string; icon: React.ReactNode }[] = [
  { label: 'client-side BIP-39', icon: KeyIcon },
  { label: 'AES-256-GCM',        icon: ShieldIcon },
  { label: 'self-custody',       icon: VaultIcon },
  { label: 'no signup',          icon: ZapIcon },
];

// ─── Main panel ────────────────────────────────────────────────────────

export function WalletPanel() {
  const { state, balance, create, unlock, lock, forget, refreshBalance } = useWallet();
  const [name, setName] = useState('');
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [justCreated, setJustCreated] = useState<{ mnemonic: string; address: string } | null>(null);
  const [unlockMode, setUnlockMode] = useState(false);

  // ── No wallet (or locked wallet present) → create flow + inline unlock ───
  if (state.kind === 'none' || state.kind === 'locked') {
    const lockedStored = state.kind === 'locked' ? state.stored : null;
    return (
      <section id="wallet" className="wallet-section" style={sectionStyle}>
        <div style={sectionGlow} />
        <div style={containerStyle}>
          <div className="reveal-up" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <span className="step-badge">01</span>
            <span style={kickerStyle}>get started</span>
          </div>
          <h2 className="reveal-up" style={{ ...h2Style, transitionDelay: '60ms' }}>
            Your agent's wallet, <span style={{ color: TEXT_DIM }}>generated in your browser.</span>
          </h2>
          <p className="reveal-up" style={{ ...subStyle, transitionDelay: '120ms' }}>
            BIP-39 HD keys created locally. Encrypted with your passphrase via AES-256-GCM
            and stored in this browser. Our servers never see them.
          </p>

          {/* Trust pills row — small, subtle, gives the eye something */}
          <div className="reveal-up" style={{
            display: 'flex', gap: 8, flexWrap: 'wrap',
            marginBottom: 36,
            transitionDelay: '180ms',
          }}>
            {trustPills.map(({ label, icon }) => (
              <span key={label} style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                fontSize: 11,
                padding: '5px 11px',
                color: TEXT_FAINT,
                background: 'rgba(0,229,255,0.04)',
                border: `1px solid ${BORDER}`,
                fontFamily: 'JetBrains Mono, monospace',
                letterSpacing: '0.02em',
              }}>
                <span style={{ color: LILAC, display: 'inline-flex' }}>{icon}</span>
                {label}
              </span>
            ))}
          </div>

          <div className="reveal-up wallet-card" style={{ ...cardStyle, transitionDelay: '220ms' }}>
            {/* Inline unlock affordance — only renders when an encrypted wallet
                exists in this browser. Compact by default; click "unlock" to
                reveal the passphrase form right here, instead of a whole
                separate section above. */}
            {lockedStored && (
              <div style={{
                marginBottom: 22,
                padding: unlockMode ? '14px 16px 16px' : '11px 14px',
                border: `1px solid ${unlockMode ? 'rgba(254,188,46,0.35)' : 'rgba(254,188,46,0.18)'}`,
                background: unlockMode ? 'rgba(254,188,46,0.05)' : 'rgba(254,188,46,0.025)',
                transition: 'all 0.2s ease',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  flexWrap: 'wrap',
                }}>
                  <span style={{ color: AMBER, fontSize: 13, lineHeight: 1, display: 'inline-flex' }}>🔒</span>
                  <span style={{ fontSize: 12, color: TEXT_DIM, fontFamily: 'JetBrains Mono, monospace' }}>
                    existing wallet ·
                    <span style={{ color: TEXT, marginLeft: 6 }}>{shortAddress(lockedStored.address)}</span>
                  </span>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                    {!unlockMode ? (
                      <button
                        type="button"
                        onClick={() => { setUnlockMode(true); setErr(''); setPass(''); }}
                        style={{
                          background: 'transparent',
                          color: AMBER,
                          fontSize: 11,
                          fontFamily: 'JetBrains Mono, monospace',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          padding: '4px 10px',
                          border: '1px solid rgba(254,188,46,0.35)',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(254,188,46,0.08)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                      >
                        unlock
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setUnlockMode(false); setErr(''); setPass(''); }}
                        style={{
                          background: 'transparent',
                          color: TEXT_FAINT,
                          fontSize: 11,
                          fontFamily: 'JetBrains Mono, monospace',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          padding: '4px 10px',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        cancel
                      </button>
                    )}
                  </div>
                </div>

                {unlockMode && (
                  <form
                    onSubmit={async e => {
                      e.preventDefault();
                      setErr(''); setBusy(true);
                      try {
                        await unlock(pass);
                        setPass(''); setUnlockMode(false);
                      } catch (e: any) {
                        setErr(e?.message || 'Failed to unlock');
                      } finally {
                        setBusy(false);
                      }
                    }}
                    style={{ marginTop: 14 }}
                  >
                    <input
                      type="password"
                      style={{ ...inputStyle, marginBottom: 10 }}
                      value={pass}
                      onChange={e => setPass(e.target.value)}
                      placeholder="passphrase"
                      autoFocus
                      onFocus={e => { e.target.style.borderColor = BORDER_HOVER; }}
                      onBlur={e => { e.target.style.borderColor = BORDER; }}
                    />
                    {err && (
                      <p style={{
                        color: RED, fontSize: 11, marginBottom: 10,
                        padding: '7px 10px',
                        border: '1px solid rgba(248,81,73,0.25)',
                        background: 'rgba(248,81,73,0.06)',
                      }}>{err}</p>
                    )}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button
                        type="submit"
                        disabled={busy || !pass}
                        style={{ ...primaryBtn, opacity: (busy || !pass) ? 0.5 : 1, height: 38, fontSize: 12, padding: '0 18px' }}
                        onMouseEnter={e => { if (!busy && pass) {const el = (e.currentTarget as HTMLButtonElement); el.style.background = PRIMARY_BTN_HOVER_BG; el.style.boxShadow = PRIMARY_BTN_HOVER_SHADOW;}; }}
                        onMouseLeave={e => {const el = (e.currentTarget as HTMLButtonElement); el.style.background = primaryBtn.background as string; el.style.boxShadow = '';}}
                      >
                        {busy ? 'unlocking…' : 'unlock'}
                      </button>
                      <button
                        type="button"
                        style={{
                          marginLeft: 'auto',
                          background: 'transparent', color: 'rgba(248,81,73,0.7)',
                          fontSize: 11, fontFamily: 'JetBrains Mono, monospace',
                          padding: '6px 10px',
                          border: '1px solid rgba(248,81,73,0.18)',
                          cursor: 'pointer',
                        }}
                        onClick={() => { if (confirm('Delete this wallet from this browser? Make sure you have your recovery phrase.')) forget(); }}
                      >
                        forget
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Subtle divider when unlock UI is showing — separates the two flows */}
            {lockedStored && !unlockMode && (
              <p style={{
                fontSize: 11, color: TEXT_FAINT,
                marginBottom: 18,
                fontFamily: 'JetBrains Mono, monospace',
                letterSpacing: '0.04em',
              }}>
                — or generate a new wallet below —
              </p>
            )}

            <form
              onSubmit={async e => {
                e.preventDefault();
                setErr('');
                if (pass !== pass2) { setErr('Passphrases do not match.'); return; }
                setBusy(true);
                try {
                  const w = await create(name || undefined, pass);
                  setJustCreated({ mnemonic: w.mnemonic, address: w.address });
                  setName(''); setPass(''); setPass2('');
                } catch (e: any) {
                  setErr(e?.message || 'Failed to create wallet');
                } finally {
                  setBusy(false);
                }
              }}
              style={{ display: unlockMode ? 'none' : 'block' }}
            >
              <div style={{ marginBottom: 18 }}>
                <label style={labelStyle}>label · optional</label>
                <input
                  style={inputStyle}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="agent-bot"
                  spellCheck={false}
                  onFocus={e => { e.target.style.borderColor = BORDER_HOVER; }}
                  onBlur={e => { e.target.style.borderColor = BORDER; }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
                <div>
                  <label style={labelStyle}>passphrase</label>
                  <input
                    type="password"
                    style={inputStyle}
                    value={pass}
                    onChange={e => setPass(e.target.value)}
                    required minLength={8}
                    placeholder="min 8 characters"
                    onFocus={e => { e.target.style.borderColor = BORDER_HOVER; }}
                    onBlur={e => { e.target.style.borderColor = BORDER; }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>confirm</label>
                  <input
                    type="password"
                    style={inputStyle}
                    value={pass2}
                    onChange={e => setPass2(e.target.value)}
                    required minLength={8}
                    onFocus={e => { e.target.style.borderColor = BORDER_HOVER; }}
                    onBlur={e => { e.target.style.borderColor = BORDER; }}
                  />
                </div>
              </div>
              {err && (
                <p style={{
                  color: RED, fontSize: 12, marginBottom: 16,
                  padding: '8px 12px', border: '1px solid rgba(248,81,73,0.25)',
                  background: 'rgba(248,81,73,0.06)',
                }}>{err}</p>
              )}
              <button
                type="submit"
                disabled={busy}
                style={{ ...primaryBtn, opacity: busy ? 0.5 : 1, cursor: busy ? 'wait' : 'pointer' }}
                onMouseEnter={e => { if (!busy) {const el = (e.currentTarget as HTMLButtonElement); el.style.background = PRIMARY_BTN_HOVER_BG; el.style.boxShadow = PRIMARY_BTN_HOVER_SHADOW;}; }}
                onMouseLeave={e => { {const el = (e.currentTarget as HTMLButtonElement); el.style.background = primaryBtn.background as string; el.style.boxShadow = '';}; }}
              >
                {busy ? 'generating…' : 'generate wallet'}
              </button>
              <p style={{
                marginTop: 22, marginBottom: 0,
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '10px 12px',
                fontSize: 11, color: AMBER, lineHeight: 1.6,
                fontFamily: 'JetBrains Mono, monospace',
                background: 'rgba(254,188,46,0.05)',
                border: '1px solid rgba(254,188,46,0.18)',
              }}>
                <span style={{ flexShrink: 0, display: 'inline-flex' }}>{WarnIcon}</span>
                <span>forget your passphrase = lose access. there is no reset.</span>
              </p>
            </form>
          </div>
        </div>
      </section>
    );
  }

  // ── Just created — show recovery phrase ──────────────────────────────
  if (justCreated && state.kind === 'unlocked') {
    const words = justCreated.mnemonic.split(' ');
    return (
      <section id="wallet" className="wallet-section" style={sectionStyle}>
        <div style={sectionGlow} />
        <div style={containerStyle}>
          <div className="reveal-up" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <span className="step-badge" style={{ borderColor: 'rgba(254,188,46,0.4)', color: AMBER, background: 'linear-gradient(135deg, rgba(254,188,46,0.08), rgba(254,188,46,0.02))' }}>!</span>
            <span style={{ ...kickerStyle, color: AMBER, marginBottom: 0 }}>backup</span>
          </div>
          <h2 className="reveal-up" style={{ ...h2Style, transitionDelay: '60ms' }}>
            Save your 12-word recovery phrase.
          </h2>
          <p className="reveal-up" style={{ ...subStyle, transitionDelay: '120ms' }}>
            The only way to restore your wallet on another device. Shown once — close this view and
            it's gone for good. Write them down or save them to a password manager.
          </p>

          <div className="reveal-up wallet-card" style={{ ...cardStyle, padding: '32px', transitionDelay: '180ms' }}>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
              marginBottom: 24,
            }}>
              {words.map((w, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'baseline', gap: 10,
                  padding: '10px 14px',
                  background: BG_INPUT,
                  border: `1px solid ${BORDER}`,
                  fontFamily: 'JetBrains Mono, monospace',
                }}>
                  <span style={{ fontSize: 10, color: TEXT_GHOST, minWidth: 18, fontWeight: 500 }}>
                    {(i + 1).toString().padStart(2, '0')}
                  </span>
                  <span style={{ fontSize: 14, color: TEXT, fontWeight: 400, userSelect: 'all' }}>
                    {w}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <CopyButton text={justCreated.mnemonic} label="copy phrase" size="md" />
              <button
                type="button"
                style={ghostBtn}
                onClick={() => {
                  const blob = new Blob([
                    `0GENT wallet recovery phrase\n` +
                    `Address: ${justCreated.address}\n` +
                    `Created: ${new Date().toISOString()}\n\n` +
                    `${justCreated.mnemonic}\n\n` +
                    `Keep this file offline. Anyone with these 12 words controls the wallet.`,
                  ], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `0gent-recovery-${justCreated.address.slice(0, 8)}.txt`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                download .txt
              </button>
              <button
                type="button"
                style={{ ...primaryBtn, marginLeft: 'auto' }}
                onClick={() => setJustCreated(null)}
                onMouseEnter={e => {const el = (e.currentTarget as HTMLButtonElement); el.style.background = PRIMARY_BTN_HOVER_BG; el.style.boxShadow = PRIMARY_BTN_HOVER_SHADOW;}}
                onMouseLeave={e => {const el = (e.currentTarget as HTMLButtonElement); el.style.background = primaryBtn.background as string; el.style.boxShadow = '';}}
              >
                I've saved it
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }
  // ── Unlocked ────────────────────────────────────────────────────────
  const w = state.wallet;
  const explorerUrl = EXPLORER_BASE + w.address;
  const zg = balance ? Number(balance.zg) : 0;
  const isFunded = zg > 0;

  return (
    <section id="wallet" className="wallet-section" style={sectionStyle}>
      <div style={sectionGlow} />
      <div style={containerStyle}>
        <div className="reveal-up" style={{
          display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
          marginBottom: 14,
        }}>
          <span className="step-badge" style={{ borderColor: 'rgba(63,185,80,0.4)', color: GREEN, background: 'linear-gradient(135deg, rgba(63,185,80,0.08), rgba(63,185,80,0.02))' }}>✓</span>
          <span style={{ ...kickerStyle, marginBottom: 0 }}>your agent</span>
          <StatusTag kind="active">active</StatusTag>
        </div>
        <h2 className="reveal-up" style={{ ...h2Style, transitionDelay: '60ms' }}>{w.name}</h2>
        <p className="reveal-up" style={{ ...subStyle, transitionDelay: '120ms' }}>
          Wallet unlocked in this browser. Use it from the terminal below or via the CLI / SDK
          to provision real resources on-chain.
        </p>

        <div className="reveal-up wallet-card" style={{ ...cardStyle, transitionDelay: '180ms' }}>
          {/* Address row */}
          <div style={{ marginBottom: 28 }}>
            <div style={labelStyle}>address</div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
              paddingBottom: 14,
              borderBottom: `1px solid ${BORDER}`,
            }}>
              <code style={{
                color: TEXT, fontSize: 13,
                fontFamily: 'JetBrains Mono, monospace',
                userSelect: 'all', wordBreak: 'break-all',
                flex: 1, minWidth: 260,
              }}>{w.address}</code>
              <CopyButton text={w.address} />
              <a
                href={explorerUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  ...ghostBtn,
                  padding: '5px 10px', fontSize: 11,
                  textDecoration: 'none',
                  display: 'inline-flex', alignItems: 'center',
                }}
              >
                explorer ↗
              </a>
            </div>
          </div>

          {/* Balance — quieter, no gradient bg */}
          <div style={{
            display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap',
            marginBottom: isFunded ? 24 : 16,
          }}>
            <div>
              <div style={labelStyle}>balance</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 28, fontWeight: 500, color: TEXT,
                  letterSpacing: '-0.01em', lineHeight: 1,
                }}>
                  {balance ? Number(balance.zg).toFixed(4) : '0.0000'}
                </span>
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 14, color: LILAC, fontWeight: 500,
                }}>0G</span>
              </div>
            </div>
            <button
              type="button"
              onClick={refreshBalance}
              style={{
                ...ghostBtn,
                marginLeft: 'auto', padding: '5px 10px', fontSize: 11,
              }}
            >
              refresh
            </button>
          </div>

          {/* Faucet hint when balance is 0 — much quieter */}
          {balance && !isFunded && (
            <div style={{
              padding: '14px 16px',
              background: 'rgba(254,188,46,0.04)',
              border: '1px solid rgba(254,188,46,0.18)',
              marginBottom: 24,
              fontSize: 12, color: TEXT_DIM, lineHeight: 1.7,
              fontFamily: 'JetBrains Mono, monospace',
            }}>
              <div style={{ marginBottom: 6, color: AMBER, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: 10 }}>
                fund this wallet to start
              </div>
              open <a href={FAUCET_URL} target="_blank" rel="noreferrer" style={{ color: LILAC, textDecoration: 'none' }}>faucet.0g.ai</a>, paste the address, request — funds arrive in ~30s.
            </div>
          )}

          {/* Action row */}
          <div style={{
            display: 'flex', gap: 8, flexWrap: 'wrap',
            paddingTop: 20, borderTop: `1px solid ${BORDER}`,
          }}>
            <a
              href={FAUCET_URL}
              target="_blank"
              rel="noreferrer"
              style={{
                ...ghostBtn,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                ...(isFunded ? {} : { borderColor: 'rgba(254,188,46,0.3)', color: AMBER }),
              }}
            >
              faucet ↗
            </a>
            <a
              href={`/agent/${w.address}`}
              style={{
                ...ghostBtn,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              public profile →
            </a>
            <button type="button" style={ghostBtn} onClick={lock}>
              lock
            </button>
            <button
              type="button"
              style={{ ...ghostBtn, marginLeft: 'auto', color: 'rgba(248,81,73,0.7)', borderColor: 'rgba(248,81,73,0.18)' }}
              onClick={() => { if (confirm('Delete this wallet from this browser?')) forget(); }}
            >
              forget wallet
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
