# Sakshi: a time-scoped dead man's switch for evidence

**A design whitepaper.**

Version 0.1. October 2026.

Repository: https://github.com/Rajshah1302/sakshi
Live demo: https://sakshi-eta-eight.vercel.app

---

## Abstract

Sakshi is a dead man's switch for sensitive evidence. A holder seals a message
or a pointer to a record, then checks in periodically. The check-in is a renewal
of a time-scoped lease stored on Arkiv, a Web3 database whose entities expire at
a chosen block. If the holder stops checking in, the lease lapses, a release is
recorded, and a quorum of guardians can reconstruct the content key and open the
vault. The content is encrypted before it reaches the database, and the key is
split with Shamir's Secret Sharing so that no single guardian can open the vault
alone.

This paper describes the threat model, the three primitives, the protocol, the
mapping onto Arkiv's entity model, the security argument, the privacy
properties, the failure modes, and the work required before a real deployment.
It is a design document for a working demo, not a peer-reviewed result.

---

## 1. Introduction

Journalists and human rights defenders often hold evidence that is valuable
precisely because it can be published, and dangerous precisely because it exists.
The person who holds it is frequently the person most exposed to detention,
device seizure, and network shutdowns. The evidence usually lives on a single
phone, in a single cloud account, or in a single notebook.

The failure mode is not only seizure. It is also silence. If the holder is
detained, disappears, or loses connectivity for long enough, the evidence may
never be released. A system that only protects confidentiality is incomplete. A
useful system must also arrange for release when the holder cannot act.

Sakshi has three goals:

1. **Confidentiality.** The database must not learn the plaintext.
2. **Availability.** The record must survive the operator of the application.
3. **Conditional release.** The content must become available to a chosen quorum
   when, and only when, the holder stops checking in.

The design is intentionally small. It uses an expiring entity as a lease, a
permanent entity as an anchor, and a threshold secret sharing scheme as the
release condition. The interesting decision is not a new cryptographic
primitive; it is the mapping of a physical safety procedure, the check-in, onto
a database whose records have lifetimes.

---

## 2. Problem statement

Let a holder `H` control evidence `E`. `H` wishes to ensure that:

- `E` remains secret to the public and to the service operator;
- `E` survives the disappearance of the service;
- `E` is released to a set of guardians `G` if `H` fails to check in for a
  period `T`;
- no single guardian can release `E` early.

A conventional design stores `E` in a server and uses a scheduler to release it
after `T`. That design has three weaknesses. The server is a single point of
seizure. The scheduler is a single point of failure. The operator can read `E`.

A decentralized design stores `E` on a public ledger. That design has two
weaknesses. Public ledgers are permanent, which conflicts with the sensitivity
of the content, and most ledgers have no native notion of expiration, so the
release condition must be implemented by an external process.

Arkiv offers a different set of primitives: typed attributes for queries, a
per-entity expiration, a mutable owner and an immutable creator, and public
reads without an application backend. Those primitives allow the switch to be
expressed as a state of the database rather than as a job on a server.

---

## 3. Threat model

### 3.1 Adversaries

**A1. A platform or censor.** Can block the application, remove an account, or
pressure a hosting provider.

**A2. A state or police actor.** Can detain the holder, seize devices, compel
disclosure, or block network access.

**A3. A malicious guardian.** Holds one share and wishes to open the vault
early, or to sell the share.

**A4. A network attacker.** Can drop, delay, or replay RPC requests.

**A5. A compromised operator.** Controls the application server in the live
path.

### 3.2 Assumptions

- The cryptographic primitives are secure: AES-256-GCM and Shamir's Secret
  Sharing over a finite field.
- At most one guardian is compromised or coerced before the release.
- The holder's device is not compromised at the moment of sealing.
- Arkiv's public read path remains available, or the record can be read through
  another client.

### 3.3 Non-goals

Sakshi does not attempt to:

- prove that the evidence is true;
- protect a person from physical coercion;
- provide anonymity to the holder;
- defend against a compromised endpoint at sealing time;
- provide liveness or anti-spoofing for the check-in.

These are explicit non-goals, not oversights. A system that claims them without
evidence would be worse than one that does not.

---

## 4. Design

### 4.1 Primitives

**Vault.** A `readonly`, permanent Arkiv entity. Its payload is the AES-GCM
ciphertext. Its attributes are the namespace, the type, the evidence hash, and
the creation time. The vault is the anchor: it outlives the switch.

**Beat.** A second entity whose lifetime is the check-in deadline. Its
attributes are the namespace, the type, a reference to the vault, the deadline,
and the renewal interval. The beat is the lease: it exists only while the holder
is checking in.

**Release.** A `readonly`, permanent entity written when the beat lapses. It
records that the switch fired and references the vault.

**Shares.** The content key is split into three shares with threshold two. Each
guardian holds one share. The shares are never written to Arkiv.

### 4.2 Lifetimes

The separation of lifetimes is the core of the design.

| Entity | Lifetime | Role |
|---|---|---|
| Vault | permanent | the evidence must survive the switch |
| Beat | the deadline | the switch is a lease |
| Release | permanent | the record of the release must survive |

If the vault expired with the beat, the switch would destroy the evidence at the
moment of release. If the beat never expired, the switch would never fire. The
pair of lifetimes encodes the policy.

### 4.3 Protocol

**Seal.** `H` generates a key `K`, encrypts `E` to `C = AES-GCM(K, E)`, and
writes the vault. `H` splits `K` into shares `s1, s2, s3` and writes the beat
with a deadline `now + T`. `H` distributes the shares to the guardians.

**Check in.** `H` writes a new deadline `now + T` and extends the beat's
expiration in one atomic batch. The deadline attribute and the entity expiration
must agree.

**Lapse.** An observer compares the deadline with the current time. If the beat
has expired, or the deadline has passed, the switch has fired. Because Arkiv
emits no event on expiration, the observer must poll or track deadlines.

**Release.** The observer writes a release entity and notifies the guardians.

**Unseal.** Two guardians provide `s1` and `s2`. The key `K = combine(s1, s2)`
is reconstructed and `E = AES-GCM-decrypt(K, C)` is returned.

### 4.4 Arkiv mapping

| Need | Arkiv primitive |
|---|---|
| Namespace | `project = "sakshi"` on every entity |
| Typed filtering | typed attributes: `str`, `u64`, `bytes32`, `key` |
| Range queries | numeric attributes: `deadline`, `created_ms` |
| The lease | Entity Expiration on the beat |
| Renewal | `extendEntity` |
| Atomic check-in | `executeBatch` with a patch and an extension |
| Immutable authorship | `$creator` |
| Transferable control | `$owner` and `changeOwnership` |
| Public verification | public reads without an application backend |
| Historical verification | `.atBlock()` reads |

What deliberately stays off Arkiv:

- the plaintext;
- the content key and the shares;
- the recovery kit;
- any personal data.

---

## 5. Security analysis

### 5.1 Confidentiality

The vault payload is ciphertext. The key is split and never written to the
database. An adversary with read access to Arkiv learns the ciphertext, the
hash, the timestamps, and the creator, but not the plaintext.

**Residual risk.** The deployed demo stores shares in the browser's local
storage. An XSS, a shared laptop, or a device seizure can expose all shares. The
production design must deliver one share per guardian.

### 5.2 Integrity

AES-GCM authenticates the ciphertext. A modified payload fails decryption. The
hash in the vault is intended to let a verifier detect a changed payload
independently of decryption. The current Node path hashes a slightly different
byte sequence than the stored payload, so the hash is not yet a reliable
commitment. This is a correctness bug, not a design flaw.

### 5.3 Availability

The vault and release are public Arkiv entities. A verifier can read them
without the application backend. The beat is public while it lives. The record
therefore survives the application.

**Residual risk.** The CLI and the live server need a funded wallet and an RPC
endpoint. A network shutdown can prevent new writes. The static demo avoids the
server but does not touch Arkiv.

### 5.4 The release condition

The threshold is two of three. One share is insufficient; three shares are
unnecessary. This tolerates one lost or coerced guardian and still requires two
parties to collude for an early release.

**Residual risk.** Two colluding guardians can release early. The threshold is a
deterrent, not a proof. A production design may add a time lock so that the
shares are useless before the deadline even if two guardians collude.

### 5.5 The lease

The beat's lifetime is the switch. The holder extends it. The network removes it
on expiry. This is a stronger primitive than a stored timestamp because the
expiry is enforced by the database, not by an application scheduler.

**Residual risk.** Expiration emits no event, so an observer must poll. A
transient RPC failure must not be confused with a lapse. The current UI does not
make that distinction, and it can write a false release. The fix is to separate
network errors from confirmed expiry and to show an unreachable state.

### 5.6 Early release

The current build does not gate unseal on a release. Any two shares decrypt at
any time. A production build must verify a release entity whose creator is the
watchdog and whose timestamp follows the beat's lapse.

### 5.7 Coercion

A coercer can compel the holder to check in, or compel a guardian to reveal a
share. Sakshi has no duress mode. A production build should add a decoy vault
and a panic path.

### 5.8 Summary

| Property | Status |
|---|---|
| Confidentiality against the database | holds |
| Integrity of the ciphertext | holds at the AEAD level |
| Availability without the operator | holds for reads |
| Conditional release | partial; no gate |
| Threshold against one guardian | holds |
| Threshold against two colluding guardians | does not hold |
| Coercion resistance | none |

---

## 6. Privacy

Sakshi minimizes on-chain data. The public record contains ciphertext, a hash,
a small set of attributes, and timestamps. It does not contain names, phone
numbers, emails, or government identifiers.

The design is compatible with the spirit of data minimization, but a real
deployment must address:

- **Consent.** A notice and a consent record for the holder and the guardians.
- **Erasure.** Permanent ciphertext cannot be erased. Use expiring vaults and
  crypto-shredding (destroy the key) for a real product.
- **Metadata.** Timestamps and the creator wallet can leak a check-in schedule.
  Consider coarse timestamps and per-vault wallets.
- **Third parties.** Do not store other people's data without consent.

---

## 7. Limitations

1. **No on-chain evidence yet.** The demo has not written to Tiramisu.
2. **Server-side encryption in the live path.** The demo server receives
   plaintext and returns shares.
3. **No `$creator` filtering.** The code filters on `project` and `type`.
4. **No cursor pagination or live events.** The UI polls.
5. **No release gate.** Two shares decrypt at any time.
6. **Shares are not delivered.** The recovery kit contains all three.
7. **No liveness or anti-spoofing.**
8. **No offline queue.** Check-in needs connectivity.
9. **The static demo is not Arkiv.** The Vercel build uses a client-side store.

These are engineering gaps with known fixes. The roadmap in the README orders
them by risk.

---

## 8. Related work

- **Dead man's switches** in software are usually implemented as a server-side
  timer that sends a message after inactivity. They depend on the server.
- **Warrant canaries** are a signal that a legal order occurred. They do not
  protect or release content.
- **Secret sharing** is a standard tool for threshold custody. Sakshi uses it
  for the release quorum.
- **Verifiable credentials and zero-knowledge identity** solve a different
  problem: proving a claim about a person. Sakshi protects a record, not an
  identity.
- **Time-lock encryption** would strengthen the release by making shares
  useless before a deadline. That is a natural extension.

---

## 9. Future work

1. Client-side encryption and signing on every path.
2. Per-user wallets and `$creator` filtering.
3. A release gate and a separate watchdog role.
4. Out-of-band share delivery, one share per guardian.
5. Time-lock encryption for the release.
6. Offline-first check-in with a queued transaction.
7. Hindi and regional language support.
8. A standalone verifier that reads Arkiv directly.

---

## 10. Conclusion

Sakshi is a small idea with a sharp constraint: the evidence must outlive the
person who sealed it, while the check-in must not. The design turns that
constraint into a pair of entities with different lifetimes, a threshold key,
and a public record. The current build is a working demo with named gaps. The
most important next step is not more features; it is to make the custody path
match the claims: encrypt and sign on the device, deliver one share per
guardian, and gate the unseal on a verified release.

---

## References

1. Arkiv documentation. https://docs.arkiv.network
2. Arkiv Tiramisu network. https://docs.arkiv.network/networks/tiramisu/
3. RSF, World Press Freedom Index, India. https://rsf.org/en/country/india
4. Access Now, #KeepItOn. https://www.accessnow.org/keepiton/
5. Shamir, A. How to share a secret. Communications of the ACM, 1979.
6. NIST, Recommendation for Block Cipher Modes of Operation: Galois/Counter
   Mode (GCM) and GMAC. SP 800-38D.
7. Digital Personal Data Protection Act, 2023 (India).
