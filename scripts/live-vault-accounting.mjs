import { readFileSync } from "node:fs";
import { createAccount, createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const key = process.env.EXIGENT_LIVE_PRIVATE_KEY;
if (!key) throw new Error("EXIGENT_LIVE_PRIVATE_KEY is required for live payable accounting coverage");

const manifest = JSON.parse(readFileSync(new URL("../deployment-manifest.public.json", import.meta.url), "utf8"));
if (Number(manifest.chainId) !== 61999) throw new Error("refusing a non-Studionet manifest");

const account = createAccount(key);
const client = createClient({ chain: studionet, endpoint: "https://studio.genlayer.com/api", account });
const vault = manifest.contracts.protectedVault;
const amount = 10_000_000_000_000_000n;
const withdrawalAmount = amount / 2n;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const readStatus = async () => JSON.parse(await client.readContract({ address: vault, functionName: "get_status_json", args: [] }));
const readCredit = async () => BigInt(await client.readContract({ address: vault, functionName: "get_credit", args: [account.address] }));
const readBalance = async () => BigInt(await client.getBalance({ address: account.address }));

const finalized = async (hash) => {
  const receipt = await client.waitForTransactionReceipt({ hash, status: "FINALIZED", retries: 120, interval: 5000 });
  const result = String(receipt.txExecutionResultName ?? "");
  if (result !== "FINISHED_WITH_RETURN") throw new Error(`transaction did not finalize successfully: ${hash} (${result || "unknown"})`);
  return receipt;
};

const payoutFinalized = async (hash, expectedParent) => {
  const receipt = await client.waitForTransactionReceipt({ hash, status: "FINALIZED", retries: 120, interval: 5000, fullTransaction: true });
  const statusName = String(receipt.statusName ?? receipt.status_name ?? "").toUpperCase();
  const valueCredited = receipt.value_credited === true || receipt.valueCredited === true;
  const recipient = String(receipt.recipient ?? receipt.to_address ?? "").toLowerCase();
  const triggeredBy = String(receipt.triggered_by ?? receipt.triggeredBy ?? "").toLowerCase();
  if (statusName !== "FINALIZED" || !valueCredited) throw new Error(`payout child was not finalized and credited: ${hash}`);
  if (recipient !== account.address.toLowerCase()) throw new Error(`payout recipient mismatch: ${hash}`);
  if (BigInt(String(receipt.value ?? 0)) !== withdrawalAmount) throw new Error(`payout value mismatch: ${hash}`);
  if (triggeredBy !== expectedParent.toLowerCase()) throw new Error(`payout parent mismatch: ${hash}`);
  return receipt;
};

const waitForPayoutChildren = async (parentHash) => {
  let children = [];
  for (let attempt = 0; attempt < 60; attempt += 1) {
    children = await client.getTriggeredTransactionIds({ hash: parentHash });
    if (children.length) break;
    await sleep(2000);
  }
  if (!children.length) throw new Error(`withdrawal payout child was not discovered for ${parentHash}`);
  const matches = [];
  for (const child of children) {
    try {
      await payoutFinalized(child, parentHash);
      matches.push(child);
    } catch {
      // Ignore unrelated children; exactly one credited payout is required below.
    }
  }
  if (matches.length !== 1) throw new Error(`expected one successful payout child, found ${matches.length}`);
  return matches;
};

const before = await readStatus();
const beforeCredit = await readCredit();
const beforeBalance = await readBalance();
if (before.withdrawals_paused || before.deposits_paused) {
  throw new Error(`vault must be open for accounting coverage: withdrawals_paused=${before.withdrawals_paused}, deposits_paused=${before.deposits_paused}`);
}

const depositHash = await client.writeContract({ address: vault, functionName: "deposit", args: [], value: amount });
await finalized(depositHash);
const afterDeposit = await readStatus();
const depositedCredit = await readCredit();
const afterDepositBalance = await readBalance();
if (depositedCredit !== beforeCredit + amount) throw new Error("deposit credit mismatch");
if (BigInt(afterDeposit.total_credits) !== BigInt(before.total_credits) + amount) throw new Error("deposit total mismatch");
if (afterDepositBalance >= beforeBalance) throw new Error("recipient balance did not reflect the payable deposit cost");

const beforeWithdrawalBalance = afterDepositBalance;
const withdrawHash = await client.writeContract({ address: vault, functionName: "withdraw", args: [withdrawalAmount], value: 0n });
await finalized(withdrawHash);
const payoutChildren = await waitForPayoutChildren(withdrawHash);
const payoutChild = await client.getTransaction({ hash: payoutChildren[payoutChildren.length - 1] });
if (BigInt(String(payoutChild.value ?? 0)) !== withdrawalAmount) {
  throw new Error(`payout child value mismatch: expected ${withdrawalAmount}, got ${String(payoutChild.value ?? 0)}`);
}
const afterPayoutBalance = await readBalance();
const payoutBalanceDelta = afterPayoutBalance - beforeWithdrawalBalance;
if (payoutBalanceDelta <= 0n || payoutBalanceDelta > withdrawalAmount) {
  throw new Error(`recipient balance did not show the settled payout: delta=${payoutBalanceDelta}`);
}

const afterDispatch = await readStatus();
const withdrawalId = String(afterDispatch.active_withdrawal_key || "");
if (!withdrawalId) throw new Error("withdrawal did not expose an active settlement record");
const dispatchedRecord = JSON.parse(await client.readContract({ address: vault, functionName: "get_withdrawal_json", args: [withdrawalId] }));
if (dispatchedRecord.status !== "DISPATCHED") throw new Error(`unexpected withdrawal status: ${dispatchedRecord.status}`);

const settleHash = await client.writeContract({ address: vault, functionName: "settle_withdrawal", args: [withdrawalId], value: 0n });
await finalized(settleHash);
const finalStatus = await readStatus();
const finalRecord = JSON.parse(await client.readContract({ address: vault, functionName: "get_withdrawal_json", args: [withdrawalId] }));
const finalCredit = await readCredit();
if (finalRecord.status !== "SETTLED") throw new Error(`withdrawal was not settled: ${finalRecord.status}`);
if (finalStatus.active_withdrawal_key) throw new Error("settled withdrawal remained active");
if (finalCredit !== beforeCredit + amount - withdrawalAmount) throw new Error("final credit mismatch after settlement");
if (BigInt(finalStatus.total_credits) !== BigInt(before.total_credits) + amount - withdrawalAmount) throw new Error("final total mismatch after settlement");

console.log(JSON.stringify({
  account: account.address,
  depositHash,
  withdrawHash,
  payoutChildren,
  settleHash,
  withdrawalId,
  depositAmount: String(amount),
  withdrawalAmount: String(withdrawalAmount),
  beforeCredit: String(beforeCredit),
  depositedCredit: String(depositedCredit),
  finalCredit: String(finalCredit),
  beforeBalance: String(beforeBalance),
  beforeWithdrawalBalance: String(beforeWithdrawalBalance),
  afterPayoutBalance: String(afterPayoutBalance),
  payoutBalanceDelta: String(payoutBalanceDelta),
  beforeTotal: String(before.total_credits),
  finalTotal: String(finalStatus.total_credits),
}));
