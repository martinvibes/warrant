import { useEffect } from 'react';
import { Nav } from './components/Nav';
import { Hero } from './components/Hero';
import { Terminal } from './components/Terminal';
import { Limits } from './components/Limits';
import { HowItWorks } from './components/HowItWorks';
import { Settlement } from './components/Settlement';
import { Footer } from './components/Footer';
import { AgentProfile } from './components/AgentProfile';
import { Docs } from './components/Docs';
import { Ledger } from './components/Ledger';
import { Resources } from './components/Resources';
import { NumberSearch } from './components/NumberSearch';
import { NotFound } from './components/NotFound';

function App() {
  const path = typeof window !== 'undefined' ? window.location.pathname : '/';

  // Scroll reveal for the landing sections.
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.1 }
    );
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [path]);

  // /ledger — what this service sold, readable by anyone with no credentials.
  if (path === '/ledger' || path === '/ledger/') return <Ledger />;

  if (path === '/docs' || path === '/docs/') return <Docs />;

  const agentMatch = path.match(/^\/agent\/([^/]+)\/?$/);
  if (agentMatch) return <AgentProfile agent={decodeURIComponent(agentMatch[1])} />;

  if (path === '/' || path === '') {
    return (
      <>
        <Nav />
        <Hero />
        <div className="reveal"><Resources /></div>
        <div className="reveal"><NumberSearch /></div>
        <div className="reveal"><Terminal /></div>
        <div className="reveal"><Limits /></div>
        <div className="reveal"><HowItWorks /></div>
        <div className="reveal"><Settlement /></div>
        <Footer />
      </>
    );
  }

  return <NotFound />;
}

export default App;
