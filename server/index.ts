import cors from "cors";
import express from "express";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { createBackend } from "./backend";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const backend = createBackend();

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, mode: backend.mode, address: backend.address ?? null });
});

app.post("/api/create", async (req, res) => {
  const { text, intervalS } = (req.body ?? {}) as { text?: unknown; intervalS?: unknown };
  if (typeof text !== "string" || text.trim().length === 0) {
    res.status(400).json({ error: "text is required" });
    return;
  }
  const interval = Number(intervalS ?? 60);
  if (!Number.isFinite(interval) || interval < 2) {
    res.status(400).json({ error: "intervalS must be at least 2" });
    return;
  }
  try {
    res.json(await backend.create(text, interval));
  } catch (error) {
    res.status(500).json({ error: message(error) });
  }
});

app.post("/api/checkin/:beatKey", async (req, res) => {
  const interval = Number((req.body as { intervalS?: unknown })?.intervalS ?? 60);
  try {
    res.json(await backend.checkIn(req.params.beatKey, interval));
  } catch (error) {
    res.status(410).json({ error: message(error) });
  }
});

app.get("/api/beat/:beatKey", async (req, res) => {
  try {
    res.json(await backend.getBeat(req.params.beatKey));
  } catch (error) {
    res.status(410).json({ error: message(error) });
  }
});

app.get("/api/vault/:vaultKey", async (req, res) => {
  try {
    res.json(await backend.getVault(req.params.vaultKey));
  } catch (error) {
    res.status(404).json({ error: message(error) });
  }
});

app.post("/api/release/:vaultKey", async (req, res) => {
  try {
    res.json(await backend.writeRelease(req.params.vaultKey));
  } catch (error) {
    res.status(500).json({ error: message(error) });
  }
});

app.post("/api/unseal", async (req, res) => {
  const { vaultKey, shares } = (req.body ?? {}) as { vaultKey?: unknown; shares?: unknown };
  if (typeof vaultKey !== "string" || !Array.isArray(shares) || shares.length < 2) {
    res.status(400).json({ error: "vaultKey and at least 2 shares are required" });
    return;
  }
  try {
    const text = await backend.unseal(vaultKey, shares.map(String));
    res.json({ text });
  } catch (error) {
    res.status(400).json({ error: message(error) });
  }
});

// Serve the built web app when present (production).
const dist = join(process.cwd(), "dist", "web");
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api")) {
      next();
      return;
    }
    res.sendFile(join(dist, "index.html"));
  });
}

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => {
  console.log(`Sakshi API on http://localhost:${port} (${backend.mode} mode)`);
});
