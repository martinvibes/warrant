/**
 * /dashboard — non-technical user's home base.
 *
 * Wallet → Identity → Email → AI → Memory. Each card is self-contained:
 * own loading state, own error state, own result display. All paid actions
 * route through `agentClient.paid(...)` which handles the x402 dance from the
 * browser using the unlocked wallet's private key.
 *
 * SMS is intentionally NOT included — buying a number costs $1 of operator
 * USD, which we can't auto-front for new dashboard users. Power users can
 * still SMS via the CLI using a number they own.
 */

import { useState, useEffect, useMemo, type ReactNode, type CSSProperties } from 'react';
import { Nav } from './Nav';
import { Footer } from './Footer';
import { useWallet } from '../lib/walletContext';
import { shortAddress, FAUCET_URL, EXPLORER_BASE } from '../lib/wallet';
import { createAgentClient, statusText, type AgentClient, type PaymentStatus } from '../lib/agentClient';
import {
  IdentityIcon, EmailIcon, PhoneIcon, BrainIcon, DatabaseIcon,
  CopyIcon, CheckIcon, ExternalIcon, LockIcon,
} from './Icons';

// ─── Tokens ───────────────────────────────────────────────────────────
const LILAC      = '#00E5FF';
const PURPLE     = '#00B8D4';
const TEXT       = '#fefefe';
const TEXT_DIM   = 'rgba(254,254,254,0.7)';
const TEXT_FAINT = 'rgba(254,254,254,0.5)';
const TEXT_GHOST = 'rgba(254,254,254,0.30)';
const BG_PAGE    = '#050508';
const BG_CARD    = '#0c0c14';
const BG_INPUT   = 'rgba(0,0,0,0.45)';
const BORDER     = 'rgba(0,229,255,0.12)';
const BORDER_HOVER = 'rgba(0,229,255,0.30)';
const GREEN      = '#7DEFB1';
const AMBER      = '#FFC97A';
const RED        = '#f85149';

const CHAIN_EXPLORER_TX = 'https://chainscan.0g.ai/tx/';

// ─── Shared UI ────────────────────────────────────────────────────────

const baseInput: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  background: BG_INPUT,
  border: `1px solid ${BORDER}`,
  color: TEXT,
  fontSize: 13,
  fontFamily: 'JetBrains Mono, monospace',
  outline: 'none',
};
const inputClass = 'dash-input';
const primaryClass = 'dash-btn-primary';
const ghostClass = 'dash-btn-ghost';

const primaryBtn: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  height: 38,
  padding: '0 18px',
  background: PURPLE,
  color: '#fff',
  fontSize: 13,
  fontWeight: 500,
  borderRadius: 100,
  border: 'none',
  cursor: 'pointer',
  transition: 'all 0.15s',
};

const ghostBtn: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  height: 36,
  padding: '0 16px',
  background: 'transparent',
  color: TEXT_DIM,
  fontSize: 12,
  fontWeight: 500,
  borderRadius: 100,
  border: `1px solid ${BORDER}`,
  cursor: 'pointer',
  transition: 'all 0.15s',
  fontFamily: 'JetBrains Mono, monospace',
};

function Label({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
      <span style={{ fontSize: 11, color: TEXT_FAINT, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'JetBrains Mono, monospace' }}>{children}</span>
      {action}
    </div>
  );
}

function Card({ kicker, title, sub, badge, children, style }: { kicker?: string; title: string; sub?: ReactNode; badge?: ReactNode; children: ReactNode; style?: CSSProperties }) {
  return (
    <div className="dash-card" style={{ background: BG_CARD, border: `1px solid ${BORDER}`, padding: 26, ...style }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        {kicker && (
          <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: LILAC, fontFamily: 'JetBrains Mono, monospace' }}>
            {kicker}
          </div>
        )}
        {badge}
      </div>
      <h3 style={{ fontSize: 17, fontWeight: 500, letterSpacing: '-0.01em', marginBottom: sub ? 6 : 14 }}>{title}</h3>
      {sub && <div style={{ fontSize: 12.5, color: TEXT_DIM, marginBottom: 16, lineHeight: 1.6 }}>{sub}</div>}
      {children}
    </div>
  );
}

function LiveBadge({ label = 'live' }: { label?: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: GREEN,
      fontFamily: 'JetBrains Mono, monospace',
    }}>
      <span className="dash-pulse-dot" style={{ width: 6, height: 6, background: GREEN, borderRadius: '50%', display: 'inline-block', boxShadow: `0 0 6px ${GREEN}` }} />
      {label}
    </span>
  );
}

function ProgressLine({ status }: { status: PaymentStatus }) {
  if (status.kind === 'idle' || status.kind === 'success') return null;
  const isErr = status.kind === 'error';
  const color = isErr ? RED : LILAC;
  const dot   = isErr ? '✗' : (status.kind === 'broadcasting' || status.kind === 'verifying' ? '◔' : '◌');
  return (
    <div style={{
      marginTop: 12, padding: '8px 12px',
      border: `1px solid ${isErr ? 'rgba(248,81,73,0.30)' : 'rgba(0,229,255,0.20)'}`,
      background: isErr ? 'rgba(248,81,73,0.05)' : 'rgba(0,229,255,0.04)',
      fontSize: 12, color, fontFamily: 'JetBrains Mono, monospace',
      display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
    }}>
      <span className={isErr ? '' : 'pulse'}>{dot}</span>
      <span style={{ flex: 1, minWidth: 0 }}>{statusText(status)}</span>
      {(status.kind === 'broadcasting' || status.kind === 'verifying') && (
        <a
          href={CHAIN_EXPLORER_TX + (status as any).txHash}
          target="_blank" rel="noreferrer"
          style={{ color: LILAC, textDecoration: 'underline', fontSize: 11 }}
        >
          view tx ↗
        </a>
      )}
    </div>
  );
}

// ─── Wallet section ───────────────────────────────────────────────────

function WalletGate({ onUnlocked: _ }: { onUnlocked?: () => void }) {
  const { state, create, unlock } = useWallet();
  const [mode, setMode] = useState<'create' | 'unlock'>(state.kind === 'locked' ? 'unlock' : 'create');
  const [name, setName] = useState('');
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [justCreated, setJustCreated] = useState<{ mnemonic: string; address: string } | null>(null);

  if (justCreated) {
    return (
      <Card kicker="ONE-TIME" title="Save your recovery phrase." sub="Write these 12 words down somewhere safe. If you lose them you lose access — same trust model as MetaMask. There is no reset.">
        <div className="dash-result-in" style={{
          padding: 20,
          background: BG_INPUT,
          border: `1px solid ${BORDER}`,
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 14,
          lineHeight: 1.95,
          color: TEXT,
          letterSpacing: '0.02em',
          wordSpacing: '6px',
          userSelect: 'all',
          textAlign: 'center',
        }}>
          {justCreated.mnemonic}
        </div>
        <div style={{ marginTop: 14, fontSize: 11, color: AMBER, fontFamily: 'JetBrains Mono, monospace', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span>⚠</span>
          <span>Don't share these. Anyone with these 12 words controls this wallet.</span>
        </div>
        <button
          style={{ ...primaryBtn, marginTop: 18, width: '100%' }}
          className={primaryClass}
          onClick={() => { setJustCreated(null); }}
        >
          I've saved it · continue
        </button>
      </Card>
    );
  }

  return (
    <Card kicker="GET STARTED" title="Get your wallet" sub="An encrypted local wallet, generated in your browser. Nothing leaves your device.">
      <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
        <button
          onClick={() => { setMode('create'); setErr(''); }}
          style={{
            ...ghostBtn,
            color: mode === 'create' ? LILAC : TEXT_DIM,
            borderColor: mode === 'create' ? BORDER_HOVER : BORDER,
            background: mode === 'create' ? 'rgba(0,229,255,0.06)' : 'transparent',
          }}
          className={ghostClass}
        >Create new</button>
        <button
          onClick={() => { setMode('unlock'); setErr(''); }}
          disabled={state.kind !== 'locked'}
          style={{
            ...ghostBtn,
            color: mode === 'unlock' ? LILAC : (state.kind !== 'locked' ? TEXT_GHOST : TEXT_DIM),
            borderColor: mode === 'unlock' ? BORDER_HOVER : BORDER,
            background: mode === 'unlock' ? 'rgba(0,229,255,0.06)' : 'transparent',
          }}
          className={ghostClass}
        >Unlock existing</button>
      </div>

      {mode === 'create' ? (
        <form onSubmit={async e => {
          e.preventDefault();
          setErr('');
          if (pass !== pass2) { setErr('Passphrases do not match.'); return; }
          if (pass.length < 8) { setErr('Passphrase must be at least 8 characters.'); return; }
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
        }}>
          <div style={{ marginBottom: 14 }}>
            <Label>Label (optional)</Label>
            <input style={baseInput} className={inputClass} value={name} onChange={e => setName(e.target.value)} placeholder="agent-bot" />
          </div>

          {/* Passphrase explanation — non-tech users often don't know what
              this is, so spell it out before they need to type one. */}
          <div style={{
            marginBottom: 14, padding: '12px 14px',
            border: `1px solid ${BORDER}`, background: 'rgba(0,229,255,0.04)',
            fontSize: 12.5, color: TEXT_DIM, lineHeight: 1.6,
          }}>
            <div style={{ fontSize: 11, color: LILAC, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
              What's a passphrase?
            </div>
            A password that locks your wallet on this device — only you'll know it. Pick something you can remember but no one can guess. Examples:{' '}
            <code style={{ color: LILAC, fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>can run smile</code>,{' '}
            <code style={{ color: LILAC, fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>blue sky bird</code>,{' '}
            <code style={{ color: LILAC, fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>mydogjollof</code>.{' '}
            <span style={{ color: TEXT_FAINT }}>Spaces, capitals, and punctuation all count — type it the same way every time.</span>
            <div style={{ marginTop: 8, fontSize: 11, color: AMBER }}>
              Different from your recovery phrase — that comes next, after the wallet is generated.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <Label>Passphrase</Label>
              <input
                type="password"
                style={baseInput}
                className={inputClass}
                value={pass}
                onChange={e => setPass(e.target.value)}
                placeholder="e.g. can run smile"
                required
                minLength={8}
              />
            </div>
            <div>
              <Label>Confirm</Label>
              <input
                type="password"
                style={baseInput}
                className={inputClass}
                value={pass2}
                onChange={e => setPass2(e.target.value)}
                placeholder="type it again"
                required
                minLength={8}
              />
            </div>
          </div>
          {err && <div style={{ color: RED, fontSize: 12, padding: '7px 10px', border: '1px solid rgba(248,81,73,0.25)', background: 'rgba(248,81,73,0.05)', marginBottom: 10 }}>{err}</div>}
          <button type="submit" style={{ ...primaryBtn, width: '100%' }} className={primaryClass} disabled={busy}>
            {busy ? 'Generating…' : 'Generate wallet'}
          </button>
        </form>
      ) : (
        <form onSubmit={async e => {
          e.preventDefault();
          setErr('');
          setBusy(true);
          try { await unlock(pass); setPass(''); }
          catch (e: any) { setErr(e?.message || 'Failed to unlock'); }
          finally { setBusy(false); }
        }}>
          <div style={{ marginBottom: 12 }}>
            <Label>Passphrase</Label>
            <input type="password" style={baseInput} className={inputClass} value={pass} onChange={e => setPass(e.target.value)} autoFocus required />
          </div>
          {err && <div style={{ color: RED, fontSize: 12, padding: '7px 10px', border: '1px solid rgba(248,81,73,0.25)', background: 'rgba(248,81,73,0.05)', marginBottom: 10 }}>{err}</div>}
          <button type="submit" style={{ ...primaryBtn, width: '100%' }} className={primaryClass} disabled={busy}>
            {busy ? 'Unlocking…' : 'Unlock'}
          </button>
        </form>
      )}
    </Card>
  );
}

function AccountBar({ address, balance, onLock }: { address: string; balance: string; onLock: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch { /* ignore */ }
  };

  return (
    <div className="dash-card dash-account-bar" style={{
      background: BG_CARD,
      border: `1px solid ${BORDER}`,
      padding: '16px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 18,
      flexWrap: 'wrap',
      animationDelay: '0ms',
    }}>
      {/* Connection indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="dash-pulse-dot" style={{ width: 8, height: 8, background: GREEN, borderRadius: '50%', display: 'inline-block', boxShadow: `0 0 8px ${GREEN}` }} />
        <span style={{ fontSize: 10, color: TEXT_FAINT, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.10em' }}>connected</span>
      </div>

      {/* Address with explicit copy button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <code
          title={address}
          style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: TEXT,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}
        >{shortAddress(address)}</code>
        <button
          onClick={copy}
          aria-label="Copy address"
          title={copied ? 'Copied!' : 'Copy address'}
          className={ghostClass}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            height: 28, padding: '0 10px',
            background: copied ? 'rgba(125,239,177,0.08)' : 'transparent',
            border: `1px solid ${copied ? 'rgba(125,239,177,0.35)' : BORDER}`,
            color: copied ? GREEN : TEXT_DIM,
            fontSize: 11,
            fontFamily: 'JetBrains Mono, monospace',
            cursor: 'pointer',
          }}
        >
          {copied ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
          <span>{copied ? 'copied' : 'copy'}</span>
        </button>
      </div>

      {/* Balance + actions on the right */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 10, color: TEXT_FAINT, textTransform: 'uppercase', letterSpacing: '0.08em' }}>balance</span>
          <span style={{ fontSize: 16, color: LILAC, fontWeight: 500 }}>{balance}</span>
          <span style={{ fontSize: 11, color: TEXT_FAINT }}>tokens</span>
        </div>
        <a
          href={EXPLORER_BASE + address}
          target="_blank"
          rel="noreferrer"
          aria-label="View on explorer"
          title="View on chainscan"
          className={ghostClass}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 28, padding: '0 10px', fontSize: 11, textDecoration: 'none', color: TEXT_DIM, border: `1px solid ${BORDER}`, fontFamily: 'JetBrains Mono, monospace' }}
        >
          <ExternalIcon size={11} />
          <span>view</span>
        </a>
        <button
          onClick={onLock}
          aria-label="Lock wallet"
          title="Lock wallet"
          className={ghostClass}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 28, padding: '0 10px', fontSize: 11, color: TEXT_DIM, border: `1px solid ${BORDER}`, background: 'transparent', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace' }}
        >
          <LockIcon size={11} />
          <span>lock</span>
        </button>
      </div>
    </div>
  );
}

// ─── Tab strip ────────────────────────────────────────────────────────

type TabId = 'ask' | 'identity' | 'email' | 'phone' | 'memory';

const TABS: { id: TabId; label: string; icon: ReactNode; cost?: string }[] = [
  { id: 'ask',      label: 'Ask AI',        icon: <BrainIcon    size={14} />, cost: '$0.10' },
  { id: 'identity', label: 'Identity',      icon: <IdentityIcon size={14} />, cost: '$0.50' },
  { id: 'email',    label: 'Email',         icon: <EmailIcon    size={14} />, cost: 'from $0.02' },
  { id: 'phone',    label: 'Phone & SMS',   icon: <PhoneIcon    size={14} /> },
  { id: 'memory',   label: 'Memory',        icon: <DatabaseIcon size={14} />, cost: 'free' },
];

function TabStrip({ active, onChange }: { active: TabId; onChange: (id: TabId) => void }) {
  return (
    <div
      role="tablist"
      className="dash-tab-strip"
      style={{
        display: 'flex',
        gap: 4,
        marginBottom: 18,
        padding: 6,
        background: BG_CARD,
        border: `1px solid ${BORDER}`,
        overflowX: 'auto',
        scrollbarWidth: 'none',
      }}
    >
      {TABS.map(t => {
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.id)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 16px',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 12,
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: isActive ? TEXT : TEXT_FAINT,
              background: isActive ? 'rgba(0,229,255,0.12)' : 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'background 0.18s ease, color 0.18s ease',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              borderBottom: isActive ? `2px solid ${LILAC}` : '2px solid transparent',
            }}
          >
            <span style={{ display: 'inline-flex', color: isActive ? LILAC : TEXT_FAINT }}>{t.icon}</span>
            <span>{t.label}</span>
            {t.cost && (
              <span style={{ marginLeft: 6, fontSize: 9, color: isActive ? LILAC : TEXT_GHOST, fontWeight: 400 }}>
                {t.cost}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Identity card ────────────────────────────────────────────────────

function IdentityCard({ client }: { client: AgentClient }) {
  const [state, setState] = useState<PaymentStatus>({ kind: 'idle' });
  const [identity, setIdentity] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const r = await client.free('GET', '/identity/' + client.address);
        if (!cancel && r?.tokenId) setIdentity(r);
      } catch { /* no identity yet */ }
      finally { if (!cancel) setLoaded(true); }
    })();
    return () => { cancel = true; };
  }, [client.address]);

  const mint = async () => {
    try {
      const r = await client.paid('POST', '/identity/mint', {}, setState);
      setIdentity(r);
      setTimeout(() => setState({ kind: 'idle' }), 2500);
    } catch { /* error already in state */ }
  };

  return (
    <Card
      kicker="ON-CHAIN ID"
      title="Identity NFT"
      badge={identity ? <LiveBadge label="minted" /> : undefined}
      sub={identity
        ? <>Your agent NFT is on-chain. Permanent identity.</>
        : <>Mint an identity NFT that proves you are <em>this agent</em>. One per wallet.</>
      }
    >
      {!loaded ? (
        <div style={{ fontSize: 12, color: TEXT_FAINT, fontFamily: 'JetBrains Mono, monospace' }}>checking…</div>
      ) : identity ? (
        <div className="dash-result-in">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
            <div>
              <div style={{ color: TEXT_FAINT, fontSize: 11, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Token ID</div>
              <div style={{ color: LILAC, fontSize: 28, fontWeight: 600 }}>#{identity.tokenId}</div>
            </div>
            <div>
              <div style={{ color: TEXT_FAINT, fontSize: 11, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Resources</div>
              <div style={{ color: TEXT, fontSize: 28, fontWeight: 600 }}>{identity.resourceCount ?? 0}</div>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <a href={`/agent/${client.address}`} style={{ ...ghostBtn, height: 32, fontSize: 11, textDecoration: 'none' }} className={ghostClass}>view public profile →</a>
          </div>
        </div>
      ) : (
        <button style={{ ...primaryBtn, width: '100%' }} className={primaryClass} onClick={mint} disabled={state.kind !== 'idle' && state.kind !== 'error' && state.kind !== 'success'}>
          {state.kind === 'idle' || state.kind === 'error' || state.kind === 'success' ? 'Mint identity ($0.50 USDC)' : 'Minting…'}
        </button>
      )}
      <ProgressLine status={state} />
    </Card>
  );
}

// ─── Email card ───────────────────────────────────────────────────────

function EmailCard({ client }: { client: AgentClient }) {
  const [inboxes, setInboxes] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState('');
  const [provState, setProvState] = useState<PaymentStatus>({ kind: 'idle' });
  const [selected, setSelected] = useState<string | null>(null);
  const [showProvisionForm, setShowProvisionForm] = useState(false);

  // Load inboxes from the dedicated DB-backed endpoint. This returns the
  // UUID `id` that /email/:id/send and /email/:id/inbox both expect.
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const r = await client.free<any>('GET', '/email/by-owner/' + client.address);
        const emails = (r?.inboxes || []).map((row: any) => ({ id: row.id, address: row.address }));
        if (!cancel) setInboxes(emails);
      } catch { /* no inboxes */ }
      finally { if (!cancel) setLoaded(true); }
    })();
  }, [client.address]);

  const provision = async () => {
    if (!name.trim()) { setProvState({ kind: 'error', message: 'Pick a name first' }); return; }
    try {
      const r = await client.paid<any>('POST', '/email/provision', { name: name.trim() }, setProvState);
      setInboxes(p => [...p, { id: r.id, address: r.address }]);
      setName('');
      setShowProvisionForm(false);
      setTimeout(() => setProvState({ kind: 'idle' }), 2500);
    } catch { /* error in state */ }
  };

  const subText = inboxes.length > 0
    ? <>{inboxes.length} inbox{inboxes.length === 1 ? '' : 'es'} owned by your wallet.</>
    : <>Real <code style={{ color: LILAC }}>&lt;name&gt;@0gent.xyz</code> inbox you own. Send & receive on-chain.</>;

  return (
    <Card
      kicker="MESSAGING"
      title="Email"
      badge={inboxes.length > 0 ? <LiveBadge label={`${inboxes.length} owned`} /> : undefined}
      sub={subText}
    >
      {!loaded ? (
        <div style={{ fontSize: 12, color: TEXT_FAINT, fontFamily: 'JetBrains Mono, monospace' }}>checking…</div>
      ) : (
        <>
          {/* Inbox list — click row to expand send form inline */}
          {inboxes.length > 0 && (
            <div style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
              {inboxes.map(i => {
                const open = selected === i.id;
                return (
                  <div key={i.id}>
                    <div
                      className="dash-row"
                      onClick={() => setSelected(open ? null : i.id)}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 14px', border: `1px solid ${open ? BORDER_HOVER : BORDER}`,
                        background: open ? 'rgba(0,229,255,0.05)' : BG_INPUT,
                        fontFamily: 'JetBrains Mono, monospace', fontSize: 13,
                        cursor: 'pointer',
                      }}
                    >
                      <code style={{ color: LILAC, wordBreak: 'break-all', flex: 1, minWidth: 0 }}>{i.address}</code>
                      <span style={{ fontSize: 10, color: TEXT_FAINT, marginLeft: 8 }}>
                        {open ? '▾ close' : '▸ send'}
                      </span>
                    </div>
                    {open && <InboxActions client={client} inboxId={i.id} />}
                  </div>
                );
              })}
            </div>
          )}

          {/* New inbox — collapsed by default, expands inline */}
          {!showProvisionForm ? (
            <button
              onClick={() => setShowProvisionForm(true)}
              style={{
                ...ghostBtn,
                width: '100%',
                fontFamily: 'JetBrains Mono, monospace',
                color: LILAC,
                borderStyle: 'dashed',
              }}
              className={ghostClass}
            >
              + provision a new inbox · $2.00 USDC
            </button>
          ) : (
            <div className="dash-result-in" style={{ padding: 14, border: `1px solid ${BORDER_HOVER}`, background: 'rgba(0,229,255,0.04)' }}>
              <Label
                action={
                  <button
                    onClick={() => { setShowProvisionForm(false); setName(''); setProvState({ kind: 'idle' }); }}
                    style={{ background: 'transparent', border: 'none', color: TEXT_FAINT, cursor: 'pointer', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
                  >cancel ✕</button>
                }
              >New inbox name</Label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  style={{ ...baseInput, flex: 1 }}
                  className={inputClass}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="alice  →  alice@0gent.xyz"
                  autoFocus
                />
                <button
                  style={{ ...primaryBtn, whiteSpace: 'nowrap' }}
                  className={primaryClass}
                  onClick={provision}
                  disabled={!name.trim() || (provState.kind !== 'idle' && provState.kind !== 'error' && provState.kind !== 'success')}
                >Pay $2.00 USDC</button>
              </div>
              <ProgressLine status={provState} />
            </div>
          )}
        </>
      )}
    </Card>
  );
}

function InboxActions({ client, inboxId }: { client: AgentClient; inboxId: string }) {
  const [mode, setMode] = useState<'send' | 'read'>('send');

  return (
    <div className="dash-result-in" style={{ marginTop: 8, padding: 14, border: `1px solid ${BORDER_HOVER}`, background: 'rgba(0,229,255,0.04)' }}>
      {/* Sub-tabs: Send vs Read */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
        <button
          onClick={() => setMode('send')}
          className={ghostClass}
          style={{
            ...ghostBtn,
            height: 30, padding: '0 14px', fontSize: 11,
            color: mode === 'send' ? LILAC : TEXT_DIM,
            borderColor: mode === 'send' ? BORDER_HOVER : BORDER,
            background: mode === 'send' ? 'rgba(0,229,255,0.08)' : 'transparent',
          }}
        >Send · $0.08 USDC</button>
        <button
          onClick={() => setMode('read')}
          className={ghostClass}
          style={{
            ...ghostBtn,
            height: 30, padding: '0 14px', fontSize: 11,
            color: mode === 'read' ? LILAC : TEXT_DIM,
            borderColor: mode === 'read' ? BORDER_HOVER : BORDER,
            background: mode === 'read' ? 'rgba(0,229,255,0.08)' : 'transparent',
          }}
        >Inbox · $0.02 USDC</button>
      </div>

      {mode === 'send' ? <SendEmail client={client} inboxId={inboxId} /> : <ReadInbox client={client} inboxId={inboxId} />}
    </div>
  );
}

function SendEmail({ client, inboxId }: { client: AgentClient; inboxId: string }) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [state, setState] = useState<PaymentStatus>({ kind: 'idle' });

  const send = async () => {
    if (!to || !body) { setState({ kind: 'error', message: '`to` and `body` are required' }); return; }
    try {
      await client.paid('POST', `/email/${inboxId}/send`, { to, subject, body }, setState);
      setTo(''); setSubject(''); setBody('');
      setTimeout(() => setState({ kind: 'idle' }), 2500);
    } catch { /* */ }
  };

  return (
    <div>
      <div style={{ display: 'grid', gap: 8 }}>
        <input style={baseInput} className={inputClass} value={to} onChange={e => setTo(e.target.value)} placeholder="to · user@example.com" autoFocus />
        <input style={baseInput} className={inputClass} value={subject} onChange={e => setSubject(e.target.value)} placeholder="subject (optional)" />
        <textarea style={{ ...baseInput, fontFamily: 'inherit', minHeight: 70, resize: 'vertical' }} className={inputClass} value={body} onChange={e => setBody(e.target.value)} placeholder="body" />
        <button style={primaryBtn} className={primaryClass} onClick={send} disabled={!to || !body || (state.kind !== 'idle' && state.kind !== 'error' && state.kind !== 'success')}>
          Send · $0.08 USDC
        </button>
      </div>
      <ProgressLine status={state} />
    </div>
  );
}

// Field names match what /email/:id/inbox actually returns. The backend
// service maps DB columns (from_address, to_address, body_text) to a flatter
// API shape (from, to, body) — so we read the API shape here, not the DB one.
interface InboundMessage {
  id: string;
  direction: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  timestamp: string;
}

function ReadInbox({ client, inboxId }: { client: AgentClient; inboxId: string }) {
  const [state, setState] = useState<PaymentStatus>({ kind: 'idle' });
  const [messages, setMessages] = useState<InboundMessage[] | null>(null);
  const [opened, setOpened] = useState<string | null>(null);

  const load = async () => {
    try {
      const r = await client.paid<{ messages: InboundMessage[] }>('GET', `/email/${inboxId}/inbox`, undefined, setState);
      setMessages(r?.messages || []);
      setTimeout(() => setState({ kind: 'idle' }), 1500);
    } catch { /* error in state */ }
  };

  if (messages === null) {
    return (
      <div>
        <div style={{ fontSize: 12.5, color: TEXT_DIM, lineHeight: 1.6, marginBottom: 12 }}>
          Reading the inbox costs $0.02 USDC. You'll see all messages — both ones you've sent and any inbound replies your inbox has received.
        </div>
        <button style={primaryBtn} className={primaryClass} onClick={load} disabled={state.kind !== 'idle' && state.kind !== 'error' && state.kind !== 'success'}>
          Pay $0.02 USDC to read
        </button>
        <ProgressLine status={state} />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div style={{ fontSize: 13, color: TEXT_DIM, padding: '8px 0' }}>
        No messages in this inbox yet.{' '}
        <button onClick={load} style={{ background: 'transparent', border: 'none', color: LILAC, cursor: 'pointer', textDecoration: 'underline', fontSize: 12, padding: 0 }}>
          Refresh ($0.02 USDC)
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: TEXT_FAINT, fontFamily: 'JetBrains Mono, monospace' }}>
          {messages.length} message{messages.length === 1 ? '' : 's'}
        </span>
        <button
          onClick={() => { setMessages(null); setOpened(null); }}
          className={ghostClass}
          style={{ ...ghostBtn, height: 26, padding: '0 10px', fontSize: 10 }}
        >refresh ↻</button>
      </div>
      <div style={{ display: 'grid', gap: 6 }}>
        {messages.map(m => {
          const isOpen = opened === m.id;
          const isInbound = m.direction === 'inbound';
          return (
            <div key={m.id}>
              <div
                onClick={() => setOpened(isOpen ? null : m.id)}
                className="dash-row"
                style={{
                  padding: '10px 12px',
                  background: BG_INPUT,
                  border: `1px solid ${isOpen ? BORDER_HOVER : BORDER}`,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    fontSize: 9, color: isInbound ? GREEN : LILAC, fontWeight: 600,
                    letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0,
                    minWidth: 36,
                  }}>{isInbound ? '← in' : 'out →'}</span>
                  <code style={{ color: TEXT, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {isInbound ? m.from : m.to}
                  </code>
                  <span style={{ color: TEXT_FAINT, fontSize: 11, flexShrink: 0 }}>
                    {new Date(m.timestamp).toLocaleDateString()}
                  </span>
                </div>
                {m.subject && (
                  <div style={{ fontSize: 12, color: TEXT_DIM, marginTop: 4, marginLeft: 46, fontFamily: 'inherit', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.subject}
                  </div>
                )}
              </div>
              {isOpen && (
                <div className="dash-result-in" style={{
                  padding: 14,
                  background: BG_INPUT,
                  border: `1px solid ${BORDER_HOVER}`,
                  borderTop: 'none',
                  fontSize: 13,
                  color: TEXT_DIM,
                  lineHeight: 1.7,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {m.body || <span style={{ color: TEXT_GHOST, fontStyle: 'italic' }}>(no plain-text body)</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Phone card (read-only — operator-side, not user-purchasable) ────
//
// Buying a Telnyx number costs $1 of operator USD; we don't expose that to
// dashboard users. Card shows the capability is real and live (with the
// existing operator-owned number as proof), and points to the CLI for
// devs who want to actually provision.

function PhoneCard() {
  // The number we proved end-to-end during the hackathon. Keep this in sync
  // with the actual operator-owned number; pulling from the API would also
  // work but a static label avoids 1 round-trip on every dashboard load.
  const operatorNumber = '+1 (816) 496-1100';

  return (
    <Card
      kicker="04"
      title="Phone & SMS"
      badge={<LiveBadge />}
      sub={<>Real US phone numbers via <strong style={{ color: TEXT }}>Telnyx</strong>. The agent owns the number, sends real SMS. Verified end-to-end at the operator level.</>}
    >
      <div style={{
        padding: '14px 16px', marginBottom: 14,
        background: BG_INPUT, border: `1px solid ${BORDER}`,
        position: 'relative', overflow: 'hidden',
      }}>
        <div className="dash-live-stripe" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2 }} />
        <div style={{ fontSize: 10, color: TEXT_FAINT, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>
          Operator-side number
        </div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18, color: LILAC, fontWeight: 500 }}>
          {operatorNumber}
        </div>
        <div style={{ fontSize: 11, color: TEXT_FAINT, marginTop: 6, fontFamily: 'JetBrains Mono, monospace' }}>
          Kansas City, US · resource #11 on-chain
        </div>
      </div>

      <div style={{
        padding: '12px 14px', marginBottom: 14,
        border: `1px dashed ${BORDER}`,
        fontSize: 12, color: TEXT_DIM, lineHeight: 1.6,
      }}>
        <strong style={{ color: TEXT }}>Why no Buy button?</strong> Each phone number costs ~$2 of real USD on the operator account, so we can't auto-front it for every dashboard user. Provisioning is available for devs through the CLI:
      </div>

      <code
        onClick={async () => {
          try { await navigator.clipboard.writeText('npx @0gent/core phone provision --country US -y'); } catch {}
        }}
        title="click to copy"
        style={{
          display: 'block', cursor: 'pointer',
          padding: '10px 12px', background: BG_INPUT, border: `1px solid ${BORDER}`,
          fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: TEXT,
          wordBreak: 'break-all',
        }}
        className="dash-row"
      >
        npx @0gent/core phone provision --country US -y
      </code>

      <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <a href="/docs#http-api" style={{ ...ghostBtn, height: 32, fontSize: 11, textDecoration: 'none' }} className={ghostClass}>
          Read the docs →
        </a>
        <a href="https://www.npmjs.com/package/@0gent/core" target="_blank" rel="noreferrer" style={{ ...ghostBtn, height: 32, fontSize: 11, textDecoration: 'none' }} className={ghostClass}>
          npm @0gent/core ↗
        </a>
      </div>
    </Card>
  );
}

// ─── AI inference card ────────────────────────────────────────────────

function ComputeCard({ client }: { client: AgentClient }) {
  const [prompt, setPrompt] = useState('');
  const [reply, setReply] = useState<{ text: string; model?: string; tokens?: number } | null>(null);
  const [state, setState] = useState<PaymentStatus>({ kind: 'idle' });

  const ask = async () => {
    if (!prompt.trim()) return;
    setReply(null);
    try {
      const r = await client.paid<any>('POST', '/compute/infer', { prompt: prompt.trim(), maxTokens: 200 }, setState);
      setReply({ text: r.response, model: r.model, tokens: r.usage?.totalTokens });
      setTimeout(() => setState({ kind: 'idle' }), 2500);
    } catch { /* */ }
  };

  return (
    <Card
      kicker="INFERENCE"
      title="Ask AI"
      badge={<LiveBadge />}
      sub={<>Pay-per-call LLM inference. Real on-chain micropayment, real model response.</>}
    >
      <textarea
        style={{ ...baseInput, fontFamily: 'inherit', minHeight: 80, resize: 'vertical', marginBottom: 10 }}
        className={inputClass}
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        placeholder="ask anything · 'why is 0G Chain interesting in one sentence?'"
      />
      <button
        style={{ ...primaryBtn, width: '100%' }}
        className={primaryClass}
        onClick={ask}
        disabled={!prompt.trim() || (state.kind !== 'idle' && state.kind !== 'error' && state.kind !== 'success')}
      >
        Ask · $0.10 USDC
      </button>
      {reply && (
        <div className="dash-result-in" style={{
          marginTop: 14, padding: 16,
          border: `1px solid ${BORDER}`, background: BG_INPUT,
          fontSize: 13, lineHeight: 1.75, color: TEXT,
        }}>
          <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{reply.text}</div>
          {(reply.model || reply.tokens) && (
            <div style={{ marginTop: 12, fontSize: 11, color: TEXT_FAINT, fontFamily: 'JetBrains Mono, monospace', display: 'flex', gap: 14 }}>
              {reply.model && <span>{reply.model}</span>}
              {reply.tokens && <span>{reply.tokens} tokens</span>}
            </div>
          )}
        </div>
      )}
      <ProgressLine status={state} />
    </Card>
  );
}

// ─── Memory card ──────────────────────────────────────────────────────

function MemoryCard({ client }: { client: AgentClient }) {
  const [keys, setKeys]   = useState<{ key: string; rootHash: string; updatedAt: string }[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [k, setK] = useState('');
  const [v, setV] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [readResult, setReadResult] = useState<{ key: string; value: any } | null>(null);

  const refresh = async () => {
    try {
      const r = await client.free<any>('GET', '/memory/' + client.address);
      setKeys(r?.keys || []);
    } catch { /* none */ }
    finally { setLoaded(true); }
  };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [client.address]);

  const write = async () => {
    if (!k.trim()) { setErr('key required'); return; }
    setErr(''); setBusy(true);
    try {
      let value: any = v;
      try { value = JSON.parse(v); } catch { /* keep as string */ }
      await client.free('POST', '/memory/' + client.address, { key: k.trim(), value });
      setK(''); setV('');
      await refresh();
    } catch (e: any) {
      setErr(e?.message || 'failed');
    } finally { setBusy(false); }
  };

  const readKey = async (key: string) => {
    try {
      const r = await client.free<any>('GET', '/memory/' + client.address + '?key=' + encodeURIComponent(key));
      setReadResult({ key, value: r?.value });
    } catch (e: any) {
      setErr(e?.message || 'failed');
    }
  };

  return (
    <Card
      kicker="STORAGE"
      title="Memory"
      badge={keys.length > 0 ? <LiveBadge label={`${keys.length} keys`} /> : undefined}
      sub={<>Persistent key/value storage. Free reads + writes.</>}
    >
      {!loaded ? (
        <div style={{ fontSize: 12, color: TEXT_FAINT, fontFamily: 'JetBrains Mono, monospace' }}>checking…</div>
      ) : (
        <>
          {keys.length > 0 && (
            <div style={{ display: 'grid', gap: 6, marginBottom: 14 }}>
              {keys.map(item => (
                <div
                  key={item.key}
                  className="dash-row"
                  onClick={() => readKey(item.key)}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
                    padding: '10px 14px', border: `1px solid ${BORDER}`, background: BG_INPUT,
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  <code style={{ color: LILAC, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.key}</code>
                  <span style={{ fontSize: 10, color: TEXT_FAINT }}>▸ read</span>
                </div>
              ))}
            </div>
          )}
          {readResult && (
            <div className="dash-result-in" style={{
              marginBottom: 14, padding: 14,
              border: `1px solid ${BORDER_HOVER}`, background: 'rgba(0,229,255,0.04)',
              fontSize: 12, fontFamily: 'JetBrains Mono, monospace',
            }}>
              <div style={{ color: LILAC, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                {readResult.key}
              </div>
              <pre style={{ color: TEXT, whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, lineHeight: 1.6 }}>
                {typeof readResult.value === 'string' ? readResult.value : JSON.stringify(readResult.value, null, 2)}
              </pre>
            </div>
          )}
          <div style={{ display: 'grid', gap: 8 }}>
            <input style={baseInput} className={inputClass} value={k} onChange={e => setK(e.target.value)} placeholder="key · last_message" />
            <textarea style={{ ...baseInput, minHeight: 60, resize: 'vertical' }} className={inputClass} value={v} onChange={e => setV(e.target.value)} placeholder='value · "hello" or {"json": true}' />
            <button style={{ ...primaryBtn, width: '100%' }} className={primaryClass} onClick={write} disabled={busy || !k.trim()}>
              {busy ? 'Saving…' : 'Save · free'}
            </button>
            {err && <div style={{ color: RED, fontSize: 12 }}>{err}</div>}
          </div>
        </>
      )}
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────

export function Dashboard() {
  const wallet = useWallet();
  const [tab, setTab] = useState<TabId>('ask');

  // Fund / faucet hint when balance == 0
  const showFaucet = wallet.state.kind === 'unlocked' && wallet.balance && Number(wallet.balance.zg) === 0;

  // Build the agent client only when unlocked
  const client = useMemo<AgentClient | null>(() => {
    if (wallet.state.kind !== 'unlocked') return null;
    return createAgentClient(wallet.state.wallet.privateKey);
  }, [wallet.state.kind === 'unlocked' ? wallet.state.wallet.privateKey : null]);

  return (
    <div style={{ background: BG_PAGE, color: TEXT, minHeight: '100vh' }}>
      <Nav />

      <div className="page-wrap" style={{ maxWidth: 980, margin: '0 auto', padding: '120px 16px 48px' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: LILAC, marginBottom: 12, fontFamily: 'JetBrains Mono, monospace' }}>
            Dashboard
          </div>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1.05, marginBottom: 14 }}>
            {wallet.state.kind === 'unlocked' ? <>Welcome back, agent.</> : <>Become an agent.</>}
          </h1>
          <p style={{ fontSize: 15, color: TEXT_DIM, lineHeight: 1.7, maxWidth: 640 }}>
            {wallet.state.kind === 'unlocked'
              ? <>The same infrastructure your code-side agent uses, with buttons. Every action below is a real on-chain payment.</>
              : <>Generate a wallet, fund it with USDC on Celo, then mint an identity, claim an email, ask AI questions, and write to persistent memory — all paid on-chain.</>
            }
          </p>
        </div>

        {wallet.state.kind !== 'unlocked' ? (
          <div style={{ maxWidth: 520 }}>
            <WalletGate />
          </div>
        ) : (
          <>
            {/* Account bar — address + copy button + balance + actions */}
            <div style={{ marginBottom: 14 }}>
              <AccountBar
                address={wallet.state.wallet.address}
                balance={wallet.balance ? Number(wallet.balance.zg).toFixed(4) : '…'}
                onLock={wallet.lock}
              />
            </div>

            {/* Faucet alert when out of funds */}
            {showFaucet && (
              <div className="dash-result-in" style={{
                marginBottom: 18, padding: 14,
                border: '1px solid rgba(255,201,122,0.30)', background: 'rgba(255,201,122,0.06)',
                fontSize: 13, color: AMBER, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap',
              }}>
                <span>Your wallet is empty. Fund it with USDC on Celo to start.</span>
                <a href={FAUCET_URL} target="_blank" rel="noreferrer" style={{ ...primaryBtn, height: 32, fontSize: 12, padding: '0 14px', textDecoration: 'none' }} className={primaryClass}>
                  Open faucet ↗
                </a>
              </div>
            )}

            {/* Tab strip */}
            <TabStrip active={tab} onChange={setTab} />

            {/* Workspace — focused, full-width section per tab */}
            <div key={tab} className="dash-result-in">
              {tab === 'ask'      && client && <ComputeCard  client={client} />}
              {tab === 'identity' && client && <IdentityCard client={client} />}
              {tab === 'email'    && client && <EmailCard    client={client} />}
              {tab === 'phone'    &&             <PhoneCard />}
              {tab === 'memory'   && client && <MemoryCard   client={client} />}
            </div>
          </>
        )}

        {/* Footnote */}
        <div style={{ marginTop: 48, fontSize: 12, color: TEXT_GHOST, lineHeight: 1.7, fontFamily: 'JetBrains Mono, monospace', textAlign: 'center' }}>
          Live on-chain · all transactions visible at <a href="/stats" style={{ color: LILAC }}>0gent.xyz/stats</a>
        </div>
      </div>

      <Footer />
    </div>
  );
}
