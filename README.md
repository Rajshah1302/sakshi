# Sakshi

**An encrypted dead-man's switch for at-risk journalists and protesters.**

Sakshi keeps a piece of evidence sealed while you check in. If you go silent, it
releases — to the guardians you chose, never to the public.

- **Durable vault.** Encrypted evidence and its hash live in a `readonly` entity that survives.
- **Heartbeat.** A separate entity expires at your check-in deadline; checking in extends it.
- **Guardian release.** The encryption key is split 2-of-3. If the heartbeat lapses, guardians combine shares and decrypt.

Built on [Arkiv](https://arkiv.network) Tiramisu testnet.

## Status

M0 working model: vault + heartbeat + lapse detection + guardian release.

## Setup

```bash
npm install
cp .env.example .env    # add a funded Tiramisu PRIVATE_KEY
npm run typecheck
```

Fund a wallet at https://hub.arkiv.network/faucet, then:

```bash
# 1. seal a file into a permanent vault + create the heartbeat
npm run create -- ./secret.txt 120

# 2. keep it alive (run before the deadline)
npm run checkin -- <beatKey> 120

# 3. watch for silence; writes a Release when the heartbeat lapses
npm run watch -- <beatKey> <vaultKey>

# 4. guardians combine any two shares to decrypt
npm run release -- <vaultKey> <shareA> <shareB> released.bin
```

Run the local demos with no wallet:

```bash
npm run simulate         # encryption + threshold round-trip
npm run simulate:switch  # full create → check-in → lapse → release → unseal timeline
```

The on-chain path (`create`/`checkin`/`watch`/`release`) requires a funded
Tiramisu wallet in `.env`. Without one, `simulate:switch` exercises the same
state machine in memory.

## Docs

- Entity schema: [`arkiv/schema.md`](arkiv/schema.md)
- Friction log: [`arkiv/friction.md`](arkiv/friction.md)

MIT licensed.
