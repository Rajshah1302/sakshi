import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Stats } from "../api";
import HeartbeatVault from "../components/HeartbeatVault";
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

  return (
    <div className="landing">
      <div className="grain" aria-hidden="true" />
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <header className="landing-nav">
        <Link className="landing-brand" to="/">
          <span className="brand-mark" aria-hidden="true">
            ◈
          </span>
          <div>
            <strong>Sakshi</strong>
            <span>evidence, on your terms</span>
          </div>
        </Link>

        <nav className="landing-links" aria-label="Sections">
          <a href="#problem">Why</a>
          <a href="#how">How it works</a>
          <a href="#guardians">Guardians</a>
          <a href="#privacy">Privacy</a>
          <a href="#faq">FAQ</a>
        </nav>

        <Link className="button primary" to="/vaults">
          Open app
        </Link>
      </header>

      <main id="main">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">A dead man’s switch for evidence</p>
            <h1>
              If you go quiet,
              <br />
              <em>it speaks.</em>
            </h1>
            <p className="hero-lead">
              Sakshi keeps a source’s evidence sealed while they check in. If they stop —
              detained, silenced, offline — it releases to the guardians they chose. Never to the
              public.
            </p>
            <div className="hero-actions">
              <Link className="button primary" to="/create">
                Seal a vault
              </Link>
              <a className="button ghost" href="#how">
                How it works
              </a>
            </div>
            <p className="hero-trust">AES-256-GCM · Shamir 2-of-3 · Arkiv Entity Expiration</p>
          </div>

          <div className="hero-visual">
            <HeartbeatVault live={live} />
          </div>
        </section>

        <div className="marquee" aria-hidden="true">
          <div className="marquee-track">
            {[0, 1].map((block) => (
              <div className="marquee-inner" key={block}>
                <span>Sealed until silence</span>
                <span>Check in or it opens</span>
                <span>No single guardian</span>
                <span>Ciphertext only</span>
                <span>Expiry is the switch</span>
              </div>
            ))}
          </div>
        </div>

        <section className="live-register" aria-label="Live register">
          <div className="lr-head">
            <span className="lr-dot" aria-hidden="true" />
            <span>Live register</span>
            <span className="lr-mode">
              {stats ? (stats.mode === "live" ? "Tiramisu" : "Demo") : "Connecting"}
            </span>
          </div>

          <div className="lr-stats" aria-live="polite">
            <div>
              <strong>{stats?.total ?? "—"}</strong>
              <span>vaults</span>
            </div>
            <div>
              <strong className="teal">{stats?.sealed ?? "—"}</strong>
              <span>sealed</span>
            </div>
            <div>
              <strong className="rose">{stats?.released ?? "—"}</strong>
              <span>released</span>
            </div>
          </div>

          <div className="lr-anchor">
            <span>latest anchor</span>
            <code>{latestHash ? shortKey(latestHash) : "—"}</code>
          </div>
        </section>

        <section className="section" id="problem" data-reveal>
          <p className="eyebrow">The silence problem</p>
          <h2>When a journalist goes quiet, the story usually goes with them.</h2>
          <p className="lead">
            Phones are seized. Drives are wiped. Accounts are taken down. The people who could
            publish the evidence are exactly the people at risk. A file that exists on one device is
            a file that can disappear.
          </p>
          <div className="problem-grid">
            <div className="problem-card">
              <span>Seized</span>
              <p>Evidence on a phone is evidence an adversary can hold.</p>
            </div>
            <div className="problem-card">
              <span>Silenced</span>
              <p>If the only person who can release it is detained, it never leaves.</p>
            </div>
            <div className="problem-card">
              <span>Gone dark</span>
              <p>A shutdown or a flat battery can end a story.</p>
            </div>
          </div>
        </section>

        <section className="section" id="how" data-reveal>
          <p className="eyebrow">How it works</p>
          <h2>Seal it. Check in. Go quiet.</h2>
          <div className="steps">
            <article className="step">
              <span className="num">01</span>
              <h3>Seal</h3>
              <p>
                Encrypt the evidence on your device. Only ciphertext reaches Arkiv. The key is
                split 2-of-3 across your guardians.
              </p>
            </article>
            <article className="step">
              <span className="num">02</span>
              <h3>Check in</h3>
              <p>
                A heartbeat entity on Arkiv expires at your deadline. Every check-in extends it.
                Miss one and the switch fires.
              </p>
            </article>
            <article className="step">
              <span className="num">03</span>
              <h3>Release</h3>
              <p>
                Guardians combine any two shares to open the vault. The permanent, readonly vault
                outlives the heartbeat.
              </p>
            </article>
          </div>
        </section>

        <section className="section" id="guardians" data-reveal>
          <p className="eyebrow">Guardians</p>
          <h2>Two secrets, never one.</h2>
          <p className="lead">
            The key is split into three shares. Any two reconstruct it. No single guardian — and no
            single seizure — can open the vault before its time.
          </p>
          <div className="guardian-row">
            <div className="guardian need">
              <span className="seal">01</span>
              <span className="tag">Share 1</span>
              <p>An editor.</p>
            </div>
            <div className="guardian need">
              <span className="seal">02</span>
              <span className="tag">Share 2</span>
              <p>A lawyer.</p>
            </div>
            <div className="guardian">
              <span className="seal">03</span>
              <span className="tag">Share 3</span>
              <p>A colleague.</p>
            </div>
          </div>
          <p className="guardian-note">Any two of the three open the vault.</p>
        </section>

        <section className="section" id="privacy" data-reveal>
          <p className="eyebrow">Privacy</p>
          <h2>The chain sees ciphertext. Nothing else.</h2>
          <div className="facts">
            <div className="fact">
              <strong>AES-256-GCM</strong>
              <span>Evidence is sealed before it leaves the device.</span>
            </div>
            <div className="fact">
              <strong>Shamir 2-of-3</strong>
              <span>The key is split; one share reveals nothing.</span>
            </div>
            <div className="fact">
              <strong>Local-first</strong>
              <span>Vault references and shares live on your device.</span>
            </div>
            <div className="fact">
              <strong>No PII on Arkiv</strong>
              <span>Only hashes and ciphertext are written.</span>
            </div>
            <div className="fact">
              <strong>Permanent anchor</strong>
              <span>The vault is readonly; only the heartbeat expires.</span>
            </div>
            <div className="fact">
              <strong>Open source</strong>
              <span>MIT licensed. Audit every line.</span>
            </div>
          </div>
        </section>

        <section className="section" id="faq" data-reveal>
          <p className="eyebrow">Questions</p>
          <h2>What people ask first.</h2>
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
                The app runs today in demo mode. Add a funded Tiramisu wallet to write real vaults
                and heartbeats on Arkiv.
              </p>
            </details>
          </div>
        </section>

        <section className="cta" data-reveal>
          <div className="cta-box">
            <p className="eyebrow">Start</p>
            <h2>Seal something worth protecting.</h2>
            <p>It takes a minute. It might outlive you.</p>
            <Link className="button primary" to="/create">
              Seal a vault
            </Link>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <span>◈ Sakshi — evidence, on your terms.</span>
        <span>Built on Arkiv · MIT</span>
      </footer>
    </div>
  );
}
