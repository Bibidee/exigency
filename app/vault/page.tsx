"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { useWallet } from "@/components/WalletProvider";
import PageIntro from "@/components/PageIntro";
import Panel from "@/components/Panel";
import StatusPill from "@/components/StatusPill";
import TxNotice from "@/components/TxNotice";
import {
  depositToVault,
  getVaultCredit,
  getVaultStatus,
  getActiveWithdrawalKey,
  getWithdrawal,
  listHolderWithdrawalKeys,
  closeSuccessfulWithdrawal,
  retryWithdrawal,
  settleWithdrawal,
  withdrawFromVault,
  type WithdrawalRecord,
} from "@/lib/contracts";
import { waitForFinalization, waitForTriggeredValueTransfer } from "@/lib/genlayer";
import { formatGenAmount, parseGenAmount } from "@/lib/amount";

const WITHDRAWAL_PARENT_KEY = "exigent.withdrawal.parent";
const WITHDRAWAL_ID_KEY = "exigent.withdrawal.id";
const WITHDRAWAL_CHILD_KEY = "exigent.withdrawal.child";

function fmt(ts: number) {
  return ts ? new Date(ts * 1000).toLocaleString() : "—";
}

function clearWithdrawalProof() {
  window.sessionStorage.removeItem(WITHDRAWAL_PARENT_KEY);
  window.sessionStorage.removeItem(WITHDRAWAL_ID_KEY);
  window.sessionStorage.removeItem(WITHDRAWAL_CHILD_KEY);
}

function saveWithdrawalProof(withdrawalId: string, parent: string, child = "") {
  window.sessionStorage.setItem(WITHDRAWAL_ID_KEY, withdrawalId);
  window.sessionStorage.setItem(WITHDRAWAL_PARENT_KEY, parent);
  if (child) window.sessionStorage.setItem(WITHDRAWAL_CHILD_KEY, child);
}

export default function VaultPage() {
  const { address: account } = useWallet();
  const [status, setStatus] = useState<Record<string, unknown> | null>(null);
  const [statusState, setStatusState] = useState<"LOADING" | "READY" | "UNKNOWN">("LOADING");
  const [credit, setCredit] = useState<bigint>(0n);
  const [amount, setAmount] = useState("0.10");
  const [error, setError] = useState("");
  const [tx, setTx] = useState("");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState("");
  const [withdrawal, setWithdrawal] = useState<WithdrawalRecord | null>(null);
  const [withdrawalChild, setWithdrawalChild] = useState("");
  const [withdrawalParent, setWithdrawalParent] = useState("");

  useEffect(() => {
    const queryParent = new URLSearchParams(window.location.search).get("withdrawalParent");
    const savedParent = window.sessionStorage.getItem(WITHDRAWAL_PARENT_KEY) || "";
    setWithdrawalParent(queryParent || savedParent);
  }, []);

  const load = useCallback(async (addr?: string) => {
    setStatusState("LOADING");
    try {
      const next = await getVaultStatus();
      const nextCredit = addr ? await getVaultCredit(addr) : 0n;
      const activeKey = addr ? await getActiveWithdrawalKey(addr) : "";
      const keys = addr ? await listHolderWithdrawalKeys(addr) : [];
      const lastKey = activeKey || keys.at(-1) || "";
      const nextWithdrawal = lastKey ? await getWithdrawal(lastKey) : null;
      const savedId = window.sessionStorage.getItem(WITHDRAWAL_ID_KEY) || "";
      const savedParent = window.sessionStorage.getItem(WITHDRAWAL_PARENT_KEY) || "";
      const savedChild = window.sessionStorage.getItem(WITHDRAWAL_CHILD_KEY) || "";
      let resolvedParent = "";
      let resolvedChild = "";

      if (nextWithdrawal?.status === "SUCCESS_CLOSED") {
        clearWithdrawalProof();
      } else if (nextWithdrawal && savedId === nextWithdrawal.withdrawal_id) {
        resolvedParent = savedParent;
        resolvedChild = savedChild;
      } else if (nextWithdrawal?.status === "DISPATCHED" && !savedId && savedParent) {
        // A parent hash created by the current active withdrawal can be
        // associated once the record is read. ACKNOWLEDGED recovery requires
        // the persisted ID as well, so an unrelated stale hash cannot close it.
        saveWithdrawalProof(nextWithdrawal.withdrawal_id, savedParent);
        resolvedParent = savedParent;
      }
      setStatus(next);
      setCredit(nextCredit);
      setWithdrawal(nextWithdrawal);
      setWithdrawalParent(resolvedParent);
      setWithdrawalChild(resolvedChild);
      setError("");
      setStatusState("READY");
      return nextWithdrawal;
    } catch (cause) {
      setStatus(null);
      setCredit(0n);
      setWithdrawal(null);
      setStatusState("UNKNOWN");
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, []);

  useEffect(() => {
    void load(account || undefined);
  }, [account, load]);

  async function provePayout(parentHash: `0x${string}`, expectedAmount: bigint, expectedRecipient: string, withdrawalId: string) {
    setPhase("Discovering the withdrawal payout child transaction");
    const child = await waitForTriggeredValueTransfer(parentHash, expectedRecipient, expectedAmount);
    saveWithdrawalProof(withdrawalId, parentHash, child);
    setWithdrawalChild(child);
    await load(account || undefined);
    setPhase("Payout child finalized successfully. Acknowledge it, then close the proven success to retire recovery metadata.");
  }

  async function proveExistingPayout() {
    if (!account || !withdrawal || !withdrawalParent || !window.sessionStorage.getItem(WITHDRAWAL_ID_KEY)) {
      setError("This acknowledged withdrawal needs its matching finalized parent hash before it can be success-closed.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await provePayout(withdrawalParent as `0x${string}`, BigInt(withdrawal.amount), withdrawal.destination, withdrawal.withdrawal_id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setPhase("Withdrawal parent is finalized, but the payout child is not yet proven.");
    } finally {
      setBusy(false);
    }
  }

  async function run(kind: "deposit" | "withdraw") {
    if (!account) {
      setError("Connect a wallet first.");
      return;
    }
    setBusy(true);
    setError("");
    setTx("");
    setWithdrawalChild("");
    setPhase(kind === "deposit" ? "Submitting deposit" : "Submitting withdrawal");
    let parentFinalized = false;
    try {
      const value = parseGenAmount(amount);
      const hash = kind === "deposit"
        ? await depositToVault(account, value)
        : await withdrawFromVault(account, value);
      setTx(hash);
      setPhase("Waiting for FINALIZED and successful execution");
      await waitForFinalization(hash);
      parentFinalized = true;
      if (kind === "withdraw") {
        const currentWithdrawal = await load(account);
        if (!currentWithdrawal || currentWithdrawal.status !== "DISPATCHED" || BigInt(currentWithdrawal.amount) !== value) {
          throw new Error("The finalized withdrawal record did not match the submitted payout amount.");
        }
        saveWithdrawalProof(currentWithdrawal.withdrawal_id, hash);
        setWithdrawalParent(hash);
        await provePayout(hash, value, account, currentWithdrawal.withdrawal_id);
      } else {
        await load(account);
        setPhase("Deposit finalized successfully and state refreshed");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      if (kind === "withdraw" && parentFinalized) {
        setPhase("Withdrawal parent finalized, but the payout child was not proven. Acknowledgement is unavailable; the record remains recoverable.");
        await load(account);
      } else {
        setPhase("");
      }
    } finally {
      setBusy(false);
    }
  }

  async function settle() {
    if (!account || !withdrawal) return setError("Connect the withdrawal holder wallet first.");
    if (withdrawal.status !== "DISPATCHED" || !withdrawalChild) return setError("The successful payout child must be proven before acknowledgement.");
    setBusy(true);
    setError("");
    setPhase("Submitting payout acknowledgement");
    try {
      const hash = await settleWithdrawal(account, withdrawal.withdrawal_id);
      setTx(hash);
      await waitForFinalization(hash);
      await load(account);
      setPhase("Payout acknowledged. Retiring the recovery candidate after the proven successful child.");
      const closeHash = await closeSuccessfulWithdrawal(account, withdrawal.withdrawal_id);
      setTx(closeHash);
      await waitForFinalization(closeHash);
      await load(account);
      clearWithdrawalProof();
      setWithdrawalParent("");
      setWithdrawalChild("");
      setPhase("Payout acknowledged and success-closed; the holder is available and recovery metadata was retired.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setPhase("");
    } finally {
      setBusy(false);
    }
  }

  async function closeSuccessful() {
    if (!account || !withdrawal) return setError("Connect the withdrawal holder wallet first.");
    if (withdrawal.status !== "ACKNOWLEDGED" || !withdrawalChild || !withdrawalParent) return setError("Prove the successful payout child before closing this acknowledgement.");
    setBusy(true);
    setError("");
    setPhase("Retiring the recovery candidate for the proven successful payout");
    try {
      const hash = await closeSuccessfulWithdrawal(account, withdrawal.withdrawal_id);
      setTx(hash);
      await waitForFinalization(hash);
      await load(account);
      clearWithdrawalProof();
      setWithdrawalParent("");
      setWithdrawalChild("");
      setPhase("Payout success-closed; the holder is available and recovery metadata was retired.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setPhase("");
    } finally {
      setBusy(false);
    }
  }

  async function retry() {
    if (!account || !withdrawal) return setError("Connect the withdrawal holder wallet first.");
    if (withdrawal.status !== "FAILED_RECOVERABLE") return setError("Only a failed recoverable payout can be retried.");
    setBusy(true);
    setError("");
    setPhase("Submitting the exact recoverable payout retry");
    try {
      const hash = await retryWithdrawal(account, withdrawal.withdrawal_id);
      setTx(hash);
      await waitForFinalization(hash);
      saveWithdrawalProof(withdrawal.withdrawal_id, hash);
      setWithdrawalParent(hash);
      await provePayout(hash, BigInt(withdrawal.amount), withdrawal.destination, withdrawal.withdrawal_id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setPhase("");
    } finally {
      setBusy(false);
    }
  }

  const known = statusState === "READY" && status !== null;
  const validAmount = (() => {
    try {
      parseGenAmount(amount);
      return true;
    } catch {
      return false;
    }
  })();
  const stateLabel = (paused: unknown) => !known ? "UNKNOWN / READ FAILED" : Boolean(paused) ? "PAUSED" : "OPEN";
  const withdrawalStatus = withdrawal?.status || "—";

  return (
    <AppShell>
      <PageIntro eyebrow="Consequential target" title="Protected Vault" copy="This demo target holds test GEN credits. There is deliberately no administrator pause button: emergency pause methods reject every caller except CapabilityGate." />
      {error && <div className="notice bad">{error} <button className="btn-secondary" style={{ marginTop: 10 }} onClick={() => load(account || undefined)}>Retry reads</button></div>}
      <div className="grid-3">
        <div className="stat"><small>Withdrawals</small><strong><StatusPill value={stateLabel(status?.withdrawals_paused)} /></strong></div>
        <div className="stat"><small>Deposits</small><strong><StatusPill value={stateLabel(status?.deposits_paused)} /></strong></div>
        <div className="stat"><small>Your credit</small><strong>{known ? formatGenAmount(credit) : "—"} GEN</strong></div>
      </div>
      <div className="grid-2" style={{ marginTop: 14 }}>
        <Panel eyebrow="Normal user path" title="Deposit test GEN">
          <div className="panel-body stack">
            <div className="field"><label>Amount in GEN</label><input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" /></div>
            <div className="notice">The payable amount and GenLayer protocol fee are estimated separately. If deposits are paused by a finalized EXIGENT capability, this write reverts.</div>
            <button className="btn" onClick={() => run("deposit")} disabled={busy || !known || !account || !validAmount}>Deposit</button>
          </div>
        </Panel>
        <Panel eyebrow="Normal user path" title="Withdraw test GEN">
          <div className="panel-body stack">
            <div className="field"><label>Amount in GEN</label><input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" /></div>
            <div className="notice">A withdrawal debits credit and emits a separate payout child. After that child is proven finalized and successful, acknowledge the payout; acknowledgement releases this holder for another withdrawal while retaining exact recovery state for an early child failure.</div>
            {withdrawal?.status === "ACKNOWLEDGED" && <div className="notice">This withdrawal is acknowledged but not success-closed. Re-prove the finalized payout and complete success closure before starting another withdrawal.</div>}
            <button className="btn-secondary" onClick={() => run("withdraw")} disabled={busy || !known || !account || !validAmount || withdrawal?.status === "ACKNOWLEDGED"}>Withdraw</button>
          </div>
        </Panel>
      </div>
      {phase && <div className="notice good" style={{ marginTop: 14 }}>{phase}</div>}
      {tx && <div style={{ marginTop: 14 }}><TxNotice hash={tx} /></div>}
      {withdrawal && (
        <Panel eyebrow="Payout state machine" title="Withdrawal acknowledgement">
          <div className="panel-body stack">
            <div className="grid-3">
              <div className="stat"><small>Status</small><strong><StatusPill value={withdrawalStatus} /></strong></div>
              <div className="stat"><small>Amount</small><strong>{formatGenAmount(BigInt(withdrawal.amount))} GEN</strong></div>
              <div className="stat"><small>Retries</small><strong>{withdrawal.retry_count}</strong></div>
            </div>
            <div className="notice">Withdrawal key: <span className="mono">{withdrawal.withdrawal_id}</span>. A proven success is closed to retire recovery metadata; an early acknowledgement remains recoverable until it is closed.</div>
            {withdrawalChild && <TxNotice hash={withdrawalChild} label="Payout child finalized" />}
            {withdrawal.status === "DISPATCHED" && !withdrawalChild && <div className="notice">Acknowledgement is disabled until the payout child transaction is discovered and proven successful.</div>}
            {withdrawal.status === "ACKNOWLEDGED" && !withdrawalChild && withdrawalParent && <div className="notice">This browser no longer has the payout child proof. Re-prove the finalized child from the stored parent transaction before closing this acknowledgement.</div>}
            {withdrawal.status === "ACKNOWLEDGED" && !withdrawalChild && !withdrawalParent && <div className="notice bad">This withdrawal is acknowledged, but its parent transaction proof was not retained. Re-provide or rediscover that public parent hash before success closure.</div>}
            <div className="form-actions">
              {withdrawal.status === "DISPATCHED" && !withdrawalChild && <button className="btn-secondary" onClick={() => void proveExistingPayout()} disabled={busy || !withdrawalParent}>Prove payout child</button>}
              {withdrawal.status === "DISPATCHED" && <button className="btn" onClick={() => void settle()} disabled={busy || !withdrawalChild}>Acknowledge and close payout</button>}
              {withdrawal.status === "ACKNOWLEDGED" && !withdrawalChild && withdrawalParent && <button className="btn-secondary" onClick={() => void proveExistingPayout()} disabled={busy}>Re-prove successful payout</button>}
              {withdrawal.status === "ACKNOWLEDGED" && <button className="btn" onClick={() => void closeSuccessful()} disabled={busy || !withdrawalChild}>Close successful payout</button>}
              {withdrawal.status === "FAILED_RECOVERABLE" && <button className="btn-secondary" onClick={retry} disabled={busy}>Retry exact payout</button>}
            </div>
          </div>
        </Panel>
      )}
      <Panel eyebrow="Current protected state" title="Vault authority surface">
        <div className="panel-body"><dl className="keyvals">
          <div className="keyval"><dt>Gate</dt><dd className="digest">{known ? String(status?.gate_address || "Not configured") : "UNKNOWN / READ FAILED"}</dd></div>
          <div className="keyval"><dt>Withdrawals paused until</dt><dd>{known ? fmt(Number(status?.withdrawals_paused_until || 0)) : "—"}</dd></div>
          <div className="keyval"><dt>Deposits paused until</dt><dd>{known ? fmt(Number(status?.deposits_paused_until || 0)) : "—"}</dd></div>
          <div className="keyval"><dt>Total credited wei</dt><dd className="mono">{known ? String(status?.total_credits || "0") : "—"}</dd></div>
        </dl></div>
      </Panel>
    </AppShell>
  );
}
