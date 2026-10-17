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
npm run create      # create a vault + heartbeat
npm run checkin     # extend the deadline
npm run watch       # detect a lapse and write a Release
npm run release     # guardians combine shares and decrypt
```

Run the local logic demo with no wallet:

```bash
npm run simulate
```

## Docs

- Entity schema: [`arkiv/schema.md`](arkiv/schema.md)
- Friction log: [`arkiv/friction.md`](arkiv/friction.md)

MIT licensed.
