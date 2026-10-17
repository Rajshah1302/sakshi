import { useEffect, useState } from "react";
import { useNow } from "../hooks";
import { formatClock, shortKey } from "../time";

const ECG =
  "M0 60 H52 L62 60 L70 28 L80 94 L88 40 L96 60 H150 L160 60 L168 22 L178 98 L186 44 L194 60 H300";

const CYCLE = 14;

export interface LiveVault {
  vaultKey: string;
  evidenceHash?: string;
  deadlineMs?: number;
  intervalS?: number;
  status: "sealed" | "released";
}

export default function HeartbeatVault({ live }: { live?: LiveVault }) {
  const now = useNow(1000);
  const [demoRemaining, setDemoRemaining] = useState(CYCLE);
  const [demoReleased, setDemoReleased] = useState(false);

  useEffect(() => {
    if (live) return;
    const timer = window.setInterval(() => {
      setDemoRemaining((value) => {
        if (value <= 1) {
          setDemoReleased(true);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [live]);

  useEffect(() => {
    if (live || !demoReleased) return;
    const timer = window.setTimeout(() => {
      setDemoReleased(false);
      setDemoRemaining(CYCLE);
    }, 4600);
    return () => window.clearTimeout(timer);
  }, [live, demoReleased]);

  const hasLive = Boolean(live?.deadlineMs);
  const remainingMs = hasLive ? Math.max(0, (live?.deadlineMs as number) - now) : demoRemaining * 1000;
  const released = hasLive ? live?.status === "released" || remainingMs <= 0 : demoReleased;
  const totalMs = hasLive && live?.intervalS ? live.intervalS * 1000 : CYCLE * 1000;
  const width = released ? 0 : Math.min(100, (remainingMs / totalMs) * 100);
  const keyLabel = hasLive && live ? shortKey(live.vaultKey) : "0x8f…21";

  return (
    <div className={`hero-vault ${released ? "released" : ""}`}>
      <div className="hv-head">
        <span className="hv-pill">
          <i />
          {released ? "Released" : "Sealed"}
        </span>
        <span className="hv-id">
          {hasLive ? "live vault" : "sample vault"} · {keyLabel}
        </span>
      </div>

      <svg className="hv-ecg" viewBox="0 0 300 120" preserveAspectRatio="none" aria-hidden="true">
        <path className="ecg" d={ECG} />
        <path className="flat" d="M0 60 H300" />
      </svg>

      <div className="hv-timer">{released ? "00:00" : formatClock(remainingMs)}</div>
      <div className="hv-sub">
        {released ? "guardians may now open" : hasLive ? "live — until release" : "until release"}
      </div>

      <div className="hv-bar">
        <span style={{ width: `${width}%` }} />
      </div>

      <div className="hv-foot">
        <span>
          {released
            ? "2 of 3 shares required"
            : hasLive
              ? "latest vault on the register"
              : "check-in extends the heartbeat"}
        </span>
        <span className={`hv-dot ${released ? "dead" : ""}`} />
      </div>
    </div>
  );
}
