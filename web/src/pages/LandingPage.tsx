import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Stats } from "../api";
import ProductMockup from "../components/ProductMockup";
import { shortKey } from "../time";
import { useReveal } from "../useReveal";
import "../landing.css";

const NEWS = [
  {
    source: "RSF",
    date: "13 Oct 2026",
    title: "Around 40 journalists detained while covering electoral-roll protests",
    body: "Police in New Delhi and other cities held reporters covering protests against the electoral roll revision for several hours.",
    impact: "When the people filming a protest are detained, the record depends on who holds the footage.",
    href: "https://rsf.org/en/unprecedented-police-crackdown-press-india-around-40-journalists-covering-protests-against",
    image:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/00/Lambodar_Prasad_Dash_leading_Journalists_Protest_rally.jpg/1280px-Lambodar_Prasad_Dash_leading_Journalists_Protest_rally.jpg",
    alt: "Journalists holding placards at a protest rally",
    credit: "Photo: Lambodar999, CC BY-SA 4.0",
    creditHref:
      "https://commons.wikimedia.org/wiki/File:Lambodar_Prasad_Dash_leading_Journalists_Protest_rally.jpg",
  },
  {
    source: "RSF",
    date: "2026 Index",
    title: "India ranks 157th of 180 for press freedom",
    body: "RSF's 2026 index places India at 157th of 180, with a score of 31.96. Critical reporters face harassment, legal cases, and physical attacks.",
    impact: "A reporter under pressure needs their evidence to be somewhere the pressure cannot reach.",
    href: "https://rsf.org/en/country/india",
    image:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/14/2020_Indian_farmers%27_protest_-_sitting_protest.jpg/1280px-2020_Indian_farmers%27_protest_-_sitting_protest.jpg",
    alt: "Protesters seated at a large sit-in",
    credit: "Photo: Randeep Maddoke, CC BY-SA 4.0",
    creditHref:
      "https://commons.wikimedia.org/wiki/File:2020_Indian_farmers%27_protest_-_sitting_protest.jpg",
  },
  {
    source: "RSF",
    date: "Safety",
    title: "Two to three journalists are killed for their work every year",
    body: "RSF calls India one of the world's most dangerous countries for media professionals. Prosecutions and arbitrary arrests are routine.",
    impact: "A phone that holds the only copy is a single point of failure.",
    href: "https://rsf.org/en/country/india",
    image:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f8/Farmers%27_protest_at_Singhu_Border_%2815_February_2021%29.jpg/1280px-Farmers%27_protest_at_Singhu_Border_%2815_February_2021%29.jpg",
    alt: "A crowd of protesters at the Singhu border",
    credit: "Photo: Satdeep Gill, CC BY-SA 4.0",
    creditHref:
      "https://commons.wikimedia.org/wiki/File:Farmers%27_protest_at_Singhu_Border_(15_February_2021).jpg",
  },
  {
    source: "Access Now",
    date: "31 Mar 2026",
    title: "313 internet shutdowns in 2025, the highest since 2016",
    body: "Access Now and the #KeepItOn coalition documented 313 shutdowns across 52 countries. India has repeatedly topped the world's shutdown rankings.",
    impact: "When the network goes down, the evidence has to already be somewhere else.",
    href: "https://www.accessnow.org/keepiton-2025-report",
    image:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a0/Indian_Farmers%27_Protest_by_Ravan_Khosa_37_%28ed_RE1%29.jpg/1280px-Indian_Farmers%27_Protest_by_Ravan_Khosa_37_%28ed_RE1%29.jpg",
    alt: "Protesters gathered during a farmers' protest",
    credit: "Photo: Ravan Khosa, CC BY-SA 4.0",
    creditHref:
      "https://commons.wikimedia.org/wiki/File:Indian_Farmers%27_Protest_by_Ravan_Khosa_37_(ed_RE1).jpg",
  },
];

const QUESTIONS = [
  {
    q: "Why India?",
    a: "India ranks 157th of 180 for press freedom. In October 2026, around 40 journalists were detained covering the electoral-roll protests. Shutdowns are routine. This is where the harm is concentrated.",
  },
  {
    q: "Why censorship resistance?",
    a: "The vault and the heartbeat are public Arkiv entities. Anyone can read and query them without our backend. If this site is blocked, the evidence still verifies.",
  },
  {
    q: "Why privacy?",
    a: "Only AES-256-GCM ciphertext reaches Arkiv. The key never leaves the device. Two of three guardians hold the shares needed to reconstruct it.",
  },
  {
    q: "Why Arkiv?",
    a: "A normal database can be switched off, rewritten, or seized with its operator. Arkiv gives us an immutable creator, a public read path, and native expiry that we use as the switch.",
  },
  {
    q: "How we use Arkiv",
    a: "Vault is a readonly, permanent entity. Beat expires at the deadline, and extendEntity is a check-in. Release records that the switch fired. We use the creator field for authorship, cursors for pagination, and WebSocket events for live updates.",
  },
  {
    q: "Friction report",
    a: "We logged the real problems: expiry emits no event, readonly does not stop extension, extendEntity sets instead of adds, and the SDK requires a predicate. Each entry has expected vs actual, versions, and repro steps in arkiv/friction.md.",
  },
];

export default function LandingPage() {
  useReveal();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      api
        .stats()
        .then((next) => {
          if (!cancelled) setStats(next);
        })
        .catch(() => {
          if (!cancelled) setStats(null);
        });
    };
    load();
    const timer = window.setInterval(load, 10000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const live = stats?.recent[0];
  const latestHash = stats?.recent.find((vault) => vault.evidenceHash)?.evidenceHash;
  const modeLabel = stats ? (stats.mode === "live" ? "Tiramisu" : "Demo") : "Connecting";

  const terminal = [
    { prompt: "$", tone: "cmd", text: "npm run create -- ./field-notes.md 7d" },
    { prompt: "✓", tone: "ok", text: `vault sealed   ${latestHash ? shortKey(latestHash) : "0x8f2a…21c4"}` },
    { prompt: "✓", tone: "ok", text: "heartbeat      7d" },
    { prompt: "$", tone: "cmd", text: "npm run checkin -- 0x8f2a…21c4" },
    { prompt: "✓", tone: "ok", text: "extended       +7d" },
    { prompt: "$", tone: "cmd", text: "npm run watch" },
    { prompt: "!", tone: "warn", text: "heartbeat lapsed, 2 of 3 shares required" },
  ];

  return (
    <div className="landing">
      <div className="grain" aria-hidden="true" />
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <header className="site-nav">
        <Link className="nav-brand" to="/">
          <span className="nav-mark" aria-hidden="true">
            ◈
          </span>
          <span>Sakshi</span>
        </Link>

        <nav className="nav-links" aria-label="Sections">
          <a href="#stakes">Why it matters</a>
          <a href="#why">Why Arkiv</a>
          <a href="#how">How it works</a>
          <a href="#faq">FAQ</a>
        </nav>

        <div className="nav-actions">
          <span className="nav-mode">
            <i aria-hidden="true" /> {modeLabel}
          </span>
          <Link className="btn btn-primary" to="/vaults">
            Open app
          </Link>
        </div>
      </header>

      <main id="main">
        <section className="hero">
          <div className="hero-badge">
            <i aria-hidden="true" /> A dead man’s switch for evidence
          </div>
          <h1>
            The story survives
            <br />
            <span>the silence.</span>
          </h1>
          <p className="hero-sub">
            Sakshi is for the journalists and RTI activists reporting from India’s hardest places.
            Evidence stays sealed while they check in. If they cannot, it goes to the guardians they
            chose.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-primary" to="/create">
              Seal a vault
            </Link>
            <a className="btn btn-secondary" href="#stakes">
              Why it matters
            </a>
          </div>
          <p className="hero-meta">
            AES-256-GCM <span>·</span> Shamir 2-of-3 <span>·</span> Arkiv Entity Expiration
          </p>

          <ProductMockup live={live} />
        </section>

        <section className="strip" aria-label="Live register">
          <div className="strip-head">
            <span className="strip-dot" aria-hidden="true" />
            <span>Live register</span>
            <span className="strip-mode">{modeLabel}</span>
          </div>
          <div className="strip-stats" aria-live="polite">
            <div>
              <b>{stats?.total ?? "…"}</b>
              <span>vaults</span>
            </div>
            <div>
              <b className="teal">{stats?.sealed ?? "…"}</b>
              <span>sealed</span>
            </div>
            <div>
              <b className="rose">{stats?.released ?? "…"}</b>
              <span>released</span>
            </div>
          </div>
          <div className="strip-anchor">
            <span>Latest anchor</span>
            <code>{latestHash ? shortKey(latestHash) : "…"}</code>
          </div>
        </section>

        <section className="section" id="stakes">
          <div className="section-head">
            <p className="kicker">Why it matters</p>
            <h2>This is not a hypothetical.</h2>
            <p className="section-sub">
              Reporters in India are detained, attacked, and cut off. When the person holding the
              evidence is silenced, the evidence usually goes with them.
            </p>
          </div>

          <div className="news-grid">
            {NEWS.map((item) => (
              <article className="news-card" key={item.title} data-reveal>
                <div className="news-media">
                  <img src={item.image} alt={item.alt} loading="lazy" width={800} height={500} />
                  <span className="news-source">
                    {item.source} · {item.date}
                  </span>
                </div>
                <div className="news-body">
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                  <p className="news-impact">{item.impact}</p>
                  <a href={item.href} target="_blank" rel="noreferrer">
                    Read the report <span aria-hidden="true">↗</span>
                  </a>
                </div>
                <a className="news-credit" href={item.creditHref} target="_blank" rel="noreferrer">
                  {item.credit}
                </a>
              </article>
            ))}
          </div>

          <p className="sources">
            Reporting:{" "}
            <a href="https://rsf.org/en/country/india" target="_blank" rel="noreferrer">
              RSF
            </a>
            ,{" "}
            <a href="https://www.accessnow.org/keepiton/" target="_blank" rel="noreferrer">
              Access Now
            </a>
            . Photographs: Wikimedia Commons, CC BY-SA 4.0.
          </p>
        </section>

        <section className="section" id="why">
          <div className="section-head">
            <p className="kicker">Why this, why Arkiv</p>
            <h2>The questions we had to answer.</h2>
            <p className="section-sub">
              The short version, in the order the judges ask it.
            </p>
          </div>

          <div className="qa-grid">
            {QUESTIONS.map((item) => (
              <article className="qa-card" key={item.q} data-reveal>
                <h3>{item.q}</h3>
                <p>{item.a}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section" id="how">
          <div className="section-head">
            <p className="kicker">How it works</p>
            <h2>Seal it. Check in. Go quiet.</h2>
          </div>

          <div className="steps">
            <div className="step" data-reveal>
              <span className="step-num">01 · Seal</span>
              <h3>Encrypt on device</h3>
              <p>
                The evidence is encrypted locally. Only ciphertext goes to Arkiv. The key is split
                into three shares.
              </p>
            </div>
            <div className="step" data-reveal>
              <span className="step-num">02 · Check in</span>
              <h3>Extend the heartbeat</h3>
              <p>
                A heartbeat entity expires at your deadline. Every check-in extends it. Miss one
                and the switch fires.
              </p>
            </div>
            <div className="step" data-reveal>
              <span className="step-num">03 · Release</span>
              <h3>Guardians open it</h3>
              <p>
                Guardians combine any two shares to open the vault. The permanent vault outlives
                the heartbeat.
              </p>
            </div>
          </div>

          <div className="terminal" aria-hidden="true">
            <div className="terminal-bar">
              <i />
              <i />
              <i />
              <span>sakshi, zsh</span>
            </div>
            <div className="terminal-body">
              {terminal.map((line, index) => (
                <div key={index} className={line.tone}>
                  <span className="prompt">{line.prompt}</span> {line.text}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section" id="faq">
          <div className="faq-layout">
            <div className="faq-head">
              <p className="kicker">FAQ</p>
              <h2>What people ask first.</h2>
            </div>

            <div className="faq">
              <details>
                <summary>Is my evidence really private?</summary>
                <p>
                  Yes. Only AES-256-GCM ciphertext is stored. The key never leaves your device. Two
                  of three guardians hold the shares needed to reconstruct it.
                </p>
              </details>
              <details>
                <summary>What if I lose a share?</summary>
                <p>
                  Any two of three shares open the vault. Lose two and it cannot be opened, by
                  anyone, including us.
                </p>
              </details>
              <details>
                <summary>What if Arkiv goes down?</summary>
                <p>
                  The vault is a permanent, readonly entity. The heartbeat is the switch. The vault
                  is built to outlive both the heartbeat and the person who sealed it.
                </p>
              </details>
              <details>
                <summary>Who should be a guardian?</summary>
                <p>
                  People who would not collude: an editor, a lawyer, a colleague. The point of
                  two-of-three is that no single person can open it alone.
                </p>
              </details>
              <details>
                <summary>Is this live yet?</summary>
                <p>
                  The app runs today in demo mode. Add a funded Tiramisu wallet to write real
                  vaults and heartbeats on Arkiv.
                </p>
              </details>
            </div>
          </div>
        </section>

        <section className="cta">
          <div className="cta-panel" data-reveal>
            <p className="kicker">Start</p>
            <h2>Seal something worth protecting.</h2>
            <p>It takes a minute. It might outlive you.</p>
            <Link className="btn btn-primary" to="/create">
              Seal a vault
            </Link>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-brand">
          <span className="nav-mark" aria-hidden="true">
            ◈
          </span>
          <strong>Sakshi</strong>
          <p>Evidence, on your terms. Built on Arkiv.</p>
        </div>
        <div>
          <h4>Product</h4>
          <a href="#stakes">Why it matters</a>
          <a href="#why">Why Arkiv</a>
          <a href="#how">How it works</a>
        </div>
        <div>
          <h4>App</h4>
          <Link to="/vaults">Vaults</Link>
          <Link to="/create">New vault</Link>
          <Link to="/guardians">Guardians</Link>
        </div>
        <div>
          <h4>Open</h4>
          <span>MIT licensed</span>
          <span>Arkiv Tiramisu</span>
        </div>
      </footer>
    </div>
  );
}
