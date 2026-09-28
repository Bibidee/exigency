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
  charterRegistry: "0xBAeB7D6B7dC560A3b7AeaCdBA96c29c46BE6dB21",
  exigencyEngine: "0xD312EbD571fD3353870098F902b1bdafA7457cA1",
  capabilityGate: "0xa7181624F1cbFaedDeefb8Ff5811AF4Ee660357e",
  protectedVault: "0x3778A8b18B0DF4288464DF6A745F5569668bdE1D",
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
