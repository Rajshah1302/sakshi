import { checkIn } from "../arkiv/mutations";
import { config } from "../config";

async function main(): Promise<void> {
  const beatKey = process.argv[2] as `0x${string}` | undefined;
  if (!beatKey) {
    console.error("usage: npm run checkin -- <beatKey> [intervalSeconds]");
    process.exit(1);
  }

  const intervalS = Number(process.argv[3] ?? config.checkinIntervalS);
  if (!Number.isFinite(intervalS) || intervalS <= 0) {
    throw new Error("intervalSeconds must be a positive number");
  }

  const result = await checkIn(beatKey, intervalS);
  console.log(`checked in — new deadline ${new Date(result.deadlineMs).toISOString()}`);
  console.log(`tx: ${result.txHash}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
