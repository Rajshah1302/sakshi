# Building on Arkiv, friction log

Sakshi, October 2026. `@arkiv-network/sdk` **0.8.1**, Node 22.14, Tiramisu testnet (chain 7738577).

Each item is what we expected, what actually happens, and what would fix it. Items marked
**[docs]** were confirmed from the 0.8.1 docs/source; **[build]** were hit while implementing.

---

## 1. Expiry is silent, and expired entities vanish, a dead-man's switch cannot observe it **[docs]**

- **Expected:** an expiry notification, or a query result that says "this entity lapsed at block N."
- **Actual:** "There is no event and no grace period" when an entity expires. From the expiry block
  the entity is gone from every query, and `getEntity()` throws `NoEntityFoundError`, the same
  error as "never existed" and "was deleted."
- **Consequence:** a watchdog must remember each beat's `deadline` / `$expiresAt` and poll; it cannot
  learn about the lapse from the chain.
- **Repro:** create an entity with `ExpirationTime.fromBlocks(1)`; after ~2 s `getEntity(key)` throws.
- **Fix:** emit an expiry event, or return the lapsed block from `getEntity`.

## 2. `readonly` freezes content, but not extension, transfer or deletion **[docs]**

- **Expected:** `readonly` = immutable.
- **Actual:** `readonly` freezes attributes and payload, but the owner can still `extendEntity`,
  `changeOwnership`, and `deleteEntity`. Governance therefore rests on **ownership**, not the flag.
- **Consequence:** the heartbeat must never be `readonly`; and a "sealed" record still needs a burn
  address (or a trusted owner) if deletion must be impossible.
- **Fix:** document this next to the flag, or add an `immutable` flag that also blocks extension.

## 3. Duration expiries must be a whole number of 2 s blocks **[docs]**

- **Expected:** `ExpirationTime.fromSeconds(7)`.
- **Actual:** `InvalidExpiryError: a lifetime must be a multiple of the 2s block time`.
- **Consequence:** real-world deadlines are converted with `ExpirationTime.atDate(date)` (rounds up),
  not `fromSeconds`.
- **Repro:** `ExpirationTime.fromSeconds(7)`.
- **Fix:** have `fromSeconds` round up by default, or point the error at `atDate`.

## 4. `executeBatch` order is fixed: creates → patches → deletes → extensions → ownership **[docs]**

- **Expected:** order-independent.
- **Actual:** later operations see earlier ones, in that order.
- **Consequence:** the atomic check-in (patch `deadline`, extend expiry) relies on patches running
  before extensions. That is fine but undocumented at the method level.
- **Fix:** state the order in the `executeBatch` docs and type comment.

## 5. Attribute read-back is a tagged cell, not a value **[build]**

- **Expected:** `entity.attributes.deadline === 1760000600000`.
- **Actual:** `{ type: "u64", value: "<string|bigint>" }`, so arithmetic/logic needs parsing.
- **Consequence:** `readNumber()` / `readString()` helpers in `src/arkiv/entities.ts`.
- **Fix:** `entity.attributesX` typed convenience accessors, or document the shape in the read example.

## 6. No server-side ordering; 200 results per page **[docs]**

- **Expected:** `orderBy("deadline")`.
- **Actual:** no ordering; `MAX_LIMIT = 200`; results paginate by cursor.
- **Consequence:** `listLiveBeats()` walks pages and sorts client-side.
- **Fix:** none required for correctness; document the cap and cursor pattern prominently.

## 7. The SDK requires a predicate where raw RPC accepts `*` **[docs]**

- **Expected:** `client.select().limit(1).fetch()` returns anything.
- **Actual:** the SDK rejects a match-all query; every query needs a predicate.
- **Consequence:** every query starts with `eq("project", "sakshi")`, good practice anyway.
- **Fix:** align the SDK and RPC docs, and say the project predicate is the intended pattern.

## 8. Keyless reads have a small budget; access keys are server-side **[docs]**

- **Expected:** a public web app can read freely.
- **Actual:** the public RPC is rate-limited and the keyless query budget is small; an access key
  raises it but must not ship in browser code.
- **Consequence:** reads in a production build need a server/proxy or an access key kept backend-side.
- **Fix:** document the budget and offer an origin-locked, browser-safe read key.

---

## What went smoothly

- `ExpirationTime.atDate()` maps a real deadline to a block cleanly.
- `executeBatch` gives an atomic patch + extend for check-ins.
- `$creator` is immutable and filterable, so authorship is verifiable without our backend.
- AES-256-GCM + Shamir 2-of-3 compose cleanly; a single share cannot reconstruct (see `npm run simulate`).
