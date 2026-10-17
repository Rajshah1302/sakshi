import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const shouldWrite = process.argv.includes("--write");
const privateKey = generatePrivateKey();
const account = privateKeyToAccount(privateKey);

console.log("Sakshi test wallet");
console.log(`  address:     ${account.address}`);
console.log(`  private key: ${privateKey}`);
console.log("\nThis is a Tiramisu testnet wallet. Never reuse it for real funds.");

if (shouldWrite) {
  const path = ".env";
  const template = readFileSync(".env.example", "utf8");
  let content = existsSync(path) ? readFileSync(path, "utf8") : template;

  if (/^PRIVATE_KEY=.*$/m.test(content)) {
    content = content.replace(/^PRIVATE_KEY=.*$/m, `PRIVATE_KEY=${privateKey}`);
  } else {
    content = `${content.trimEnd()}\nPRIVATE_KEY=${privateKey}\n`;
  }

  writeFileSync(path, content);
  console.log(`\nWrote ${path}. Fund the address at https://hub.arkiv.network/faucet`);
} else {
  console.log("\nRe-run with --write to save it to .env");
}
