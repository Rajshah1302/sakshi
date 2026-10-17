import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export interface SealedEvidence {
  /** AES-GCM nonce, base64. */
  nonce: string;
  /** ciphertext || auth-tag, base64. */
  ciphertext: string;
}

const ALGO = "aes-256-gcm";
const NONCE_LEN = 12;
const TAG_LEN = 16;

export function generateKey(): Uint8Array {
  return new Uint8Array(randomBytes(32));
}

export function encrypt(key: Uint8Array, plaintext: Uint8Array): SealedEvidence {
  if (key.length !== 32) throw new Error("key must be 32 bytes");
  const nonce = randomBytes(NONCE_LEN);
  const cipher = createCipheriv(ALGO, key, nonce);
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    nonce: nonce.toString("base64"),
    ciphertext: Buffer.concat([ct, tag]).toString("base64"),
  };
}

export function decrypt(key: Uint8Array, sealed: SealedEvidence): Uint8Array {
  if (key.length !== 32) throw new Error("key must be 32 bytes");
  const nonce = Buffer.from(sealed.nonce, "base64");
  const buf = Buffer.from(sealed.ciphertext, "base64");
  if (buf.length < TAG_LEN) throw new Error("ciphertext is too short");
  const tag = buf.subarray(buf.length - TAG_LEN);
  const ct = buf.subarray(0, buf.length - TAG_LEN);
  const decipher = createDecipheriv(ALGO, key, nonce);
  decipher.setAuthTag(tag);
  return new Uint8Array(Buffer.concat([decipher.update(ct), decipher.final()]));
}
