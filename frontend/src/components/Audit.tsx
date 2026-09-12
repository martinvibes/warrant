/**
 * The public ledger.
 *
 * Same data as the console, no signer, nothing filtered. The claim this page
 * makes is that the refusals are as visible as the purchases — a system that
 * only publishes what it allowed is a marketing page, not an audit trail.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  API_URL,
  explorerTx,
  formatUsdc,
  getHealth,
  getPricing,
  listRefusals,
  listReceipts,
  listWarrants,
  percentSpent,
  shortId,
  timeAgo,
  untilExpiry,
  type Health,
  type Pricing,
  type Receipt,
  type Refusal,
  type WarrantView,
} from '../lib/api';
import { LogoLockup } from './Logo';
import { ExternalIcon } from './Icons';

const BRASS = '#E8B55C';
const SETTLED = '#6FE3A5';
const REFUSED = '#E5484D';
const LINE = 'rgba(232, 181, 92,0.14)';
const SURFACE = '#0e0e0f';
const DIM = 'rgba(247,246,243,0.55)';
const MUTED = 'rgba(247,246,243,0.35)';

type Feed =
  | { kind: 'settled'; at: number; r: Receipt }
  | { kind: 'refused'; at: number; r: Refusal };

export function Audit() {
  const [health, setHealth] = useState<Health | null>(null);
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [warrants, setWarrants] = useState<WarrantView[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [refusals, setRefusals] = useState<Refusal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'settled' | 'refused'>('all');

  const load = useCallback(async () => {
    try {
      const [h, w, rc, rf] = await Promise.all([
        getHealth(),
        listWarrants(),
        listReceipts(),
        listRefusals(),
      ]);
      setHealth(h);
      setWarrants(w);
      setReceipts(rc);
      setRefusals(rf);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
    getPricing().then(setPricing).catch(() => {});
    const id = setInterval(load, 6000);
    return () => clearInterval(id);
  }, [load]);

  // One chronological feed, because the interesting comparison is between a
  // purchase and the refusal that came a second later.
  const feed = useMemo<Feed[]>(() => {
    const rows: Feed[] = [
      ...receipts.map(r => ({ kind: 'settled' as const, at: r.created_at, r })),
      ...refusals.map(r => ({ kind: 'refused' as const, at: r.created_at, r })),
    ];
    return rows
      .filter(f => filter === 'all' || f.kind === filter)
      .sort((a, b) => b.at - a.at)
      .slice(0, 120);
  }, [receipts, refusals, filter]);

  const totals = useMemo(() => {
    const settled = receipts.reduce((a, r) => a + BigInt(r.amount), 0n);
    const attempted = settled + refusals.reduce((a, r) => a + BigInt(r.price), 0n);
    return {
      settled: settled.toString(),
      refusedValue: refusals.reduce((a, r) => a + BigInt(r.price), 0n).toString(),
      attempted: attempted.toString(),
      refusalRate: receipts.length + refusals.length
        ? (refusals.length / (receipts.length + refusals.length)) * 100
        : 0,
    };
  }, [receipts, refusals]);

  const byCode = useMemo(() => {
    const counts = new Map<string, number>();
    refusals.forEach(r => counts.set(r.code, (counts.get(r.code) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [refusals]);

  return (
    <div style={{ minHeight: '100vh', background: '#070707' }}>
      <header style={{ borderBottom: `1px solid ${LINE}`, padding: '18px 28px' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <a href="/" style={{ textDecoration: 'none' }}>
            <LogoLockup size={21} />
          </a>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <a href="/console" style={{ fontSize: 13, color: DIM, textDecoration: 'none' }}>Console</a>
            <a href="/docs" style={{ fontSize: 13, color: DIM, textDecoration: 'none' }}>Docs</a>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1240, margin: '0 auto', padding: '52px 28px 100px' }}>
        <div className="label" style={{ color: BRASS, marginBottom: 14 }}>Public ledger</div>
        <h1 className="display" style={{ fontSize: 'clamp(28px, 4vw, 42px)', margin: '0 0 16px' }}>
          Everything bought, and everything refused
        </h1>
        <p style={{ fontSize: 16, color: DIM, maxWidth: 620, lineHeight: 1.75, margin: '0 0 10px' }}>
          No credentials and no filtering. Every figure on this page comes from a request you
          can repeat yourself against <span className="mono" style={{ color: BRASS, fontSize: 14 }}>{API_URL}</span>.
        </p>
        <p style={{ fontSize: 14, color: MUTED, maxWidth: 620, lineHeight: 1.7, margin: '0 0 40px' }}>
          A ledger that publishes only its successes tells you nothing about what it prevents.
        </p>

        {error && (
          <div style={{ padding: 14, marginBottom: 28, border: '1px solid rgba(229,72,77,0.3)', background: 'rgba(229,72,77,0.07)', fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 1, background: LINE, border: `1px solid ${LINE}`, marginBottom: 20 }}>
          <Tile label="Settled" value={formatUsdc(totals.settled)} sub={`${receipts.length} purchases`} tone={SETTLED} />
          <Tile label="Refused" value={formatUsdc(totals.refusedValue)} sub={`${refusals.length} attempts`} tone={refusals.length ? REFUSED : undefined} />
          <Tile label="Refusal rate" value={`${totals.refusalRate.toFixed(0)}%`} sub="of all paid requests" />
          <Tile label="Warrants" value={String(warrants.length)} sub={`${warrants.filter(w => w.status === 'live').length} live`} tone={BRASS} />
        </div>

        <div className="audit-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>
          <section style={{ background: SURFACE, border: `1px solid ${LINE}`, minWidth: 0 }}>
            <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '13px 18px', borderBottom: `1px solid ${LINE}`, flexWrap: 'wrap' }}>
              <h2 className="label" style={{ color: DIM, margin: 0 }}>Activity</h2>
              <div style={{ display: 'flex', gap: 4 }}>
                {(['all', 'settled', 'refused'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className="label"
                    style={{
                      padding: '4px 9px',
                      cursor: 'pointer',
                      fontSize: 10,
                      background: filter === f ? 'rgba(232, 181, 92,0.1)' : 'transparent',
                      color: filter === f ? BRASS : MUTED,
                      border: `1px solid ${filter === f ? 'rgba(232, 181, 92,0.3)' : 'transparent'}`,
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </header>

            {feed.length === 0 ? (
              <p style={{ padding: 20, fontSize: 13, color: MUTED, margin: 0, lineHeight: 1.7 }}>
                Nothing has happened yet. Sign a warrant in the console and point an agent at
                this service, and both what it buys and what it is stopped from buying will
                appear here.
              </p>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {feed.map(f => (
                  <li
                    key={`${f.kind}-${f.r.id}`}
                    style={{
                      display: 'flex',
                      gap: 14,
                      padding: '14px 18px',
                      borderBottom: `1px solid rgba(247,246,243,0.05)`,
                      borderLeft: `2px solid ${f.kind === 'settled' ? SETTLED : REFUSED}`,
                    }}
                  >
                    <span className="mono" style={{ fontSize: 11, color: MUTED, width: 62, flexShrink: 0, paddingTop: 2 }}>
                      {timeAgo(f.at)}
                    </span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      {f.kind === 'settled' ? (
                        <>
                          <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                            <span className="mono" style={{ fontSize: 13, color: '#F7F6F3' }}>{f.r.resource}</span>
                            <span className="mono" style={{ fontSize: 13, color: SETTLED, fontVariantNumeric: 'tabular-nums' }}>
                              {formatUsdc(f.r.amount)}
                            </span>
                            <a href={`/agent/${encodeURIComponent(f.r.agent)}`} className="mono" style={{ fontSize: 11, color: DIM }}>
                              {f.r.agent}
                            </a>
                          </div>
                          <div className="mono" style={{ fontSize: 11, color: MUTED, marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            <span>“{f.r.purpose}”</span>
                            <a href={explorerTx(f.r.tx_id, f.r.network)} target="_blank" rel="noreferrer" style={{ color: BRASS, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              {shortId(f.r.tx_id, 12, 4)} <ExternalIcon size={9} />
                            </a>
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                            <span className="mono" style={{ fontSize: 13, color: '#F7F6F3' }}>{f.r.resource}</span>
                            <span className="mono" style={{ fontSize: 12, color: REFUSED }}>{f.r.code}</span>
                            {f.r.agent && (
                              <a href={`/agent/${encodeURIComponent(f.r.agent)}`} className="mono" style={{ fontSize: 11, color: DIM }}>
                                {f.r.agent}
                              </a>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: MUTED, marginTop: 4, lineHeight: 1.6 }}>{f.r.reason}</div>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Panel title="Why requests were refused">
              {byCode.length === 0 ? (
                <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>Nothing has been refused.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                  {byCode.map(([code, n]) => {
                    const pct = (n / refusals.length) * 100;
                    return (
                      <div key={code}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 5 }}>
                          <span className="mono" style={{ fontSize: 11.5, color: DIM }}>{code}</span>
                          <span className="mono" style={{ fontSize: 11.5, color: REFUSED, fontVariantNumeric: 'tabular-nums' }}>{n}</span>
                        </div>
                        <div style={{ height: 3, background: 'rgba(247,246,243,0.07)' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: REFUSED, opacity: 0.7 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Panel>

            <Panel title="Warrants">
              {warrants.length === 0 ? (
                <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>None issued yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {warrants.slice(0, 8).map(w => (
                    <div key={w.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 5, alignItems: 'baseline' }}>
                        <span style={{ fontSize: 12.5, color: '#F7F6F3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {w.purpose}
                        </span>
                        <span className="label" style={{ fontSize: 9, color: w.status === 'live' ? SETTLED : REFUSED, flexShrink: 0 }}>
                          {w.status}
                        </span>
                      </div>
                      <div style={{ height: 3, background: 'rgba(247,246,243,0.07)', marginBottom: 5 }}>
                        <div style={{ width: `${percentSpent(w)}%`, height: '100%', background: w.status === 'live' ? BRASS : MUTED }} />
                      </div>
                      <div className="mono" style={{ fontSize: 10.5, color: MUTED, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <span>{formatUsdc(w.spent)} / {formatUsdc(w.cap)}</span>
                        <span>{w.status === 'live' ? untilExpiry(w.expiry) : w.agent}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            {health && (
              <Panel title="This service">
                <dl style={{ display: 'grid', gap: 10, margin: 0 }}>
                  <Fact k="network" v={health.network} />
                  <Fact k="asset" v={health.asset} />
                  <Fact k="pays to" v={health.payTo ?? '—'} />
                  <Fact k="facilitator" v={health.facilitator.replace(/^https?:\/\//, '')} />
                  {pricing?.resources.map(r => (
                    <Fact key={r.resource} k={r.resource} v={r.price} />
                  ))}
                </dl>
              </Panel>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ background: SURFACE, border: `1px solid ${LINE}` }}>
      <header style={{ padding: '13px 18px', borderBottom: `1px solid ${LINE}` }}>
        <h2 className="label" style={{ color: DIM, margin: 0 }}>{title}</h2>
      </header>
      <div style={{ padding: 18 }}>{children}</div>
    </section>
  );
}

function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div style={{ padding: '18px 20px', background: SURFACE }}>
      <div className="label" style={{ color: MUTED, marginBottom: 9 }}>{label}</div>
      <div className="mono" style={{ fontSize: 23, fontWeight: 500, color: tone ?? '#F7F6F3', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11.5, color: MUTED, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
      <dt className="label" style={{ color: MUTED }}>{k}</dt>
      <dd className="mono" style={{ fontSize: 11.5, color: DIM, margin: 0, textAlign: 'right', wordBreak: 'break-all' }}>{v}</dd>
    </div>
  );
}
