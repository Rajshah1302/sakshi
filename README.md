# Sakshi

**An encrypted dead man's switch for evidence, built on Arkiv.**

Sakshi keeps a piece of evidence sealed while its holder checks in. If the holder
goes silent, the switch releases the vault to the guardians they chose. The
evidence never becomes public and no single guardian can open it alone.

- **Live app:** https://sakshi-eta-eight.vercel.app
- **Demo video:** https://sakshi-eta-eight.vercel.app/sakshi-demo-vo.mp4
- **Repository:** https://github.com/Rajshah1302/sakshi
- **Devfolio:** https://devfolio.co/projects/sakshi-1ea8
- **Network:** Arkiv Tiramisu testnet, chain ID `7738577`
- **License:** MIT

> **Honest status.** The deployment is a working client-side demo. It does not
> write to Arkiv yet. The local server and CLI contain the real Arkiv path, but
> they need a funded Tiramisu wallet to create entities. This README documents
> what is built, what is not built, and why.

---

## Table of contents

1. [The problem](#1-the-problem)
2. [What Sakshi does](#2-what-sakshi-does)
3. [How it works](#3-how-it-works)
4. [Status and limitations](#4-status-and-limitations)
5. [Quick start](#5-quick-start)
6. [Architecture](#6-architecture)
7. [Data model](#7-data-model)
8. [Protocols](#8-protocols)
9. [Cryptography](#9-cryptography)
10. [Arkiv integration](#10-arkiv-integration)
11. [Threat model](#11-threat-model)
12. [Privacy and India's DPDP Act](#12-privacy-and-indias-dpdp-act)
13. [The web application](#13-the-web-application)
14. [HTTP API](#14-http-api)
15. [CLI reference](#15-cli-reference)
16. [Deployment](#16-deployment)
17. [Testing and verification](#17-testing-and-verification)
18. [Friction report](#18-friction-report)
19. [Whitepaper](#19-whitepaper)
20. [Devfolio submission mapping](#20-devfolio-submission-mapping)
21. [Roadmap](#21-roadmap)
22. [FAQ](#22-faq)
23. [Glossary](#23-glossary)
24. [References](#24-references)
25. [Changelog](#25-changelog)
26. [License](#26-license)

---

## 1. The problem

India is one of the hardest places in the world to report from.

- **Press freedom:** RSF ranks India **157th of 180** in its 2026 World Press
  Freedom Index, with a score of 31.96.
- **Journalists detained:** on **13 October 2026**, around **40 journalists**
  covering protests against the electoral roll revision were detained by police
  in New Delhi and other cities.
- **Journalists killed:** RSF reports that, on average, **two to three
  journalists are killed for their work every year** in India, and calls the
  country one of the world's most dangerous for media professionals.
- **Internet shutdowns:** Access Now and the #KeepItOn coalition documented
  **313 shutdowns across 52 countries in 2025**, the highest since 2016. India
  has repeatedly topped the world's shutdown rankings.

The pattern is consistent. The person who holds the evidence is the person most
at risk, and the evidence usually sits on a single phone or a single cloud
account. When the phone is seized, the account is taken down, or the person is
detained, the evidence goes with them.

Existing tools do not solve this:

| Tool | What fails |
|---|---|
| Google Drive, Dropbox, Notion | A central operator can suspend the account or hand over the data. |
| Signal, WhatsApp | Good for transport, not for a time-scoped release to guardians. |
| IPFS | Content-addressed, permanent, but cannot expire or revoke. |
| A normal database | The operator can switch it off, rewrite it, or seize it with the server. |
| A warrant canary | A signal that something happened. It does not protect or release the evidence. |
| Password managers | Designed for credentials, not for a quorum release of sensitive documents. |

Sakshi is built around one question: **how can a journalist's evidence survive
the journalist's silence, without becoming public and without depending on a
single operator?**

The answer is a vault, a heartbeat, and a quorum.

---

## 2. What Sakshi does

Sakshi has three primitives.

1. **A sealed vault.** The holder writes a message, or a pointer to the full
   record, and seals it with AES-256-GCM. Only ciphertext and a hash are stored
   publicly. The vault is a `readonly`, permanent Arkiv entity.
2. **A heartbeat.** A second Arkiv entity expires at the holder's check-in
   deadline. Every check-in extends the deadline. The heartbeat is the switch.
3. **A guardian quorum.** The content key is split with Shamir's Secret Sharing
   into three shares. Any two shares reconstruct the key. One share reveals
   nothing.

The flow is:

1. The holder seals the evidence.
2. The holder checks in before the deadline.
3. If the holder goes silent, the heartbeat lapses.
4. Guardians combine any two of three shares and decrypt the vault.
5. A `Release` record marks that the switch fired.

The vault is permanent. Only the heartbeat expires. That split is the product:
the evidence outlives the person who sealed it, while the check-in lease is
time-scoped and renewable.

---

## 3. How it works

```text
                    ┌──────────────────────────────────────────┐
                    │                HOLDER                    │
                    │  evidence ──► AES-256-GCM ──► ciphertext │
                    │                    │                     │
                    │                    └── key ──► Shamir 2-of-3
                    │  check-in ──► extendEntity(Beat)         │
                    └───────────────┬──────────────────────────┘
                                    │
              ┌─────────────────────┴─────────────────────┐
              │                    ARKIV                  │
              │  Vault   readonly, permanent, ciphertext  │
              │  Beat    expiring, deadline = check-in    │
              │  Release written when the Beat lapses      │
              └─────────────────────┬─────────────────────┘
                                    │
                    ┌───────────────┴──────────────┐
                    │          GUARDIANS           │
                    │  share 1 + share 2 ──► key   │
                    │  key ──► decrypt ──► evidence│
                    └──────────────────────────────┘
```

A check-in is an atomic `executeBatch` that patches the `deadline` attribute and
calls `extendEntity` on the heartbeat. The deadline attribute is what the UI and
the watchdog read; the entity expiration is what removes the heartbeat from the
query surface when the switch fires.

---

## 4. Status and limitations

This section is deliberately blunt. A submission that hides its gaps is worse
than one that names them.

### What works

- Encryption and decryption with AES-256-GCM.
- Shamir 2-of-3 over GF(2^8), with tests for any pair and a single-share
  rejection.
- A CLI that can create a vault and heartbeat, check in, watch for a lapse, and
  release.
- An Express API with a live mode and a file-backed demo mode.
- A React app with a landing page, a vault dashboard, a create flow, a vault
  detail view, a guardian page, settings, and a command palette.
- A static Vercel deployment with a client-side demo backend, so the full flow
  runs without a server.
- Real screenshots and a 1:02 voiced demo video.
- A schema document and a friction log.

### What does not work yet

- **No on-chain entities.** No funded Tiramisu wallet has been used, so there
  are no `Vault`, `Beat`, or `Release` entities on the network yet. The Devfolio
  wallet field is a placeholder.
- **The deployed app is a demo.** The Vercel build uses a client-side store
  (`localStorage` plus WebCrypto) and does not query Arkiv. The local server and
  CLI are the real Arkiv path.
- **No `$creator` filtering.** Queries filter on `project` and `type`; the code
  does not yet use `createdBy()`. The Security pillar is therefore not fully
  claimed.
- **No cursor pagination or WebSocket events.** The current queries use
  `getEntity` by key and simple `select` calls. The UI polls every few seconds.
- **The local server encrypts on the server.** The demo server receives plaintext
  and returns shares. That contradicts the self-custody story. The browser demo
  encrypts in the browser, and a future release will move the server path to the
  browser as well.
- **No release gating.** Any two shares can decrypt at any time. A production
  build should refuse to unseal until a valid `Release` exists and the heartbeat
  has lapsed.
- **No guardian delivery.** The recovery kit contains all three shares in one
  file. A real guardian on another device receives only a vault link, not a
  share.
- **No liveness or anti-spoofing.** Sakshi protects the *evidence*, not the
  *identity* of the person checking in.

These are engineering gaps, not marketing claims. The roadmap below addresses
them in order.

---

## 5. Quick start

### Requirements

- Node.js 22 or newer.
- npm 10 or newer.
- Optional: a funded Tiramisu wallet for the live Arkiv path.

### Install

```bash
git clone https://github.com/Rajshah1302/sakshi
cd sakshi
npm install
```

### Run the local app

```bash
npm run dev
# API on http://localhost:8787
# UI on http://localhost:5190
```

Open http://localhost:5190, create a vault with a short check-in interval, and
watch the switch fire.

### Run the crypto and state-machine demos

```bash
npm run simulate         # AES-GCM and Shamir round-trip
npm run simulate:switch  # create, check-in, lapse, release, unseal
npm run test:backend     # demo backend end to end
```

### Build the static app

```bash
npm run build:web
# output: dist/web
```

### Typecheck everything

```bash
npm run typecheck:all
```

### Live Arkiv path

```bash
npm run wallet -- --write   # generate a wallet and write .env
# fund the address at https://hub.arkiv.network/faucet
npm run create -- ./secret.txt 604800
npm run checkin -- <beatKey> 604800
npm run watch -- <beatKey> <vaultKey>
npm run release -- <vaultKey> <shareA> <shareB> released.bin
```

---

## 6. Architecture

### Layers

| Layer | Responsibility |
|---|---|
| Crypto | AES-256-GCM sealing, Shamir splitting, hashing |
| Arkiv adapter | Entities, attributes, queries, batches |
| Domain | Create, check-in, lapse, release, unseal |
| Server | Express API, live and demo modes |
| Browser demo | Client-side WebCrypto backend for the static deployment |
| Web app | Landing, dashboard, create, vault detail, guardians, settings |
| CLI | Scriptable create, check-in, watch, release |

### Source layout

```text
sakshi/
├── src/
│   ├── arkiv/
│   │   ├── client.ts        public and wallet clients
│   │   ├── entities.ts      constants and attribute readers
│   │   ├── mutations.ts     create, check-in, release
│   │   └── queries.ts       get, list, unseal
│   ├── crypto/
│   │   ├── aes.ts           AES-256-GCM
│   │   ├── shamir.ts        GF(2^8) secret sharing
│   │   └── index.ts
│   ├── cli/
│   │   ├── create.ts
│   │   ├── checkin.ts
│   │   ├── watch.ts
│   │   └── release.ts
│   └── config.ts
├── server/
│   ├── backend.ts           live and demo backends
│   └── index.ts             Express API
├── web/
│   ├── public/              favicon and demo video
│   └── src/
│       ├── api.ts           API wrapper with demo switch
│       ├── demo.ts          client-side demo backend
│       ├── browser-crypto.ts WebCrypto and browser Shamir
│       ├── store.ts         local vault records
│       ├── components/
│       └── pages/
├── arkiv/
│   ├── schema.md            entity types, attributes, queries
│   └── friction.md          reproducible friction log
├── docs/
│   ├── whitepaper.md
│   ├── devfolio-submission.md
│   └── shots/
├── scripts/
│   ├── simulate.ts
│   ├── simulate-switch.ts
│   ├── test-backend.ts
│   └── wallet.ts
├── vercel.json
└── package.json
```

### Design decisions

**Why an expiring heartbeat instead of a stored deadline only?** A stored
timestamp is just data; an expiring Arkiv entity is a state change the network
performs. The heartbeat removes itself from the query surface when the deadline
passes, which is closer to a switch than a timestamp that someone has to check.

**Why a separate permanent vault?** If the only record expired, the evidence
would vanish exactly when the switch fired. The vault must outlive the
heartbeat. The split also gives the two entities different lifetimes, which is
the core of the Arkiv mapping.

**Why Shamir instead of a single key held by a server?** A server is a single
point of seizure and a single point of failure. Two of three shares means one
compromised guardian, or one seized device, is not enough.

**Why two crypto implementations?** The CLI and server use Node's `crypto`
module. The static Vercel build cannot run a Node server, so the browser demo
uses WebCrypto and a browser-compatible Shamir implementation. The two
implementations must agree on the wire format.

---

## 7. Data model

Every entity carries `project = "sakshi"` so the namespace cannot collide with
another project.

### Vault

A `readonly`, permanent entity created by the holder.

| Attribute | Type | Purpose |
|---|---|---|
| `project` | str | namespace |
| `type` | str | `vault` |
| `evidence_hash` | bytes32 | hash of the sealed payload |
| `created_ms` | u64 | creation time |

Payload: JSON with the AES-GCM nonce and ciphertext, base64 encoded. No
plaintext, no PII.

Expiration: `ExpirationTime.permanent()`.

### Beat

The switch. Created by the holder, no flags, so the owner can extend it.

| Attribute | Type | Purpose |
|---|---|---|
| `project` | str | namespace |
| `type` | str | `beat` |
| `vault_key` | key | points at the vault |
| `deadline` | u64 | check-in deadline in milliseconds |
| `interval_s` | u64 | renewal interval |

Payload: empty text.

Expiration: `ExpirationTime.atDate(new Date(deadline))`.

### Release

Written when the heartbeat lapses.

| Attribute | Type | Purpose |
|---|---|---|
| `project` | str | namespace |
| `type` | str | `release` |
| `vault_key` | key | points at the vault |
| `released_ms` | u64 | when the switch fired |

`readonly`, permanent.

### Lifetimes

| Entity | Lifetime | Why |
|---|---|---|
| Vault | permanent | evidence must survive the switch |
| Beat | the deadline | the switch is a lease |
| Release | permanent | the record that the switch fired must survive |

---

## 8. Protocols

### 8.1 Create

1. Generate a 32-byte AES key.
2. Encrypt the evidence with AES-256-GCM.
3. Hash the sealed payload.
4. Create the `Vault` with `readonly: true` and a permanent lifetime.
5. Split the key with Shamir into three shares with threshold two.
6. Create the `Beat` with `vault_key`, `deadline`, and `interval_s`.

The vault and the beat are created in two transactions in the current code. A
batch with `predictEntityKeys` would make the pair atomic; that is on the
roadmap.

### 8.2 Check-in

1. Read the beat's current interval.
2. Compute a new deadline: now plus the interval.
3. In one `executeBatch`, patch `deadline` and call `extendEntity` with the new
   expiry.

The patch runs before the extension in the SDK's batch order. The two values
must stay in sync; the schema document calls this out.

### 8.3 Lapse detection

Arkiv emits no event when an entity expires. The watchdog therefore:

1. Reads the beat while it is live.
2. Remembers the beat key, the vault key, and the deadline.
3. Compares the deadline with the current time.
4. On `NoEntityFoundError`, or when the deadline has passed, treats the switch
   as fired.

The current UI has a known bug here: it treats **any** error from the beat poll
as a lapse. A transient RPC failure can therefore write a false release. The
fix is to distinguish a network error from a genuine expiry and to show an
"unreachable" banner instead of firing.

### 8.4 Release

1. Confirm the heartbeat lapsed.
2. Write a `Release` entity for the vault.
3. Notify the guardians.

The current release is not authenticated, and the CLI release command does not
check for a release entity before decrypting. Both are production gaps.

### 8.5 Unseal

1. Collect two of three shares.
2. Reconstruct the 32-byte key with Shamir.
3. Decrypt the vault payload with AES-256-GCM.
4. Return the plaintext.

The browser demo and the CLI share the same wire format.

---

## 9. Cryptography

### 9.1 AES-256-GCM

- 32-byte key, 12-byte nonce, 16-byte authentication tag.
- The tag is appended to the ciphertext.
- A wrong key or a tampered ciphertext fails authentication.

The nonce is random for every seal. A nonce must never be reused with the same
key; the code generates a fresh one per encryption.

### 9.2 Shamir's Secret Sharing over GF(2^8)

The field is GF(2^8) with the AES polynomial `x^8 + x^4 + x^3 + x + 1` (`0x1b`).

- A secret byte is the constant term of a random polynomial of degree `k-1`.
- Each share is the evaluation of that polynomial at a distinct non-zero `x`.
- Reconstruction is Lagrange interpolation at `x = 0`.

A share is encoded as `[x, y0, y1, ...]` in hex. With `k = 2`, any pair
interpolates correctly; a single share leaves the constant term undetermined.

The tests check:

- any pair of three shares reconstructs the key;
- a single share is rejected;
- the reconstructed key decrypts the ciphertext.

Known limits:

- The implementation is byte-wise and not constant-time. Side-channel
  resistance is out of scope for the demo.
- A share has no integrity protection on its own; a wrong share produces a bad
  key, and decryption fails at the GCM tag.
- The threshold is enforced by the caller. `combine` accepts any two shares; it
  does not know the intended threshold. The create flow always uses 2-of-3.

### 9.3 Hashing

The evidence hash is a hash of the sealed payload. It proves that the ciphertext
has not changed, not that the plaintext is true. The current Node path hashes
`JSON.stringify(sealed)` while the payload stores `{ v: 1, ...sealed }`, so the
stored hash does not match the payload bytes. This is a real bug, listed in the
friction log.

### 9.4 Key custody

| Path | Where the key lives | Notes |
|---|---|---|
| CLI | in memory, split immediately | shares written to the recovery kit |
| Local server | on the server | a known gap, should move to the browser |
| Browser demo | in the browser | WebCrypto, split before storage |
| Guardians | one share each | not yet delivered in the current build |

---

## 10. Arkiv integration

### 10.1 Entities and attributes

Arkiv stores typed attributes and an opaque payload. The design keeps
everything the app filters on in attributes and everything sensitive in the
payload.

- Numeric types (`u64`, `i32`) support ranges; `bytes32`, `addr`, and `key`
  support equality only.
- The payload is not queryable.
- Every entity expires.

### 10.2 Queries

```ts
// live beats
client.select("*")
  .where(and(eq("project", "sakshi"), eq("type", "beat")))
  .limit(200)
  .fetch();

// releases for a vault
client.select("*")
  .where(and(
    eq("project", "sakshi"),
    eq("type", "release"),
    eq("vault_key", key(vaultKey)),
  ))
  .fetch();

// a vault by key
client.getEntity(vaultKey);
```

There is no server-side ordering and results cap at 200 per page. A production
build needs cursor pagination and client-side sorting.

### 10.3 Expiration and extension

`ExpirationTime` builds the lifetime. `extendEntity` sets a new expiry; it does
not add to the old one. An extension to an earlier block is rejected.

The heartbeat's lifetime is the switch. The vault is permanent. The release is
permanent.

### 10.4 What is implemented today

| Feature | Status |
|---|---|
| Typed attributes | yes |
| Per-entity expiration | yes |
| `extendEntity` on check-in | yes |
| `executeBatch` patch plus extend | yes |
| `readonly` vault | yes |
| `key` references | yes |
| `createdBy()` filtering | no |
| Cursor pagination | no |
| `watchEntityEvents` | no |
| Batch create with predicted keys | no |

The landing and the Devfolio answers describe only what is implemented.

---

## 11. Threat model

### Adversaries

1. **A censor or platform** that can take down a website or an account.
2. **A state or police actor** that can seize a device or detain a person.
3. **A malicious guardian** who wants to open the vault early.
4. **A network attacker** who can drop or delay RPC calls.
5. **A compromised server operator** in the live-server path.

### Attacks and mitigations

| Attack | Current mitigation | Residual risk |
|---|---|---|
| Seize the holder's phone | ciphertext only; key split | shares may be on the same phone |
| Block the app's website | public entities and CLI | the deployed demo is static; the CLI needs a funded wallet |
| Open the vault early | none | any two shares decrypt at any time |
| Forge a check-in | none | the check-in endpoint is unauthenticated |
| Force a false release | none | the UI treats any poll error as a lapse |
| Tamper with the ciphertext | GCM authentication | none |
| Replace the evidence | hash mismatch bug | the hash is not verified client-side |
| Collude as two guardians | none | threshold is the only barrier |
| Coerce a guardian | none | no duress mode |

### What Sakshi protects

Sakshi protects **integrity and availability of the record**: the ciphertext
cannot be modified unnoticed, and the public entities survive the team's
backend. It does not protect a person from coercion, and it does not prove that
the plaintext is true.

### Fixes before production

1. Client-side encryption and signing on every path.
2. Per-user wallets and `createdBy()` filtering.
3. A separate watchdog role with its own key.
4. Release gating before unseal.
5. Share delivery out-of-band, one share per guardian.
6. A false-release guard for transient errors.
7. A client-side hash verification.
8. Liveness and duress handling.

---

## 12. Privacy and India's DPDP Act

Sakshi is designed for sensitive evidence, so the privacy model matters.

### On Arkiv

- Only ciphertext and a hash are written.
- Attributes are minimal: project, type, hash, timestamps.
- No names, phone numbers, emails, or Aadhaar numbers.
- Expiry is user-controlled for the heartbeat.

### Off Arkiv

- Plaintext, keys, and shares stay off the chain.
- Vault references and shares live in the browser's local storage in the demo,
  and in the recovery kit.

### DPDP considerations

- **Consent:** the holder chooses to seal and to share. The current build has no
  formal notice or consent record.
- **Erasure:** ciphertext on a permanent entity cannot be erased. A production
  build should use expiring vaults and crypto-shredding (destroy the key) rather
  than permanent ciphertext.
- **Data minimisation:** on-chain data is limited to ciphertext and metadata.
- **Children:** no age assurance. Do not use for children's data.

### Honest claim

The claim "only ciphertext is on Arkiv" is true. The claim "the key never leaves
your device" is true for the browser demo and the CLI, but not for the local
server path, which receives plaintext and returns shares. That path is a known
gap.

---

## 13. The web application

### Routes

| Route | Purpose |
|---|---|
| `/` | landing page |
| `/vaults` | dashboard with search and status filters |
| `/create` | seal a vault |
| `/vaults/:vaultKey` | vault detail, check-in, recovery kit, release, unseal |
| `/guardians` | unseal console |
| `/guardians/:vaultKey` | shareable guardian link |
| `/settings` | mode, defaults, local data |

### State

- Vault records and shares: `localStorage` key `sakshi:vaults:v1`.
- Demo backend state: `localStorage` key `sakshi:demo:v1`.
- Settings: `localStorage` key `sakshi:settings:v1`.

### Demo vs live

- `VITE_DEMO=true` (production build) uses `web/src/demo.ts`, a client-side
  backend with WebCrypto and Shamir.
- Without the flag (local development), the app calls the Express API.

### Interaction details

- Countdown ring and activity timeline.
- Copy buttons for keys and shares.
- Recovery kit download.
- Guardian link copy.
- `.ics` reminder with a one-hour alarm.
- Command palette on `Ctrl/Cmd+K`.

---

## 14. HTTP API

The local server exposes:

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | mode and wallet address |
| GET | `/api/stats` | vault counts and recent vaults |
| POST | `/api/create` | seal evidence, create vault and beat |
| POST | `/api/checkin/:beatKey` | extend the deadline |
| GET | `/api/beat/:beatKey` | read the heartbeat |
| GET | `/api/vault/:vaultKey` | read the vault hash |
| POST | `/api/release/:vaultKey` | write a release |
| POST | `/api/unseal` | combine shares and decrypt |

The API has no authentication, rate limits, or CORS allowlist. Do not expose it
publicly as-is.

---

## 15. CLI reference

```bash
npm run wallet -- --write
npm run create -- <evidence-file> [intervalSeconds]
npm run checkin -- <beatKey> [intervalSeconds]
npm run watch -- <beatKey> [vaultKey] [--once]
npm run release -- <vaultKey> <shareA> <shareB> [outFile]
npm run simulate
npm run simulate:switch
npm run test:backend
npm run typecheck:all
```

Environment:

| Variable | Purpose |
|---|---|
| `PRIVATE_KEY` | funded Tiramisu wallet |
| `ARKIV_RPC_URL` | optional custom RPC |
| `CHECKIN_INTERVAL_S` | default interval |
| `WATCH_POLL_S` | watchdog poll interval |
| `PORT` | API port |

---

## 16. Deployment

### Vercel (current)

- Build: `npm run build:web`
- Output: `dist/web`
- `vercel.json` sets `VITE_DEMO=true` at build time.
- The app is fully static and uses the browser demo backend.
- Vercel Authentication is disabled so judges can open it.

### Local live server

- `npm run dev` runs the API and the Vite app.
- The API holds `PRIVATE_KEY` and uses the file-backed demo store or the live
  Arkiv path.
- The demo store is a JSON file and does not persist on a serverless host.

### Production notes

- A persistent host is required for the live server path.
- Add authentication and rate limits to write endpoints.
- Keep `PRIVATE_KEY` server-side only.
- Do not log request bodies.

---

## 17. Testing and verification

| Command | What it checks |
|---|---|
| `npm run typecheck:all` | TypeScript in the core and the web app |
| `npm run build:web` | production build |
| `npm run simulate` | AES-GCM and Shamir |
| `npm run simulate:switch` | full state machine |
| `npm run test:backend` | demo backend end to end |

Manual checks performed:

- Created a vault in the browser and on the deployed app.
- Extended the heartbeat and waited for the lapse.
- Unsealed with two shares and read the plaintext.
- Confirmed the video streams as `video/mp4`.

---

## 18. Friction report

The full report is in [`arkiv/friction.md`](arkiv/friction.md). The highlights:

1. Expiry emits no event and expired entities disappear from queries.
2. `readonly` blocks content changes but not extension, transfer, or deletion.
3. Duration expiries must be whole 2-second blocks.
4. `executeBatch` has a fixed operation order.
5. Attribute read-back is a tagged cell, not a value.
6. There is no server-side ordering and results cap at 200 per page.
7. The SDK requires a predicate where raw RPC accepts `*`.
8. Keyless reads have a small budget and access keys must stay server-side.

Each entry includes expected vs actual, versions, reproduction, and a proposed
fix.

---

## 19. Whitepaper

The formal whitepaper is in [`docs/whitepaper.md`](docs/whitepaper.md).
The Arkiv engineering paper is in [`docs/arkiv-technical-whitepaper.pdf`](docs/arkiv-technical-whitepaper.pdf) (PDF), with its print source in [`docs/arkiv-technical-whitepaper.html`](docs/arkiv-technical-whitepaper.html). It covers:

- the threat model in formal terms;
- the three primitives and their lifetimes;
- the security argument for the threshold release;
- the Arkiv mapping and what deliberately stays off-chain;
- the failure cases and the residual risks;
- the governance and legal considerations for a real deployment.

This README is the practitioner's guide. The whitepaper is the design document.
They should be read together.

### Discussion

The central design bet is that **a time-scoped lease is a better switch than a
stored timestamp**. A timestamp is inert data. A lease is a state change: the
network removes the entity when the term ends, and the holder renews it
explicitly. That gives the switch a native notion of "still alive" and "expired"
without a central scheduler.

The second bet is that **the evidence and the lease should have different
lifetimes**. The evidence is permanent; the lease is short. If both expired
together, the switch would destroy the thing it protects. The split is the
reason the vault is `readonly` and permanent while the beat is the only expiring
entity.

The third bet is that **two of three is the smallest useful quorum**. One share
is a single point of seizure. Three of three has no fault tolerance. Two of
three tolerates one lost or coerced guardian while still requiring collusion for
an early release. It is a compromise, not a proof.

The weakest part is custody. A threshold is only as good as the delivery of the
shares. If all three shares sit on the holder's phone, the threshold is
theater. The next release must deliver one share per guardian through an
independent channel.

---

## 20. Devfolio submission mapping

| Criterion | Where it is answered |
|---|---|
| The problem it solves | section 1 and the Devfolio field |
| Challenges | section 18 and the Devfolio field |
| Why Arkiv? | section 10 and the Devfolio field |
| How do you use Arkiv? | section 10 and the Devfolio field |
| Friction report | `arkiv/friction.md` |
| Live app | https://sakshi-eta-eight.vercel.app |
| Demo video | https://sakshi-eta-eight.vercel.app/sakshi-demo-vo.mp4 |
| Schema | `arkiv/schema.md` |
| Repo | https://github.com/Rajshah1302/sakshi |

The published Devfolio entry still has two placeholders: the on-chain wallet
evidence and the first-entity answer. Both are marked for update after a funded
run.

---

## 21. Roadmap

**Phase 1, correctness**

1. Move the server path to client-side encryption and signing.
2. Add `createdBy()` filtering and per-user wallets.
3. Fix the evidence hash to cover the exact payload.
4. Distinguish network errors from expiry in the watchdog.
5. Gate unseal on a valid release.

**Phase 2, guardians**

6. Deliver one share per guardian through a one-time link or QR code.
7. Add share rotation and revocation.
8. Add a duress mode and a decoy vault.

**Phase 3, India-first**

9. Offline-first PWA with queued check-ins.
10. Hindi and regional language support.
11. SMS or WhatsApp check-in fallback for shutdowns.
12. A pilot with an Indian press-freedom or RTI organisation.

**Phase 4, evidence**

13. Hash-chain revisions and expose `.atBlock()` verification.
14. Time-locked release with drand so the release survives guardian silence.
15. A standalone verifier that reads Arkiv directly.

---

## 22. FAQ

**Is the evidence private?**
On Arkiv, yes: only ciphertext and a hash are written. In the local server path,
plaintext is sent to the server, which is a gap.

**What happens if the website is blocked?**
The entities are public and the CLI can read them. The deployed demo is static;
the CLI needs a funded wallet.

**What if I lose a share?**
Any two of three shares open the vault. Lose two and the vault cannot be opened.

**What if a guardian colludes?**
Two colluding guardians can open the vault. The threshold assumes they do not.

**Can the holder open the vault early?**
Yes, with two shares. The current build does not gate unseal on a release.

**Is the evidence true?**
Sakshi proves integrity and authorship of the record, not the truth of the
content.

**Does it work during an internet shutdown?**
Not yet. Check-in requires a live transaction. An offline queue is on the
roadmap.

**Is it production-ready?**
No. It is a working demo with named gaps.

---

## 23. Glossary

- **Arkiv entity:** a record with attributes, a payload, an owner, a creator,
  and an expiration.
- **Attribute:** a typed, indexed key-value pair used for queries.
- **Beat:** the heartbeat entity whose lifetime is the check-in deadline.
- **Creator (`$creator`):** the immutable wallet that created the entity.
- **Entity Expiration:** the block at which an entity leaves the query surface.
- **Guardian:** a person who holds one Shamir share.
- **Lifetime Extension:** the `extendEntity` operation that moves an expiry
  later.
- **Owner (`$owner`):** the wallet that controls writes, extensions, transfers,
  and deletion.
- **Release:** the entity written when the switch fires.
- **Shamir secret sharing:** splitting a secret into shares where a threshold
  reconstructs it.
- **Vault:** the permanent, readonly entity that holds the sealed evidence.

---

## 24. References

- Arkiv documentation: https://docs.arkiv.network
- Arkiv Tiramisu network: https://docs.arkiv.network/networks/tiramisu/
- RSF India: https://rsf.org/en/country/india
- Access Now #KeepItOn: https://www.accessnow.org/keepiton/
- Wikimedia Commons images, CC BY-SA 4.0, attributed on the landing page.
- Shamir, A. (1979). How to share a secret.
- Juels, A. and Wattenberg, M. (1999). A fuzzy commitment scheme. (Reference for
  the broader family of error-tolerant commitments; not used in this build.)

---

## 25. Changelog

| Commit | Change |
|---|---|
| `d2bbd13` | scaffold |
| `3e6d349` | AES-GCM and Shamir |
| `00d9422` | Arkiv client and entities |
| `23f9a51` | CLI commands |
| `5703ca7` | schema and friction |
| `b4c754b` | switch simulation |
| `b89b460` | wallet generator |
| `2a762cc` | API with live and demo backends |
| `aef1a6d` | React app |
| `bd48ada` | web tooling |
| `d004742` | landing page |
| `148574d` | devtool redesign and product mockup |
| `f25bfaf` | command palette |
| `373fb98` | real reporting and em dash removal |
| `8f3d5b3` | removed judge framing |
| `31648d7` | guardian links, reminders, search |
| `c616b62` | Vercel static demo |
| `b80396e` | demo video |
| `131cf7b` | served video |
| `4c14794` | voiced fast-cut demo |

---

## 26. License

MIT. See [LICENSE](LICENSE).
