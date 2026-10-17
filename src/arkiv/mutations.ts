import { ExpirationTime, jsonToPayload, stringToPayload } from "@arkiv-network/sdk";
import { bytes32, key, str, u64 } from "@arkiv-network/sdk/attr";
import { keccak256, toBytes } from "viem";
import { encrypt, generateKey, split } from "../crypto";
import { getWalletClient } from "./client";
import { PROJECT, TYPE_BEAT, TYPE_RELEASE, TYPE_VAULT } from "./entities";

export interface CreateResult {
  vaultKey: `0x${string}`;
  beatKey: `0x${string}`;
  shares: string[];
  evidenceHash: `0x${string}`;
  deadlineMs: number;
}

export async function createVaultAndBeat(
  evidence: Uint8Array,
  intervalS: number,
  guardians = 3,
  threshold = 2,
): Promise<CreateResult> {
  const wallet = getWalletClient();

  const keyBytes = generateKey();
  const sealed = encrypt(keyBytes, evidence);
  const evidenceHash = keccak256(toBytes(JSON.stringify(sealed)));

  const vault = await wallet.createEntity({
    payload: jsonToPayload({ v: 1, ...sealed }),
    contentType: "application/json",
    attributes: {
      project: str(PROJECT),
      type: str(TYPE_VAULT),
      evidence_hash: bytes32(evidenceHash),
      created_ms: u64(Date.now()),
    },
    expires: ExpirationTime.permanent(),
    flags: { readonly: true },
  });

  const shares = split(keyBytes, guardians, threshold);
  const deadlineMs = Date.now() + intervalS * 1000;

  const beat = await wallet.createEntity({
    payload: stringToPayload(""),
    contentType: "text/plain",
    attributes: {
      project: str(PROJECT),
      type: str(TYPE_BEAT),
      vault_key: key(vault.entityKey),
      deadline: u64(deadlineMs),
      interval_s: u64(intervalS),
    },
    // The heartbeat is owned by the user and must stay extendable.
    expires: ExpirationTime.atDate(new Date(deadlineMs)),
  });

  return {
    vaultKey: vault.entityKey,
    beatKey: beat.entityKey,
    shares,
    evidenceHash,
    deadlineMs,
  };
}

export interface CheckInResult {
  deadlineMs: number;
  txHash: `0x${string}`;
}

export async function checkIn(beatKey: `0x${string}`, intervalS: number): Promise<CheckInResult> {
  const wallet = getWalletClient();
  const deadlineMs = Date.now() + intervalS * 1000;

  const result = await wallet.executeBatch({
    patches: [{ entityKey: beatKey, set: { deadline: u64(deadlineMs) } }],
    extensions: [{ entityKey: beatKey, expires: ExpirationTime.atDate(new Date(deadlineMs)) }],
  });

  return { deadlineMs, txHash: result.txHash };
}

export interface ReleaseResult {
  releaseKey: `0x${string}`;
  txHash: `0x${string}`;
}

export async function writeRelease(vaultKey: `0x${string}`): Promise<ReleaseResult> {
  const wallet = getWalletClient();

  const release = await wallet.createEntity({
    payload: stringToPayload(""),
    contentType: "text/plain",
    attributes: {
      project: str(PROJECT),
      type: str(TYPE_RELEASE),
      vault_key: key(vaultKey),
      released_ms: u64(Date.now()),
    },
    expires: ExpirationTime.permanent(),
    flags: { readonly: true },
  });

  return { releaseKey: release.entityKey, txHash: release.txHash };
}
