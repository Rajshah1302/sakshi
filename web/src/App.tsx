import { useEffect, useRef, useState } from "react";
import { api, type CreateResponse, type Mode } from "./api";

type Phase = "idle" | "sealed" | "released";

function clock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function short(value: string): string {
  return value.length > 20 ? `${value.slice(0, 10)}…${value.slice(-6)}` : value;
}

function Copy({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      className="copy"
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setDone(true);
        window.setTimeout(() => setDone(false), 1200);
      }}
    >
      {done ? "copied" : "copy"}
    </button>
  );
}

export default function App() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [text, setText] = useState(
    "If you are reading this, I did not make my check-in. The full record is with my editor.",
  );
  const [intervalS, setIntervalS] = useState(60);
  const [created, setCreated] = useState<CreateResponse | null>(null);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [phase, setPhase] = useState<Phase>("idle");
  const [releaseKey, setReleaseKey] = useState<string | null>(null);
  const [unsealed, setUnsealed] = useState<string | null>(null);
  const [shareA, setShareA] = useState("");
  const [shareB, setShareB] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const releasedRef = useRef(false);

  useEffect(() => {
    api.health().then((h) => setMode(h.mode)).catch(() => setMode(null));
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, []);

  // Poll the heartbeat while the vault is sealed.
  useEffect(() => {
    if (!created || phase !== "sealed") return;
    let cancelled = false;

    const poll = async () => {
      try {
        const beat = await api.beat(created.beatKey);
        if (!cancelled) setDeadline(beat.deadline);
      } catch {
        if (!cancelled) setPhase((current) => (current === "sealed" ? "released" : current));
      }
    };

    void poll();
    const timer = window.setInterval(poll, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [created, phase]);

  // React at the deadline even before the node drops the entity.
  useEffect(() => {
    if (phase === "sealed" && deadline !== null && now >= deadline) {
      setPhase("released");
    }
  }, [phase, deadline, now]);

  // When released, write the release record once.
  useEffect(() => {
    if (phase !== "released" || !created || releasedRef.current) return;
    releasedRef.current = true;
    api
      .release(created.vaultKey)
      .then((result) => setReleaseKey(result.releaseKey))
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)));
  }, [phase, created]);

  const remaining = deadline === null ? null : deadline - now;

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const result = await api.create(text, intervalS);
      setCreated(result);
      setDeadline(result.deadlineMs);
      setShareA(result.shares[0] ?? "");
      setShareB(result.shares[1] ?? "");
      setPhase("sealed");
      setReleaseKey(null);
      setUnsealed(null);
      releasedRef.current = false;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  async function checkIn() {
    if (!created) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.checkIn(created.beatKey, intervalS);
      setDeadline(result.deadlineMs);
      setPhase("sealed");
      releasedRef.current = false;
      setReleaseKey(null);
      setUnsealed(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  async function unseal() {
    if (!created) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.unseal(created.vaultKey, [shareA, shareB].filter(Boolean));
      setUnsealed(result.text);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setCreated(null);
    setDeadline(null);
    setPhase("idle");
    setReleaseKey(null);
    setUnsealed(null);
    setShareA("");
    setShareB("");
    setError(null);
    releasedRef.current = false;
  }

  const statusClass = phase === "released" ? "released" : phase === "sealed" ? "sealed" : "idle";

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="mark">◈</span>
          <div>
            <h1>Sakshi</h1>
            <p>an encrypted dead-man's switch for evidence</p>
          </div>
        </div>
        <span className={`badge ${mode ?? "unknown"}`}>
          {mode === "live" ? "LIVE · TIRAMISU" : mode === "demo" ? "DEMO · IN-MEMORY" : "CONNECTING"}
        </span>
      </header>

      <main className="grid">
        <section className="card">
          <h2>{created ? "The switch" : "Seal a vault"}</h2>

          {!created ? (
            <>
              <p className="muted">
                Write what should be released if you go silent. It is encrypted before it leaves
                this machine; only the sealed ciphertext is stored.
              </p>
              <label className="field">
                <span>Evidence</span>
                <textarea
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  rows={7}
                  placeholder="The message or a pointer to the full record…"
                />
              </label>
              <div className="row">
                <label className="field small">
                  <span>Check-in every (seconds)</span>
                  <input
                    type="number"
                    min={2}
                    max={86400}
                    value={intervalS}
                    onChange={(event) => setIntervalS(Number(event.target.value))}
                  />
                </label>
                <button className="primary" type="button" onClick={create} disabled={busy}>
                  {busy ? "Sealing…" : "Seal & create heartbeat"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className={`status ${statusClass}`}>
                <span className="dot" />
                <strong>{phase === "released" ? "RELEASED" : "SEALED"}</strong>
                <span className="muted">
                  {phase === "released" ? "the heartbeat lapsed" : "check in before the clock runs out"}
                </span>
              </div>

              <div className="timer">
                <span className="count">{remaining === null ? "--:--" : clock(remaining)}</span>
                <span className="muted">until release</span>
              </div>

              <button className="primary" type="button" onClick={checkIn} disabled={busy || phase === "released"}>
                {busy ? "Checking in…" : "I'm here — check in"}
              </button>

              <dl className="keys">
                <div>
                  <dt>Vault</dt>
                  <dd title={created.vaultKey}>{short(created.vaultKey)} <Copy value={created.vaultKey} /></dd>
                </div>
                <div>
                  <dt>Heartbeat</dt>
                  <dd title={created.beatKey}>{short(created.beatKey)} <Copy value={created.beatKey} /></dd>
                </div>
                <div>
                  <dt>Hash</dt>
                  <dd title={created.evidenceHash}>{short(created.evidenceHash)} <Copy value={created.evidenceHash} /></dd>
                </div>
              </dl>

              <details className="shares" open={phase === "released"}>
                <summary>Guardian shares (any 2 of 3)</summary>
                {created.shares.map((share, index) => (
                  <div className="share" key={share}>
                    <span className="muted">guardian {index + 1}</span>
                    <code>{share}</code>
                    <Copy value={share} />
                  </div>
                ))}
              </details>

              <button className="ghost" type="button" onClick={reset}>
                Start over
              </button>
            </>
          )}

          {error ? <p className="error">{error}</p> : null}
        </section>

        <section className="card">
          <h2>Release</h2>
          {phase !== "released" ? (
            <p className="muted">
              While the heartbeat is alive, the vault stays sealed. Stop checking in — or let the
              clock run out — and the switch fires.
            </p>
          ) : (
            <>
              <p className="muted">
                The heartbeat lapsed. A release record was written; only guardians can open the
                vault.
              </p>
              {releaseKey ? (
                <p className="mono-line">
                  release <code title={releaseKey}>{short(releaseKey)}</code>
                </p>
              ) : null}

              <label className="field">
                <span>Guardian share A</span>
                <input value={shareA} onChange={(event) => setShareA(event.target.value)} />
              </label>
              <label className="field">
                <span>Guardian share B</span>
                <input value={shareB} onChange={(event) => setShareB(event.target.value)} />
              </label>
              <button className="primary" type="button" onClick={unseal} disabled={busy || !shareA || !shareB}>
                {busy ? "Opening…" : "Unseal with 2 shares"}
              </button>

              {unsealed !== null ? (
                <blockquote className="unsealed">{unsealed}</blockquote>
              ) : null}
            </>
          )}
        </section>
      </main>

      <footer className="foot">
        <span>
          {mode === "demo"
            ? "Demo mode: the Arkiv calls are simulated in memory. Add a funded PRIVATE_KEY to run live."
            : "Live mode: vault and heartbeat are Arkiv entities on Tiramisu."}
        </span>
        <span>AES-256-GCM · Shamir 2-of-3 · Arkiv Entity Expiration</span>
      </footer>
    </div>
  );
}
