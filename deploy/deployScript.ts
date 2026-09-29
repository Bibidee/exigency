import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { DecodedDeployData, GenLayerClient, TransactionHash } from "genlayer-js/types";

const CHAIN_ID = 61999;
const RPC = "https://studio.genlayer.com/api";

function code(file: string): Uint8Array {
  return new Uint8Array(readFileSync(path.resolve(process.cwd(), "contracts", file)));
}

async function waitFinal(client: GenLayerClient<any>, hash: TransactionHash) {
  return client.waitForTransactionReceipt({
    hash,
    status: "FINALIZED",
    retries: 360,
    interval: 5000,
    fullTransaction: true,
  } as any);
}

function deployedAddress(client: GenLayerClient<any>, receipt: any): string {
  const value = receipt?.data?.contract_address
    ?? (receipt?.txDataDecoded as DecodedDeployData | undefined)?.contractAddress;
  if (!value) throw new Error(`Deployment finalized but address was not decoded: ${JSON.stringify(receipt)}`);
  return String(value);
}

async function deployOne(client: GenLayerClient<any>, file: string, args: unknown[]): Promise<{ address: string; txId: string }> {
  const txId = await client.deployContract({ code: code(file), args: args as any[] });
  console.log(`[deploy] ${file}: ${txId}`);
  const receipt = await waitFinal(client, txId as TransactionHash);
  const address = deployedAddress(client, receipt);
  console.log(`[finalized] ${file}: ${address}`);
  return { address, txId: String(txId) };
}

async function writeAndFinalize(client: GenLayerClient<any>, address: `0x${string}`, functionName: string, args: unknown[]) {
  const txId = await client.writeContract({ address, functionName, args: args as any[], value: 0n } as any);
  console.log(`[write] ${functionName}: ${txId}`);
  await waitFinal(client, txId as TransactionHash);
  console.log(`[finalized] ${functionName}: ${txId}`);
  return String(txId);
}

export default async function main(client: GenLayerClient<any>) {
  if (Number(client.chain?.id) !== CHAIN_ID) {
    throw new Error(`EXIGENT must deploy to stable Studionet ${CHAIN_ID}; connected chain is ${client.chain?.id}`);
  }

  console.log(`EXIGENT target: Studionet ${CHAIN_ID} (${RPC})`);
  console.log("Expected local CLI: genlayer 0.39.1. Do not use global 0.40.0rc2 for this deployment.");
  await client.initializeConsensusSmartContract();

  const registry = await deployOne(client, "charter_registry.py", []);
  const gate = await deployOne(client, "capability_gate.py", []);
  const engine = await deployOne(client, "exigency_engine.py", [registry.address, gate.address]);
  const bindEngineTx = await writeAndFinalize(client, gate.address as `0x${string}`, "bind_engine", [engine.address]);
  const vault = await deployOne(client, "protected_vault.py", [gate.address]);

  const env = [
    "NEXT_PUBLIC_GENLAYER_CHAIN_ID=61999",
    "NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio.genlayer.com/api",
    "NEXT_PUBLIC_GENLAYER_EXPLORER=https://explorer-studio.genlayer.com",
    `NEXT_PUBLIC_CHARTER_REGISTRY_ADDRESS=${registry.address}`,
    `NEXT_PUBLIC_EXIGENCY_ENGINE_ADDRESS=${engine.address}`,
    `NEXT_PUBLIC_CAPABILITY_GATE_ADDRESS=${gate.address}`,
    `NEXT_PUBLIC_PROTECTED_VAULT_ADDRESS=${vault.address}`,
    "",
  ].join("\n");
  writeFileSync(path.resolve(process.cwd(), ".env.generated"), env);

  const manifest = {
    project: "EXIGENT",
    network: "studionet",
    chainId: CHAIN_ID,
    rpc: RPC,
    expectedLocalCli: "0.39.1",
    jsSdk: "1.1.8",
    contracts: { charterRegistry: registry.address, exigencyEngine: engine.address, capabilityGate: gate.address, protectedVault: vault.address },
    deploymentTransactions: {
      charterRegistry: registry.txId,
      capabilityGate: gate.txId,
      exigencyEngine: engine.txId,
      protectedVault: vault.txId,
    },
    bindEngineTransaction: bindEngineTx,
    generatedAt: new Date().toISOString(),
    nextSteps: [
      "Copy .env.generated to .env.local before building the frontend.",
      "Publish and activate a demo charter only after the protected-vault address exists.",
      "Verify every deployment and child transaction is FINALIZED in explorer-studio.genlayer.com.",
      "Archive exact deployed-source provenance before review submission."
    ]
  };
  writeFileSync(path.resolve(process.cwd(), "deployment-manifest.generated.json"), JSON.stringify(manifest, null, 2) + "\n");
  console.log(JSON.stringify(manifest, null, 2));
}
