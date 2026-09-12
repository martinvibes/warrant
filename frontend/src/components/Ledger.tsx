import { useEffect, useState } from 'react';
import { Nav } from './Nav';
import { Footer } from './Footer';
import {
  formatUsdc,
  getContracts,
  getPurchases,
  getStats,
  shortHash,
  timeAgo,
  type Contracts,
  type Purchase,
  type Stats,
} from '../lib/api';

/**
 * The public ledger.
 *
 * No wallet, no login, no key. Anyone who can reach this page can check what
 * this service sold and to whom, which is the only version of an audit trail
 * worth having. Every settled row links to the transaction on HashScan so the
 * claim can be checked against the network rather than against us.
 */

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section style={{ border: '1px solid var(--color-line)', background: 'var(--color-surface)' }}>
      <header style={{ padding: '18px 22px', borderBottom: '1px solid var(--color-line)' }}>
        <h2 className="label" style={{ color: 'var(--color-accent-light)' }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{ marginTop: 6, fontSize: 13, color: 'var(--color-muted)' }}>{subtitle}</p>
        )}
      </header>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ padding: '38px 22px', fontSize: 14, color: 'var(--color-muted)', textAlign: 'center' }}>
      {children}
    </p>
  );
}

function Tile({ value, label }: { value: string | number; label: string }) {
  return (
    <div style={{ padding: '20px 22px', borderLeft: '1px solid var(--color-line)', flex: '1 1 160px' }}>
      <div
        className="mono"
        style={{ fontSize: 25, color: 'var(--color-accent-light)', fontVariantNumeric: 'tabular-nums' }}
      >
        {value}
      </div>
      <div className="label" style={{ marginTop: 6, color: 'var(--color-muted)' }}>
        {label}
      </div>
    </div>
  );
}

function ContractRow({ name, address, explorer }: { name: string; address: string | null; explorer: string | null }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 16,
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 22px',
        borderTop: '1px solid var(--color-line)',
        flexWrap: 'wrap',
      }}
    >
      <span style={{ fontSize: 14 }}>{name}</span>
      {address ? (
        <a
          className="mono"
          href={explorer ?? undefined}
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: 12.5, color: 'var(--color-accent-light)' }}
        >
          {shortHash(address, 10, 6)}
        </a>
      ) : (
        <span className="mono" style={{ fontSize: 12.5, color: 'var(--color-muted)' }}>
          not deployed
        </span>
      )}
    </div>
  );
}

export function Ledger() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [contracts, setContracts] = useState<Contracts | null>(null);
  const [kind, setKind] = useState<string>('all');

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      getPurchases(undefined, 200)
        .then(p => !cancelled && setPurchases(p))
        .catch(() => undefined);
      getStats()
        .then(s => !cancelled && setStats(s))
        .catch(() => undefined);
    };
    load();
    getContracts()
      .then(c => !cancelled && setContracts(c))
      .catch(() => undefined);
    const timer = setInterval(load, 6000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const kinds = Object.keys(stats?.byKind ?? {}).sort();
  const rows = kind === 'all' ? purchases : purchases.filter(p => p.kind === kind);
  const spent = purchases.reduce((sum, p) => sum + BigInt(p.amount || '0'), 0n);

  return (
    <>
      <Nav />
      <main style={{ maxWidth: 1080, margin: '0 auto', padding: '120px 24px 90px', display: 'grid', gap: 28 }}>
        <header style={{ maxWidth: 640 }}>
          <span className="label" style={{ color: 'var(--color-accent)' }}>
            Public ledger
          </span>
          <h1 className="display" style={{ fontSize: 42, marginTop: 14, lineHeight: 1.12 }}>
            Everything this service sold.
          </h1>
          <p style={{ marginTop: 16, fontSize: 15.5, lineHeight: 1.7, color: 'var(--color-dim)' }}>
            No wallet and no login. Each settled row links to the transaction, so you can check the
            claim against the network rather than against us.
          </p>
        </header>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            border: '1px solid var(--color-line)',
            borderLeft: 'none',
            background: 'var(--color-surface)',
          }}
        >
          <Tile value={stats?.total ?? 0} label="Purchases" />
          <Tile value={stats?.agents ?? 0} label="Agents" />
          <Tile value={formatUsdc(spent)} label="Settled" />
          <Tile value={kinds.length} label="Kinds bought" />
        </div>

        <Panel title="Purchases" subtitle="Newest first, refreshed every six seconds.">
          {kinds.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '14px 22px' }}>
              {['all', ...kinds].map(option => (
                <button
                  key={option}
                  onClick={() => setKind(option)}
                  className="label"
                  style={{
                    padding: '5px 11px',
                    cursor: 'pointer',
                    background: kind === option ? 'var(--color-accent)' : 'transparent',
                    color: kind === option ? '#000' : 'var(--color-dim)',
                    border: '1px solid var(--color-line)',
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          {rows.length === 0 ? (
            <Empty>Nothing has settled yet. The ledger fills itself as agents buy.</Empty>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }}>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.id} style={{ borderTop: '1px solid var(--color-line)' }}>
                      <td style={{ padding: '13px 22px', fontSize: 14 }}>{row.kind}</td>
                      <td className="mono" style={{ padding: '13px 12px', fontSize: 12.5 }}>
                        <a href={`/agent/${encodeURIComponent(row.agent)}`} style={{ color: 'var(--color-dim)' }}>
                          {row.agent}
                        </a>
                      </td>
                      <td
                        className="mono"
                        style={{
                          padding: '13px 12px',
                          fontSize: 13,
                          color: 'var(--color-settled)',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {formatUsdc(row.amount)}
                      </td>
                      <td className="mono" style={{ padding: '13px 12px', fontSize: 12.5, color: 'var(--color-muted)' }}>
                        {row.explorer ? (
                          <a href={row.explorer} target="_blank" rel="noreferrer" style={{ color: 'var(--color-accent-light)' }}>
                            {shortHash(row.transaction ?? '', 8, 6)}
                          </a>
                        ) : (
                          'no transaction'
                        )}
                      </td>
                      <td
                        style={{
                          padding: '13px 22px',
                          fontSize: 12.5,
                          color: 'var(--color-muted)',
                          textAlign: 'right',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {timeAgo(row.at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Contracts" subtitle="Where the identity, the catalogue and the limit actually live.">
          <ContractRow name="AgentIdentity" address={contracts?.identity.address ?? null} explorer={contracts?.identity.explorer ?? null} />
          <ContractRow name="ResourceMarket" address={contracts?.market.address ?? null} explorer={contracts?.market.explorer ?? null} />
          <ContractRow name="AgentTreasury" address={contracts?.treasury.address ?? null} explorer={contracts?.treasury.explorer ?? null} />
        </Panel>
      </main>
      <Footer />
    </>
  );
}
