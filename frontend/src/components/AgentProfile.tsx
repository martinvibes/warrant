import { useEffect, useState } from 'react';
import { Nav } from './Nav';
import { Footer } from './Footer';
import {
  formatUsdc,
  getAgent,
  getPurchases,
  shortHash,
  timeAgo,
  type AgentRecord,
  type Purchase,
} from '../lib/api';

/**
 * One agent's record: what it bought, and what it now owns as a result.
 *
 * Readable by anyone with the account id. An agent's spending is the closest
 * thing it has to a reputation, so hiding it behind a login would make the
 * reputation unusable by the people who would want to check it.
 */
export function AgentProfile({ agent }: { agent: string }) {
  const [record, setRecord] = useState<AgentRecord | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      getAgent(agent)
        .then(r => !cancelled && setRecord(r))
        .catch(e => !cancelled && setError((e as Error).message));
      getPurchases(agent, 100)
        .then(p => !cancelled && setPurchases(p))
        .catch(() => undefined);
    };
    load();
    const timer = setInterval(load, 8000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [agent]);

  return (
    <>
      <Nav />
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '120px 24px 90px', display: 'grid', gap: 26 }}>
        <header>
          <span className="label" style={{ color: 'var(--color-accent)' }}>
            Agent
          </span>
          <h1 className="mono" style={{ fontSize: 30, marginTop: 12 }}>
            {agent}
          </h1>
          {error && (
            <p style={{ marginTop: 12, fontSize: 14, color: 'var(--color-refused)' }}>
              Could not read this agent: {error}
            </p>
          )}
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
          {[
            { value: formatUsdc(record?.spent ?? '0'), label: 'Spent' },
            { value: purchases.length, label: 'Purchases' },
            { value: record?.inboxes.length ?? 0, label: 'Inboxes' },
            { value: record?.numbers.length ?? 0, label: 'Numbers' },
          ].map(tile => (
            <div key={tile.label} style={{ padding: '20px 22px', borderLeft: '1px solid var(--color-line)', flex: '1 1 140px' }}>
              <div className="mono" style={{ fontSize: 24, color: 'var(--color-accent-light)' }}>
                {tile.value}
              </div>
              <div className="label" style={{ marginTop: 6, color: 'var(--color-muted)' }}>
                {tile.label}
              </div>
            </div>
          ))}
        </div>

        <section style={{ border: '1px solid var(--color-line)', background: 'var(--color-surface)' }}>
          <h2 className="label" style={{ padding: '18px 22px', borderBottom: '1px solid var(--color-line)', color: 'var(--color-accent-light)' }}>
            What it owns
          </h2>
          {(record?.inboxes.length ?? 0) === 0 && (record?.numbers.length ?? 0) === 0 ? (
            <p style={{ padding: '34px 22px', fontSize: 14, color: 'var(--color-muted)', textAlign: 'center' }}>
              This agent has not bought anything it keeps yet.
            </p>
          ) : (
            <>
              {record?.inboxes.map(inbox => (
                <div key={inbox.address} style={{ display: 'flex', justifyContent: 'space-between', gap: 14, padding: '13px 22px', borderTop: '1px solid var(--color-line)', flexWrap: 'wrap' }}>
                  <span className="mono" style={{ fontSize: 13 }}>{inbox.address}</span>
                  <span style={{ fontSize: 12.5, color: 'var(--color-muted)' }}>{timeAgo(inbox.at)}</span>
                </div>
              ))}
              {record?.numbers.map(number => (
                <div key={number.phoneNumber} style={{ display: 'flex', justifyContent: 'space-between', gap: 14, padding: '13px 22px', borderTop: '1px solid var(--color-line)', flexWrap: 'wrap' }}>
                  <span className="mono" style={{ fontSize: 13 }}>
                    {number.phoneNumber} <span style={{ color: 'var(--color-muted)' }}>{number.country}</span>
                  </span>
                  <span style={{ fontSize: 12.5, color: 'var(--color-muted)' }}>{timeAgo(number.provisionedAt)}</span>
                </div>
              ))}
            </>
          )}
        </section>

        <section style={{ border: '1px solid var(--color-line)', background: 'var(--color-surface)' }}>
          <h2 className="label" style={{ padding: '18px 22px', borderBottom: '1px solid var(--color-line)', color: 'var(--color-accent-light)' }}>
            What it bought
          </h2>
          {purchases.length === 0 ? (
            <p style={{ padding: '34px 22px', fontSize: 14, color: 'var(--color-muted)', textAlign: 'center' }}>
              Nothing settled under this account yet.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
                <tbody>
                  {purchases.map(row => (
                    <tr key={row.id} style={{ borderTop: '1px solid var(--color-line)' }}>
                      <td style={{ padding: '13px 22px', fontSize: 14 }}>{row.kind}</td>
                      <td className="mono" style={{ padding: '13px 12px', fontSize: 13, color: 'var(--color-settled)' }}>
                        {formatUsdc(row.amount)}
                      </td>
                      <td className="mono" style={{ padding: '13px 12px', fontSize: 12.5 }}>
                        {row.explorer ? (
                          <a href={row.explorer} target="_blank" rel="noreferrer" style={{ color: 'var(--color-accent-light)' }}>
                            {shortHash(row.transaction ?? '', 8, 6)}
                          </a>
                        ) : (
                          <span style={{ color: 'var(--color-muted)' }}>no transaction</span>
                        )}
                      </td>
                      <td style={{ padding: '13px 22px', fontSize: 12.5, color: 'var(--color-muted)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {timeAgo(row.at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
