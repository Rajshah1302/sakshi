import "dotenv/config";

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

export const config = {
  privateKey: readEnv("PRIVATE_KEY") as `0x${string}` | undefined,
  rpcUrl: readEnv("ARKIV_RPC_URL"),
  checkinIntervalS: Number(readEnv("CHECKIN_INTERVAL_S") ?? 604800),
};

const ZERO_KEY = /^0x0{64}$/;

export function hasPrivateKey(): boolean {
  return Boolean(config.privateKey) && !ZERO_KEY.test(config.privateKey as string);
}

export function requirePrivateKey(): `0x${string}` {
  if (!hasPrivateKey()) {
    throw new Error(
      "PRIVATE_KEY is not set. Copy .env.example to .env and add a funded Tiramisu wallet " +
        "(get test GLM at https://hub.arkiv.network/faucet).",
    );
  }
  return config.privateKey as `0x${string}`;
}
