/**
 * Does every page still render?
 *
 *   npm run check:renders
 *
 * Renders each top-level component to a string and fails on one that throws or
 * comes back empty. It will not catch a layout problem, but it does catch the
 * class of mistake that a typecheck cannot and that only shows up as a blank
 * page: a bad hook call, a missing provider, a destructure of undefined.
 */
import { renderToString } from 'react-dom/server';
import { Hero } from '../src/components/Hero';
import { Terminal } from '../src/components/Terminal';
import { Resources } from '../src/components/Resources';
import { HowItWorks } from '../src/components/HowItWorks';
import { Settlement } from '../src/components/Settlement';
import { Footer } from '../src/components/Footer';
import { Nav } from '../src/components/Nav';
import { Limits } from '../src/components/Limits';
import { NumberSearch } from '../src/components/NumberSearch';
import { Ledger } from '../src/components/Ledger';
import { Docs } from '../src/components/Docs';
import { AgentProfile } from '../src/components/AgentProfile';
import { NotFound } from '../src/components/NotFound';

const cases: [string, () => JSX.Element][] = [
  ['Nav', () => <Nav />],
  ['Hero', () => <Hero />],
  ['Terminal', () => <Terminal />],
  ['Resources', () => <Resources />],
  ['NumberSearch', () => <NumberSearch />],
  ['HowItWorks', () => <HowItWorks />],
  ['Settlement', () => <Settlement />],
  ['Footer', () => <Footer />],
  ['Limits', () => <Limits />],
  ['Ledger', () => <Ledger />],
  ['Docs', () => <Docs />],
  ['AgentProfile', () => <AgentProfile agent="0.0.4242" />],
  ['NotFound', () => <NotFound />],
];

export function run(): number {
  let failed = 0;
  for (const [name, make] of cases) {
    try {
      const html = renderToString(make());
      const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      console.log(`  ok    ${name.padEnd(14)} ${String(html.length).padStart(6)} bytes html, ${String(text.length).padStart(5)} chars text`);
      if (text.length < 40) {
        console.log(`  WARN  ${name} rendered almost no text`);
        failed++;
      }
    } catch (err) {
      console.log(`  FAIL  ${name}: ${(err as Error).message}`);
      failed++;
    }
  }
  console.log(failed === 0 ? '\nALL COMPONENTS RENDER' : `\n${failed} PROBLEM(S)`);
  return failed;
}

process.exitCode = run();
