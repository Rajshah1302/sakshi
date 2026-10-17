import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loadVaults } from "../store";
import { shortKey } from "../time";

interface Command {
  id: string;
  label: string;
  hint?: string;
  group: string;
  run: () => void;
}

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = useMemo<Command[]>(() => {
    const base: Command[] = [
      { id: "new", label: "New vault", hint: "Create", group: "Actions", run: () => navigate("/create") },
      { id: "vaults", label: "Open vaults", group: "Navigate", run: () => navigate("/vaults") },
      { id: "guardians", label: "Open guardians", group: "Navigate", run: () => navigate("/guardians") },
      { id: "settings", label: "Open settings", group: "Navigate", run: () => navigate("/settings") },
      { id: "site", label: "Back to site", group: "Navigate", run: () => navigate("/") },
    ];

    const vaults = loadVaults().map<Command>((vault) => ({
      id: `vault:${vault.vaultKey}`,
      label: vault.title || "Untitled vault",
      hint: shortKey(vault.vaultKey),
      group: "Vaults",
      run: () => navigate(`/vaults/${vault.vaultKey}`),
    }));

    return [...base, ...vaults];
  }, [navigate, open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (command) =>
        command.label.toLowerCase().includes(q) || (command.hint ?? "").toLowerCase().includes(q),
    );
  }, [commands, query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (active >= filtered.length) setActive(0);
  }, [filtered.length, active]);

  if (!open) return null;

  const run = (command: Command) => {
    onClose();
    command.run();
  };

  return (
    <div className="palette-backdrop" onClick={onClose} role="presentation">
      <div
        className="palette"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <input
          ref={inputRef}
          className="palette-input"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") onClose();
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActive((index) => Math.min(index + 1, filtered.length - 1));
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((index) => Math.max(index - 1, 0));
            }
            if (event.key === "Enter" && filtered[active]) {
              event.preventDefault();
              run(filtered[active]);
            }
          }}
          placeholder="Search vaults and actions…"
          aria-label="Search commands"
          autoComplete="off"
          spellCheck={false}
        />

        <div className="palette-list">
          {filtered.length === 0 ? <p className="palette-empty">No matches.</p> : null}
          {filtered.map((command, index) => (
            <button
              key={command.id}
              type="button"
              className={`palette-item ${index === active ? "active" : ""}`}
              onMouseEnter={() => setActive(index)}
              onClick={() => run(command)}
            >
              <span className="palette-group">{command.group}</span>
              <span className="palette-label">{command.label}</span>
              {command.hint ? <span className="palette-hint">{command.hint}</span> : null}
            </button>
          ))}
        </div>

        <div className="palette-foot">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> navigate
          </span>
          <span>
            <kbd>↵</kbd> open
          </span>
          <span>
            <kbd>esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}
