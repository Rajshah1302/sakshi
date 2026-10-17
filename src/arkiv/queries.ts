import { and, eq } from "@arkiv-network/sdk/query";
import { combine, decrypt, type SealedEvidence } from "../crypto";
import { getPublicClient } from "./client";
import {
  PROJECT,
  readNumber,
  readString,
  TYPE_BEAT,
  TYPE_VAULT,
  type AttributeMap,
} from "./entities";

export interface BeatView {
  key: `0x${string}`;
  deadline: number;
  intervalS: number;
  vaultKey: `0x${string}`;
}

function toJson(payload: Uint8Array): unknown {
  return JSON.parse(new TextDecoder().decode(payload));
}

export async function getBeat(beatKey: `0x${string}`): Promise<BeatView> {
  const entity = await getPublicClient().getEntity(beatKey);
  const attrs = entity.attributes as AttributeMap;
  return {
    key: entity.key as `0x${string}`,
    deadline: readNumber(attrs, "deadline"),
    intervalS: readNumber(attrs, "interval_s"),
    vaultKey: readString(attrs, "vault_key") as `0x${string}`,
  };
}

export interface VaultView {
  key: `0x${string}`;
  evidenceHash: string;
  sealed: SealedEvidence;
}

export async function getVault(vaultKey: `0x${string}`): Promise<VaultView> {
  const entity = await getPublicClient().getEntity(vaultKey);
  const attrs = entity.attributes as AttributeMap;
  const payload = toJson(entity.payload) as { nonce: string; ciphertext: string };
  return {
    key: entity.key as `0x${string}`,
    evidenceHash: readString(attrs, "evidence_hash"),
    sealed: { nonce: payload.nonce, ciphertext: payload.ciphertext },
  };
}

export async function listLiveBeats(): Promise<
  Array<{ key: `0x${string}`; deadline: number; intervalS: number; vaultKey: `0x${string}` }>
> {
  const result = await getPublicClient()
    .select("*")
    .where(and(eq("project", PROJECT), eq("type", TYPE_BEAT)))
    .limit(200)
    .fetch();

  return result.entities.map((entity) => {
    const attrs = entity.attributes as AttributeMap;
    return {
      key: entity.key as `0x${string}`,
      deadline: readNumber(attrs, "deadline"),
      intervalS: readNumber(attrs, "interval_s"),
      vaultKey: readString(attrs, "vault_key") as `0x${string}`,
    };
  });
}

export async function listVaults(): Promise<Array<{ key: `0x${string}`; evidenceHash: string }>> {
  const result = await getPublicClient()
    .select("*")
    .where(and(eq("project", PROJECT), eq("type", TYPE_VAULT)))
    .limit(200)
    .fetch();

  return result.entities.map((entity) => {
    const attrs = entity.attributes as AttributeMap;
    return {
      key: entity.key as `0x${string}`,
      evidenceHash: readString(attrs, "evidence_hash"),
    };
  });
}

/** Reconstruct the key from guardian shares and decrypt the vault payload. */
export async function unsealVault(
  vaultKey: `0x${string}`,
  shares: string[],
): Promise<Uint8Array> {
  const vault = await getVault(vaultKey);
  const keyBytes = combine(shares);
  return decrypt(keyBytes, vault.sealed);
}
