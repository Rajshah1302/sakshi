import { readFileSync } from "node:fs";
import { createVaultAndBeat } from "../arkiv/mutations";
import { config } from "../config";

async function main(): Promise<void> {
  const file = process.argv[2];
  if (!file) {
    console.error("usage: npm run create -- <evidence-file> [intervalSeconds]");
    process.exit(1);
  }

  const evidence = new Uint8Array(readFileSync(file));
  const intervalS = Number(process.argv[3] ?? config.checkinIntervalS);
  if (!Number.isFinite(intervalS) || intervalS <= 0) {
    throw new Error("intervalSeconds must be a positive number");
  }

  const result = await createVaultAndBeat(evidence, intervalS);

  console.log("--- Sakshi vault created ---");
  console.log(`vault:     ${result.vaultKey}`);
  console.log(`beat:      ${result.beatKey}`);
  console.log(`evidence:  ${result.evidenceHash}`);
  console.log(`deadline:  ${new Date(result.deadlineMs).toISOString()}`);
  console.log("\nGuardian shares (give one to each guardian; any 2 reconstruct):");
  result.shares.forEach((share, i) => console.log(`  guardian ${i + 1}: ${share}`));
  console.log("\nKeep these shares safe. Do not commit them.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
