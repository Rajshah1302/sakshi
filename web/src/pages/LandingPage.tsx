import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Stats } from "../api";
import ProductMockup from "../components/ProductMockup";
import { shortKey } from "../time";
import { useReveal } from "../useReveal";
import "../landing.css";

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
    { prompt: "!", tone: "warn", text: "heartbeat lapsed — 2 of 3 shares required" },
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
          <a href="#product">Product</a>
          <a href="#how">How it works</a>
          <a href="#security">Security</a>
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
            <i aria-hidden="true" /> Live on Arkiv · {modeLabel}
          </div>
          <h1>
            If you go quiet,
            <br />
            <span>it speaks.</span>
          </h1>
          <p className="hero-sub">
            Sakshi keeps a source’s evidence sealed while they check in. If they stop — detained,
            silenced, offline — it releases to the guardians they chose. Never to the public.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-primary" to="/create">
              Seal a vault
            </Link>
            <a className="btn btn-secondary" href="#how">
              How it works
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
              <b>{stats?.total ?? "—"}</b>
              <span>vaults</span>
            </div>
            <div>
              <b className="teal">{stats?.sealed ?? "—"}</b>
              <span>sealed</span>
            </div>
            <div>
              <b className="rose">{stats?.released ?? "—"}</b>
              <span>released</span>
            </div>
          </div>
          <div className="strip-anchor">
            <span>Latest anchor</span>
            <code>{latestHash ? shortKey(latestHash) : "—"}</code>
          </div>
        </section>

        <section className="section" id="product">
          <div className="section-head">
            <p className="kicker">Product</p>
            <h2>Everything a source needs. Nothing an adversary can use.</h2>
            <p className="section-sub">
              Sakshi is three small primitives — a sealed vault, a heartbeat, and a quorum of
              guardians — that outlive the person who sealed them.
            </p>
          </div>

          <div className="bento">
            <article className="bento-card span-2" data-reveal>
              <p className="kicker">Seal</p>
              <h3>Encrypted on your device.</h3>
              <p>
                Evidence is sealed with AES-256-GCM before it leaves the browser. Only ciphertext
                reaches Arkiv — no document, no PII, no metadata.
              </p>
              <div className="mini-code">
                <span>const</span> sealed = <span>encrypt</span>(key, evidence)
              </div>
            </article>

            <article className="bento-card" data-reveal>
              <p className="kicker">Heartbeat</p>
              <h3>A switch that expires.</h3>
              <p>An Arkiv entity dies at your deadline. Checking in extends it.</p>
              <div className="mini-bar">
                <span style={{ width: "64%" }} />
              </div>
            </article>

            <article className="bento-card" data-reveal>
              <p className="kicker">Guardians</p>
              <h3>Two secrets, never one.</h3>
              <p>Any 2 of 3 shares reconstruct the key.</p>
              <div className="mini-shares">
                <i>01</i>
                <i>02</i>
                <i>03</i>
              </div>
            </article>

            <article className="bento-card" data-reveal>
              <p className="kicker">Anchor</p>
              <h3>Permanent evidence.</h3>
              <p>The vault is readonly; only the heartbeat expires.</p>
              <code className="mini-hash">{latestHash ? shortKey(latestHash) : "0x51fc…298f68"}</code>
            </article>

            <article className="bento-card" data-reveal>
              <p className="kicker">Open source</p>
              <h3>Audit every line.</h3>
              <p>MIT licensed. Schema and crypto are in the repo.</p>
              <div className="mini-tag">MIT</div>
            </article>
          </div>
        </section>

        <section className="section" id="how">
          <div className="section-head">
            <p className="kicker">How it works</p>
            <h2>Seal it. Check in. Go quiet.</h2>
          </div>

          <div className="steps">
            <div className="step" data-reveal>
              <span className="step-num">01 — Seal</span>
              <h3>Encrypt on device</h3>
              <p>
                Encrypt the evidence locally. Only ciphertext reaches Arkiv. The key is split
                2-of-3 across your guardians.
              </p>
            </div>
            <div className="step" data-reveal>
              <span className="step-num">02 — Check in</span>
              <h3>Extend the heartbeat</h3>
              <p>
                A heartbeat entity expires at your deadline. Every check-in extends it. Miss one
                and the switch fires.
              </p>
            </div>
            <div className="step" data-reveal>
              <span className="step-num">03 — Release</span>
              <h3>Guardians open it</h3>
              <p>
                Guardians combine any two shares to open the vault. The permanent vault outlives
                the heartbeat.
              </p>
            </div>
          </div>
        </section>

        <section className="section" id="security">
          <div className="security">
            <div>
              <p className="kicker">Security</p>
              <h2>The chain sees ciphertext. Nothing else.</h2>
              <p className="section-sub">
                Sakshi is built so that losing the device, the browser, or the company does not
                lose the evidence — and so that no single guardian can open it early.
              </p>
              <ul className="checks">
                <li>AES-256-GCM sealing, on device</li>
                <li>Shamir 2-of-3 key shares</li>
                <li>No PII written to Arkiv</li>
                <li>Permanent, readonly vault anchor</li>
                <li>Revocable, expiring consent</li>
              </ul>
            </div>

            <div className="terminal" aria-hidden="true">
              <div className="terminal-bar">
                <i />
                <i />
                <i />
                <span>sakshi — zsh</span>
              </div>
              <div className="terminal-body">
                {terminal.map((line, index) => (
                  <div key={index} className={line.tone}>
                    <span className="prompt">{line.prompt}</span> {line.text}
                  </div>
                ))}
              </div>
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
                  Yes. Only AES-256-GCM ciphertext is stored. The key never leaves your device; two
                  of three guardians hold the shares needed to reconstruct it.
                </p>
              </details>
              <details>
                <summary>What if I lose a share?</summary>
                <p>
                  Any two of three shares open the vault. Lose two and it cannot be opened — by
                  anyone, including us.
                </p>
              </details>
              <details>
                <summary>What if Arkiv goes down?</summary>
                <p>
                  The vault is a permanent, readonly entity; the heartbeat is the switch. The vault
                  is built to outlive the heartbeat and the person who sealed it.
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
          <a href="#product">Overview</a>
          <a href="#how">How it works</a>
          <a href="#security">Security</a>
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
