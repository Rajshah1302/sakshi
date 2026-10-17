# Sakshi

**An encrypted dead-man's switch for at-risk journalists and protesters.**

Sakshi keeps a piece of evidence sealed while you check in. If you go silent, it
releases, to the guardians you chose, never to the public.

- **Durable vault.** Encrypted evidence and its hash live in a `readonly` entity that survives.
- **Heartbeat.** A separate entity expires at your check-in deadline; checking in extends it.
- **Guardian release.** The encryption key is split 2-of-3. If the heartbeat lapses, guardians combine shares and decrypt.

Built on [Arkiv](https://arkiv.network) Tiramisu testnet.

## App

A product, not a demo page:

- **Vaults**: dashboard with sealed/released counts and a live countdown per vault.
- **New vault**: seal evidence with a check-in interval; receive a 3-share recovery kit.
- **Vault detail**: countdown ring, check-in, recovery kit (reveal/download), activity timeline, and a guardian unseal panel once the switch fires.
- **Guardians**: open any vault with two shares; verify a vault's evidence hash.
- **Settings**: network/mode, default interval, and local-data controls.

Vault metadata and guardian shares are stored **on this device** (localStorage).
Sakshi is self-custodial.

```bash
npm install
npm run dev          # API on :8787, UI on :5190
```

Open http://localhost:5190. **Demo mode** (no wallet) persists to
`server/.demo-store.json`; add a funded `PRIVATE_KEY` to run live against Tiramisu.

To serve the built UI from the API only:

```bash
npm run build:web
npm run dev:api      # http://localhost:8787
```

## Setup

```bash
cp .env.example .env    # add a funded Tiramisu PRIVATE_KEY (optional for the demo)
npm run typecheck:all
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
