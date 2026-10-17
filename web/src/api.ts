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
  health: () => call<Health>("/health"),
  stats: () => call<Stats>("/stats"),
  create: (text: string, intervalS: number) =>
    call<CreateResponse>("/create", { method: "POST", body: JSON.stringify({ text, intervalS }) }),
  checkIn: (beatKey: string, intervalS: number) =>
    call<{ deadlineMs: number; txHash?: string }>(`/checkin/${beatKey}`, {
      method: "POST",
      body: JSON.stringify({ intervalS }),
    }),
  beat: (beatKey: string) => call<BeatResponse>(`/beat/${beatKey}`),
  vault: (vaultKey: string) => call<{ evidenceHash: string }>(`/vault/${vaultKey}`),
  release: (vaultKey: string) =>
    call<{ releaseKey: string; txHash?: string }>(`/release/${vaultKey}`, { method: "POST" }),
  unseal: (vaultKey: string, shares: string[]) =>
    call<{ text: string }>("/unseal", { method: "POST", body: JSON.stringify({ vaultKey, shares }) }),
};
