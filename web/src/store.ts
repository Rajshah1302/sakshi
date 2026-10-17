export type VaultEventType = "created" | "checked-in" | "released" | "unsealed";

export interface VaultEvent {
  at: number;
  type: VaultEventType;
  note?: string;
}

export interface LocalVault {
  vaultKey: string;
  beatKey: string;
  evidenceHash: string;
  intervalS: number;
  createdAt: number;
  deadlineMs: number;
  title: string;
  shares: string[];
  kitSaved: boolean;
  mode: "live" | "demo";
  events: VaultEvent[];
  releaseKey?: string;
}

const KEY = "sakshi:vaults:v1";

export function loadVaults(): LocalVault[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LocalVault[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveVaults(vaults: LocalVault[]): void {
  localStorage.setItem(KEY, JSON.stringify(vaults));
}

export function upsertVault(vault: LocalVault): LocalVault {
  const vaults = loadVaults();
  const index = vaults.findIndex((item) => item.vaultKey === vault.vaultKey);
  if (index >= 0) vaults[index] = vault;
  else vaults.unshift(vault);
  saveVaults(vaults);
  return vault;
}

export function getVault(vaultKey: string): LocalVault | undefined {
  return loadVaults().find((vault) => vault.vaultKey === vaultKey);
}

export function removeVault(vaultKey: string): void {
  saveVaults(loadVaults().filter((vault) => vault.vaultKey !== vaultKey));
}

export function vaultStatus(vault: LocalVault, now: number): "sealed" | "released" {
  const released = vault.events.some((event) => event.type === "released");
  return released || now >= vault.deadlineMs ? "released" : "sealed";
}

export function recoveryKit(vault: LocalVault): string {
  return [
    "SAKSHI RECOVERY KIT",
    "===================",
    "",
    `Title:     ${vault.title || "Untitled vault"}`,
    `Vault:     ${vault.vaultKey}`,
    `Heartbeat: ${vault.beatKey}`,
    `Hash:      ${vault.evidenceHash}`,
    `Created:   ${new Date(vault.createdAt).toISOString()}`,
    "",
    "Guardian shares — any 2 of 3 reconstruct the key:",
    ...vault.shares.map((share, index) => `  ${index + 1}. ${share}`),
    "",
    "Store this offline. Never share all three with one person.",
    "Without 2 shares the vault cannot be opened.",
    "",
  ].join("\n");
}
