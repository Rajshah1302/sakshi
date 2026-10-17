import { useEffect, useState } from "react";

const ECG =
  "M0 60 H52 L62 60 L70 28 L80 94 L88 40 L96 60 H150 L160 60 L168 22 L178 98 L186 44 L194 60 H300";

const CYCLE = 14;

function clock(total: number): string {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function HeartbeatVault() {
  const [remaining, setRemaining] = useState(CYCLE);
  const [released, setReleased] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          setReleased(true);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!released) return;
    const timer = window.setTimeout(() => {
      setReleased(false);
      setRemaining(CYCLE);
    }, 4600);
    return () => window.clearTimeout(timer);
  }, [released]);

  const width = released ? 0 : (remaining / CYCLE) * 100;

  return (
    <div className={`hero-vault ${released ? "released" : ""}`}>
      <div className="hv-head">
        <span className="hv-pill">
          <i />
          {released ? "Released" : "Sealed"}
        </span>
        <span className="hv-id">vault · 0x8f…21</span>
      </div>

      <svg className="hv-ecg" viewBox="0 0 300 120" preserveAspectRatio="none" aria-hidden="true">
        <path className="ecg" d={ECG} />
        <path className="flat" d="M0 60 H300" />
      </svg>

      <div className="hv-timer">{released ? "00:00" : clock(remaining)}</div>
      <div className="hv-sub">{released ? "guardians may now open" : "until release"}</div>

      <div className="hv-bar">
        <span style={{ width: `${width}%` }} />
      </div>

      <div className="hv-foot">
        <span>{released ? "2 of 3 shares required" : "check-in extends the heartbeat"}</span>
        <span className={`hv-dot ${released ? "dead" : ""}`} />
      </div>
    </div>
  );
}
