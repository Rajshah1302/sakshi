import { useEffect, useState } from "react";
import { api, type Health } from "../api";
import { PageHeader } from "../components/ui";
import { loadSettings, saveSettings } from "../settings";
import { loadVaults, saveVaults } from "../store";
import { shortKey } from "../time";

export default function SettingsPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [interval, setInterval] = useState(loadSettings().defaultIntervalS);
  const [saved, setSaved] = useState(false);
  const [count, setCount] = useState(() => loadVaults().length);

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth(null));
  }, []);

  function save() {
    saveSettings({ defaultIntervalS: interval });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  }

  function clearLocal() {
    if (!window.confirm("Remove all vault records and shares from this device?")) return;
    saveVaults([]);
    setCount(0);
  }

  return (
    <div className="page narrow">
      <PageHeader
        eyebrow="Settings"
        title="Preferences & network."
        subtitle="Sakshi is self-custodial: vault metadata and guardian shares live on this device, never on a server."
      />

      <section className="panel">
        <div className="panel-head">
          <h2>Network</h2>
        </div>
        <div className="kv">
          <span>Mode</span>
          <strong>{health?.mode === "live" ? "Live · Tiramisu" : health?.mode === "demo" ? "Demo · In-memory" : "Connecting…"}</strong>
        </div>
        {health?.address ? (
          <div className="kv">
            <span>Wallet</span>
            <code>{shortKey(health.address)}</code>
          </div>
        ) : (
          <p className="muted">
            No funded wallet configured. The demo runs the same state machine in memory. Add a
            <code> PRIVATE_KEY </code> to `.env` and restart to go live.
          </p>
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Defaults</h2>
        </div>
        <label className="field">
          <span className="field-label">Default check-in interval (seconds)</span>
          <input
            type="number"
            name="defaultInterval"
            min={2}
            value={interval}
            onChange={(event) => setInterval(Number(event.target.value))}
            inputMode="numeric"
            autoComplete="off"
          />
          <span className="field-hint">Used as the starting value when you create a vault.</span>
        </label>
        <div className="panel-actions">
          <button className="button primary" type="button" onClick={save}>
            {saved ? "Saved" : "Save"}
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Local data</h2>
        </div>
        <p className="muted">
          {count} vault{count === 1 ? "" : "s"} stored on this device. Removing them deletes your copy of
          the guardian shares.
        </p>
        <div className="panel-actions">
          <button className="button danger" type="button" onClick={clearLocal} disabled={count === 0}>
            Clear local records
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>How it works</h2>
        </div>
        <ul className="bullets">
          <li>Evidence is sealed with AES-256-GCM on this device; only ciphertext is stored.</li>
          <li>The key is split 2-of-3 with Shamir's Secret Sharing across guardians.</li>
          <li>A heartbeat entity on Arkiv expires at your deadline; checking in extends it.</li>
          <li>When the heartbeat lapses, guardians combine any two shares to open the vault.</li>
          <li>The vault is a permanent, readonly entity — the evidence outlives the switch.</li>
        </ul>
      </section>
    </div>
  );
}
