import type { BeatResponse, CreateResponse, Health, Stats } from "./api";
import { combine, decrypt, encrypt, generateKey, hash, split, type Sealed } from "./browser-crypto";

const STORE = "sakshi:demo:v1";
const SEED_INTERVAL_S = 7 * 24 * 3600;

interface DemoVault {
  sealed: Sealed;
  evidenceHash: string;
}

interface DemoBeat {
  key: string;
  vaultKey: string;
  deadlineMs: number;
  intervalS: number;
}

interface DemoState {
  vaults: Record<string, DemoVault>;
  beats: Record<string, DemoBeat>;
}

function load(): DemoState {
  try {
    const raw = localStorage.getItem(STORE);
    if (!raw) return { vaults: {}, beats: {} };
    const parsed = JSON.parse(raw) as Partial<DemoState>;
    return { vaults: parsed.vaults ?? {}, beats: parsed.beats ?? {} };
  } catch {
    return { vaults: {}, beats: {} };
  }
}

function save(state: DemoState): void {
  localStorage.setItem(STORE, JSON.stringify(state));
}

function randomKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`;
}

async function ensureSeed(): Promise<void> {
  const state = load();
  if (Object.keys(state.beats).length > 0) return;

  const key = generateKey();
  const sealed = await encrypt(
    key,
    new TextEncoder().encode("Sakshi sample vault. Replace this with your own evidence."),
  );
  const evidenceHash = await hash(sealed);
  const vaultKey = randomKey();
  const beatKey = randomKey();
  const deadlineMs = Date.now() + SEED_INTERVAL_S * 1000;

  state.vaults[vaultKey] = { sealed, evidenceHash };
  state.beats[beatKey] = {
    key: beatKey,
    vaultKey,
    deadlineMs,
    intervalS: SEED_INTERVAL_S,
  };
  save(state);
}

export const demo = {
  async health(): Promise<Health> {
    return { ok: true, mode: "demo", address: null };
  },

  async stats(): Promise<Stats> {
    await ensureSeed();
    const state = load();
    const now = Date.now();
    const beats = Object.values(state.beats);
    const sealed = beats.filter((beat) => beat.deadlineMs > now).length;
    const total = Math.max(Object.keys(state.vaults).length, beats.length);

    const recent = beats
      .slice()
      .sort((a, b) => b.deadlineMs - a.deadlineMs)
      .slice(0, 6)
      .map((beat) => ({
        vaultKey: beat.vaultKey,
        evidenceHash: state.vaults[beat.vaultKey]?.evidenceHash,
        deadlineMs: beat.deadlineMs,
        intervalS: beat.intervalS,
        status: (beat.deadlineMs > now ? "sealed" : "released") as "sealed" | "released",
      }));

    return {
      mode: "demo",
      total,
      sealed,
      released: Math.max(0, total - sealed),
      recent,
    };
  },

  async create(text: string, intervalS: number): Promise<CreateResponse> {
    const key = generateKey();
    const sealed = await encrypt(key, new TextEncoder().encode(text));
    const evidenceHash = await hash(sealed);
    const state = load();
    const vaultKey = randomKey();
    const beatKey = randomKey();
    const deadlineMs = Date.now() + intervalS * 1000;

    state.vaults[vaultKey] = { sealed, evidenceHash };
    state.beats[beatKey] = { key: beatKey, vaultKey, deadlineMs, intervalS };
    save(state);

    return { vaultKey, beatKey, evidenceHash, deadlineMs, shares: split(key, 3, 2) };
  },

  async checkIn(beatKey: string, intervalS: number): Promise<{ deadlineMs: number }> {
    const state = load();
    const beat = state.beats[beatKey];
    if (!beat) throw new Error("heartbeat not found");
    if (Date.now() >= beat.deadlineMs) throw new Error("heartbeat has expired");
    beat.deadlineMs = Date.now() + intervalS * 1000;
    beat.intervalS = intervalS;
    save(state);
    return { deadlineMs: beat.deadlineMs };
  },

  async beat(beatKey: string): Promise<BeatResponse> {
    const beat = load().beats[beatKey];
    if (!beat) throw new Error("heartbeat not found");
    if (Date.now() >= beat.deadlineMs) throw new Error("heartbeat has expired");
    return {
      key: beat.key,
      deadline: beat.deadlineMs,
      intervalS: beat.intervalS,
      vaultKey: beat.vaultKey,
    };
  },

  async vault(vaultKey: string): Promise<{ evidenceHash: string }> {
    const vault = load().vaults[vaultKey];
    if (!vault) throw new Error("vault not found");
    return { evidenceHash: vault.evidenceHash };
  },

  async release(vaultKey: string): Promise<{ releaseKey: string }> {
    if (!load().vaults[vaultKey]) throw new Error("vault not found");
    return { releaseKey: randomKey() };
  },

  async unseal(vaultKey: string, shares: string[]): Promise<{ text: string }> {
    const vault = load().vaults[vaultKey];
    if (!vault) throw new Error("vault not found");
    const key = combine(shares);
    return { text: new TextDecoder().decode(await decrypt(key, vault.sealed)) };
  },
};
