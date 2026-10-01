import { readFileSync } from "node:fs";
import { createAccount, createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const key = process.env.EXIGENT_LIVE_PRIVATE_KEY;
if (!key) throw new Error("EXIGENT_LIVE_PRIVATE_KEY is required for live protected-action coverage");

const manifest = JSON.parse(readFileSync(new URL("../deployment-manifest.public.json", import.meta.url), "utf8"));
if (Number(manifest.chainId) !== 61999) throw new Error("refusing a non-Studionet manifest");

const account = createAccount(key);
const client = createClient({ chain: studionet, endpoint: "https://studio.genlayer.com/api", account });
const target = manifest.contracts.protectedVault;
const actionKey = process.env.EXIGENT_LIVE_ACTION_KEY || `LIVE-ACTION-${Date.now()}`;

const finalized = async (hash) => {
  const receipt = await client.waitForTransactionReceipt({ hash, status: "FINALIZED", retries: 120, interval: 5000 });
  const statusName = String(receipt.statusName ?? receipt.status_name ?? "").toUpperCase();
  const result = String(receipt.txExecutionResultName ?? receipt.tx_execution_result_name ?? receipt.resultName ?? receipt.result_name ?? "").toUpperCase();
  if (statusName !== "FINALIZED" || ["MAJORITY_DISAGREE", "CANCELED", "ERROR", "FAILED"].includes(result)) {
    throw new Error(`transaction did not finalize successfully: ${hash} (${result || "unknown"})`);
  }
  return receipt;
};

const readStatus = async () => JSON.parse(await client.readContract({ address: target, functionName: "get_status_json", args: [] }));
const before = await readStatus();
if (before.protected_action_paused) throw new Error("protected action is currently paused; choose another live test window");
const beforeCount = BigInt(before.protected_action_count);

const parentHash = await client.writeContract({ address: target, functionName: "execute_protected_action", args: [actionKey], value: 0n });
await finalized(parentHash);
const record = JSON.parse(await client.readContract({ address: target, functionName: "get_protected_action_json", args: [actionKey] }));
const after = await readStatus();
if (record.holder.toLowerCase() !== account.address.toLowerCase()) throw new Error("protected action holder mismatch");
if (BigInt(after.protected_action_count) !== beforeCount + 1n) throw new Error("protected action count mismatch");
if (record.action_key !== actionKey) throw new Error("protected action key mismatch");

console.log(JSON.stringify({
  account: account.address,
  parentHash,
  actionKey,
  beforeCount: String(beforeCount),
  afterCount: String(after.protected_action_count),
  protectedActionPaused: after.protected_action_paused,
  valueCustody: "NONE",
}));
