/**
 * The operator console.
 *
 * One screen that answers the four questions an owner has about an agent that
 * spends money: what did I authorise, what has it spent, what did it buy, and
 * what did it try to buy that I did not allow. The last one is the reason this
 * page exists — a spending cap can tell you a balance went down, but only a
 * warrant can tell you what was refused and why.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  explorerAccount,
  explorerTx,
  formatUsdc,
  getPricing,
  listRefusals,
  listWarrants,
  listReceipts,
  percentSpent,
  registerWarrant,
  revokeWarrant,
  shortId,
  timeAgo,
  untilExpiry,
  type Pricing,
  type Receipt,
  type Refusal,
  type WarrantView,
} from '../lib/api';
import { OwnerProvider, useOwner } from '../lib/ownerContext';
import { humanizeSignerError, shortAddress, toAtomic } from '../lib/owner';
import { CheckIcon, CopyIcon, ExternalIcon, LockIcon } from './Icons';
import { WarrantMark } from './Logo';

const BRASS = '#E8B55C';
const BRASS_DEEP = '#C98A2E';
const SETTLED = '#6FE3A5';
const REFUSED = '#E5484D';
const LINE = 'rgba(232, 181, 92,0.14)';
const SURFACE = '#0e0e0f';
const DIM = 'rgba(247,246,243,0.55)';
const MUTED = 'rgba(247,246,243,0.35)';

// ── primitives ──────────────────────────────────────────────────────────

function Panel({
  title,
  aside,
  children,
  pad = 20,
}: {
  title?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  pad?: number;
}) {
  return (
    <section style={{ background: SURFACE, border: `1px solid ${LINE}` }}>
      {title && (
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '13px 20px',
            borderBottom: `1px solid ${LINE}`,
          }}
        >
          <h2 className="label" style={{ color: DIM, margin: 0 }}>
            {title}
          </h2>
          {aside}
        </header>
      )}
      <div style={{ padding: pad }}>{children}</div>
    </section>
  );
}

/** Status as shape and colour, not only as a word. */
function Pill({ status }: { status: WarrantView['status'] }) {
  const look = {
    live: { fg: SETTLED, bg: 'rgba(111,227,165,0.1)', bd: 'rgba(111,227,165,0.3)', text: 'live' },
    revoked: { fg: REFUSED, bg: 'rgba(229,72,77,0.1)', bd: 'rgba(229,72,77,0.3)', text: 'revoked' },
    expired: { fg: MUTED, bg: 'rgba(247,246,243,0.05)', bd: 'rgba(247,246,243,0.14)', text: 'expired' },
  }[status];
  return (
    <span
      className="label"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 8px',
        color: look.fg,
        background: look.bg,
        border: `1px solid ${look.bd}`,
        fontSize: 10,
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: look.fg }} />
      {look.text}
    </span>
  );
}

function Chip({ children, tone = 'brass' }: { children: React.ReactNode; tone?: 'brass' | 'plain' }) {
  const brass = tone === 'brass';
  return (
    <span
      className="mono"
      style={{
        fontSize: 11,
        padding: '3px 7px',
        color: brass ? BRASS : DIM,
        background: brass ? 'rgba(232, 181, 92,0.08)' : 'rgba(247,246,243,0.04)',
        border: `1px solid ${brass ? 'rgba(232, 181, 92,0.22)' : 'rgba(247,246,243,0.1)'}`,
      }}
    >
      {children}
    </span>
  );
}

/**
 * Spend against the cap. The bar is the cap, not the spend, so a warrant that
 * has barely been used looks barely used — the empty space is the headroom the
 * owner still has at risk.
 */
function SpendBar({ w }: { w: WarrantView }) {
  const pct = percentSpent(w);
  const exhausted = pct >= 99.5;
  const fill = w.status !== 'live' ? MUTED : exhausted ? REFUSED : BRASS;
  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 10,
          marginBottom: 6,
        }}
      >
        <span
          className="mono"
          style={{ fontSize: 15, color: '#F7F6F3', fontVariantNumeric: 'tabular-nums' }}
        >
          {formatUsdc(w.spent)}
        </span>
        <span className="mono" style={{ fontSize: 11, color: MUTED, fontVariantNumeric: 'tabular-nums' }}>
          of {formatUsdc(w.cap)}
        </span>
      </div>
      <div style={{ height: 4, background: 'rgba(247,246,243,0.07)', overflow: 'hidden' }}>
        <div
          style={{
            width: `${Math.max(pct, pct > 0 ? 1.5 : 0)}%`,
            height: '100%',
            background: fill,
            transition: 'width 0.4s ease',
          }}
        />
      </div>
    </div>
  );
}

function Copyable({ value, label }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(value).then(
          () => {
            setDone(true);
            setTimeout(() => setDone(false), 1400);
          },
          () => {}
        );
      }}
      title={value}
      className="mono"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: 'none',
        border: 'none',
        padding: 0,
        color: DIM,
        fontSize: 11,
        cursor: 'pointer',
        fontFamily: 'IBM Plex Mono, monospace',
      }}
    >
      {label ?? shortId(value)}
      {done ? <CheckIcon size={11} color={SETTLED} /> : <CopyIcon size={11} />}
    </button>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.7, margin: 0 }}>{children}</p>
  );
}

// ── owner bar ───────────────────────────────────────────────────────────

function OwnerBar() {
  const { state, hasWallet, connectWallet, createKey, unlockKey, lock } = useOwner();
  const [passphrase, setPassphrase] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<string | null>(null);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(humanizeSignerError(err));
    } finally {
      setBusy(false);
    }
  };

  if (state.kind === 'ready') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span className="label" style={{ color: MUTED }}>
          signing as
        </span>
        <Chip>{shortAddress(state.signer.address)}</Chip>
        <span style={{ fontSize: 11, color: MUTED }}>
          {state.signer.kind === 'injected' ? 'browser wallet' : 'local key'}
        </span>
        <button onClick={lock} style={ghostButton}>
          Lock
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {state.kind === 'locked' ? (
          <>
            <span style={{ fontSize: 13, color: DIM, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <LockIcon size={13} color={MUTED} />
              {shortAddress(state.stored.address)}
            </span>
            <input
              type="password"
              value={passphrase}
              onChange={e => setPassphrase(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') run(() => unlockKey(passphrase));
              }}
              placeholder="passphrase"
              style={{ ...inputStyle, width: 160 }}
            />
            <button
              disabled={busy}
              onClick={() => run(() => unlockKey(passphrase))}
              style={primaryButton}
            >
              Unlock
            </button>
          </>
        ) : (
          <>
            {hasWallet && (
              <button disabled={busy} onClick={() => run(connectWallet)} style={primaryButton}>
                Connect wallet
              </button>
            )}
            <input
              type="password"
              value={passphrase}
              onChange={e => setPassphrase(e.target.value)}
              placeholder="passphrase for a local key"
              style={{ ...inputStyle, width: 210 }}
            />
            <button
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const key = await createKey(passphrase);
                  setRevealed(key.privateKey);
                })
              }
              style={ghostButton}
            >
              Create local key
            </button>
          </>
        )}
      </div>

      {revealed && (
        <div
          style={{
            padding: 12,
            background: 'rgba(232, 181, 92,0.06)',
            border: `1px solid ${LINE}`,
            fontSize: 12,
            color: DIM,
            lineHeight: 1.6,
          }}
        >
          This key is the owner in this system. It is encrypted in this browser and nowhere
          else, so if you lose the passphrase you lose the ability to revoke anything you
          signed with it. Back it up now.
          <div style={{ marginTop: 8 }}>
            <Copyable value={revealed} label="copy private key" />
          </div>
        </div>
      )}

      {error && (
        <p style={{ fontSize: 12, color: REFUSED, margin: 0 }}>{error}</p>
      )}
      {state.kind === 'none' && !hasWallet && !error && (
        <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>
          No browser wallet detected. A local key signs the same warrants.
        </p>
      )}
    </div>
  );
}

// ── issuing ─────────────────────────────────────────────────────────────

function IssueWarrant({
  pricing,
  onIssued,
}: {
  pricing: Pricing | null;
  onIssued: (w: WarrantView, header: string) => void;
}) {
  const { state, network, assetDecimals, health } = useOwner();
  const [agent, setAgent] = useState('');
  const [cap, setCap] = useState('1.00');
  const [purpose, setPurpose] = useState('');
  const [hours, setHours] = useState('24');
  const [chosen, setChosen] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const catalogue = pricing?.resources ?? [];

  // Default to nothing selected. An empty resource list authorises nothing,
  // and making the owner name what they are buying is the whole point.
  const toggle = (r: string) =>
    setChosen(prev => (prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]));

  const signer = state.kind === 'ready' ? state.signer : null;

  const submit = async () => {
    setError(null);
    if (!signer) return setError('Connect a wallet or unlock a local key first.');
    if (!/^\d+\.\d+\.\d+$/.test(agent.trim()))
      return setError('The agent is a Hedera account id, like 0.0.12345.');
    if (chosen.length === 0)
      return setError('Choose at least one resource. A warrant that covers nothing authorises nothing.');
    if (!purpose.trim())
      return setError('Say what this is for. The purpose is written onto every receipt.');

    const hrs = Number(hours);
    if (!Number.isFinite(hrs) || hrs <= 0) return setError('Expiry must be a positive number of hours.');

    setBusy(true);
    try {
      const signed = await signer.signWarrant(
        {
          agent: agent.trim(),
          asset: health?.asset ?? pricing?.asset ?? '',
          cap: toAtomic(cap, assetDecimals),
          resources: chosen,
          purpose: purpose.trim(),
          expiry: Math.floor(Date.now() / 1000) + Math.round(hrs * 3600),
        },
        network
      );
      const res = await registerWarrant(signed);
      onIssued(res.warrant, res.header);
      setPurpose('');
      setChosen([]);
    } catch (err) {
      setError(humanizeSignerError(err));
    } finally {
      setBusy(false);
    }
  };

  const estimate = useMemo(() => {
    if (!chosen.length || !catalogue.length) return null;
    const prices = chosen
      .map(r => catalogue.find(c => c.resource === r))
      .filter(Boolean) as Pricing['resources'];
    if (!prices.length) return null;
    const cheapest = prices.reduce((a, b) => (BigInt(a.atomic) <= BigInt(b.atomic) ? a : b));
    try {
      const capAtomic = BigInt(toAtomic(cap, assetDecimals));
      const n = capAtomic / BigInt(cheapest.atomic);
      return `${n.toLocaleString()} × ${cheapest.resource} at most`;
    } catch {
      return null;
    }
  }, [chosen, catalogue, cap, assetDecimals]);

  return (
    <Panel title="Issue a warrant">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="Agent" hint="The one Hedera account this warrant authorises.">
          <input
            value={agent}
            onChange={e => setAgent(e.target.value)}
            placeholder="0.0.12345"
            style={inputStyle}
          />
        </Field>

        <Field label="Resources" hint="Anything not listed here is refused before money moves.">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {catalogue.length === 0 && <Empty>Waiting for the service catalogue.</Empty>}
            {catalogue.map(r => {
              const on = chosen.includes(r.resource);
              return (
                <button
                  key={r.resource}
                  onClick={() => toggle(r.resource)}
                  className="mono"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '7px 10px',
                    fontSize: 12,
                    cursor: 'pointer',
                    color: on ? BRASS : DIM,
                    background: on ? 'rgba(232, 181, 92,0.1)' : 'transparent',
                    border: `1px solid ${on ? 'rgba(232, 181, 92,0.4)' : 'rgba(247,246,243,0.12)'}`,
                    fontFamily: 'IBM Plex Mono, monospace',
                    transition: 'all 0.15s',
                  }}
                >
                  {on ? <CheckIcon size={11} color={BRASS} /> : <span style={{ width: 11 }} />}
                  {r.resource}
                  <span style={{ color: MUTED }}>{r.price}</span>
                </button>
              );
            })}
          </div>
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Cap" hint={pricing ? `In ${pricing.asset}` : undefined}>
            <input value={cap} onChange={e => setCap(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Expires in" hint="Hours">
            <input value={hours} onChange={e => setHours(e.target.value)} style={inputStyle} />
          </Field>
        </div>

        <Field label="Purpose" hint="Written onto every receipt, so spend stays explicable later.">
          <input
            value={purpose}
            onChange={e => setPurpose(e.target.value)}
            placeholder="Support triage for the September backlog"
            style={inputStyle}
          />
        </Field>

        {estimate && (
          <p className="mono" style={{ fontSize: 11, color: MUTED, margin: 0 }}>
            This cap buys {estimate}.
          </p>
        )}

        <button disabled={busy || !signer} onClick={submit} style={{ ...primaryButton, height: 40 }}>
          {busy ? 'Waiting for your signature…' : 'Sign warrant'}
        </button>

        <p style={{ fontSize: 11, color: MUTED, lineHeight: 1.6, margin: 0 }}>
          Signing costs nothing and touches no chain. The signature is the warrant.
        </p>

        {error && <p style={{ fontSize: 12, color: REFUSED, margin: 0 }}>{error}</p>}
      </div>
    </Panel>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span className="label" style={{ color: DIM }}>
        {label}
      </span>
      {children}
      {hint && <span style={{ fontSize: 11, color: MUTED, lineHeight: 1.5 }}>{hint}</span>}
    </label>
  );
}

// ── warrants ────────────────────────────────────────────────────────────

function WarrantCard({
  w,
  selected,
  onSelect,
  onRevoke,
  canRevoke,
}: {
  w: WarrantView;
  selected: boolean;
  onSelect: () => void;
  onRevoke: () => void;
  canRevoke: boolean;
}) {
  return (
    <article
      onClick={onSelect}
      style={{
        padding: 16,
        cursor: 'pointer',
        background: selected ? 'rgba(232, 181, 92,0.05)' : 'transparent',
        borderLeft: `2px solid ${selected ? BRASS : 'transparent'}`,
        borderBottom: `1px solid ${LINE}`,
        transition: 'background 0.15s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
        <div style={{ minWidth: 0 }}>
          <h3
            style={{
              fontSize: 14,
              fontWeight: 500,
              margin: 0,
              color: '#F7F6F3',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {w.purpose}
          </h3>
          <p className="mono" style={{ fontSize: 11, color: MUTED, margin: '4px 0 0' }}>
            {w.agent} · {w.status === 'live' ? untilExpiry(w.expiry) : `${w.status} ${timeAgo(w.revokedAt ?? w.expiry)}`}
          </p>
        </div>
        <Pill status={w.status} />
      </div>

      <SpendBar w={w} />

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12, alignItems: 'center' }}>
        {w.resources.map(r => (
          <Chip key={r}>{r}</Chip>
        ))}
        <span style={{ flex: 1 }} />
        {w.status === 'live' && canRevoke && (
          <button
            onClick={e => {
              e.stopPropagation();
              onRevoke();
            }}
            style={{ ...ghostButton, color: REFUSED, borderColor: 'rgba(229,72,77,0.3)' }}
          >
            Revoke
          </button>
        )}
      </div>
    </article>
  );
}

function ReceiptsTable({ receipts, network }: { receipts: Receipt[]; network: string }) {
  if (!receipts.length) {
    return (
      <Empty>
        Nothing has settled under this warrant yet. A receipt is written only after the
        money has actually moved, so this list is never a prediction.
      </Empty>
    );
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            {['When', 'Resource', 'Amount', 'Payer', 'Transaction'].map(h => (
              <th key={h} className="label" style={thStyle}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {receipts.map(r => (
            <tr key={r.id}>
              <td style={tdStyle}>{timeAgo(r.created_at)}</td>
              <td style={tdStyle}>
                <Chip>{r.resource}</Chip>
              </td>
              <td style={{ ...tdStyle, color: SETTLED, fontVariantNumeric: 'tabular-nums' }}>
                {formatUsdc(r.amount)}
              </td>
              <td style={tdStyle}>
                <a
                  href={explorerAccount(r.payer, network)}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: DIM }}
                >
                  {r.payer}
                </a>
              </td>
              <td style={tdStyle}>
                <a
                  href={explorerTx(r.tx_id, network)}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: BRASS, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  {shortId(r.tx_id, 14, 4)}
                  <ExternalIcon size={10} />
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RefusalsTable({ refusals }: { refusals: Refusal[] }) {
  if (!refusals.length) {
    return <Empty>No purchase has been refused yet.</Empty>;
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            {['When', 'Wanted', 'Agent', 'Refused because'].map(h => (
              <th key={h} className="label" style={thStyle}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {refusals.map(r => (
            <tr key={r.id}>
              <td style={tdStyle}>{timeAgo(r.created_at)}</td>
              <td style={tdStyle}>
                <Chip tone="plain">{r.resource}</Chip>{' '}
                <span style={{ color: MUTED, fontVariantNumeric: 'tabular-nums' }}>
                  {formatUsdc(r.price)}
                </span>
              </td>
              <td style={tdStyle}>{r.agent ?? '—'}</td>
              <td style={{ ...tdStyle, whiteSpace: 'normal', maxWidth: 420 }}>
                <span className="mono" style={{ color: REFUSED, fontSize: 11 }}>
                  {r.code}
                </span>
                <div style={{ color: DIM, marginTop: 3, lineHeight: 1.5 }}>{r.reason}</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── the page ────────────────────────────────────────────────────────────

function ConsoleBody() {
  const { state, network, health, healthError } = useOwner();
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [warrants, setWarrants] = useState<WarrantView[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [refusals, setRefusals] = useState<Refusal[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<'receipts' | 'refusals'>('receipts');
  const [issuedHeader, setIssuedHeader] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [w, rc, rf] = await Promise.all([listWarrants(), listReceipts(), listRefusals()]);
      setWarrants(w);
      setReceipts(rc);
      setRefusals(rf);
      setLoadError(null);
    } catch (err) {
      setLoadError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    getPricing().then(setPricing).catch(() => {});
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh]);

  const signer = state.kind === 'ready' ? state.signer : null;
  const current = warrants.find(w => w.id === selected) ?? warrants[0] ?? null;

  const shownReceipts = current ? receipts.filter(r => r.warrant_id === current.id) : receipts;
  const shownRefusals = current ? refusals.filter(r => r.warrant_id === current.id) : refusals;

  const totals = useMemo(() => {
    const live = warrants.filter(w => w.status === 'live');
    const sum = (rows: WarrantView[], k: 'cap' | 'spent') =>
      rows.reduce((a, w) => a + BigInt(w[k]), 0n).toString();
    return {
      live: live.length,
      authorised: sum(live, 'cap'),
      spent: sum(warrants, 'spent'),
      refused: refusals.length,
    };
  }, [warrants, refusals]);

  const doRevoke = async (w: WarrantView) => {
    if (!signer) return setNotice('Unlock the owner key before revoking.');
    setNotice(null);
    try {
      const { revocation, signature } = await signer.signRevocation(w.id, network);
      const res = await revokeWarrant(w.id, revocation, signature);
      setNotice(
        res.alreadyRevoked
          ? 'That warrant was already revoked.'
          : 'Revoked. The next request under it will be refused.'
      );
      refresh();
    } catch (err) {
      setNotice(humanizeSignerError(err));
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#070707' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
          flexWrap: 'wrap',
          padding: '18px 28px',
          borderBottom: `1px solid ${LINE}`,
          background: 'rgba(14,14,15,0.7)',
          backdropFilter: 'blur(20px)',
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <WarrantMark size={22} />
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>Warrant</span>
          <span className="label" style={{ color: MUTED, marginLeft: 6 }}>
            console
          </span>
        </a>
        <OwnerBar />
      </header>

      <div style={{ maxWidth: 1360, margin: '0 auto', padding: '24px 28px 80px' }}>
        {(healthError || loadError) && (
          <div
            style={{
              padding: 14,
              marginBottom: 20,
              border: `1px solid rgba(229,72,77,0.3)`,
              background: 'rgba(229,72,77,0.07)',
              fontSize: 13,
              color: '#F7F6F3',
            }}
          >
            {healthError || loadError}
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 1,
            background: LINE,
            border: `1px solid ${LINE}`,
            marginBottom: 24,
          }}
        >
          <Tile label="Live warrants" value={String(totals.live)} />
          <Tile label="Authorised" value={formatUsdc(totals.authorised)} tone={BRASS} />
          <Tile label="Settled" value={formatUsdc(totals.spent)} tone={SETTLED} />
          <Tile
            label="Refused"
            value={String(totals.refused)}
            tone={totals.refused > 0 ? REFUSED : undefined}
          />
        </div>

        <div className="console-grid" style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <IssueWarrant
              pricing={pricing}
              onIssued={(w, header) => {
                setSelected(w.id);
                setIssuedHeader(header);
                refresh();
              }}
            />

            {issuedHeader && (
              <Panel title="Hand this to the agent">
                <p style={{ fontSize: 12, color: DIM, lineHeight: 1.7, margin: '0 0 10px' }}>
                  The agent presents this in the <span className="mono">X-Warrant</span> header on
                  every purchase. It is the signed warrant, base64 encoded, and it is not a
                  secret: it authorises one agent to buy named things up to a cap, and nothing
                  else.
                </p>
                <div
                  className="mono"
                  style={{
                    padding: 10,
                    background: '#070707',
                    border: `1px solid ${LINE}`,
                    fontSize: 10,
                    color: DIM,
                    wordBreak: 'break-all',
                    maxHeight: 110,
                    overflowY: 'auto',
                    lineHeight: 1.5,
                  }}
                >
                  {issuedHeader}
                </div>
                <div style={{ marginTop: 10 }}>
                  <Copyable value={issuedHeader} label="copy header" />
                </div>
              </Panel>
            )}

            {health && (
              <Panel title="This service">
                <dl style={{ display: 'grid', gap: 10, margin: 0 }}>
                  <Fact k="Network" v={health.network} />
                  <Fact k="Settles in" v={`${health.asset} · ${health.assetDecimals} dp`} />
                  <Fact k="Pays to" v={health.payTo ?? 'not configured'} />
                  <Fact k="Facilitator" v={health.facilitator.replace(/^https?:\/\//, '')} />
                </dl>
              </Panel>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
            <Panel
              title="Warrants"
              pad={0}
              aside={
                <span className="mono" style={{ fontSize: 11, color: MUTED }}>
                  {warrants.length}
                </span>
              }
            >
              {warrants.length === 0 ? (
                <div style={{ padding: 20 }}>
                  <Empty>
                    No warrant has been issued yet. Sign one on the left, and the agent named in
                    it can start buying the moment it has the header.
                  </Empty>
                </div>
              ) : (
                warrants.map(w => (
                  <WarrantCard
                    key={w.id}
                    w={w}
                    selected={current?.id === w.id}
                    onSelect={() => setSelected(w.id)}
                    onRevoke={() => doRevoke(w)}
                    canRevoke={
                      !!signer && signer.address.toLowerCase() === w.owner.toLowerCase()
                    }
                  />
                ))
              )}
            </Panel>

            {notice && (
              <p style={{ fontSize: 13, color: BRASS, margin: 0 }}>{notice}</p>
            )}

            <Panel
              title={current ? `Activity · ${current.purpose}` : 'Activity'}
              pad={20}
              aside={
                <div style={{ display: 'flex', gap: 4 }}>
                  {(['receipts', 'refusals'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className="label"
                      style={{
                        padding: '4px 9px',
                        cursor: 'pointer',
                        background: tab === t ? 'rgba(232, 181, 92,0.1)' : 'transparent',
                        color: tab === t ? BRASS : MUTED,
                        border: `1px solid ${tab === t ? 'rgba(232, 181, 92,0.3)' : 'transparent'}`,
                        fontSize: 10,
                      }}
                    >
                      {t} {t === 'receipts' ? shownReceipts.length : shownRefusals.length}
                    </button>
                  ))}
                </div>
              }
            >
              {tab === 'receipts' ? (
                <ReceiptsTable receipts={shownReceipts} network={network} />
              ) : (
                <RefusalsTable refusals={shownRefusals} />
              )}
            </Panel>

            {current && (
              <Panel title="What this warrant says">
                <dl style={{ display: 'grid', gap: 10, margin: 0 }}>
                  <Fact k="Id" v={<Copyable value={current.id} />} />
                  <Fact k="Owner" v={shortAddress(current.owner)} />
                  <Fact k="Agent" v={current.agent} />
                  <Fact k="Covers" v={current.resources.join(', ') || 'nothing'} />
                  <Fact k="Cap" v={formatUsdc(current.cap)} />
                  <Fact k="Remaining" v={formatUsdc(current.remaining)} />
                  <Fact
                    k="Expiry"
                    v={`${new Date(current.expiry * 1000).toLocaleString()} · ${untilExpiry(current.expiry)}`}
                  />
                </dl>
              </Panel>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div style={{ padding: '16px 18px', background: SURFACE }}>
      <div className="label" style={{ color: MUTED, marginBottom: 8 }}>
        {label}
      </div>
      <div
        className="mono"
        style={{
          fontSize: 22,
          fontWeight: 500,
          color: tone ?? '#F7F6F3',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
    </div>
  );
}

function Fact({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'baseline' }}>
      <dt className="label" style={{ color: MUTED, flexShrink: 0 }}>
        {k}
      </dt>
      <dd
        className="mono"
        style={{ fontSize: 12, color: DIM, margin: 0, textAlign: 'right', wordBreak: 'break-word' }}
      >
        {v}
      </dd>
    </div>
  );
}

// ── shared style objects ────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  height: 34,
  padding: '0 10px',
  background: '#070707',
  border: `1px solid rgba(247,246,243,0.12)`,
  color: '#F7F6F3',
  fontSize: 13,
  fontFamily: 'IBM Plex Mono, monospace',
  outline: 'none',
  width: '100%',
};

const primaryButton: React.CSSProperties = {
  height: 34,
  padding: '0 14px',
  background: BRASS_DEEP,
  color: '#0b0b0b',
  border: 'none',
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.02em',
  cursor: 'pointer',
};

const ghostButton: React.CSSProperties = {
  height: 28,
  padding: '0 10px',
  background: 'transparent',
  color: DIM,
  border: `1px solid rgba(247,246,243,0.16)`,
  fontSize: 11,
  cursor: 'pointer',
  fontFamily: 'IBM Plex Mono, monospace',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 12,
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '0 14px 9px 0',
  color: MUTED,
  borderBottom: `1px solid ${LINE}`,
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '11px 14px 11px 0',
  borderBottom: `1px solid rgba(247,246,243,0.05)`,
  color: DIM,
  fontFamily: 'IBM Plex Mono, monospace',
  whiteSpace: 'nowrap',
  verticalAlign: 'top',
};

export function Console() {
  return (
    <OwnerProvider>
      <ConsoleBody />
    </OwnerProvider>
  );
}

export default Console;
