import { useEffect, useState } from 'react';
import { searchNumbers, type NumberOption } from '../lib/api';

/**
 * Live inventory from the number provider.
 *
 * This calls the same unpriced endpoint an agent calls, against the real
 * provider, so what is on the page is what is genuinely for sale this minute.
 * Searching is free here for the same reason it is free there: an agent that
 * cannot see the price before it commits is not choosing.
 */

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
];

export function NumberSearch() {
  const [country, setCountry] = useState('US');
  const [area, setArea] = useState('');
  const [numbers, setNumbers] = useState<NumberOption[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');
  const [message, setMessage] = useState('');

  const run = (nextCountry = country, nextArea = area) => {
    setState('loading');
    searchNumbers({ country: nextCountry, area: nextArea || undefined, limit: 6 })
      .then(r => {
        setNumbers(r.numbers);
        setState(r.numbers.length ? 'ready' : 'empty');
        setMessage(r.error ?? '');
      })
      .catch(e => {
        setState('error');
        setMessage((e as Error).message);
      });
  };

  // One search on arrival, so the panel shows real numbers rather than a form.
  useEffect(() => {
    run('US', '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section
      id="numbers"
      style={{ padding: '112px 24px', borderTop: '1px solid var(--color-line)' }}
    >
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <header style={{ marginBottom: 34, maxWidth: 660 }}>
          <span className="label" style={{ color: 'var(--color-accent)' }}>
            Live inventory
          </span>
          <h2 className="display" style={{ fontSize: 34, marginTop: 14, lineHeight: 1.15 }}>
            Numbers an agent can buy right now.
          </h2>
          <p style={{ marginTop: 14, fontSize: 15, lineHeight: 1.7, color: 'var(--color-dim)' }}>
            Searching is free, here and for the agent. The number it orders is the number it was
            quoted, not whatever a second search returns.
          </p>
        </header>

        <div
          style={{
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
            alignItems: 'center',
            padding: '16px 18px',
            border: '1px solid var(--color-line)',
            borderBottom: 'none',
            background: 'var(--color-surface)',
          }}
        >
          <select
            value={country}
            onChange={e => {
              setCountry(e.target.value);
              run(e.target.value, area);
            }}
            className="mono"
            style={{
              padding: '8px 10px',
              fontSize: 13,
              color: 'var(--color-text)',
              background: 'var(--color-bg)',
              border: '1px solid var(--color-line)',
            }}
          >
            {COUNTRIES.map(c => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>

          <input
            value={area}
            onChange={e => setArea(e.target.value.replace(/\D/g, '').slice(0, 4))}
            onKeyDown={e => e.key === 'Enter' && run()}
            placeholder="area code, optional"
            className="mono"
            style={{
              flex: '1 1 180px',
              padding: '8px 10px',
              fontSize: 13,
              color: 'var(--color-text)',
              background: 'var(--color-bg)',
              border: '1px solid var(--color-line)',
            }}
          />

          <button
            onClick={() => run()}
            className="label"
            style={{
              padding: '9px 18px',
              cursor: 'pointer',
              background: 'var(--color-accent)',
              color: '#000',
              border: 'none',
            }}
          >
            {state === 'loading' ? 'Searching' : 'Search'}
          </button>

          <span className="mono" style={{ fontSize: 12, color: 'var(--color-muted)' }}>
            GET /v1/phone/search
          </span>
        </div>

        <div style={{ border: '1px solid var(--color-line)', background: 'var(--color-surface)' }}>
          {state === 'error' && (
            <p style={{ padding: '30px 20px', fontSize: 14, color: 'var(--color-refused)' }}>
              The provider could not be reached: {message}
            </p>
          )}

          {state === 'empty' && (
            <p style={{ padding: '30px 20px', fontSize: 14, color: 'var(--color-muted)' }}>
              Nothing is available on those filters. Try a different area code.
            </p>
          )}

          {state !== 'error' && numbers.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
                <tbody>
                  {numbers.map(n => (
                    <tr key={n.phoneNumber} style={{ borderTop: '1px solid var(--color-line)' }}>
                      <td
                        className="mono"
                        style={{ padding: '14px 20px', fontSize: 14, color: 'var(--color-accent-light)', whiteSpace: 'nowrap' }}
                      >
                        {n.phoneNumber}
                      </td>
                      <td style={{ padding: '14px 12px', fontSize: 13.5, color: 'var(--color-dim)' }}>
                        {n.region || n.country}
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {n.features
                            .filter(f => ['sms', 'mms', 'voice'].includes(f))
                            .map(f => (
                              <span
                                key={f}
                                className="label"
                                style={{
                                  padding: '2px 7px',
                                  fontSize: 10,
                                  color: 'var(--color-muted)',
                                  border: '1px solid var(--color-faint)',
                                }}
                              >
                                {f}
                              </span>
                            ))}
                        </span>
                      </td>
                      <td
                        className="mono"
                        style={{
                          padding: '14px 20px',
                          fontSize: 13,
                          textAlign: 'right',
                          whiteSpace: 'nowrap',
                          color: 'var(--color-dim)',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {n.monthly ? `${Number(n.monthly).toFixed(2)} ${n.currency ?? ''} / month` : 'price on order'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {state === 'loading' && numbers.length === 0 && (
            <p style={{ padding: '30px 20px', fontSize: 14, color: 'var(--color-muted)' }}>
              Asking the provider what is free…
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
