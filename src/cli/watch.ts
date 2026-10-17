import { NoEntityFoundError } from "@arkiv-network/sdk";
import { writeRelease } from "../arkiv/mutations";
import { getBeat } from "../arkiv/queries";

async function main(): Promise<void> {
  const beatKey = process.argv[2] as `0x${string}` | undefined;
  const vaultArg = process.argv[3] as `0x${string}` | undefined;
  const once = process.argv.includes("--once");
  const pollS = Number(process.env.WATCH_POLL_S ?? 2);

  if (!beatKey) {
    console.error("usage: npm run watch -- <beatKey> [vaultKey] [--once]");
    process.exit(1);
  }

  let vaultKey = vaultArg;

  const release = async (): Promise<void> => {
    if (!vaultKey) {
      console.error(
        "The heartbeat lapsed but the vault key is unknown. " +
          "Re-run with: npm run watch -- <beatKey> <vaultKey>",
      );
      process.exit(1);
    }
    const result = await writeRelease(vaultKey);
    console.log(`RELEASED, release entity ${result.releaseKey}`);
    console.log(`tx: ${result.txHash}`);
  };

  const tick = async (): Promise<boolean> => {
    try {
      const beat = await getBeat(beatKey);
      vaultKey = beat.vaultKey;
      if (Date.now() >= beat.deadline) {
        await release();
        return true;
      }
      const remaining = Math.round((beat.deadline - Date.now()) / 1000);
      console.log(`alive, ${remaining}s left, vault ${beat.vaultKey}`);
      return false;
    } catch (error) {
      if (error instanceof NoEntityFoundError) {
        console.log("heartbeat has expired");
        await release();
        return true;
      }
      throw error;
    }
  };

  if (once) {
    await tick();
    return;
  }

  for (;;) {
    const done = await tick();
    if (done) break;
    await new Promise((resolve) => setTimeout(resolve, pollS * 1000));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
