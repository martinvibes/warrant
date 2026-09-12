import { Fragment, useEffect, useState } from 'react';
import { Nav } from './Nav';
import { Footer } from './Footer';
import {
  formatUsdc,
  getContracts,
  getPurchases,
  getReceipt,
  getStats,
  shortHash,
  timeAgo,
  type Contracts,
  type Purchase,
  type Receipt,
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

/**
 * One receipt, opened in place.
 *
 * The digest and the signature are shown in full rather than shortened,
 * because they are the parts somebody would actually copy out to check the
 * thing. Everything needed to verify it is on screen: no key, no account.
 */
function ReceiptDetail({ id, issuer }: { id: string; issuer: string | null }) {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    getReceipt(id)
      .then(r => setReceipt(r.receipt))
      .catch(e => setError((e as Error).message));
  }, [id]);

  if (error) {
    return (
      <p style={{ padding: '16px 22px', fontSize: 13, color: 'var(--color-refused)' }}>
        That receipt could not be read: {error}
      </p>
    );
  }
  if (!receipt) {
    return (
      <p style={{ padding: '16px 22px', fontSize: 13, color: 'var(--color-muted)' }}>Reading…</p>
    );
  }

  const signedByIssuer = Boolean(
    receipt.signature && issuer && receipt.issuer.toLowerCase() === issuer.toLowerCase(),
  );

  const Field = ({ label, value }: { label: string; value: string }) => (
    <div style={{ display: 'grid', gap: 4 }}>
      <span className="label" style={{ fontSize: 10, color: 'var(--color-muted)' }}>
        {label}
      </span>
      <span
        className="mono"
        style={{ fontSize: 11.5, color: 'var(--color-dim)', wordBreak: 'break-all', lineHeight: 1.6 }}
      >
        {value}
      </span>
    </div>
  );

  return (
    <div
      style={{
        display: 'grid',
        gap: 16,
        padding: '18px 22px',
        background: 'var(--color-bg)',
        borderTop: '1px solid var(--color-faint)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span
          className="label"
          style={{
            padding: '3px 9px',
            fontSize: 10,
            color: signedByIssuer ? 'var(--color-settled)' : 'var(--color-muted)',
            border: `1px solid ${signedByIssuer ? 'rgba(111,227,165,0.3)' : 'var(--color-faint)'}`,
          }}
        >
          {signedByIssuer ? 'SIGNED BY THE ISSUER' : 'UNSIGNED'}
        </span>
        <span style={{ fontSize: 12.5, color: 'var(--color-muted)' }}>
          {receipt.resource} · issued {receipt.issuedAt}
        </span>
      </div>

      <Field label="Digest" value={receipt.digest} />
      <Field label="Signature" value={receipt.signature || 'none'} />
      <Field label="Issuer" value={receipt.issuer} />

      <p style={{ fontSize: 12.5, lineHeight: 1.65, color: 'var(--color-muted)' }}>
        The digest is a SHA-256 over version, id, agent, kind, resource, amount, asset, network,
        settlement and issue time, joined by pipes. Recover the signer from it and you should get
        the issuer above. Nothing here needs this service to be honest.
      </p>
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
  const [openReceipt, setOpenReceipt] = useState<string | null>(null);

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
                    <Fragment key={row.id}>
                    <tr style={{ borderTop: '1px solid var(--color-line)' }}>
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
                      <td className="mono" style={{ padding: '13px 12px', fontSize: 12.5 }}>
                        {row.receipt ? (
                          <button
                            onClick={() => setOpenReceipt(openReceipt === row.receipt ? null : row.receipt)}
                            className="mono"
                            style={{
                              padding: 0,
                              fontSize: 12.5,
                              cursor: 'pointer',
                              background: 'none',
                              border: 'none',
                              borderBottom: '1px dotted var(--color-line)',
                              color: openReceipt === row.receipt ? 'var(--color-accent-light)' : 'var(--color-dim)',
                            }}
                          >
                            receipt
                          </button>
                        ) : (
                          <span style={{ color: 'var(--color-muted)' }}>—</span>
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
                    {openReceipt && openReceipt === row.receipt && (
                      <tr>
                        <td colSpan={6} style={{ padding: 0 }}>
                          <ReceiptDetail id={openReceipt} issuer={contracts?.receiptIssuer ?? null} />
                        </td>
                      </tr>
                    )}
                    </Fragment>
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
          <ContractRow
            name="Receipt issuer"
            address={contracts?.receiptIssuer ?? null}
            explorer={
              contracts?.receiptIssuer
                ? `https://hashscan.io/${contracts.network.split(':')[1] ?? 'testnet'}/account/${contracts.receiptIssuer}`
                : null
            }
          />
        </Panel>
      </main>
      <Footer />
    </>
  );
}
