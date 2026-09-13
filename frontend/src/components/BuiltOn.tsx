/**
 * What this is actually built on.
 *
 * Four names, each with the sentence that says what it does here. A strip of
 * logos with no sentences is a sponsor wall; the useful version tells you
 * which part of the system each one is, so a reader can go and check the
 * claim. Nothing appears here that the code does not use — the marks went up
 * as each integration became real, and a name with no working call behind it
 * would make the other three worth less.
 */
import type { ReactElement } from 'react';
import { HederaMark, X402Mark, PrivyMark, BazanticMark } from './marks';

const BUILT_ON: { name: string; role: string; href: string; Mark: () => ReactElement }[] = [
  {
    name: 'Hedera',
    role: 'Settles every payment in USDC, and holds the contract that says no.',
    href: 'https://hashscan.io/testnet/contract/0xF33E2E0ecc982416f788759083129de6A147a1FE',
    Mark: HederaMark,
  },
  {
    name: 'x402',
    role: 'Turns 402 Payment Required into a price an agent can pay and retry.',
    href: 'https://github.com/coinbase/x402',
    Mark: X402Mark,
  },
  {
    name: 'Privy',
    role: "Holds the agent's key, and refuses to sign what the policy forbids.",
    href: 'https://privy.io',
    Mark: PrivyMark,
  },
  {
    name: 'Bazantic',
    role: 'Lists the catalogue, and the Recipes other agents run against it.',
    href: 'https://bazantic.com/recipes/agent-starter-kit',
    Mark: BazanticMark,
  },
];

export function BuiltOn() {
  return (
    <section className="built-on" aria-labelledby="built-on-title">
      <div className="built-on-inner">
        <div id="built-on-title" className="mono built-on-eyebrow">
          Built on
        </div>
        <ul className="built-on-grid">
          {BUILT_ON.map(({ name, role, href, Mark }) => (
            <li key={name}>
              <a href={href} target="_blank" rel="noreferrer" className="built-on-item">
                <span className="built-on-mark" aria-hidden="true">
                  <Mark />
                </span>
                <span className="built-on-name">{name}</span>
                <span className="built-on-role">{role}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
