import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { useToast } from "../components/Toast";
import { CopyButton, Field, Modal, PageHeader, Ring, StatusPill } from "../components/ui";
import { useNow } from "../hooks";
import {
  getVault,
  recoveryKit,
  removeVault,
  upsertVault,
  vaultStatus,
  type LocalVault,
  type VaultEventType,
} from "../store";
import { formatDate, formatDuration, shortKey } from "../time";

function eventLabel(type: VaultEventType): string {
  switch (type) {
    case "created":
      return "Vault sealed";
    case "checked-in":
      return "Checked in";
    case "released":
      return "Switch fired";
    case "unsealed":
      return "Vault unsealed";
  }
}

export default function VaultPage() {
  const { vaultKey } = useParams<{ vaultKey: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [vault, setVault] = useState<LocalVault | undefined>(() =>
    vaultKey ? getVault(vaultKey) : undefined,
  );
  const [showKit, setShowKit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [shareA, setShareA] = useState(vault?.shares[0] ?? "");
  const [shareB, setShareB] = useState(vault?.shares[1] ?? "");
  const [unsealed, setUnsealed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const releaseRequested = useRef(false);
  const now = useNow(500);
  const status = vault ? vaultStatus(vault, now) : "sealed";

  // Persist every change back to the local recovery store.
  useEffect(() => {
    if (vault) upsertVault(vault);
  }, [vault]);

  // Poll the heartbeat so the deadline stays accurate and lapses are noticed.
  useEffect(() => {
    if (!vault) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const beat = await api.beat(vault.beatKey);
        if (cancelled) return;
        setVault((current) => {
          if (!current || current.deadlineMs === beat.deadline) return current;
          return { ...current, deadlineMs: beat.deadline };
        });
      } catch {
        if (cancelled) return;
        setVault((current) => {
          if (!current || current.events.some((event) => event.type === "released")) return current;
          return { ...current, events: [...current.events, { at: Date.now(), type: "released" }] };
        });
      }
    };

    void poll();
    const timer = window.setInterval(poll, 2500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [vault?.beatKey]);

  // When the switch fires, write the release record once.
  useEffect(() => {
    if (!vault || status !== "released" || vault.releaseKey || releaseRequested.current) return;
    releaseRequested.current = true;
    api
      .release(vault.vaultKey)
      .then((result) => {
        setVault((current) => (current ? { ...current, releaseKey: result.releaseKey } : current));
        toast.push("Release record written.", "success");
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)));
  }, [status, vault?.vaultKey]);

  if (!vault) {
    return (
      <div className="page narrow">
        <PageHeader
          eyebrow="Vault"
          title="Vault not found"
          subtitle="This vault is not in your local recovery store."
        />
        <Link className="button primary" to="/vaults">
          Back to vaults
        </Link>
      </div>
    );
  }

  const remaining = Math.max(0, vault.deadlineMs - now);

  async function checkIn() {
    if (!vault) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.checkIn(vault.beatKey, vault.intervalS);
      releaseRequested.current = false;
      setVault((current) =>
        current
          ? {
              ...current,
              deadlineMs: result.deadlineMs,
              events: [...current.events, { at: Date.now(), type: "checked-in" }],
            }
          : current,
      );
      toast.push("Checked in. Deadline extended.", "success");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  async function unseal() {
    if (!vault) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.unseal(vault.vaultKey, [shareA, shareB].filter(Boolean));
      setUnsealed(result.text);
      setVault((current) =>
        current
          ? { ...current, events: [...current.events, { at: Date.now(), type: "unsealed" }] }
          : current,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  function downloadKit() {
    if (!vault) return;
    const blob = new Blob([recoveryKit(vault)], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `sakshi-recovery-${vault.vaultKey.slice(0, 8)}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
    setVault((current) => (current ? { ...current, kitSaved: true } : current));
  }

  function deleteLocal() {
    if (!vault) return;
    removeVault(vault.vaultKey);
    setConfirmDelete(false);
    toast.push("Local record removed.", "info");
    navigate("/vaults");
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Vault"
        title={vault.title || "Untitled vault"}
        subtitle={`Created ${formatDate(vault.createdAt)} · ${
          vault.mode === "live" ? "Live on Tiramisu" : "Demo (in-memory)"
        }`}
        actions={
          <>
            <Link className="button ghost" to="/vaults">
              Back
            </Link>
            <button className="button ghost danger" type="button" onClick={() => setConfirmDelete(true)}>
              Delete
            </button>
          </>
        }
      />

      <div className="vault-layout">
        <section className="panel vault-main">
          <div className="vault-status-row">
            <StatusPill status={status} />
            <span className="muted">
              {status === "sealed" ? "The switch is armed" : "The switch has fired"}
            </span>
          </div>

          <Ring remaining={remaining} total={vault.intervalS * 1000} />

          <div className="vault-actions">
            <button
              className="button primary"
              type="button"
              onClick={checkIn}
              disabled={busy || status === "released"}
            >
              {busy ? "Checking in…" : "I'm here — check in"}
            </button>
            <span className="muted">Renews for {formatDuration(vault.intervalS * 1000)}</span>
          </div>

          {error ? <p className="error">{error}</p> : null}

          <dl className="info-grid">
            <div>
              <dt>Vault key</dt>
              <dd>
                <code>{shortKey(vault.vaultKey)}</code>
                <CopyButton value={vault.vaultKey} />
              </dd>
            </div>
            <div>
              <dt>Heartbeat</dt>
              <dd>
                <code>{shortKey(vault.beatKey)}</code>
                <CopyButton value={vault.beatKey} />
              </dd>
            </div>
            <div>
              <dt>Evidence hash</dt>
              <dd>
                <code>{shortKey(vault.evidenceHash)}</code>
                <CopyButton value={vault.evidenceHash} />
              </dd>
            </div>
            <div>
              <dt>Interval</dt>
              <dd>every {formatDuration(vault.intervalS * 1000)}</dd>
            </div>
          </dl>
        </section>

        <aside className="vault-side">
          <section className="panel">
            <div className="panel-head">
              <h2>Recovery kit</h2>
              <button className="button ghost small" type="button" onClick={() => setShowKit((value) => !value)}>
                {showKit ? "Hide" : "Reveal"}
              </button>
            </div>
            <p className="muted">Any 2 of 3 guardian shares reconstruct the key. Store them offline, separately.</p>

            {!vault.kitSaved ? (
              <div className="notice">You haven't marked the kit as saved. Download it now.</div>
            ) : null}

            {showKit ? (
              <div className="shares">
                {vault.shares.map((share, index) => (
                  <div className="share" key={share}>
                    <span>Guardian {index + 1}</span>
                    <code>{share}</code>
                    <CopyButton value={share} />
                  </div>
                ))}
              </div>
            ) : null}

            <div className="panel-actions">
              <button className="button secondary" type="button" onClick={downloadKit}>
                Download kit
              </button>
              {!vault.kitSaved ? (
                <button
                  className="button ghost small"
                  type="button"
                  onClick={() => setVault((current) => (current ? { ...current, kitSaved: true } : current))}
                >
                  Mark saved
                </button>
              ) : null}
            </div>
          </section>

          {status === "released" ? (
            <section className="panel">
              <div className="panel-head">
                <h2>Release</h2>
              </div>
              <p className="muted">A release record was written. Guardians can open the vault.</p>
              {vault.releaseKey ? <p className="mono muted">release {shortKey(vault.releaseKey)}</p> : null}

              <Field label="Guardian share A">
                <input value={shareA} onChange={(event) => setShareA(event.target.value)} />
              </Field>
              <Field label="Guardian share B">
                <input value={shareB} onChange={(event) => setShareB(event.target.value)} />
              </Field>
              <button
                className="button primary"
                type="button"
                onClick={unseal}
                disabled={busy || !shareA || !shareB}
              >
                {busy ? "Opening…" : "Unseal with 2 shares"}
              </button>
              {unsealed !== null ? <blockquote className="unsealed">{unsealed}</blockquote> : null}
            </section>
          ) : null}

          <section className="panel">
            <div className="panel-head">
              <h2>Activity</h2>
            </div>
            <ol className="timeline">
              {vault.events.map((event, index) => (
                <li key={`${event.at}-${index}`}>
                  <span className={`dot ${event.type}`} />
                  <div>
                    <strong>{eventLabel(event.type)}</strong>
                    <span>{formatDate(event.at)}</span>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>

      <Modal open={confirmDelete} title="Delete this local record?" onClose={() => setConfirmDelete(false)}>
        <p className="muted">
          This removes the vault from this device. The Arkiv entity is permanent, but you will lose the
          guardian shares stored here.
        </p>
        <div className="modal-actions">
          <button className="button ghost" type="button" onClick={() => setConfirmDelete(false)}>
            Cancel
          </button>
          <button className="button danger" type="button" onClick={deleteLocal}>
            Delete record
          </button>
        </div>
      </Modal>
    </div>
  );
}
