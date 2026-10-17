import { randomBytes } from "node:crypto";
import { keccak256, toBytes } from "viem";
import { combine, decrypt, encrypt, generateKey, split } from "../src/crypto";
import { hasPrivateKey } from "../src/config";
import { checkIn, createVaultAndBeat, writeRelease } from "../src/arkiv/mutations";
import { getBeat, getVault, unsealVault } from "../src/arkiv/queries";

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

export interface SakshiBackend {
  mode: BackendMode;
  create(text: string, intervalS: number): Promise<CreateResult>;
  checkIn(beatKey: string, intervalS: number): Promise<{ deadlineMs: number; txHash?: string }>;
  getBeat(beatKey: string): Promise<BeatView>;
  getVault(vaultKey: string): Promise<{ evidenceHash: string }>;
  writeRelease(vaultKey: string): Promise<{ releaseKey: string; txHash?: string }>;
  unseal(vaultKey: string, shares: string[]): Promise<string>;
}

export function createBackend(): SakshiBackend {
  return hasPrivateKey() ? liveBackend() : memoryBackend();
}

function liveBackend(): SakshiBackend {
  return {
    mode: "live",
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

function memoryBackend(): SakshiBackend {
  const vaults = new Map<string, MemoryVault>();
  const beats = new Map<string, MemoryBeat>();
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

      vaults.set(vaultKey, { sealed, evidenceHash });
      beats.set(beatKey, { key: beatKey, vaultKey, deadlineMs, intervalS });

      return { vaultKey, beatKey, evidenceHash, deadlineMs, shares: split(keyBytes, 3, 2) };
    },
    async checkIn(beatKey, intervalS) {
      const beat = beats.get(beatKey);
      if (!beat) throw new Error("heartbeat not found");
      if (Date.now() >= beat.deadlineMs) throw new Error("heartbeat has expired");
      beat.deadlineMs = Date.now() + intervalS * 1000;
      beat.intervalS = intervalS;
      return { deadlineMs: beat.deadlineMs };
    },
    async getBeat(beatKey) {
      const beat = beats.get(beatKey);
      if (!beat) throw new Error("heartbeat not found");
      if (Date.now() >= beat.deadlineMs) throw new Error("heartbeat has expired");
      return { key: beat.key, deadline: beat.deadlineMs, intervalS: beat.intervalS, vaultKey: beat.vaultKey };
    },
    async getVault(vaultKey) {
      const vault = vaults.get(vaultKey);
      if (!vault) throw new Error("vault not found");
      return { evidenceHash: vault.evidenceHash };
    },
    async writeRelease(vaultKey) {
      if (!vaults.has(vaultKey)) throw new Error("vault not found");
      return { releaseKey: randKey() };
    },
    async unseal(vaultKey, shares) {
      const vault = vaults.get(vaultKey);
      if (!vault) throw new Error("vault not found");
      return new TextDecoder().decode(decrypt(combine(shares), vault.sealed));
    },
  };
}
