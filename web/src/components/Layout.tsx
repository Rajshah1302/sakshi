import { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { api, type Health } from "../api";
import { shortKey } from "../time";

const NAV = [
  { to: "/vaults", label: "Vaults", icon: "▤", end: true },
  { to: "/create", label: "New vault", icon: "＋", end: false },
  { to: "/guardians", label: "Guardians", icon: "⚖", end: false },
  { to: "/settings", label: "Settings", icon: "⚙", end: false },
];

export default function Layout() {
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    api
      .health()
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" to="/">
          <span className="brand-mark">◈</span>
          <div>
            <strong>Sakshi</strong>
            <span>evidence, on your terms</span>
          </div>
        </Link>

        <nav className="nav">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className={`net ${health?.mode ?? "unknown"}`}>
            <i />
            {health?.mode === "live"
              ? "Live · Tiramisu"
              : health?.mode === "demo"
                ? "Demo · In-memory"
                : "Connecting…"}
          </div>
          {health?.address ? <code className="addr">{shortKey(health.address)}</code> : null}
          <Link className="sidebar-home" to="/">
            ← Back to site
          </Link>
          <p className="sidebar-note">AES-256-GCM · Shamir 2-of-3</p>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
