import { useNow } from "../hooks";
import { formatClock, shortKey } from "../time";
import type { LiveVault } from "./HeartbeatVault";

export default function ProductMockup({ live }: { live?: LiveVault }) {
  const now = useNow(1000);
  const hasLive = Boolean(live?.deadlineMs);
  const remainingMs = hasLive ? Math.max(0, (live?.deadlineMs as number) - now) : 0;
  const released = hasLive ? live?.status === "released" || remainingMs <= 0 : false;
  const vaultKey = live?.vaultKey ?? "0x8f2ac4b1e9d7a3f5c6b8d0e2a4f6c8b0d2e4f6a8c0b2d4e6f8a0c2b4d6e8f02121c4";
  const hash = live?.evidenceHash ?? "0x51fc2f61795280306ba085c706037e4441530ec955be926538ad349ecb298f68";
  const totalMs = live?.intervalS ? live.intervalS * 1000 : 1;
  const progress = released ? 0 : hasLive ? Math.min(100, (remainingMs / totalMs) * 100) : 64;
  const timer = hasLive ? formatClock(remainingMs) : "06:12:44";

  return (
    <div className="mockup" aria-hidden="true">
      <div className="mockup-glow" />
      <div className="window">
        <div className="window-bar">
          <span className="dots">
            <i />
            <i />
            <i />
          </span>
          <span className="window-url">sakshi.app/vaults/{shortKey(vaultKey)}</span>
          <span className="window-spacer" />
        </div>

        <div className="window-body">
          <aside className="mock-sidebar">
            <div className="mock-brand">◈ Sakshi</div>
            <div className="mock-nav">
              <span className="active">Vaults</span>
              <span>New vault</span>
              <span>Guardians</span>
              <span>Settings</span>
            </div>
            <div className="mock-net">
              <i /> {live ? "Live · Tiramisu" : "Demo · In-memory"}
            </div>
          </aside>

          <div className="mock-main">
            <div className="mock-head">
              <div>
                <span className="mock-kicker">Vault</span>
                <h3>Manipur field notes</h3>
              </div>
              <span className={`mock-pill ${released ? "released" : "sealed"}`}>
                <i />
                {released ? "Released" : "Sealed"}
              </span>
            </div>

            <div className="mock-grid">
              <div className="mock-timer-card">
                <span className="mock-label">Until release</span>
                <strong>{released ? "00:00" : timer}</strong>
                <div className="mock-bar">
                  <span style={{ width: `${progress}%` }} />
                </div>
                <span className="mock-btn">I’m here — check in</span>
              </div>

              <div className="mock-side-card">
                <span className="mock-label">Recovery kit</span>
                <div className="mock-share">
                  <span>01</span>
                  <code>••••••••</code>
                </div>
                <div className="mock-share">
                  <span>02</span>
                  <code>••••••••</code>
                </div>
                <div className="mock-share">
                  <span>03</span>
                  <code>••••••••</code>
                </div>
                <p>Any 2 of 3 open the vault.</p>
              </div>
            </div>

            <div className="mock-rows">
              <div>
                <span>Vault key</span>
                <code>{shortKey(vaultKey)}</code>
              </div>
              <div>
                <span>Heartbeat</span>
                <code>{hasLive ? "live" : "7d"}</code>
              </div>
              <div>
                <span>Evidence hash</span>
                <code>{shortKey(hash)}</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
