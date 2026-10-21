import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Wallet } from "ethers";
import { createAccount, createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const RPC = "https://studio.genlayer.com/api";
const root = process.cwd();
const manifest = JSON.parse(readFileSync(path.join(root, "deployment-manifest.public.json"), "utf8"));
const incident = process.env.EXIGENT_LIVE_INCIDENT || "V2-BOUNDARY-INC-1792583486906";

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

const provisional = await readJson(client, contracts.exigencyEngine, "get_incident_json", [incident]);
const now = Math.floor(Date.now() / 1000);
if (provisional.status !== "ASSESSMENT_PROVISIONAL") throw new Error(`expected unchanged provisional incident, got ${provisional.status}`);
if (now < Number(provisional.challenge_deadline)) throw new Error("challenge deadline has not elapsed; refusing to finalize early");
if (now >= Number(provisional.expires_at)) throw new Error("incident expired; refusing to write after expiry");

console.log(`Continuing incident ${incident} after rejected late challenge; no challenge retry will be submitted.`);
const finalizeHash = await write(client, contracts.exigencyEngine, "finalize_incident", [incident]);
const issuanceChildren = await children(client, finalizeHash);
for (const child of issuanceChildren) await waitFinal(client, child);

const finalIncident = await readJson(client, contracts.exigencyEngine, "get_incident_json", [incident]);
if (!finalIncident.capability_key) throw new Error("finalized incident did not issue a capability");
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
  incident,
  lateChallenge: { state: "REJECTED", reason: "challenge window has closed", onChainStateUnchanged: true },
  capability: finalIncident.capability_key,
  transactions: { finalizeHash, issuanceChildren, executeHash, executionChildren, reconcileHash },
  states: {
    provisional: { status: provisional.status, assessmentStage: provisional.assessment_stage, challengeDeadline: provisional.challenge_deadline },
    finalIncident: { status: finalIncident.status, assessmentStage: finalIncident.assessment_stage, capabilityKey: finalIncident.capability_key },
    dispatched: { status: dispatched.dispatch_status, dispatchCount: dispatched.dispatch_count },
    applied: { status: applied.dispatch_status, consumed: applied.consumed, dispatchCount: applied.dispatch_count },
    route: { disabled: route.route_disabled, disabledUntil: route.route_disabled_until, executionCount: route.route_execution_count },
  },
}, null, 2));
