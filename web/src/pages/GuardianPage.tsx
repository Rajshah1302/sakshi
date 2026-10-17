import { useState } from "react";
import { api } from "../api";
import { CopyButton, Field, PageHeader } from "../components/ui";
import { loadVaults } from "../store";
import { shortKey } from "../time";

export default function GuardianPage() {
  const vaults = loadVaults();
  const [vaultKey, setVaultKey] = useState(vaults[0]?.vaultKey ?? "");
  const [shareA, setShareA] = useState("");
  const [shareB, setShareB] = useState("");
  const [text, setText] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pick(key: string) {
    setVaultKey(key);
    const match = vaults.find((vault) => vault.vaultKey === key);
    setShareA(match?.shares[0] ?? "");
    setShareB(match?.shares[1] ?? "");
    setText(null);
    setHash(null);
    setError(null);
  }

  async function verify() {
    setBusy(true);
    setError(null);
    try {
      const result = await api.vault(vaultKey);
      setHash(result.evidenceHash);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  async function unseal() {
    setBusy(true);
    setError(null);
    try {
      const result = await api.unseal(vaultKey, [shareA, shareB].filter(Boolean));
      setText(result.text);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Guardians"
        title="Open a vault."
        subtitle="A guardian holds one share. Two guardians, acting together, can open the vault after the switch fires."
      />

      <div className="two-col">
        <section className="panel form">
          <Field label="Vault" hint="Choose one of your vaults, or paste any vault key.">
            <select value={vaultKey} onChange={(event) => pick(event.target.value)}>
              <option value="">Select a vault…</option>
              {vaults.map((vault) => (
                <option key={vault.vaultKey} value={vault.vaultKey}>
                  {vault.title || "Untitled vault"} · {shortKey(vault.vaultKey)}
                </option>
              ))}
            </select>
            <input
              value={vaultKey}
              onChange={(event) => setVaultKey(event.target.value)}
              placeholder="0x… vault key"
            />
          </Field>

          <Field label="Guardian share A">
            <input value={shareA} onChange={(event) => setShareA(event.target.value)} placeholder="hex share" />
          </Field>
          <Field label="Guardian share B">
            <input value={shareB} onChange={(event) => setShareB(event.target.value)} placeholder="hex share" />
          </Field>

          {error ? <p className="error">{error}</p> : null}

          <div className="form-actions">
            <button className="button primary" type="button" onClick={unseal} disabled={busy || !vaultKey || !shareA || !shareB}>
              {busy ? "Opening…" : "Unseal with 2 shares"}
            </button>
            <button className="button ghost" type="button" onClick={verify} disabled={busy || !vaultKey}>
              Verify vault
            </button>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Result</h2>
          </div>

          {hash ? (
            <div className="kv">
              <span>Evidence hash</span>
              <code>{hash}</code>
              <CopyButton value={hash} />
            </div>
          ) : null}

          {text !== null ? (
            <>
              <p className="eyebrow">Decrypted evidence</p>
              <blockquote className="unsealed">{text}</blockquote>
            </>
          ) : (
            <p className="muted">
              {hash
                ? "The vault exists. Provide two guardian shares to decrypt it."
                : "Nothing opened yet. Two valid shares will reveal the evidence."}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
