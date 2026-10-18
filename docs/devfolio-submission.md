# Devfolio submission: Sakshi

> Do not submit until every gate below is green. Any failed gate means the entry is not scored.

## Gate checklist

- [ ] Public HTTPS deployment on Tiramisu
- [ ] Funded Tiramisu wallet, with at least one real vault, beat, and release on-chain
- [ ] Holder and watchdog addresses, entity keys, and tx hashes filled into `arkiv/schema.md`
- [ ] Public repo under MIT, with a root `LICENSE` file
- [ ] `/arkiv/schema.md` and `/arkiv/friction.md` committed
- [ ] Demo video, 3 minutes or less
- [ ] Every field below filled in
- [ ] At least one team member with Indian nationality declared
- [ ] At least one track selected on Devfolio

## Do not claim these yet

These are in the landing copy or plan but not in the code. Remove the claims or implement them before submitting.

- `$creator` / `createdBy()` filtering: not implemented. Queries filter on `project` and `type` only.
- WebSocket `watchEntityEvents`: not implemented. The watchdog polls.
- Cursor pagination: not implemented.
- On-device encryption: not implemented. The server currently encrypts and splits shares.
- Release gating: not implemented. Any two shares decrypt without checking for a `Release` entity.

## Project

- **Name:** Sakshi
- **Tagline:** A dead man's switch for evidence.
- **Repo:** https://github.com/Rajshah1302/sakshi
- **Live app:** https://sakshi-eta-eight.vercel.app
- **Demo video:** https://sakshi-eta-eight.vercel.app/sakshi-demo.mp4
- **Tracks:** Best Indian Use Case, Censorship Resistance, Privacy

## The problem it solves

In India, journalists and RTI activists face detention, device seizure, and internet shutdowns. When the person holding the evidence is silenced, the evidence usually disappears with them. Existing tools either depend on a central operator or require the holder to be online at the exact moment that may be impossible.

Sakshi is a dead man's switch for evidence. The holder seals evidence on their device. A heartbeat entity on Arkiv expires at their check-in deadline. Every check-in extends it. If they go silent, the switch fires and the guardians they chose can open the vault. The vault itself is a permanent, readonly entity. Only the heartbeat expires.

## Challenges I ran into

- Expiry emits no event, and expired entities disappear from queries. A switch has to poll `$expiresAt` or track deadlines.
- `readonly` freezes content but not extension, transfer, or deletion. Control comes from ownership.
- `extendEntity` sets a new expiry. It does not add to the old one.
- The SDK requires a predicate, so every query needs a namespace (`project = "sakshi"`).
- The SDK has no server-side ordering. Results cap at 200 per page.
- A transient RPC error must not be treated as a lapse. The current UI can write a false release. That is a bug to fix.
- Full details and repro steps: `/arkiv/friction.md`.

## Why Arkiv?

A normal database can be switched off, rewritten, or seized with its operator. IPFS cannot expire or revoke. A subgraph needs an indexer. Arkiv gives us an immutable creator, a public read path, and native Entity Expiration that we use as the switch. The vault is permanent. The heartbeat is the part that expires. We deliberately keep plaintext, keys, and shares off Arkiv.

## How do you use Arkiv?

- `Vault`: a readonly, permanent entity. The payload is AES-256-GCM ciphertext. Attributes: `project`, `type`, `evidence_hash`, `created_ms`.
- `Beat`: the switch. It expires at the check-in deadline. Attributes: `project`, `type`, `vault_key`, `deadline`, `interval_s`. Check-in is an `executeBatch` that patches `deadline` and calls `extendEntity` atomically.
- `Release`: written by the watchdog when the heartbeat lapses.
- Queries are namespaced with `project = "sakshi"`.

## Wallet addresses

- Holder: `<address>`
- Watchdog: `<address>`
- Example vault: `<entity key>` / tx `<hash>`

## Schema

https://github.com/Rajshah1302/sakshi/blob/main/arkiv/schema.md

## Friction report

https://github.com/Rajshah1302/sakshi/blob/main/arkiv/friction.md

## How can judges reproduce your Arkiv usage?

1. Open `<live URL>`.
2. Create a vault with a 60-second check-in interval.
3. Copy the guardian shares.
4. Let the heartbeat lapse.
5. Open the vault, enter any two shares, and decrypt.
6. Or run `npm run simulate:switch` for the same flow in memory.
7. On Tiramisu, the holder and watchdog addresses above created the entities.

## Pre-existing work

None.

## Arkiv surfaces used

TypeScript SDK, Docs, Faucet, Block Explorer, Data Explorer.

## First entity time

`<2 hours or less / 2 to 24 hours / more than a day>`

## LLMs used

DeepSeek Flash (opencode)

## One thing Arkiv should improve first

Emit an event when an entity expires, or let a query return lapsed entities. A dead man's switch should not have to poll `$expiresAt` and guess.

## Feedback call

Yes.

## Confirmations

- [x] This is our team's work, built between 9 and 18 October. Any pre-existing or third-party work is disclosed.
- [x] Our repo is public under the MIT licence, and every link is accessible to judges.
- [x] At least one team member holds Indian nationality.
