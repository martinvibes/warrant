/**
 * One agent's record.
 *
 * The console answers "what is my agent doing". This page answers the question
 * somebody else asks: given this Hedera account, what was it ever authorised to
 * buy, what did it buy, and what was it stopped from buying. No signer, no
 * credentials, nothing hidden — which is the only way a record of spending is
 * worth anything to the person who did not issue it.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  explorerAccount,
  explorerTx,
  formatUsdc,
  getHealth,
  listRefusals,
  listReceipts,
  listWarrants,
  percentSpent,
  shortId,
  timeAgo,
  untilExpiry,
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
const DIM = 'rgba(247,246,243,0.55)';
const MUTED = 'rgba(247,246,243,0.35)';

export function AgentProfile({ agent }: { agent: string }) {
  const [warrants, setWarrants] = useState<WarrantView[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [refusals, setRefusals] = useState<Refusal[]>([]);
  const [network, setNetwork] = useState('hedera:testnet');
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    const load = async () => {
      try {
        const [h, w, rc, rf] = await Promise.all([
          getHealth(),
          listWarrants(),
          listReceipts(),
          listRefusals(),
        ]);
        if (!live) return;
        setNetwork(h.network);
        setWarrants(w.filter(x => x.agent === agent));
        setReceipts(rc.filter(x => x.agent === agent));
        setRefusals(rf.filter(x => x.agent === agent));
        setState('ready');
      } catch (err) {
        if (live) {
          setError((err as Error).message);
          setState('error');
        }
      }
    };
    load();
    const id = setInterval(load, 10_000);
    return () => { live = false; clearInterval(id); };
  }, [agent]);

  const totals = useMemo(() => {
    const sum = (rows: { amount: string }[]) =>
      rows.reduce((a, r) => a + BigInt(r.amount), 0n).toString();
    return {
      authorised: warrants
        .filter(w => w.status === 'live')
        .reduce((a, w) => a + BigInt(w.cap), 0n)
        .toString(),
      settled: sum(receipts),
      live: warrants.filter(w => w.status === 'live').length,
    };
  }, [warrants, receipts]);

  return (
    <div style={{ minHeight: '100vh', background: '#070707' }}>
      <header style={{ borderBottom: `1px solid ${LINE}`, padding: '18px 28px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <a href="/" style={{ textDecoration: 'none' }}>
            <LogoLockup size={21} />
          </a>
          <a href="/audit" style={{ fontSize: 13, color: DIM, textDecoration: 'none' }}>
            Full ledger →
          </a>
        </div>
      </header>

      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '48px 28px 100px' }}>
        <div className="label" style={{ color: MUTED, marginBottom: 12 }}>
          Agent
        </div>
        <h1 className="mono" style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 500, margin: '0 0 14px', letterSpacing: '-0.01em' }}>
          {agent}
        </h1>
        <a
          href={explorerAccount(agent, network)}
          target="_blank"
          rel="noreferrer"
          className="mono"
          style={{ fontSize: 12, color: BRASS, display: 'inline-flex', alignItems: 'center', gap: 5, textDecoration: 'none' }}
        >
          View on HashScan <ExternalIcon size={10} />
        </a>

        {state === 'loading' && (
          <p style={{ marginTop: 40, fontSize: 14, color: MUTED }}>Reading the ledger…</p>
        )}
        {state === 'error' && (
          <p style={{ marginTop: 40, fontSize: 14, color: REFUSED }}>{error}</p>
        )}

        {state === 'ready' && (
          <>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: 1, background: LINE, border: `1px solid ${LINE}`, margin: '36px 0 40px',
            }}>
              <Tile label="Live warrants" value={String(totals.live)} />
              <Tile label="Authorised" value={formatUsdc(totals.authorised)} tone={BRASS} />
              <Tile label="Settled" value={formatUsdc(totals.settled)} tone={SETTLED} />
              <Tile label="Refused" value={String(refusals.length)} tone={refusals.length ? REFUSED : undefined} />
            </div>

            {warrants.length === 0 && receipts.length === 0 && refusals.length === 0 ? (
              <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.8, maxWidth: 520 }}>
                This service has never seen {agent}. It has not been named in a warrant here, so
                every paid request it made would have been refused for want of one.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
                <Section title={`Warrants (${warrants.length})`}>
                  {warrants.length === 0 ? (
                    <Muted>No warrant here names this agent.</Muted>
                  ) : (
                    warrants.map(w => (
                      <div key={w.id} style={{ padding: '16px 0', borderBottom: `1px solid rgba(247,246,243,0.05)` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', marginBottom: 10 }}>
                          <strong style={{ fontSize: 14, fontWeight: 500 }}>{w.purpose}</strong>
                          <span className="label" style={{ color: w.status === 'live' ? SETTLED : REFUSED, fontSize: 10 }}>
                            {w.status}
                          </span>
                        </div>
                        <div style={{ height: 3, background: 'rgba(247,246,243,0.07)', marginBottom: 9 }}>
                          <div style={{ width: `${percentSpent(w)}%`, height: '100%', background: w.status === 'live' ? BRASS : MUTED }} />
                        </div>
                        <div className="mono" style={{ fontSize: 11, color: MUTED, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                          <span>{formatUsdc(w.spent)} of {formatUsdc(w.cap)}</span>
                          <span>covers {w.resources.join(', ') || 'nothing'}</span>
                          <span>{w.status === 'live' ? untilExpiry(w.expiry) : timeAgo(w.revokedAt ?? w.expiry)}</span>
                          <span>{shortId(w.id)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </Section>

                <Section title={`Bought (${receipts.length})`}>
                  {receipts.length === 0 ? (
                    <Muted>Nothing has settled for this agent.</Muted>
                  ) : (
                    receipts.map(r => (
                      <Row key={r.id}>
                        <span style={{ color: DIM }}>{timeAgo(r.created_at)}</span>
                        <span style={{ color: '#F7F6F3' }}>{r.resource}</span>
                        <span style={{ color: SETTLED, fontVariantNumeric: 'tabular-nums' }}>{formatUsdc(r.amount)}</span>
                        <a href={explorerTx(r.tx_id, r.network)} target="_blank" rel="noreferrer" style={{ color: BRASS, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          {shortId(r.tx_id, 12, 4)} <ExternalIcon size={9} />
                        </a>
                      </Row>
                    ))
                  )}
                </Section>

                <Section title={`Refused (${refusals.length})`}>
                  {refusals.length === 0 ? (
                    <Muted>Nothing was refused.</Muted>
                  ) : (
                    refusals.map(r => (
                      <Row key={r.id}>
                        <span style={{ color: DIM }}>{timeAgo(r.created_at)}</span>
                        <span style={{ color: '#F7F6F3' }}>{r.resource}</span>
                        <span style={{ color: REFUSED }}>{r.code}</span>
                        <span style={{ color: MUTED, whiteSpace: 'normal' }}>{r.reason}</span>
                      </Row>
                    ))
                  )}
                </Section>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="label" style={{ color: DIM, marginBottom: 12, paddingBottom: 10, borderBottom: `1px solid ${LINE}` }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mono"
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(70px,auto) minmax(90px,auto) minmax(80px,auto) 1fr',
        gap: 16,
        padding: '11px 0',
        fontSize: 12,
        borderBottom: `1px solid rgba(247,246,243,0.05)`,
        alignItems: 'baseline',
      }}
    >
      {children}
    </div>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 13, color: MUTED, margin: '4px 0 0' }}>{children}</p>;
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div style={{ padding: '16px 18px', background: '#0e0e0f' }}>
      <div className="label" style={{ color: MUTED, marginBottom: 8 }}>{label}</div>
      <div className="mono" style={{ fontSize: 21, color: tone ?? '#F7F6F3', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
    </div>
  );
}
