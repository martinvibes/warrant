import { useEffect, useState } from 'react';
import { isAddress } from 'ethers';
import { Glyph0G, LogoLockup } from './Logo';
import { API_URL } from '../lib/api';

// ─── Tokens (matches the rest of the page) ─────────────────────────────

const PURPLE = '#00B8D4';
const LILAC = '#00E5FF';
const GREEN = '#3fb950';
const TEXT = '#fefefe';
const TEXT_DIM = 'rgba(254,254,254,0.55)';
const TEXT_FAINT = 'rgba(254,254,254,0.32)';
const TEXT_GHOST = 'rgba(254,254,254,0.20)';
const BG_PAGE = '#08080d';
const BG_CARD = '#0a0a12';
const BORDER = 'rgba(0,229,255,0.10)';
const BORDER_HOVER = 'rgba(0,229,255,0.28)';

// ─── Types matching the backend response ──────────────────────────────

interface AgentResource {
  id: number;
  type: number;
  typeLabel: string;
  status: number;
  statusLabel: string;
  providerRef: string;
  createdAt: string;
  expiresAt: string | null;
}

interface AgentData {
  address: string;
  identity: { tokenId: number; metadataURI: string; resourceCount: number } | null;
  resources: AgentResource[];
  balance: string;
  balanceWei: string;
  chain: { chainId: number };
  explorer: string;
}

// ─── Inline icons per resource type ───────────────────────────────────

function ResourceIcon({ type, size = 22 }: { type: string; size?: number }) {
  const stroke = LILAC;
  switch (type) {
    case 'email':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <polyline points="3 7 12 13 21 7" />
        </svg>
      );
    case 'phone':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" />
        </svg>
      );
    case 'compute':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="7" rx="1.5" />
          <rect x="3" y="14" width="18" height="7" rx="1.5" />
          <line x1="7" y1="6.5" x2="7.01" y2="6.5" />
          <line x1="7" y1="17.5" x2="7.01" y2="17.5" />
        </svg>
      );
    case 'domain':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18" />
          <path d="M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
        </svg>
      );
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
  }
}

function shortAddr(a: string): string {
  return a.slice(0, 6) + '…' + a.slice(-4);
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

// ─── Page ──────────────────────────────────────────────────────────────

export function AgentProfile({ address }: { address: string }) {
  const [data, setData] = useState<AgentData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const validAddr = isAddress(address);

  useEffect(() => {
    if (!validAddr) {
      setError('Invalid wallet address.');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        const res = await fetch(`${API_URL}/agent/${address}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || `HTTP ${res.status}`);
        }
        const json = (await res.json()) as AgentData;
        if (!cancelled) setData(json);
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to load agent');
      }
    })();
    return () => { cancelled = true; };
  }, [address, validAddr]);

  const copyAddr = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: BG_PAGE,
      color: TEXT,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Section bg glow */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 50% 35% at 50% 0%, rgba(0,229,255,0.12), transparent 70%)',
      }} />

      {/* Mini nav */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        padding: '14px 24px',
        background: 'rgba(8,8,13,0.85)',
        backdropFilter: 'blur(18px)',
        borderBottom: `1px solid ${BORDER}`,
      }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        }}>
          <a href="/" style={{ textDecoration: 'none' }}>
            <LogoLockup size={20} color={LILAC} />
          </a>
          <a href="/" style={{
            fontSize: 12, color: TEXT_FAINT, fontFamily: 'JetBrains Mono, monospace',
            textDecoration: 'none', letterSpacing: '0.04em',
          }}>← back to 0gent.xyz</a>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '60px 24px 80px', position: 'relative' }}>
        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <div style={{
            fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase',
            color: LILAC, marginBottom: 14, fontWeight: 500,
          }}>agent profile</div>
          <h1 style={{
            fontSize: 'min(40px, 3.4vw)', fontWeight: 500,
            letterSpacing: '-0.03em', lineHeight: 1.1, margin: 0, marginBottom: 14,
          }}>
            {data?.identity ? `Agent #${data.identity.tokenId}` : 'Unknown agent'}
          </h1>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: TEXT_DIM,
          }}>
            <code style={{ color: LILAC, userSelect: 'all' }}>{address}</code>
            <button
              onClick={copyAddr}
              style={{
                fontSize: 11, padding: '4px 10px',
                background: 'transparent',
                border: `1px solid ${copied ? 'rgba(63,185,80,0.4)' : BORDER}`,
                color: copied ? GREEN : TEXT_DIM,
                cursor: 'pointer',
                fontFamily: 'JetBrains Mono, monospace',
                transition: 'all 0.15s',
              }}
            >
              {copied ? '✓ copied' : 'copy'}
            </button>
            {data && (
              <a
                href={data.explorer}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: 11, padding: '4px 10px',
                  border: `1px solid ${BORDER}`,
                  color: TEXT_DIM,
                  textDecoration: 'none',
                  fontFamily: 'JetBrains Mono, monospace',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = BORDER_HOVER; e.currentTarget.style.color = TEXT; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = TEXT_DIM; }}
              >
                explorer ↗
              </a>
            )}
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div style={{
            padding: '16px 20px',
            border: '1px solid rgba(248,81,73,0.3)',
            background: 'rgba(248,81,73,0.06)',
            color: '#f85149',
            fontSize: 14,
            marginBottom: 32,
          }}>
            {error}
          </div>
        )}

        {/* Loading state */}
        {!data && !error && validAddr && (
          <div style={{
            padding: '40px 0', textAlign: 'center',
            fontSize: 13, color: TEXT_FAINT,
            fontFamily: 'JetBrains Mono, monospace',
          }}>
            Reading from 0G Chain…
          </div>
        )}

        {/* Data */}
        {data && (
          <>
            {/* Stat cards row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 14, marginBottom: 40,
            }}>
              <StatCard
                label="identity"
                value={data.identity ? `#${data.identity.tokenId}` : '—'}
                detail={data.identity ? 'agent NFT' : 'not minted'}
                accent={!!data.identity}
              />
              <StatCard
                label="resources"
                value={String(data.resources.length)}
                detail={data.resources.filter(r => r.statusLabel === 'active').length + ' active'}
                accent={data.resources.length > 0}
              />
              <StatCard
                label="balance"
                value={Number(data.balance).toFixed(4)}
                unit="0G"
                detail={`chain ${data.chain.chainId}`}
                accent={Number(data.balance) > 0}
              />
            </div>

            {/* Identity card */}
            {data.identity && (
              <Section title="Identity">
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap',
                  padding: '20px 22px',
                  background: BG_CARD,
                  border: `1px solid ${BORDER}`,
                }}>
                  <div style={{
                    width: 56, height: 56,
                    border: `1px solid ${BORDER}`,
                    background: 'linear-gradient(135deg, rgba(0,229,255,0.10), rgba(0,229,255,0.02))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Glyph0G size={32} color={LILAC} strokeWidth={3.6} />
                  </div>
                  <div style={{ flex: 1, minWidth: 240 }}>
                    <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
                      Agent Identity NFT #{data.identity.tokenId}
                    </div>
                    <div style={{ fontSize: 12, color: TEXT_FAINT, fontFamily: 'JetBrains Mono, monospace', wordBreak: 'break-all' }}>
                      {data.identity.metadataURI}
                    </div>
                  </div>
                  <div style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
                    color: GREEN, padding: '5px 11px',
                    border: '1px solid rgba(63,185,80,0.3)',
                    background: 'rgba(63,185,80,0.06)',
                    letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600,
                  }}>
                    ERC-721
                  </div>
                </div>
              </Section>
            )}

            {/* Resources */}
            <Section title={`Resources · ${data.resources.length}`}>
              {data.resources.length === 0 ? (
                <div style={{
                  padding: '32px 24px',
                  background: BG_CARD,
                  border: `1px solid ${BORDER}`,
                  fontSize: 13, color: TEXT_FAINT,
                  fontFamily: 'JetBrains Mono, monospace',
                  textAlign: 'center',
                }}>
                  no resources provisioned yet
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {data.resources.map((r) => (
                    <ResourceRow key={r.id} resource={r} />
                  ))}
                </div>
              )}
            </Section>

            {/* CTA at the bottom */}
            <div style={{
              marginTop: 56, padding: '24px 28px',
              background: 'linear-gradient(135deg, rgba(0,229,255,0.06), rgba(0,229,255,0.01))',
              border: `1px solid ${BORDER}`,
              display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap',
            }}>
              <div style={{ flex: 1, minWidth: 280 }}>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
                  Want a profile like this?
                </div>
                <div style={{ fontSize: 13, color: TEXT_DIM, lineHeight: 1.6 }}>
                  Mint your own agent identity. Provision real email + phone. All paid on-chain.
                </div>
              </div>
              <a
                href="/#wallet"
                style={{
                  display: 'inline-flex', alignItems: 'center', height: 42, padding: '0 22px',
                  background: PURPLE, color: '#fff', fontSize: 13, fontWeight: 500,
                  borderRadius: 100, border: 'none', textDecoration: 'none',
                  transition: 'filter 0.2s',
                }}
              >
                Create your wallet →
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Subcomponents ─────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{
        fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
        color: TEXT_FAINT, fontWeight: 500, marginBottom: 14,
      }}>{title}</h2>
      {children}
    </div>
  );
}

function StatCard({
  label, value, unit, detail, accent,
}: {
  label: string;
  value: string;
  unit?: string;
  detail?: string;
  accent?: boolean;
}) {
  return (
    <div style={{
      padding: '18px 20px',
      background: BG_CARD,
      border: `1px solid ${accent ? 'rgba(0,229,255,0.20)' : BORDER}`,
    }}>
      <div style={{
        fontSize: 11, color: TEXT_FAINT,
        letterSpacing: '0.06em', textTransform: 'uppercase',
        marginBottom: 8, fontWeight: 500,
      }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
        <span style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 24, fontWeight: 500,
          color: accent ? TEXT : TEXT_GHOST,
          letterSpacing: '-0.01em', lineHeight: 1,
        }}>{value}</span>
        {unit && (
          <span style={{
            fontSize: 13, color: LILAC,
            fontFamily: 'JetBrains Mono, monospace', fontWeight: 500,
          }}>{unit}</span>
        )}
      </div>
      {detail && (
        <div style={{
          fontSize: 11, color: TEXT_FAINT,
          fontFamily: 'JetBrains Mono, monospace',
        }}>{detail}</div>
      )}
    </div>
  );
}

function ResourceRow({ resource }: { resource: AgentResource }) {
  const isActive = resource.statusLabel === 'active';
  return (
    <div className="ap-resource-row" style={{
      display: 'grid',
      gridTemplateColumns: 'auto 1fr auto auto',
      alignItems: 'center', gap: 14,
      padding: '14px 18px',
      background: BG_CARD,
      border: `1px solid ${BORDER}`,
      transition: 'border-color 0.2s',
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = BORDER_HOVER; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = BORDER; }}
    >
      <div style={{
        width: 40, height: 40,
        border: `1px solid ${BORDER}`,
        background: 'rgba(0,229,255,0.04)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <ResourceIcon type={resource.typeLabel} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 14, fontWeight: 500,
          color: TEXT,
          wordBreak: 'break-all',
        }}>{resource.providerRef}</div>
        <div style={{
          fontSize: 11, color: TEXT_FAINT,
          fontFamily: 'JetBrains Mono, monospace',
          marginTop: 2,
        }}>
          {resource.typeLabel} · #{resource.id} · created {fmtDate(resource.createdAt)}
          {resource.expiresAt && <> · expires {fmtDate(resource.expiresAt)}</>}
        </div>
      </div>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
        padding: '4px 10px',
        color: isActive ? GREEN : TEXT_FAINT,
        border: `1px solid ${isActive ? 'rgba(63,185,80,0.3)' : BORDER}`,
        background: isActive ? 'rgba(63,185,80,0.06)' : 'transparent',
        letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600,
      }}>
        {resource.statusLabel}
      </div>
      <div style={{
        fontSize: 11, color: TEXT_FAINT,
        fontFamily: 'JetBrains Mono, monospace',
      }}>
        {resource.typeLabel}
      </div>
    </div>
  );
}
