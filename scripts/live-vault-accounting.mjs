import { readFileSync } from "node:fs";
import { createAccount, createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const key = process.env.EXIGENT_LIVE_PRIVATE_KEY;
if (!key) throw new Error("EXIGENT_LIVE_PRIVATE_KEY is required for live payable accounting coverage");

const manifest = JSON.parse(readFileSync(new URL("../deployment-manifest.generated.json", import.meta.url), "utf8"));
if (Number(manifest.chainId) !== 61999) throw new Error("refusing a non-Studionet manifest");

const account = createAccount(key);
const client = createClient({ chain: studionet, endpoint: "https://studio.genlayer.com/api", account });
const vault = manifest.contracts.protectedVault;
const amount = 10_000_000_000_000_000n;

const readStatus = async () => JSON.parse(await client.readContract({ address: vault, functionName: "get_status_json", args: [] }));
const readCredit = async () => BigInt(await client.readContract({ address: vault, functionName: "get_credit", args: [account.address] }));
const finalized = async (hash) => {
  const receipt = await client.waitForTransactionReceipt({ hash, status: "FINALIZED", retries: 120, interval: 5000 });
  if (String(receipt.txExecutionResultName ?? "").includes("FAIL")) throw new Error(`transaction failed: ${hash}`);
  return receipt;
};

const before = await readStatus();
const beforeCredit = await readCredit();
const depositHash = await client.writeContract({ address: vault, functionName: "deposit", args: [], value: amount });
await finalized(depositHash);
const afterDeposit = await readStatus();
const depositedCredit = await readCredit();
if (depositedCredit !== beforeCredit + amount) throw new Error("deposit credit mismatch");
if (BigInt(afterDeposit.total_credits) !== BigInt(before.total_credits) + amount) throw new Error("deposit total mismatch");

const withdrawalAmount = amount / 2n;
const withdrawHash = await client.writeContract({ address: vault, functionName: "withdraw", args: [withdrawalAmount], value: 0n });
await finalized(withdrawHash);
const afterWithdraw = await readStatus();
const finalCredit = await readCredit();
if (finalCredit !== beforeCredit + amount - withdrawalAmount) throw new Error("withdraw credit mismatch");
if (BigInt(afterWithdraw.total_credits) !== BigInt(before.total_credits) + amount - withdrawalAmount) throw new Error("withdraw total mismatch");

console.log(JSON.stringify({ account: account.address, depositHash, withdrawHash, beforeCredit: String(beforeCredit), depositedCredit: String(depositedCredit), finalCredit: String(finalCredit), finalTotal: afterWithdraw.total_credits }));
