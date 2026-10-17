import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useToast } from "../components/Toast";
import { Field, PageHeader } from "../components/ui";
import { loadSettings } from "../settings";
import { upsertVault, type LocalVault } from "../store";

const PRESETS = [
  { label: "10s", value: 10 },
  { label: "1 min", value: 60 },
  { label: "10 min", value: 600 },
  { label: "1 hour", value: 3600 },
  { label: "1 day", value: 86400 },
  { label: "7 days", value: 604800 },
];

export default function CreatePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const settings = loadSettings();

  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [intervalS, setIntervalS] = useState(settings.defaultIntervalS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!text.trim()) {
      setError("Write the evidence to seal.");
      return;
    }
    if (!Number.isFinite(intervalS) || intervalS < 2) {
      setError("Check-in interval must be at least 2 seconds.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const [result, health] = await Promise.all([api.create(text, intervalS), api.health().catch(() => null)]);
      const vault: LocalVault = {
        vaultKey: result.vaultKey,
        beatKey: result.beatKey,
        evidenceHash: result.evidenceHash,
        intervalS,
        createdAt: Date.now(),
        deadlineMs: result.deadlineMs,
        title: title.trim() || "Untitled vault",
        shares: result.shares,
        kitSaved: false,
        mode: health?.mode ?? "demo",
        events: [{ at: Date.now(), type: "created" }],
      };
      upsertVault(vault);
      toast.push("Vault sealed. Save your recovery kit.", "success");
      navigate(`/vaults/${vault.vaultKey}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page narrow">
      <PageHeader
        eyebrow="New vault"
        title="Seal something worth protecting."
        subtitle="It is encrypted on this device before it leaves. Only the sealed ciphertext reaches the database."
      />

      <form className="panel form" onSubmit={submit}>
        <Field label="Title" hint="Optional. Shown only on this device.">
          <input
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Manipur field notes"
            autoComplete="off"
            spellCheck={false}
            autoFocus
          />
        </Field>

        <Field label="Evidence" hint="Encrypted before it leaves this device. Up to 128 KiB.">
          <textarea
            name="evidence"
            rows={8}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="The message, or where to find the full record…"
            autoComplete="off"
          />
        </Field>

        <Field label="Check-in every" hint="Miss one and the switch fires. You can check in any time.">
          <div className="presets">
            {PRESETS.map((preset) => (
              <button
                type="button"
                key={preset.value}
                className={`preset ${intervalS === preset.value ? "active" : ""}`}
                onClick={() => setIntervalS(preset.value)}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <input
            type="number"
            name="interval"
            min={2}
            value={intervalS}
            onChange={(event) => setIntervalS(Number(event.target.value))}
            inputMode="numeric"
            autoComplete="off"
          />
        </Field>

        {error ? <p className="error">{error}</p> : null}

        <div className="form-actions">
          <button className="button primary" disabled={busy}>
            {busy ? "Sealing…" : "Seal vault"}
          </button>
          <p className="hint">You will get 3 guardian shares. Any 2 open the vault.</p>
        </div>
      </form>
    </div>
  );
}
