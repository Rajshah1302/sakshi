import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState, PageHeader, StatusPill } from "../components/ui";
import { useNow } from "../hooks";
import { loadVaults, vaultStatus } from "../store";
import { formatDate, formatDuration, shortKey } from "../time";

type Filter = "all" | "sealed" | "released";

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "All" },
  { value: "sealed", label: "Sealed" },
  { value: "released", label: "Released" },
];

export default function VaultsPage() {
  const now = useNow(1000);
  const vaults = useMemo(() => loadVaults(), []);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const sealed = vaults.filter((vault) => vaultStatus(vault, now) === "sealed").length;
  const released = vaults.length - sealed;

  const filtered = vaults.filter((vault) => {
    const status = vaultStatus(vault, now);
    if (filter !== "all" && status !== filter) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (vault.title || "").toLowerCase().includes(q) || vault.vaultKey.toLowerCase().includes(q);
  });

  return (
    <div className="page">
      <PageHeader
        eyebrow="Your vaults"
        title="Evidence, sealed until you are not."
        subtitle="Each vault stays wrapped while you check in. Go silent and the switch releases it to your guardians."
        actions={
          <Link className="button primary" to="/create">
            New vault
          </Link>
        }
      />

      {vaults.length === 0 ? (
        <EmptyState
          title="No vaults yet"
          body="Seal a message, or a pointer to the full record. It is encrypted on this device, only the sealed ciphertext is stored."
          action={
            <Link className="button primary" to="/create">
              Create your first vault
            </Link>
          }
        />
      ) : (
        <>
          <div className="stats">
            <div className="stat">
              <span>Total</span>
              <strong>{vaults.length}</strong>
            </div>
            <div className="stat">
              <span>Sealed</span>
              <strong className="teal">{sealed}</strong>
            </div>
            <div className="stat">
              <span>Released</span>
              <strong className="rose">{released}</strong>
            </div>
          </div>

          <div className="vault-toolbar">
            <input
              className="vault-search"
              type="search"
              name="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search vaults…"
              aria-label="Search vaults"
              autoComplete="off"
            />
            <div className="segmented" role="group" aria-label="Filter vaults">
              {FILTERS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={filter === item.value ? "seg active" : "seg"}
                  onClick={() => setFilter(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="vault-empty">No vaults match that search.</p>
          ) : (
            <div className="vault-grid">
              {filtered.map((vault) => {
                const status = vaultStatus(vault, now);
                return (
                  <Link key={vault.vaultKey} to={`/vaults/${vault.vaultKey}`} className="vault-card">
                    <div className="vault-card-top">
                      <span className="vault-title">{vault.title || "Untitled vault"}</span>
                      <StatusPill status={status} />
                    </div>

                    <div className="vault-card-mid">
                      {status === "sealed" ? (
                        <>
                          <strong>{formatDuration(vault.deadlineMs - now)}</strong>
                          <span>until release</span>
                        </>
                      ) : (
                        <>
                          <strong className="rose">Released</strong>
                          <span>awaiting guardians</span>
                        </>
                      )}
                    </div>

                    <div className="vault-card-foot">
                      <code>{shortKey(vault.vaultKey)}</code>
                      <span>{formatDate(vault.createdAt)}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
