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

_Fill after the first funded run._

- Holder: `<holder-wallet>`
- Watchdog: `<watchdog-wallet>`
- Example vault: `<entity-key>` / tx `<tx-hash>`
