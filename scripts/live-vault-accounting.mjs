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
const amount = 15_000_000_000_000_000n;
const withdrawalAmount = 5_000_000_000_000_000n;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const readStatus = async () => JSON.parse(await client.readContract({ address: vault, functionName: "get_status_json", args: [] }));
const readCredit = async () => BigInt(await client.readContract({ address: vault, functionName: "get_credit", args: [account.address] }));
const readBalance = async () => BigInt(await client.getBalance({ address: account.address }));

const finalized = async (hash) => {
  const receipt = await client.waitForTransactionReceipt({ hash, status: "FINALIZED", retries: 120, interval: 5000 });
  const statusName = String(receipt.statusName ?? receipt.status_name ?? "").toUpperCase();
  const result = String(receipt.txExecutionResultName ?? receipt.tx_execution_result_name ?? receipt.resultName ?? receipt.result_name ?? "").toUpperCase();
  if (statusName !== "FINALIZED" || ["MAJORITY_DISAGREE", "CANCELED", "ERROR", "FAILED"].includes(result)) {
    throw new Error(`transaction did not finalize successfully: ${hash} (${result || "unknown"})`);
  }
  return receipt;
};

const payoutFinalized = async (hash, expectedParent, expectedAmount) => {
  const receipt = await client.waitForTransactionReceipt({ hash, status: "FINALIZED", retries: 120, interval: 5000, fullTransaction: true });
  const statusName = String(receipt.statusName ?? receipt.status_name ?? "").toUpperCase();
  const valueCredited = receipt.value_credited === true || receipt.valueCredited === true;
  const recipient = String(receipt.recipient ?? receipt.to_address ?? "").toLowerCase();
  const triggeredBy = String(receipt.triggered_by ?? receipt.triggeredBy ?? "").toLowerCase();
  if (statusName !== "FINALIZED" || !valueCredited) throw new Error(`payout child was not finalized and credited: ${hash}`);
  if (recipient !== account.address.toLowerCase()) throw new Error(`payout recipient mismatch: ${hash}`);
  if (BigInt(String(receipt.value ?? 0)) !== expectedAmount) throw new Error(`payout value mismatch: ${hash}`);
  if (triggeredBy !== expectedParent.toLowerCase()) throw new Error(`payout parent mismatch: ${hash}`);
  return receipt;
};

const waitForPayoutChildren = async (parentHash, expectedAmount) => {
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
      await payoutFinalized(child, parentHash, expectedAmount);
      matches.push(child);
    } catch {
      // Ignore unrelated children; exactly one credited payout is required below.
    }
  }
  if (matches.length !== 1) throw new Error(`expected one successful payout child, found ${matches.length}`);
  return matches;
};

const observedBefore = await readStatus();
const observedCredit = await readCredit();
const observedBalance = await readBalance();
const resumedDepositHash = process.env.EXIGENT_LIVE_RESUME_DEPOSIT_HASH || "";
const resumedDeposit = Boolean(resumedDepositHash);
const before = resumedDeposit
  ? { ...observedBefore, total_credits: String(BigInt(observedBefore.total_credits) - amount) }
  : observedBefore;
const beforeCredit = resumedDeposit ? observedCredit - amount : observedCredit;
const beforeBalance = observedBalance;
if (before.withdrawals_paused || before.deposits_paused) {
  throw new Error(`vault must be open for accounting coverage: withdrawals_paused=${before.withdrawals_paused}, deposits_paused=${before.deposits_paused}`);
}

const depositHash = resumedDepositHash || await client.writeContract({ address: vault, functionName: "deposit", args: [], value: amount });
await finalized(depositHash);
const afterDeposit = await readStatus();
const depositedCredit = await readCredit();
const afterDepositBalance = await readBalance();
if (depositedCredit !== beforeCredit + amount) throw new Error("deposit credit mismatch");
if (BigInt(afterDeposit.total_credits) !== BigInt(before.total_credits) + amount) throw new Error("deposit total mismatch");
if (!resumedDeposit && afterDepositBalance >= beforeBalance) throw new Error("recipient balance did not reflect the payable deposit cost");

const executeAndAcknowledge = async (label) => {
  const beforeWithdrawalBalance = await readBalance();
  const parentHash = await client.writeContract({ address: vault, functionName: "withdraw", args: [withdrawalAmount], value: 0n });
  await finalized(parentHash);
  const payoutChildren = await waitForPayoutChildren(parentHash, withdrawalAmount);
  const payoutChild = await client.getTransaction({ hash: payoutChildren[payoutChildren.length - 1] });
  if (BigInt(String(payoutChild.value ?? 0)) !== withdrawalAmount) {
    throw new Error(`${label} payout child value mismatch: expected ${withdrawalAmount}, got ${String(payoutChild.value ?? 0)}`);
  }
  const afterPayoutBalance = await readBalance();
  const payoutBalanceDelta = afterPayoutBalance - beforeWithdrawalBalance;
  if (payoutBalanceDelta <= 0n || payoutBalanceDelta > withdrawalAmount) {
    throw new Error(`${label} recipient balance did not show the payout: delta=${payoutBalanceDelta}`);
  }

  const withdrawalId = String(await client.readContract({ address: vault, functionName: "get_active_withdrawal_key", args: [account.address] }));
  if (!withdrawalId) throw new Error(`${label} withdrawal did not expose an active record`);
  const dispatchedRecord = JSON.parse(await client.readContract({ address: vault, functionName: "get_withdrawal_json", args: [withdrawalId] }));
  if (dispatchedRecord.status !== "DISPATCHED") throw new Error(`${label} unexpected withdrawal status: ${dispatchedRecord.status}`);

  const acknowledgeHash = await client.writeContract({ address: vault, functionName: "settle_withdrawal", args: [withdrawalId], value: 0n });
  await finalized(acknowledgeHash);
  const acknowledgedRecord = JSON.parse(await client.readContract({ address: vault, functionName: "get_withdrawal_json", args: [withdrawalId] }));
  const activeAfterAcknowledgement = String(await client.readContract({ address: vault, functionName: "get_active_withdrawal_key", args: [account.address] }));
  if (acknowledgedRecord.status !== "ACKNOWLEDGED") throw new Error(`${label} withdrawal was not acknowledged: ${acknowledgedRecord.status}`);
  if (activeAfterAcknowledgement) throw new Error(`${label} acknowledgement did not release the holder lock`);
  const closeHash = await client.writeContract({ address: vault, functionName: "close_successful_withdrawal", args: [withdrawalId], value: 0n });
  await finalized(closeHash);
  const finalRecord = JSON.parse(await client.readContract({ address: vault, functionName: "get_withdrawal_json", args: [withdrawalId] }));
  if (finalRecord.status !== "SUCCESS_CLOSED") throw new Error(`${label} withdrawal was not success-closed: ${finalRecord.status}`);
  return { parentHash, payoutChildren, acknowledgeHash, closeHash, withdrawalId, finalRecord, beforeWithdrawalBalance, afterPayoutBalance, payoutBalanceDelta };
};

const first = await executeAndAcknowledge("first");
const second = await executeAndAcknowledge("second");
if (first.withdrawalId === second.withdrawalId) throw new Error("same-holder withdrawals reused the same record id");

const finalStatus = await readStatus();
const finalCredit = await readCredit();
const recoveryIds = await client.readContract({ address: vault, functionName: "get_recovery_withdrawal_keys", args: [account.address] });
const expectedFinalCredit = beforeCredit + amount - withdrawalAmount - withdrawalAmount;
const expectedFinalTotal = BigInt(before.total_credits) + amount - withdrawalAmount - withdrawalAmount;
if (finalCredit !== expectedFinalCredit) throw new Error("final credit mismatch after two acknowledged withdrawals");
if (BigInt(finalStatus.total_credits) !== expectedFinalTotal) throw new Error("final total mismatch after two acknowledged withdrawals");
if (recoveryIds.includes(first.withdrawalId) || recoveryIds.includes(second.withdrawalId)) {
  throw new Error("success-closed withdrawals retained stale recovery candidates");
}

console.log(JSON.stringify({
  account: account.address,
  depositHash,
  firstWithdrawal: {
    parentHash: first.parentHash,
    payoutChildren: first.payoutChildren,
    acknowledgeHash: first.acknowledgeHash,
    closeHash: first.closeHash,
    withdrawalId: first.withdrawalId,
    status: first.finalRecord.status,
    beforeBalance: String(first.beforeWithdrawalBalance),
    afterPayoutBalance: String(first.afterPayoutBalance),
    payoutBalanceDelta: String(first.payoutBalanceDelta),
  },
  secondWithdrawal: {
    parentHash: second.parentHash,
    payoutChildren: second.payoutChildren,
    acknowledgeHash: second.acknowledgeHash,
    closeHash: second.closeHash,
    withdrawalId: second.withdrawalId,
    status: second.finalRecord.status,
    beforeBalance: String(second.beforeWithdrawalBalance),
    afterPayoutBalance: String(second.afterPayoutBalance),
    payoutBalanceDelta: String(second.payoutBalanceDelta),
  },
  recoveryIds,
  depositAmount: String(amount),
  withdrawalAmount: String(withdrawalAmount),
  beforeCredit: String(beforeCredit),
  depositedCredit: String(depositedCredit),
  finalCredit: String(finalCredit),
  beforeBalance: String(beforeBalance),
  firstPayoutBalanceDelta: String(first.payoutBalanceDelta),
  secondPayoutBalanceDelta: String(second.payoutBalanceDelta),
  beforeTotal: String(before.total_credits),
  finalTotal: String(finalStatus.total_credits),
}));
