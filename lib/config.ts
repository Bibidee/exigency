export const NETWORK = {
  name: "Studionet",
  chainId: 61999,
  rpc: "https://studio.genlayer.com/api/",
  explorer: "https://explorer-studio.genlayer.com",
} as const;

export type DeploymentAddresses = {
  charterRegistry: `0x${string}` | "";
  exigencyEngine: `0x${string}` | "";
  capabilityGate: `0x${string}` | "";
  protectedVault: `0x${string}` | "";
};

// Public Studionet deployment fallback. Environment variables still override
// these values, but the hosted UI remains functional when Vercel does not
// import the local .env.local file.
const DEPLOYED_ADDRESSES: DeploymentAddresses = {
  charterRegistry: "0xa5cE28ae6913288A99Bcd0061B51d1B25B6cf90F",
  exigencyEngine: "0x50d50642505eA54341796e15D7d6C2b7C43A572C",
  capabilityGate: "0x2cdBE27C7e3740B2F0850E6725E3feEa28d7c69e",
  protectedVault: "0x2a924F888E84DbD490e5db9565Cfd4f36C56370a",
};

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
