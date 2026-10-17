import { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { api, type Health } from "../api";
import { shortKey } from "../time";
import CommandPalette from "./CommandPalette";

const NAV = [
  { to: "/vaults", label: "Vaults", icon: "▤", end: true },
  { to: "/create", label: "New vault", icon: "＋", end: false },
  { to: "/guardians", label: "Guardians", icon: "⚖", end: false },
  { to: "/settings", label: "Settings", icon: "⚙", end: false },
];

export default function Layout() {
  const [health, setHealth] = useState<Health | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    api
      .health()
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="app-shell">
        <aside className="sidebar">
          <Link className="brand" to="/">
            <span className="brand-mark" aria-hidden="true">
              ◈
            </span>
            <div>
              <strong>Sakshi</strong>
              <span>evidence, on your terms</span>
            </div>
          </Link>

          <button className="cmd-trigger" type="button" onClick={() => setPaletteOpen(true)}>
            <span>Command</span>
            <kbd>⌘K</kbd>
          </button>

          <nav className="nav">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}
              >
                <span className="nav-icon" aria-hidden="true">
                  {item.icon}
                </span>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="sidebar-foot">
            <div className={`net ${health?.mode ?? "unknown"}`}>
              <i aria-hidden="true" />
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

        <main id="main" className="main">
          <Outlet />
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  );
}
