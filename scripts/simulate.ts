import { randomBytes } from "node:crypto";
import { combine, decrypt, encrypt, generateKey, split } from "../src/crypto";

function hex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("hex");
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`ok: ${message}`);
}

function main(): void {
  const evidence = new Uint8Array(randomBytes(256));
  const key = generateKey();
  const sealed = encrypt(key, evidence);

  console.log(`evidence:   ${hex(evidence).slice(0, 32)}… (${evidence.length} bytes)`);
  console.log(`ciphertext: ${sealed.ciphertext.slice(0, 32)}…`);

  const shares = split(key, 3, 2);
  assert(shares.length === 3, "split produced 3 shares");

  const pairA = combine([shares[0] as string, shares[1] as string]);
  const outA = decrypt(pairA, sealed);
  assert(Buffer.from(outA).equals(Buffer.from(evidence)), "guardian pair 1+2 decrypts");

  const pairB = combine([shares[1] as string, shares[2] as string]);
  const outB = decrypt(pairB, sealed);
  assert(Buffer.from(outB).equals(Buffer.from(evidence)), "guardian pair 2+3 decrypts");

  let singleRejected = false;
  try {
    combine([shares[0] as string]);
  } catch {
    singleRejected = true;
  }
  assert(singleRejected, "a single share cannot reconstruct");

  console.log("simulation complete");
}

main();
