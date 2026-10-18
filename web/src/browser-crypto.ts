const encoder = new TextEncoder();

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i] as number);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function asBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  return copy.buffer;
}

export function generateKey(): Uint8Array {
  const key = new Uint8Array(32);
  crypto.getRandomValues(key);
  return key;
}

export interface Sealed {
  nonce: string;
  ciphertext: string;
}

export async function encrypt(key: Uint8Array, plaintext: Uint8Array): Promise<Sealed> {
  const cryptoKey = await crypto.subtle.importKey("raw", asBuffer(key), "AES-GCM", false, [
    "encrypt",
  ]);
  const nonce = new Uint8Array(12);
  crypto.getRandomValues(nonce);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: asBuffer(nonce) },
      cryptoKey,
      asBuffer(plaintext),
    ),
  );
  return { nonce: toBase64(nonce), ciphertext: toBase64(ciphertext) };
}

export async function decrypt(key: Uint8Array, sealed: Sealed): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey("raw", asBuffer(key), "AES-GCM", false, [
    "decrypt",
  ]);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: asBuffer(fromBase64(sealed.nonce)) },
    cryptoKey,
    asBuffer(fromBase64(sealed.ciphertext)),
  );
  return new Uint8Array(plaintext);
}

export async function hash(sealed: Sealed): Promise<string> {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", asBuffer(encoder.encode(JSON.stringify(sealed)))),
  );
  return `0x${Array.from(digest)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`;
}

/* Shamir secret sharing over GF(2^8), AES polynomial 0x1b. */

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
  const buffer = new Uint8Array(1);
  crypto.getRandomValues(buffer);
  return buffer[0] as number;
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

  return ys.map((values, idx) => {
    const bytes = new Uint8Array(values.length + 1);
    bytes[0] = idx + 1;
    bytes.set(values, 1);
    return Array.from(bytes)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  });
}

export function combine(shares: string[]): Uint8Array {
  if (shares.length < 2) throw new Error("need at least 2 shares");

  const parsed = shares.map((hex) => {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    if (bytes.length < 2) throw new Error("share is too short");
    return { x: bytes[0] as number, y: Array.from(bytes.subarray(1)) };
  });

  const len = (parsed[0] as { y: number[] }).y.length;
  for (const item of parsed) {
    if (item.y.length !== len) throw new Error("shares have mismatched lengths");
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
