import publicManifest from "@/deployment-manifest.public.json";

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

const DEPLOYED_ADDRESSES: DeploymentAddresses = publicManifest.contracts as DeploymentAddresses;

export const ADDRESSES: DeploymentAddresses = {
  charterRegistry: (process.env.NEXT_PUBLIC_CHARTER_REGISTRY_ADDRESS || DEPLOYED_ADDRESSES.charterRegistry) as DeploymentAddresses["charterRegistry"],
  exigencyEngine: (process.env.NEXT_PUBLIC_EXIGENCY_ENGINE_ADDRESS || DEPLOYED_ADDRESSES.exigencyEngine) as DeploymentAddresses["exigencyEngine"],
  capabilityGate: (process.env.NEXT_PUBLIC_CAPABILITY_GATE_ADDRESS || DEPLOYED_ADDRESSES.capabilityGate) as DeploymentAddresses["capabilityGate"],
  protectedVault: (process.env.NEXT_PUBLIC_PROTECTED_VAULT_ADDRESS || DEPLOYED_ADDRESSES.protectedVault) as DeploymentAddresses["protectedVault"],
};

export const isConfigured = Object.values(ADDRESSES).every(Boolean);

export function explorerTx(hash: string) {
  return `${NETWORK.explorer}/tx/${hash}`;
}

export function explorerAddress(address: string) {
  return `${NETWORK.explorer}/address/${address}`;
}
