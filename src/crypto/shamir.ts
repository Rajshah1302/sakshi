import { randomBytes } from "node:crypto";

/**
 * Shamir's Secret Sharing over GF(2^8) with the AES polynomial
 * x^8 + x^4 + x^3 + x + 1 (0x1b).
 *
 * A share is hex-encoded bytes: [x, y0, y1, ...] where x is the 1-based
 * share index and y* are the polynomial evaluations for each secret byte.
 */

function gmul(a: number, b: number): number {
  let p = 0;
  for (let i = 0; i < 8; i++) {
    if (b & 1) p ^= a;
    const hi = a & 0x80;
    a = (a << 1) & 0xff;
    if (hi) a ^= 0x1b;
    b >>= 1;
  }
  return p & 0xff;
}

function gpow(a: number, e: number): number {
  let r = 1;
  while (e > 0) {
    if (e & 1) r = gmul(r, a);
    a = gmul(a, a);
    e >>= 1;
  }
  return r;
}

function ginv(a: number): number {
  if (a === 0) throw new Error("cannot invert zero in GF(256)");
  return gpow(a, 254);
}

function gdiv(a: number, b: number): number {
  return gmul(a, ginv(b));
}

function randByte(): number {
  return randomBytes(1)[0] as number;
}

export function split(secret: Uint8Array, n: number, k: number): string[] {
  if (n < 2 || n > 255) throw new Error("share count must be 2..255");
  if (k < 2 || k > n) throw new Error("threshold must be 2..n");
  if (secret.length === 0) throw new Error("secret must not be empty");

  const ys: number[][] = Array.from({ length: n }, () => []);

  for (let b = 0; b < secret.length; b++) {
    const coeffs = new Array<number>(k);
    coeffs[0] = secret[b] as number;
    for (let i = 1; i < k; i++) coeffs[i] = randByte();

    for (let x = 1; x <= n; x++) {
      let y = 0;
      for (let i = k - 1; i >= 0; i--) {
        y = gmul(y, x) ^ (coeffs[i] as number);
      }
      (ys[x - 1] as number[]).push(y);
    }
  }

  return ys.map((values, idx) => Buffer.from([idx + 1, ...values]).toString("hex"));
}

export function combine(shares: string[]): Uint8Array {
  if (shares.length < 2) throw new Error("need at least 2 shares");

  const parsed = shares.map((hex) => {
    const buf = Buffer.from(hex, "hex");
    if (buf.length < 2) throw new Error("share is too short");
    return { x: buf[0] as number, y: Array.from(buf.subarray(1)) };
  });

  const len = (parsed[0] as { y: number[] }).y.length;
  for (const p of parsed) {
    if (p.y.length !== len) throw new Error("shares have mismatched lengths");
  }

  const out = new Uint8Array(len);
  for (let bi = 0; bi < len; bi++) {
    let secret = 0;
    for (let i = 0; i < parsed.length; i++) {
      let num = 1;
      let den = 1;
      for (let j = 0; j < parsed.length; j++) {
        if (i === j) continue;
        const xj = (parsed[j] as { x: number }).x;
        const xi = (parsed[i] as { x: number }).x;
        num = gmul(num, xj);
        den = gmul(den, xj ^ xi);
      }
      const yi = (parsed[i] as { y: number[] }).y[bi] as number;
      secret ^= gmul(yi, gdiv(num, den));
    }
    out[bi] = secret;
  }
  return out;
}
