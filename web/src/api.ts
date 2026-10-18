import { demo } from "./demo";

export type Mode = "live" | "demo";

export interface Health {
  ok: boolean;
  mode: Mode;
  address: string | null;
}

export interface CreateResponse {
  vaultKey: string;
  beatKey: string;
  evidenceHash: string;
  deadlineMs: number;
  shares: string[];
}

export interface BeatResponse {
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
  mode: Mode;
  total: number;
  sealed: number;
  released: number;
  recent: StatVault[];
}

const DEMO = import.meta.env.VITE_DEMO === "true";

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    headers: { "content-type": "application/json" },
    ...init,
  });
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    throw new Error(body.error ?? `request failed (${response.status})`);
  }
  return body as T;
}

export const api = {
  health: async (): Promise<Health> => (DEMO ? demo.health() : call<Health>("/health")),

  stats: async (): Promise<Stats> => (DEMO ? demo.stats() : call<Stats>("/stats")),

  create: async (text: string, intervalS: number): Promise<CreateResponse> =>
    DEMO
      ? demo.create(text, intervalS)
      : call<CreateResponse>("/create", {
          method: "POST",
          body: JSON.stringify({ text, intervalS }),
        }),

  checkIn: async (beatKey: string, intervalS: number): Promise<{ deadlineMs: number; txHash?: string }> =>
    DEMO
      ? demo.checkIn(beatKey, intervalS)
      : call<{ deadlineMs: number; txHash?: string }>(`/checkin/${beatKey}`, {
          method: "POST",
          body: JSON.stringify({ intervalS }),
        }),

  beat: async (beatKey: string): Promise<BeatResponse> =>
    DEMO ? demo.beat(beatKey) : call<BeatResponse>(`/beat/${beatKey}`),

  vault: async (vaultKey: string): Promise<{ evidenceHash: string }> =>
    DEMO ? demo.vault(vaultKey) : call<{ evidenceHash: string }>(`/vault/${vaultKey}`),

  release: async (vaultKey: string): Promise<{ releaseKey: string; txHash?: string }> =>
    DEMO
      ? demo.release(vaultKey)
      : call<{ releaseKey: string; txHash?: string }>(`/release/${vaultKey}`, { method: "POST" }),

  unseal: async (vaultKey: string, shares: string[]): Promise<{ text: string }> =>
    DEMO
      ? demo.unseal(vaultKey, shares)
      : call<{ text: string }>("/unseal", {
          method: "POST",
          body: JSON.stringify({ vaultKey, shares }),
        }),
};
