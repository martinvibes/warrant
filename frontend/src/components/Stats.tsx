/**
 * /stats — public live metrics + full transaction log.
 *
 * Aggregates at top, per-service breakdown, full paginated transaction list.
 * Pulls from GET /stats and GET /stats/transactions on the live API.
 */

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Nav } from './Nav';
import { Footer } from './Footer';
import { LogoLockup } from './Logo';
import {
  IdentityIcon, EmailIcon, SendIcon, InboxIcon, ThreadIcon,
  PhoneIcon, SmsIcon, BrainIcon, ServerIcon, GlobeIcon, DatabaseIcon, PackageIcon,
  CloseIcon,
} from './Icons';

const API = (import.meta.env.VITE_API_URL as string) || 'https://api.0gent.xyz';

// ─── Tokens ───────────────────────────────────────────────────────────
const LILAC = '#00E5FF';
const TEXT = '#fefefe';
const TEXT_DIM = 'rgba(254,254,254,0.7)';
const TEXT_FAINT = 'rgba(254,254,254,0.5)';
const TEXT_GHOST = 'rgba(254,254,254,0.35)';
const BG_PAGE = '#050508';
const BG_CARD = '#0c0c14';
const BG_ROW = 'rgba(0,229,255,0.025)';
const BORDER = 'rgba(0,229,255,0.12)';
const BORDER_HOVER = 'rgba(0,229,255,0.30)';
const GREEN = '#7DEFB1';

// ─── Types ────────────────────────────────────────────────────────────
interface StatsResponse {
  headline: { wallets: number; resources: number; volume?: Record<string, number>; volume_0g?: number };
  totals: {
    transactions: number; wallets: number; volume?: Record<string, number>; volume_0g?: number;
    identities_minted: number; email_inboxes: number;
    emails_sent: number; emails_received: number;
    phone_numbers: number; sms_sent: number;
    inference_calls: number; memory_entries: number;
    total_resources: number;
  };
  last_24h: { transactions: number; wallets: number; volume?: Record<string, number>; volume_0g?: number };
  by_endpoint: Record<string, { count: number }>;
  updated_at: string;
}

interface Tx {
  payer: string;
  amount?: number; currency?: string; chain?: string; explorer?: string;
  amount_0g?: number;
  tx_hash: string | null;
  endpoint: string; timestamp: string; nonce?: string;
}

const ENDPOINT_META: Record<string, { label: string; icon: ReactNode; color: string }> = {
  identity:        { label: 'Identity NFT mint',  icon: <IdentityIcon size={14} color={LILAC} />,        color: LILAC },
  email:           { label: 'Email inbox',        icon: <EmailIcon    size={14} color="#7DEFB1" />,      color: '#7DEFB1' },
  'email-send':    { label: 'Email sent',         icon: <SendIcon     size={14} color="#7DEFB1" />,      color: '#7DEFB1' },
  'email-read':    { label: 'Email read',         icon: <InboxIcon    size={14} color="#7DEFB1" />,      color: '#7DEFB1' },
  'email-threads': { label: 'Email threads',      icon: <ThreadIcon   size={14} color="#7DEFB1" />,      color: '#7DEFB1' },
  phone:           { label: 'Phone number',       icon: <PhoneIcon    size={14} color="#FFC97A" />,      color: '#FFC97A' },
  sms:             { label: 'SMS sent',           icon: <SmsIcon      size={14} color="#FFC97A" />,      color: '#FFC97A' },
  'compute-infer': { label: 'AI inference',       icon: <BrainIcon    size={14} color="#4DD0E1" />,      color: '#4DD0E1' },
  compute:         { label: 'Compute VPS',        icon: <ServerIcon   size={14} color="#4DD0E1" />,      color: '#4DD0E1' },
  domain:          { label: 'Domain register',    icon: <GlobeIcon    size={14} color="#FFC97A" />,      color: '#FFC97A' },
};

// ─── Helpers ──────────────────────────────────────────────────────────
function shortAddr(a: string): string {
  if (!a) return '—';
  return a.slice(0, 6) + '…' + a.slice(-4);
}
function shortHash(h: string | null): string {
  if (!h) return '—';
  return h.slice(0, 10) + '…' + h.slice(-6);
}
function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return 'just now';
  const s = Math.floor(ms / 1000);
  if (s < 60)  return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
function fmtAmount(n: number): string {
  if (n === 0) return '0';
  if (n < 0.0001) return n.toExponential(1);
  if (n < 1) return n.toFixed(4);
  if (n < 100) return n.toFixed(2);
  return n.toFixed(0);
}

const CURRENCY_LABELS: Record<string, string> = { celo: 'USDC', '0g': '0G' };

function fmtVolume(vol?: Record<string, number>, fallback?: number): string {
  if (vol && typeof vol === 'object') {
    const parts: string[] = [];
    for (const [chain, amount] of Object.entries(vol)) {
      if (amount > 0) parts.push(`${fmtAmount(amount)} ${CURRENCY_LABELS[chain] || chain}`);
    }
    return parts.length > 0 ? parts.join(' + ') : '0';
  }
  if (typeof fallback === 'number') return `${fmtAmount(fallback)} 0G`;
  return '0';
}
function fmtN(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

// ─── Sub-components ───────────────────────────────────────────────────

function HeadlineCard({ value, label, sub }: { value: string; label: string; sub?: string }) {
  return (
    <div className="stats-headline-card" style={{
      background: BG_CARD, border: `1px solid ${BORDER}`, padding: '32px 28px',
      flex: '1 1 220px', minWidth: 0,
    }}>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 'clamp(36px, 5vw, 52px)', fontWeight: 600, color: LILAC, lineHeight: 1, letterSpacing: '-0.02em' }}>
        {value}
      </div>
      <div style={{ marginTop: 12, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: TEXT_FAINT, fontFamily: 'JetBrains Mono, monospace' }}>
        {label}
      </div>
      {sub && <div style={{ marginTop: 8, fontSize: 11, color: TEXT_GHOST, fontFamily: 'JetBrains Mono, monospace' }}>{sub}</div>}
    </div>
  );
}

function StatRow({ label, icon, value }: { label: string; icon?: ReactNode; value: string | number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderTop: `1px solid ${BORDER}`, gap: 12 }}>
      <div style={{ fontSize: 13, color: TEXT_DIM, display: 'flex', alignItems: 'center', gap: 10 }}>
        {icon && <span style={{ display: 'inline-flex', color: TEXT_FAINT }}>{icon}</span>}
        <span>{label}</span>
      </div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, color: TEXT, fontWeight: 500 }}>{value}</div>
    </div>
  );
}

function TxRow({ tx, idx }: { tx: Tx; idx: number }) {
  const meta = ENDPOINT_META[tx.endpoint] || { label: tx.endpoint, icon: <PackageIcon size={14} color={LILAC} />, color: LILAC };
  const base = tx.explorer || 'https://chainscan.0g.ai';
  const explorerTx = base + '/tx/';
  const explorerAddr = base + '/address/';
  const rowStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'minmax(140px,1.2fr) minmax(140px,1fr) minmax(110px,0.9fr) minmax(180px,1.1fr) minmax(120px,0.9fr)',
    gap: 12, alignItems: 'center', padding: '12px 16px',
    background: idx % 2 === 0 ? BG_ROW : 'transparent',
    fontSize: 12.5, fontFamily: 'JetBrains Mono, monospace',
  };
  const prefix = (label: string) => (
    <span className="stats-tx-prefix" style={{
      display: 'none',
      fontSize: 9, color: 'rgba(254,254,254,0.30)',
      fontFamily: 'JetBrains Mono, monospace',
      textTransform: 'uppercase', letterSpacing: '0.10em',
      marginRight: 6,
    }}>{label}</span>
  );

  return (
    <div style={rowStyle} className="stats-tx-row">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: meta.color, minWidth: 0 }}>
        <span style={{ display: 'inline-flex', flexShrink: 0 }}>{meta.icon}</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meta.label}</span>
      </div>
      <div>
        {prefix('Payer')}
        <a href={explorerAddr + tx.payer} target="_blank" rel="noreferrer" style={{ color: TEXT, textDecoration: 'none' }}
           onMouseEnter={e => { e.currentTarget.style.color = LILAC; }}
           onMouseLeave={e => { e.currentTarget.style.color = TEXT; }}
        >{shortAddr(tx.payer)}</a>
      </div>
      <div style={{ color: LILAC }}>{fmtAmount(tx.amount ?? tx.amount_0g ?? 0)} {tx.currency || '0G'}</div>
      <div>
        {prefix('Tx')}
        {tx.tx_hash ? (
          <a href={explorerTx + tx.tx_hash} target="_blank" rel="noreferrer" style={{ color: TEXT_FAINT, textDecoration: 'none' }}
             onMouseEnter={e => { e.currentTarget.style.color = LILAC; }}
             onMouseLeave={e => { e.currentTarget.style.color = TEXT_FAINT; }}
          >{shortHash(tx.tx_hash)} ↗</a>
        ) : (
          <span style={{ color: TEXT_GHOST }}>—</span>
        )}
      </div>
      <div style={{ color: TEXT_GHOST, textAlign: 'right' }}>{timeAgo(tx.timestamp)}</div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────

const INLINE_TX_LIMIT = 30;

export function Stats() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [recentTxs, setRecentTxs] = useState<Tx[]>([]);
  const [recentTotal, setRecentTotal] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Aggregates — fetch once on mount, then poll every 30s
  useEffect(() => {
    let cancelled = false;
    const fetchStats = async () => {
      try {
        const r = await fetch(API + '/stats');
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const d = await r.json();
        if (!cancelled) setStats(d);
      } catch (e: any) {
        if (!cancelled) setErrorMsg(e.message || 'failed to load stats');
      }
    };
    fetchStats();
    const id = setInterval(fetchStats, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Recent transactions — fetch first 30 once, refresh every 30s
  useEffect(() => {
    let cancelled = false;
    const fetchRecent = async () => {
      try {
        const r = await fetch(API + `/stats/transactions?limit=${INLINE_TX_LIMIT}&offset=0`);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const d = await r.json();
        if (!cancelled) {
          setRecentTxs(d.transactions || []);
          setRecentTotal(d.pagination?.total ?? 0);
        }
      } catch (e: any) {
        if (!cancelled) setErrorMsg(e.message || 'failed to load transactions');
      }
    };
    fetchRecent();
    const id = setInterval(fetchRecent, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const hasMore = recentTotal > recentTxs.length;

  return (
    <div style={{ background: BG_PAGE, color: TEXT, minHeight: '100vh' }}>
      <Nav />

      <div className="page-wrap" style={{ maxWidth: 1100, margin: '0 auto', padding: '120px 24px 40px' }}>

        {/* ── Header ───────────────────────────── */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ marginBottom: 32 }}>
            <LogoLockup size={28} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
            <span className="pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: GREEN, display: 'inline-block', boxShadow: `0 0 8px ${GREEN}` }} />
            <span style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: GREEN, fontFamily: 'JetBrains Mono, monospace' }}>
              live · {stats ? 'updated ' + timeAgo(stats.updated_at) : 'connecting…'}
            </span>
          </div>
          <h1 style={{ fontSize: 'clamp(36px, 5.5vw, 56px)', fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1.05, marginBottom: 16 }}>
            What agents have done on 0GENT.
          </h1>
          <p style={{ fontSize: 17, color: TEXT_DIM, lineHeight: 1.7, maxWidth: 640 }}>
            Every paid endpoint settles a real on-chain transaction. These numbers are aggregated from the payment log — verifiable on{' '}
            <a href="https://celoscan.io" target="_blank" rel="noreferrer" style={{ color: LILAC, textDecoration: 'underline' }}>Celoscan</a>{' '}and{' '}
            <a href="https://chainscan.0g.ai" target="_blank" rel="noreferrer" style={{ color: LILAC, textDecoration: 'underline' }}>0G Chainscan</a>.
          </p>
        </div>

        {errorMsg && (
          <div style={{ background: 'rgba(248,81,73,0.06)', border: '1px solid rgba(248,81,73,0.25)', color: '#f85149', padding: '12px 16px', marginBottom: 24, fontSize: 13 }}>
            {errorMsg}
          </div>
        )}

        {/* ── Headline counters (3 big numbers) ─ */}
        <div className="stats-headlines" style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 32 }}>
          <HeadlineCard
            value={stats ? fmtN(stats.headline.wallets) : '…'}
            label="Wallets"
            sub={stats ? `${stats.last_24h.wallets} active in last 24h` : ''}
          />
          <HeadlineCard
            value={stats ? fmtN(stats.headline.resources) : '…'}
            label="Resources on-chain"
            sub={stats ? `identities + emails + phones` : ''}
          />
          <HeadlineCard
            value={stats ? fmtVolume(stats.headline.volume, stats.headline.volume_0g) : '…'}
            label="Processed in payments"
            sub={stats ? `${fmtVolume(stats.last_24h.volume, stats.last_24h.volume_0g)} in last 24h` : ''}
          />
        </div>

        {/* ── Detailed totals ─────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: 40 }}>
          <div style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
            <div style={{ padding: '14px 18px', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: LILAC, fontFamily: 'JetBrains Mono, monospace' }}>
              All-time totals
            </div>
            <StatRow label="Total transactions"  value={stats ? fmtN(stats.totals.transactions) : '…'} />
            <StatRow label="Unique wallets"      value={stats ? fmtN(stats.totals.wallets)      : '…'} />
            <StatRow label="Volume processed" value={stats ? fmtVolume(stats.totals.volume, stats.totals.volume_0g) : '…'} />
            <StatRow label="Total resources"     value={stats ? fmtN(stats.totals.total_resources) : '…'} />
          </div>

          <div style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
            <div style={{ padding: '14px 18px', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: LILAC, fontFamily: 'JetBrains Mono, monospace' }}>
              By service
            </div>
            <StatRow icon={<IdentityIcon size={14} />} label="Identity NFTs minted" value={stats ? fmtN(stats.totals.identities_minted) : '…'} />
            <StatRow icon={<EmailIcon    size={14} />} label="Email inboxes"        value={stats ? fmtN(stats.totals.email_inboxes)     : '…'} />
            <StatRow icon={<SendIcon     size={14} />} label="Emails sent"          value={stats ? fmtN(stats.totals.emails_sent)       : '…'} />
            <StatRow icon={<InboxIcon    size={14} />} label="Emails received"      value={stats ? fmtN(stats.totals.emails_received)   : '…'} />
            <StatRow icon={<PhoneIcon    size={14} />} label="Phone numbers"        value={stats ? fmtN(stats.totals.phone_numbers)     : '…'} />
            <StatRow icon={<SmsIcon      size={14} />} label="SMS sent"             value={stats ? fmtN(stats.totals.sms_sent)          : '…'} />
            <StatRow icon={<BrainIcon    size={14} />} label="AI inference calls"   value={stats ? fmtN(stats.totals.inference_calls)   : '…'} />
            <StatRow icon={<DatabaseIcon size={14} />} label="Memory entries"       value={stats ? fmtN(stats.totals.memory_entries)    : '…'} />
          </div>
        </div>

        {/* ── Transaction log (capped at 30 inline) ──────── */}
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: LILAC, fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>
              Recent transactions
            </div>
            <div style={{ fontSize: 22, fontWeight: 500 }}>Every paid call on 0GENT</div>
            <div style={{ fontSize: 13, color: TEXT_FAINT, marginTop: 4 }}>
              {stats ? `Showing latest ${Math.min(INLINE_TX_LIMIT, recentTotal)} of ${fmtN(recentTotal)} total` : 'loading…'}
            </div>
          </div>
          {hasMore && (
            <button
              onClick={() => setModalOpen(true)}
              className="dash-btn-ghost"
              style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
                padding: '10px 18px', cursor: 'pointer',
                border: `1px solid ${BORDER_HOVER}`, background: 'rgba(0,229,255,0.06)',
                color: LILAC, fontWeight: 500,
              }}
            >
              View all {fmtN(recentTotal)} →
            </button>
          )}
        </div>

        {/* Tx table — inline, no filter, no pagination */}
        <div className="stats-tx-scroll" style={{ marginBottom: 24 }}>
          <div style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
            {/* Header row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(140px,1.2fr) minmax(140px,1fr) minmax(110px,0.9fr) minmax(180px,1.1fr) minmax(120px,0.9fr)',
              gap: 12, padding: '12px 16px', borderBottom: `1px solid ${BORDER}`,
              fontSize: 10, letterSpacing: '0.10em', textTransform: 'uppercase', color: TEXT_FAINT, fontFamily: 'JetBrains Mono, monospace',
            }}>
              <div>Service</div><div>Payer</div><div>Amount</div><div>Tx hash</div><div style={{ textAlign: 'right' }}>When</div>
            </div>

            {recentTxs.length === 0 && !errorMsg ? (
              <div style={{ padding: 32, textAlign: 'center', color: TEXT_FAINT, fontSize: 13 }}>Loading transactions…</div>
            ) : recentTxs.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: TEXT_FAINT, fontSize: 13 }}>
                No transactions yet — be the first to use 0GENT!
              </div>
            ) : (
              recentTxs.map((tx, i) => <TxRow key={(tx.nonce || tx.tx_hash || i) + ''} tx={tx} idx={i} />)
            )}
          </div>
        </div>

        {/* "View all" CTA — also at the bottom of the list, for mobile reach */}
        {hasMore && (
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <button
              onClick={() => setModalOpen(true)}
              className="dash-btn-ghost"
              style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
                padding: '12px 22px', cursor: 'pointer',
                border: `1px solid ${BORDER_HOVER}`, background: 'rgba(0,229,255,0.04)',
                color: LILAC, fontWeight: 500,
              }}
            >
              Browse all {fmtN(recentTotal)} transactions →
            </button>
          </div>
        )}

      </div>

      <TransactionsModal open={modalOpen} onClose={() => setModalOpen(false)} />

      <Footer />
    </div>
  );
}

// ─── Modal: full paginated + filterable transaction list ──────────────

function TransactionsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [txs, setTxs] = useState<Tx[]>([]);
  const [pagination, setPagination] = useState<{ total: number; limit: number; offset: number; has_more: boolean }>({ total: 0, limit: 50, offset: 0, has_more: false });
  const [filter, setFilter] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const fetchTxs = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('limit', String(pagination.limit));
        params.set('offset', String(pagination.offset));
        if (filter) params.set('endpoint', filter);
        const r = await fetch(API + '/stats/transactions?' + params.toString());
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const d = await r.json();
        if (!cancelled) {
          setTxs(d.transactions || []);
          setPagination(p => ({ ...p, total: d.pagination?.total ?? 0, has_more: d.pagination?.has_more ?? false }));
        }
      } catch { /* swallow — modal stays empty */ }
      finally { if (!cancelled) setLoading(false); }
    };
    fetchTxs();
    return () => { cancelled = true; };
  }, [open, pagination.offset, pagination.limit, filter]);

  // Esc to close + lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      className="stats-modal"
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(4px)',
        display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
        padding: '40px 16px',
        overflow: 'auto',
        animation: 'dashCardIn 0.25s ease-out',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: BG_PAGE,
          border: `1px solid ${BORDER}`,
          width: '100%',
          maxWidth: 1100,
          padding: '28px 24px',
        }}
      >
        {/* Modal header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, gap: 10, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: LILAC, fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>
              All transactions
            </div>
            <div style={{ fontSize: 18, fontWeight: 500 }}>
              {fmtN(pagination.total)} transaction{pagination.total === 1 ? '' : 's'}{filter ? ` · "${filter}"` : ''}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 36, height: 36, background: 'transparent', cursor: 'pointer',
              border: `1px solid ${BORDER}`, color: TEXT_DIM,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = TEXT; e.currentTarget.style.borderColor = BORDER_HOVER; }}
            onMouseLeave={e => { e.currentTarget.style.color = TEXT_DIM; e.currentTarget.style.borderColor = BORDER; }}
          >
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Filter pills */}
        <div className="stats-filter-row" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {([
            { v: '',              label: 'All',         icon: null },
            { v: 'identity',      label: 'Identity',    icon: <IdentityIcon size={12} /> },
            { v: 'email',         label: 'Email inbox', icon: <EmailIcon    size={12} /> },
            { v: 'email-send',    label: 'Email sent',  icon: <SendIcon     size={12} /> },
            { v: 'phone',         label: 'Phone',       icon: <PhoneIcon    size={12} /> },
            { v: 'sms',           label: 'SMS',         icon: <SmsIcon      size={12} /> },
            { v: 'compute-infer', label: 'AI',          icon: <BrainIcon    size={12} /> },
          ] as const).map(({ v, label, icon }) => {
            const active = filter === v;
            return (
              <button
                key={v}
                onClick={() => { setFilter(v); setPagination(p => ({ ...p, offset: 0 })); }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
                  padding: '6px 12px',
                  border: `1px solid ${active ? BORDER_HOVER : BORDER}`,
                  background: active ? 'rgba(0,229,255,0.10)' : 'transparent',
                  color: active ? LILAC : TEXT_DIM,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {icon && <span style={{ display: 'inline-flex' }}>{icon}</span>}
                {label}
              </button>
            );
          })}
        </div>

        {/* Tx table */}
        <div className="stats-tx-scroll" style={{ marginBottom: 16 }}>
          <div style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(140px,1.2fr) minmax(140px,1fr) minmax(110px,0.9fr) minmax(180px,1.1fr) minmax(120px,0.9fr)',
              gap: 12, padding: '12px 16px', borderBottom: `1px solid ${BORDER}`,
              fontSize: 10, letterSpacing: '0.10em', textTransform: 'uppercase', color: TEXT_FAINT, fontFamily: 'JetBrains Mono, monospace',
            }}>
              <div>Service</div><div>Payer</div><div>Amount</div><div>Tx hash</div><div style={{ textAlign: 'right' }}>When</div>
            </div>
            {loading && txs.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: TEXT_FAINT, fontSize: 13 }}>Loading…</div>
            ) : txs.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: TEXT_FAINT, fontSize: 13 }}>
                {filter ? `No ${filter} transactions yet.` : 'No transactions.'}
              </div>
            ) : (
              txs.map((tx, i) => <TxRow key={(tx.nonce || tx.tx_hash || i) + ''} tx={tx} idx={i} />)
            )}
          </div>
        </div>

        {/* Pagination */}
        {pagination.total > pagination.limit && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setPagination(p => ({ ...p, offset: Math.max(0, p.offset - p.limit) }))}
              disabled={pagination.offset === 0}
              style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
                padding: '8px 16px', cursor: pagination.offset === 0 ? 'not-allowed' : 'pointer',
                border: `1px solid ${BORDER}`, background: 'transparent',
                color: pagination.offset === 0 ? TEXT_GHOST : TEXT_DIM,
                opacity: pagination.offset === 0 ? 0.5 : 1,
              }}
            >← Previous</button>
            <div style={{ fontSize: 11, color: TEXT_FAINT, fontFamily: 'JetBrains Mono, monospace' }}>
              {pagination.offset + 1}–{Math.min(pagination.offset + pagination.limit, pagination.total)} of {fmtN(pagination.total)}
            </div>
            <button
              onClick={() => setPagination(p => ({ ...p, offset: p.offset + p.limit }))}
              disabled={!pagination.has_more}
              style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
                padding: '8px 16px', cursor: !pagination.has_more ? 'not-allowed' : 'pointer',
                border: `1px solid ${BORDER}`, background: 'transparent',
                color: !pagination.has_more ? TEXT_GHOST : TEXT_DIM,
                opacity: !pagination.has_more ? 0.5 : 1,
              }}
            >Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}
