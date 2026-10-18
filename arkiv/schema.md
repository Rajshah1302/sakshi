# Sakshi on Arkiv, schema

Network: **Arkiv Tiramisu testnet**, chain ID `7738577`, RPC `https://rpc.tiramisu.db-chain.testnet.arkiv.network`.
SDK: `@arkiv-network/sdk` **0.8.1**. Block time: 2 s.

Every entity carries `project = "sakshi"`. Every query starts with that predicate so the
namespace cannot collide with other projects.

## Entity types

| type | What it is | Flags | Expiry |
|---|---|---|---|
| `vault` | Durable, sealed evidence | `readonly` | `ExpirationTime.permanent()` |
| `beat` | The heartbeat / check-in switch | none | `ExpirationTime.atDate(deadline)` |
| `release` | Record that the switch fired | `readonly` | `ExpirationTime.permanent()` |

### `vault`

Set by the holder. The payload is the only copy of the evidence on Arkiv, encrypted.

| Attribute | Type | Example | Why |
|---|---|---|---|
| `project` | str | `sakshi` | namespace |
| `type` | str | `vault` | entity discriminator |
| `evidence_hash` | bytes32 | `0x…` | keccak256 over the sealed payload |
| `created_ms` | u64 | `1760000000000` | creation time |

Payload (`application/json`, never queried): `{ "v": 1, "nonce": "<b64>", "ciphertext": "<b64>" }`
where `ciphertext` is AES-256-GCM output (ciphertext ‖ tag). No plaintext, no PII.

`$creator` = `$owner` = holder. `readonly: true` freezes the payload after creation.

### `beat`

Set by the holder. This is the dead-man's switch.

| Attribute | Type | Example | Why |
|---|---|---|---|
| `project` | str | `sakshi` | namespace |
| `type` | str | `beat` | entity discriminator |
| `vault_key` | key | `0x…` | points at the vault |
| `deadline` | u64 | `1760000600000` | check-in deadline (unix ms) |
| `interval_s` | u64 | `604800` | default renewal interval |

Payload: empty (`text/plain`). **No flags**, the owner must be able to extend it.

`$creator` = `$owner` = holder. Its **entity expiry** is the switch: at `deadline` the beat
leaves the query surface. Checking in patches `deadline` and extends the expiry in one batch.

### `release`

Written by the watchdog when the beat lapses.

| Attribute | Type | Example |
|---|---|---|
| `project` | str | `sakshi` |
| `type` | str | `release` |
| `vault_key` | key | `0x…` |
| `released_ms` | u64 | `1760000700000` |

`$creator` = the watchdog wallet. `readonly: true`, permanent.

## Expiration per type

- **Vault**, permanent: the evidence must outlive the switch.
- **Beat**, the check-in deadline. `extendEntity` sets a later expiry; it is never additive.
- **Release**, permanent: the record that the switch fired must survive.

## Exact queries

SDK (`@arkiv-network/sdk/query`):

```ts
// live beats in the namespace
client.select("*")
  .where(and(eq("project", "sakshi"), eq("type", "beat")))
  .limit(200)
  .fetch();

// releases for a specific vault
client.select("*")
  .where(and(
    eq("project", "sakshi"),
    eq("type", "release"),
    eq("vault_key", key(vaultKey)),
  ))
  .fetch();

// fetch the vault (throws NoEntityFoundError once deleted; vault is permanent)
client.getEntity(vaultKey);
```

Raw JSON-RPC (`arkiv_query`):

```text
project = str('sakshi') AND type = str('beat')
project = str('sakshi') AND type = str('release') AND vault_key = key('0x…')
```

`select` results are capped at **200 per page** and there is **no server-side ordering**; the
watcher walks cursors and sorts client-side.

## Operations

| Operation | Method | Who |
|---|---|---|
| Create vault + beat | `createEntity` ×2 | holder |
| Check in | `executeBatch` (patch `deadline`) + `extendEntity` | holder |
| Detect lapse | poll `deadline` / `$expiresAt` (`getEntity` throws after expiry) | watchdog |
| Release | `createEntity` (`release`) | watchdog |
| Unseal | `combine(shares)` + AES-256-GCM decrypt | guardians |

## Deliberately off Arkiv

- The plaintext evidence (only the sealed ciphertext is on Arkiv).
- Guardian key shares (never on Arkiv).
- Any private key or seed phrase.

## On-chain evidence

Funded run: **2026-10-18** on Tiramisu (chain `7738577`).

- Holder / creator: `0x47c030be837C1230A555A1780F145a7808129c62`
- Watchdog: the same wallet in this demo run
- Example vault: `0x339396d6344ff1d888c09bc2d988818cb6e5f4677a52b2a6fb96f6aa3c75f323`
  - created in block `753156` at `2026-10-18T20:41:12.910Z`
  - `readonly`, permanent (`expiresAt` = `2^64 - 1`)
  - `evidence_hash`: `0x82624a52ec27ff091b20d0eb10de7d14528a6bd0186d9af1a2e006d012844938`
  - payload: 674 bytes (AES-256-GCM nonce + ciphertext)
- Example beat: `0x2571468ef6cfee4f470bd0392c59952d973ad35b2e9ec6ae35a9e6c5a1fca020`
  - created with a 120 s lease, extended once to `2026-10-18T20:45:00.539Z`
  - check-in tx: `0x6f5283ae03e20b0974b0994c58d2b075d1df8e20b1c9e0bf19c7247fcbb370f9`
  - after expiry, `getEntity(beatKey)` throws `NoEntityFoundError` (verified)
- Example release: `0xa902e3542c085d36672345c91c31803809746c9e953c17216040143d3c0e404d`
  - created in block `753279` at `2026-10-18T20:45:20.051Z`
  - release tx: `0x5eae55978ac9620b00cc57be40cc0de333bfbbe80dbc5d6dd82b022564a08218`
- Unseal: guardian shares 1 and 2 reconstructed the key. The released 451-byte file has
  SHA-256 `614A99A6315759DCC9CC651EB7F8EE00C7CDE4F614957D739C3D135560689E3B`,
  byte-for-byte identical to `docs/sample-evidence.txt`.
- Creation transactions are not returned by `getEntity`. The entity keys plus the
  check-in and release transactions above are the verifiable record.

The first check-in with a 90 s lease was rejected because the beat already had a 120 s
lease: `extendEntity` refuses to shorten an entity's life. Re-running with 180 s
succeeded. This is intended behavior, and it is a useful guard for a switch.
