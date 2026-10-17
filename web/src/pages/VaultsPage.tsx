import { useMemo } from "react";
import { Link } from "react-router-dom";
import { EmptyState, PageHeader, StatusPill } from "../components/ui";
import { useNow } from "../hooks";
import { loadVaults, vaultStatus } from "../store";
import { formatDate, formatDuration, shortKey } from "../time";

export default function VaultsPage() {
  const now = useNow(1000);
  const vaults = useMemo(() => loadVaults(), []);
  const sealed = vaults.filter((vault) => vaultStatus(vault, now) === "sealed").length;
  const released = vaults.length - sealed;

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
          body="Seal a message, or a pointer to the full record. It is encrypted on this device — only the sealed ciphertext is stored."
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

          <div className="vault-grid">
            {vaults.map((vault) => {
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
        </>
      )}
    </div>
  );
}
