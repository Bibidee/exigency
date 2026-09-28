export const NETWORK = {
  name: "Studionet",
  chainId: 61999,
  rpc: "https://studio.genlayer.com/api",
  explorer: "https://explorer-studio.genlayer.com",
} as const;

export type DeploymentAddresses = {
  charterRegistry: `0x${string}` | "";
  exigencyEngine: `0x${string}` | "";
  capabilityGate: `0x${string}` | "";
  protectedVault: `0x${string}` | "";
};

export const ADDRESSES: DeploymentAddresses = {
  charterRegistry: (process.env.NEXT_PUBLIC_CHARTER_REGISTRY_ADDRESS ?? "") as DeploymentAddresses["charterRegistry"],
  exigencyEngine: (process.env.NEXT_PUBLIC_EXIGENCY_ENGINE_ADDRESS ?? "") as DeploymentAddresses["exigencyEngine"],
  capabilityGate: (process.env.NEXT_PUBLIC_CAPABILITY_GATE_ADDRESS ?? "") as DeploymentAddresses["capabilityGate"],
  protectedVault: (process.env.NEXT_PUBLIC_PROTECTED_VAULT_ADDRESS ?? "") as DeploymentAddresses["protectedVault"],
};

export const isConfigured = Object.values(ADDRESSES).every(Boolean);

export function explorerTx(hash: string) {
  return `${NETWORK.explorer}/tx/${hash}`;
}

export function explorerAddress(address: string) {
  return `${NETWORK.explorer}/address/${address}`;
}
