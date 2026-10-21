import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Wallet } from "ethers";
import { createAccount, createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const RPC = "https://studio.genlayer.com/api";
const root = process.cwd();
const manifest = JSON.parse(readFileSync(path.join(root, "deployment-manifest.public.json"), "utf8"));

function promptPassword(message) {
  if (!process.stdin.isTTY || !process.stdin.setRawMode) throw new Error("run this from a visible interactive terminal");
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
  const receipt = await client.waitForTransactionReceipt({ hash, status: "FINALIZED", retries: 360, interval: 5000, fullTransaction: true });
  const leader = receipt?.consensus_data?.leader_receipt?.find((entry) => entry?.execution_result)?.execution_result;
  const result = receipt?.txExecutionResultName ?? (leader === "SUCCESS" ? "FINISHED_WITH_RETURN" : leader === "ERROR" ? "FINISHED_WITH_ERROR" : undefined);
  if (result !== "FINISHED_WITH_RETURN") throw new Error(`transaction ${hash} finalized without successful execution (${String(result ?? "unknown")})`);
  return receipt;
}

async function write(client, address, functionName, args) {
  const hash = await client.writeContract({ address, functionName, args, value: 0n });
  console.log(`[write] ${functionName}: ${hash}`);
  await waitFinal(client, hash);
  console.log(`[finalized] ${functionName}: ${hash}`);
  return String(hash);
}

async function children(client, parentHash) {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    const ids = await client.getTriggeredTransactionIds({ hash: parentHash });
    if (ids.length) return ids;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error(`no triggered child transaction found for ${parentHash}`);
}

async function readJson(client, address, method, args) {
  return JSON.parse(await client.readContract({ address, functionName: method, args }));
}

const accountName = process.env.EXIGENT_ACCOUNT || JSON.parse(readFileSync(path.join(os.homedir(), ".genlayer", "genlayer-config.json"), "utf8")).activeAccount || "live-bob";
const keystorePath = process.env.EXIGENT_KEYSTORE || path.join(os.homedir(), ".genlayer", "keystores", `${accountName}.json`);
const password = await promptPassword(`Keystore password for ${accountName}: `);
const wallet = await Wallet.fromEncryptedJson(readFileSync(keystorePath, "utf8"), password);
const account = createAccount(wallet.privateKey);
const client = createClient({ chain: studionet, endpoint: RPC, account });
const contracts = manifest.contracts;
const stamp = `${Date.now()}`;
const charter = `V2-BOUNDARY-${stamp}`;
const incident = `V2-BOUNDARY-INC-${stamp}`;
const protocol = `V2-BOUNDARY-PROTOCOL-${stamp}`;
const sources = JSON.stringify([
  { group: "official", url: "https://raw.githubusercontent.com/Bibidee/exigency/main/demo/evidence/active_incident_primary_v2.md" },
  { group: "independent", url: "https://github.com/Bibidee/exigency/raw/refs/heads/main/demo/evidence/active_incident_secondary_v2.md" },
]);
const groups = JSON.stringify([
  { name: "official", hosts: ["raw.githubusercontent.com"] },
  { name: "independent", hosts: ["github.com"] },
]);

console.log(`Signer: ${account.address}`);
console.log(`Fresh lifecycle: ${charter} / ${incident}`);
const publishHash = await write(client, contracts.charterRegistry, "publish_charter_v2", [
  charter,
  protocol,
  "EXIGENT corrected lifecycle boundary proof",
  contracts.protectedRoute,
  "SYNTHETIC TEST ONLY: trigger when approved grouped public evidence confirms an active fictional incident.",
  "Approved grouped synthetic sources must be retrievable, corroborated and current.",
  "raw.githubusercontent.com,github.com",
  "DISABLE_PROTECTED_ROUTE",
  90,
  30,
  1,
  groups,
  2,
  1,
  1,
]);

await new Promise((resolve) => setTimeout(resolve, 70000));
const activateHash = await write(client, contracts.charterRegistry, "activate_charter", [charter]);
const openHash = await write(client, contracts.exigencyEngine, "open_incident", [
  incident,
  charter,
  "DISABLE_PROTECTED_ROUTE",
  5,
  "Automated corrected-lifecycle proof for bounded evidence, retry, challenge and redispatch boundaries.",
  sources,
]);
const assessHash = await write(client, contracts.exigencyEngine, "assess_incident", [incident]);
const provisional = await readJson(client, contracts.exigencyEngine, "get_incident_json", [incident]);
if (provisional.status !== "ASSESSMENT_PROVISIONAL") throw new Error(`expected provisional assessment, got ${provisional.status}`);
const challengeHash = await write(client, contracts.exigencyEngine, "challenge_incident", [
  incident,
  JSON.stringify([{ group: "independent", url: "https://github.com/Bibidee/exigency" }]),
  "Independent repository context is supplied for the bounded challenge review.",
]);
const deadline = Number(provisional.challenge_deadline);
while (Math.floor(Date.now() / 1000) <= deadline) await new Promise((resolve) => setTimeout(resolve, 2000));
const finalizeHash = await write(client, contracts.exigencyEngine, "finalize_incident", [incident]);
const issuanceChildren = await children(client, finalizeHash);
for (const child of issuanceChildren) await waitFinal(client, child);
const finalIncident = await readJson(client, contracts.exigencyEngine, "get_incident_json", [incident]);
const capability = await readJson(client, contracts.capabilityGate, "get_capability_json", [finalIncident.capability_key]);
const executeHash = await write(client, contracts.capabilityGate, "execute_capability", [
  finalIncident.capability_key,
  capability.target,
  capability.action_class,
  Number(capability.duration_minutes),
]);
const executionChildren = await children(client, executeHash);
for (const child of executionChildren) await waitFinal(client, child);
const dispatched = await readJson(client, contracts.capabilityGate, "get_capability_json", [finalIncident.capability_key]);
const reconcileHash = await write(client, contracts.capabilityGate, "reconcile_capability", [finalIncident.capability_key]);
const applied = await readJson(client, contracts.capabilityGate, "get_capability_json", [finalIncident.capability_key]);
const route = await readJson(client, contracts.protectedRoute, "get_status_json", []);

console.log(JSON.stringify({
  signer: account.address,
  charter,
  incident,
  capability: finalIncident.capability_key,
  transactions: { publishHash, activateHash, openHash, assessHash, challengeHash, finalizeHash, issuanceChildren, executeHash, executionChildren, reconcileHash },
  states: {
    provisional: { status: provisional.status, assessmentStage: provisional.assessment_stage, challengeDeadline: provisional.challenge_deadline },
    finalIncident: { status: finalIncident.status, assessmentStage: finalIncident.assessment_stage, capabilityKey: finalIncident.capability_key },
    dispatched: { status: dispatched.dispatch_status, dispatchCount: dispatched.dispatch_count },
    applied: { status: applied.dispatch_status, consumed: applied.consumed, dispatchCount: applied.dispatch_count },
    route: { disabled: route.route_disabled, disabledUntil: route.route_disabled_until, executionCount: route.route_execution_count },
  },
}, null, 2));
