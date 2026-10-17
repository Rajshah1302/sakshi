import { randomBytes } from "node:crypto";
import { combine, decrypt, encrypt, generateKey, split } from "../src/crypto";

interface VaultRecord {
  key: string;
  sealed: { nonce: string; ciphertext: string };
}

interface BeatRecord {
  key: string;
  vaultKey: string;
  deadlineMs: number;
}

function log(message: string): void {
  console.log(`[switch] ${message}`);
}

function main(): void {
  // A virtual clock so the demo is instant.
  let now = 1_760_000_000_000;

  const evidence = new Uint8Array(randomBytes(512));
  const keyBytes = generateKey();
  const sealed = encrypt(keyBytes, evidence);
  const shares = split(keyBytes, 3, 2);

  const vault: VaultRecord = { key: "0xvault", sealed };
  const beat: BeatRecord = { key: "0xbeat", vaultKey: vault.key, deadlineMs: now + 3_000 };

  log(`t=0.0  create vault + beat (deadline in 3s)`);
  log(`      evidence ${evidence.length} bytes, sealed ${sealed.ciphertext.length} b64 chars`);

  now += 1_000;
  beat.deadlineMs = now + 3_000;
  log(`t=1.0  check-in → extendEntity (deadline now in 3s)`);

  now += 2_500;
  const alive = now < beat.deadlineMs;
  log(`t=3.5  ${alive ? "alive" : "lapsed"} (remaining ${((beat.deadlineMs - now) / 1000).toFixed(1)}s)`);

  now += 1_000;
  const lapsed = now >= beat.deadlineMs;
  log(`t=4.5  ${lapsed ? "LAPSED — watchdog writes Release" : "alive"}`);
  if (!lapsed) {
    console.error("expected the beat to lapse");
    process.exit(1);
  }

  const reconstructed = combine([shares[0] as string, shares[1] as string]);
  const out = decrypt(reconstructed, vault.sealed);
  const ok = Buffer.from(out).equals(Buffer.from(evidence));

  log(`        guardians 1+2 unseal: ${ok ? "OK" : "FAILED"}`);
  if (!ok) process.exit(1);

  const singleRejected = (() => {
    try {
      combine([shares[0] as string]);
      return false;
    } catch {
      return true;
    }
  })();
  log(`        single share rejected: ${singleRejected ? "OK" : "FAILED"}`);

  log("switch simulation complete");
}

main();
