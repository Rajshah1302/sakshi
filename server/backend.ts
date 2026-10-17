import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { keccak256, toBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { combine, decrypt, encrypt, generateKey, split } from "../src/crypto";
import { hasPrivateKey, requirePrivateKey } from "../src/config";
import { checkIn, createVaultAndBeat, writeRelease } from "../src/arkiv/mutations";
import { getBeat, getVault, listLiveBeats, listVaults, unsealVault } from "../src/arkiv/queries";

export type BackendMode = "live" | "demo";

export interface CreateResult {
  vaultKey: string;
  beatKey: string;
  evidenceHash: string;
  deadlineMs: number;
  shares: string[];
}

export interface BeatView {
  key: string;
  deadline: number;
  intervalS: number;
  vaultKey: string;
}

export interface StatVault {
  vaultKey: string;
  evidenceHash?: string;
  deadlineMs?: number;
  intervalS?: number;
  status: "sealed" | "released";
}

export interface Stats {
  mode: BackendMode;
  total: number;
  sealed: number;
  released: number;
  recent: StatVault[];
}

export interface SakshiBackend {
  mode: BackendMode;
  address?: string;
  create(text: string, intervalS: number): Promise<CreateResult>;
  checkIn(beatKey: string, intervalS: number): Promise<{ deadlineMs: number; txHash?: string }>;
  getBeat(beatKey: string): Promise<BeatView>;
  getVault(vaultKey: string): Promise<{ evidenceHash: string }>;
  writeRelease(vaultKey: string): Promise<{ releaseKey: string; txHash?: string }>;
  unseal(vaultKey: string, shares: string[]): Promise<string>;
  stats(): Promise<Stats>;
}

export function createBackend(): SakshiBackend {
  return hasPrivateKey() ? liveBackend() : memoryBackend();
}

function liveBackend(): SakshiBackend {
  const address = privateKeyToAccount(requirePrivateKey()).address;

  return {
    mode: "live",
    address,
    async create(text, intervalS) {
      const result = await createVaultAndBeat(new TextEncoder().encode(text), intervalS);
      return {
        vaultKey: result.vaultKey,
        beatKey: result.beatKey,
        evidenceHash: result.evidenceHash,
        deadlineMs: result.deadlineMs,
        shares: result.shares,
      };
    },
    async checkIn(beatKey, intervalS) {
      const result = await checkIn(beatKey as `0x${string}`, intervalS);
      return { deadlineMs: result.deadlineMs, txHash: result.txHash };
    },
    async getBeat(beatKey) {
      return getBeat(beatKey as `0x${string}`);
    },
    async getVault(vaultKey) {
      const vault = await getVault(vaultKey as `0x${string}`);
      return { evidenceHash: vault.evidenceHash };
    },
    async writeRelease(vaultKey) {
      const result = await writeRelease(vaultKey as `0x${string}`);
      return { releaseKey: result.releaseKey, txHash: result.txHash };
    },
    async unseal(vaultKey, shares) {
      const bytes = await unsealVault(vaultKey as `0x${string}`, shares);
      return new TextDecoder().decode(bytes);
    },
    async stats() {
      const [beats, vaults] = await Promise.all([listLiveBeats(), listVaults()]);
      const now = Date.now();
      const recent = vaults.slice(0, 6).map((vault) => {
        const beat = beats.find((item) => item.vaultKey === vault.key);
        return {
          vaultKey: vault.key,
          evidenceHash: vault.evidenceHash,
          deadlineMs: beat?.deadline,
          intervalS: beat?.intervalS,
          status: (beat && beat.deadline > now ? "sealed" : "released") as "sealed" | "released",
        };
      });

      return {
        mode: "live" as const,
        total: vaults.length,
        sealed: beats.length,
        released: Math.max(0, vaults.length - beats.length),
        recent,
      };
    },
  };
}

interface MemoryVault {
  sealed: { nonce: string; ciphertext: string };
  evidenceHash: string;
}

interface MemoryBeat {
  key: string;
  vaultKey: string;
  deadlineMs: number;
  intervalS: number;
}

interface DemoState {
  vaults: Record<string, MemoryVault>;
  beats: Record<string, MemoryBeat>;
}

const STORE_PATH = join(process.cwd(), "server", ".demo-store.json");

function loadState(): DemoState {
  try {
    const parsed = JSON.parse(readFileSync(STORE_PATH, "utf8")) as Partial<DemoState>;
    return { vaults: parsed.vaults ?? {}, beats: parsed.beats ?? {} };
  } catch {
    return { vaults: {}, beats: {} };
  }
}

function saveState(state: DemoState): void {
  writeFileSync(STORE_PATH, JSON.stringify(state));
}

function memoryBackend(): SakshiBackend {
  const state = loadState();
  const randKey = (): string => `0x${randomBytes(32).toString("hex")}`;

  return {
    mode: "demo",
    async create(text, intervalS) {
      const keyBytes = generateKey();
      const sealed = encrypt(keyBytes, new TextEncoder().encode(text));
      const evidenceHash = keccak256(toBytes(JSON.stringify(sealed)));
      const vaultKey = randKey();
      const beatKey = randKey();
      const deadlineMs = Date.now() + intervalS * 1000;

      state.vaults[vaultKey] = { sealed, evidenceHash };
      state.beats[beatKey] = { key: beatKey, vaultKey, deadlineMs, intervalS };
      saveState(state);

      return { vaultKey, beatKey, evidenceHash, deadlineMs, shares: split(keyBytes, 3, 2) };
    },
    async checkIn(beatKey, intervalS) {
      const beat = state.beats[beatKey];
      if (!beat) throw new Error("heartbeat not found");
      if (Date.now() >= beat.deadlineMs) throw new Error("heartbeat has expired");
      beat.deadlineMs = Date.now() + intervalS * 1000;
      beat.intervalS = intervalS;
      saveState(state);
      return { deadlineMs: beat.deadlineMs };
    },
    async getBeat(beatKey) {
      const beat = state.beats[beatKey];
      if (!beat) throw new Error("heartbeat not found");
      if (Date.now() >= beat.deadlineMs) throw new Error("heartbeat has expired");
      return { key: beat.key, deadline: beat.deadlineMs, intervalS: beat.intervalS, vaultKey: beat.vaultKey };
    },
    async getVault(vaultKey) {
      const vault = state.vaults[vaultKey];
      if (!vault) throw new Error("vault not found");
      return { evidenceHash: vault.evidenceHash };
    },
    async writeRelease(vaultKey) {
      if (!state.vaults[vaultKey]) throw new Error("vault not found");
      return { releaseKey: randKey() };
    },
    async unseal(vaultKey, shares) {
      const vault = state.vaults[vaultKey];
      if (!vault) throw new Error("vault not found");
      return new TextDecoder().decode(decrypt(combine(shares), vault.sealed));
    },
    async stats() {
      const now = Date.now();
      const beats = Object.values(state.beats);
      const vaultKeys = Object.keys(state.vaults);
      const sealed = beats.filter((beat) => beat.deadlineMs > now).length;
      const total = Math.max(vaultKeys.length, beats.length);

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
        mode: "demo" as const,
        total,
        sealed,
        released: Math.max(0, total - sealed),
        recent,
      };
    },
  };
}
