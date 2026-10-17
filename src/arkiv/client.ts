import { createPublicClient, createWalletClient } from "@arkiv-network/sdk";
import { tiramisu } from "@arkiv-network/sdk/chains";
import { http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { config, requirePrivateKey } from "../config";

const transport = config.rpcUrl ? http(config.rpcUrl) : http();

export function getPublicClient() {
  return createPublicClient({ chain: tiramisu, transport });
}

export function getWalletClient() {
  const account = privateKeyToAccount(requirePrivateKey());
  return createWalletClient({ chain: tiramisu, transport, account });
}

export type PublicClient = ReturnType<typeof getPublicClient>;
export type WalletClient = ReturnType<typeof getWalletClient>;
