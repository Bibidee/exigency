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

// Public Studionet deployment fallback. Environment variables still override
// these values, but the hosted UI remains functional when Vercel does not
// import the local .env.local file.
const DEPLOYED_ADDRESSES: DeploymentAddresses = {
  charterRegistry: "0x39A43D2D5794b8D045b2a10ddd81De238DD65A46",
  exigencyEngine: "0xb872aFf0A3E769A0EAfD6DD61fBA8D717d2b4319",
  capabilityGate: "0xf7c424a46Aa63F33Ca1b7F852566b318b548c619",
  protectedVault: "0x0D328549612835CbdC7e5CE3EC2267b13Ce86996",
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
