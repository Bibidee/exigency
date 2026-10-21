import { readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Wallet } from "ethers";
import { createAccount, createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const CHAIN_ID = 61999;
const RPC = "https://studio.genlayer.com/api";
const root = process.cwd();

function activeAccountName() {
  const configPath = path.join(os.homedir(), ".genlayer", "genlayer-config.json");
  try {
    return JSON.parse(readFileSync(configPath, "utf8")).activeAccount || "live-bob";
  } catch {
    return "live-bob";
  }
}

function promptPassword(message) {
  if (!process.stdin.isTTY || !process.stdin.setRawMode) {
    throw new Error("A visible interactive terminal is required for the keystore password");
  }
  return new Promise((resolve, reject) => {
    let value = "";
    process.stdout.write(message);
    process.stdin.setEncoding("utf8");
    process.stdin.setRawMode(true);
    const onData = (chunk) => {
      for (const char of chunk) {
        if (char === "\r" || char === "\n") {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.off("data", onData);
          process.stdout.write("\n");
          resolve(value);
        } else if (char === "\u0003") {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.off("data", onData);
          reject(new Error("cancelled"));
        } else if (char === "\u0008" || char === "\u007f") {
          value = value.slice(0, -1);
        } else if (char >= " ") {
          value += char;
          process.stdout.write("*");
        }
      }
    };
    process.stdin.on("data", onData);
  });
}

async function waitFinal(client, hash) {
  const receipt = await client.waitForTransactionReceipt({
    hash,
    status: "FINALIZED",
    retries: 360,
    interval: 5000,
    fullTransaction: true,
  });
  const leader = receipt?.consensus_data?.leader_receipt?.find((entry) => entry?.execution_result)?.execution_result;
  const result = receipt?.txExecutionResultName ?? (leader === "SUCCESS" ? "FINISHED_WITH_RETURN" : leader === "ERROR" ? "FINISHED_WITH_ERROR" : undefined);
  if (result !== "FINISHED_WITH_RETURN") {
    throw new Error(`finalized transaction did not prove successful execution: ${hash} (${String(result ?? "unknown")})`);
  }
  return receipt;
}

function deployedAddress(receipt) {
  const value = receipt?.data?.contract_address ?? receipt?.txDataDecoded?.contractAddress;
  if (!value) throw new Error(`deployment address was not returned for ${String(receipt?.transactionHash ?? "unknown")}`);
  return String(value);
}

async function deployOne(client, file, args) {
  const code = new Uint8Array(readFileSync(path.join(root, "contracts", file)));
  const txId = await client.deployContract({ code, args });
  console.log(`[deploy] ${file}: ${txId}`);
  const receipt = await waitFinal(client, txId);
  const address = deployedAddress(receipt);
  console.log(`[finalized] ${file}: ${address}`);
  return { address, txId: String(txId) };
}

async function writeAndFinalize(client, address, functionName, args) {
  const txId = await client.writeContract({ address, functionName, args, value: 0n });
  console.log(`[write] ${functionName}: ${txId}`);
  await waitFinal(client, txId);
  console.log(`[finalized] ${functionName}: ${txId}`);
  return String(txId);
}

const accountName = process.env.EXIGENT_ACCOUNT || activeAccountName();
const keystorePath = process.env.EXIGENT_KEYSTORE || path.join(os.homedir(), ".genlayer", "keystores", `${accountName}.json`);
const password = await promptPassword(`Keystore password for ${accountName}: `);
const encrypted = readFileSync(keystorePath, "utf8");
const wallet = await Wallet.fromEncryptedJson(encrypted, password);
const account = createAccount(wallet.privateKey);
const client = createClient({ chain: studionet, endpoint: RPC, account });

if (Number(client.chain?.id) !== CHAIN_ID) throw new Error(`wrong chain: ${String(client.chain?.id)}`);
console.log(`EXIGENT target: Studionet ${CHAIN_ID} (${RPC})`);
console.log(`Signer: ${account.address}`);
await client.initializeConsensusSmartContract();

const registry = await deployOne(client, "charter_registry.py", []);
const gate = await deployOne(client, "capability_gate.py", []);
const engine = await deployOne(client, "exigency_engine.py", [registry.address, gate.address]);
const bindEngineTx = await writeAndFinalize(client, gate.address, "bind_engine", [engine.address]);
const vault = await deployOne(client, "protected_vault.py", [gate.address]);
const route = await deployOne(client, "protected_route.py", [gate.address]);

const env = [
  "NEXT_PUBLIC_GENLAYER_CHAIN_ID=61999",
  `NEXT_PUBLIC_GENLAYER_RPC_URL=${RPC}`,
  "NEXT_PUBLIC_GENLAYER_EXPLORER=https://explorer-studio.genlayer.com",
  `NEXT_PUBLIC_CHARTER_REGISTRY_ADDRESS=${registry.address}`,
  `NEXT_PUBLIC_EXIGENCY_ENGINE_ADDRESS=${engine.address}`,
  `NEXT_PUBLIC_CAPABILITY_GATE_ADDRESS=${gate.address}`,
  `NEXT_PUBLIC_PROTECTED_VAULT_ADDRESS=${vault.address}`,
  `NEXT_PUBLIC_PROTECTED_ROUTE_ADDRESS=${route.address}`,
  "",
].join("\n");
writeFileSync(path.join(root, ".env.generated"), env);

const manifest = {
  project: "EXIGENT",
  network: "studionet",
  chainId: CHAIN_ID,
  rpc: RPC,
  contracts: {
    charterRegistry: registry.address,
    exigencyEngine: engine.address,
    capabilityGate: gate.address,
    protectedVault: vault.address,
    protectedRoute: route.address,
  },
  deploymentTransactions: {
    charterRegistry: registry.txId,
    capabilityGate: gate.txId,
    exigencyEngine: engine.txId,
    protectedVault: vault.txId,
    protectedRoute: route.txId,
  },
  bindEngineTransaction: bindEngineTx,
  generatedAt: new Date().toISOString(),
};
writeFileSync(path.join(root, "deployment-manifest.generated.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify(manifest, null, 2));

