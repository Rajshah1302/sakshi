import { createBackend } from "../server/backend";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`ok: ${message}`);
}

async function main(): Promise<void> {
  const backend = createBackend();
  console.log(`mode: ${backend.mode}`);

  const created = await backend.create("hello sakshi", 2);
  assert(created.shares.length === 3, "created a vault with 3 shares");

  const beat = await backend.getBeat(created.beatKey);
  assert(beat.vaultKey === created.vaultKey, "heartbeat points at the vault");

  await backend.checkIn(created.beatKey, 2);
  assert((await backend.getBeat(created.beatKey)).deadline > Date.now(), "check-in extended the deadline");

  await new Promise((resolve) => setTimeout(resolve, 3000));

  let lapsed = false;
  try {
    await backend.getBeat(created.beatKey);
  } catch {
    lapsed = true;
  }
  assert(lapsed, "heartbeat lapses after the deadline");

  const release = await backend.writeRelease(created.vaultKey);
  assert(typeof release.releaseKey === "string", "release record written");

  const text = await backend.unseal(created.vaultKey, [
    created.shares[0] as string,
    created.shares[1] as string,
  ]);
  assert(text === "hello sakshi", "guardians unseal the evidence");

  console.log("backend test complete");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
