/**
 * Why the limit is on chain.
 *
 * This is the argument the project actually turns on, so it is made with the
 * comparison in front of the reader rather than as a list of our own virtues.
 */

interface Row {
  question: string;
  usual: string;
  here: string;
}

const ROWS: Row[] = [
  {
    question: 'Where does the limit live?',
    usual: 'In the provider’s database, checked by the provider’s server.',
    here: 'In a contract on Hedera, checked by the network.',
  },
  {
    question: 'What if the service goes down?',
    usual: 'The cap goes down with it. Whatever the agent holds, it can spend.',
    here: 'The limit still holds. Funds sit in the contract, not in the agent’s wallet.',
  },
  {
    question: 'Can it say five dollars a day?',
    usual: 'No. A balance cap bounds the total, never the rate.',
    here: 'Yes. A rolling window sits alongside the lifetime cap.',
  },
  {
    question: 'Who approves a purchase?',
    usual: 'Increasingly, a human in a queue.',
    here: 'Nobody. The agent draws and spends; the arithmetic is the only gate.',
  },
  {
    question: 'Can the agent inflate what it draws?',
    usual: 'It names the amount.',
    here: 'It names a listing and a call count. The price comes from the chain.',
  },
];

function Cell({ children, tone }: { children: React.ReactNode; tone: 'usual' | 'here' }) {
  return (
    <td
      style={{
        padding: '18px 20px',
        fontSize: 14,
        lineHeight: 1.6,
        verticalAlign: 'top',
        color: tone === 'here' ? 'var(--color-text)' : 'var(--color-muted)',
        background: tone === 'here' ? 'var(--color-surface)' : 'transparent',
        borderTop: '1px solid var(--color-line)',
      }}
    >
      {children}
    </td>
  );
}

export function Limits() {
  return (
    <section id="limits" style={{ padding: '112px 24px', borderTop: '1px solid var(--color-line)' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        <header style={{ marginBottom: 44, maxWidth: 660 }}>
          <span className="label" style={{ color: 'var(--color-accent)' }}>
            The limit
          </span>
          <h2 className="display" style={{ fontSize: 40, marginTop: 14, lineHeight: 1.15 }}>
            A cap enforced by the thing it constrains is not a cap.
          </h2>
          <p style={{ marginTop: 16, fontSize: 15.5, lineHeight: 1.7, color: 'var(--color-dim)' }}>
            Fund an agent directly and its limit becomes a suggestion, because the agent holds the
            keys. Keeping the balance one step away makes it real.
          </p>
        </header>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
            <thead>
              <tr>
                <th className="label" style={{ textAlign: 'left', padding: '0 20px 12px', color: 'var(--color-muted)' }} />
                <th
                  className="label"
                  style={{ textAlign: 'left', padding: '0 20px 12px', color: 'var(--color-muted)' }}
                >
                  The usual answer
                </th>
                <th
                  className="label"
                  style={{ textAlign: 'left', padding: '0 20px 12px', color: 'var(--color-accent-light)' }}
                >
                  Here
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map(row => (
                <tr key={row.question}>
                  <td
                    style={{
                      padding: '18px 20px',
                      fontSize: 14.5,
                      lineHeight: 1.5,
                      verticalAlign: 'top',
                      width: '26%',
                      borderTop: '1px solid var(--color-line)',
                    }}
                  >
                    {row.question}
                  </td>
                  <Cell tone="usual">{row.usual}</Cell>
                  <Cell tone="here">{row.here}</Cell>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p
          className="mono"
          style={{
            marginTop: 28,
            fontSize: 12.5,
            lineHeight: 1.7,
            color: 'var(--color-muted)',
            maxWidth: 660,
          }}
        >
          AgentTreasury.sol · 27 tests · the daily cap, the lifetime cap, expiry, revocation, and
          the rule that raising a cap does not refund what was already spent.
        </p>
      </div>
    </section>
  );
}
