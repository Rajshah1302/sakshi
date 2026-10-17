import { writeFileSync } from "node:fs";
import { unsealVault } from "../arkiv/queries";

async function main(): Promise<void> {
  const vaultKey = process.argv[2] as `0x${string}` | undefined;
  const shareA = process.argv[3] ?? process.env.SHARE_1;
  const shareB = process.argv[4] ?? process.env.SHARE_2;
  const out = process.argv[5] ?? "released.bin";

  if (!vaultKey || !shareA || !shareB) {
    console.error("usage: npm run release -- <vaultKey> <shareA> <shareB> [outFile]");
    process.exit(1);
  }

  const plaintext = await unsealVault(vaultKey, [shareA, shareB]);
  writeFileSync(out, plaintext);
  console.log(`released ${plaintext.length} bytes to ${out}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
