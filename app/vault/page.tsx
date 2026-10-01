"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { useWallet } from "@/components/WalletProvider";
import PageIntro from "@/components/PageIntro";
import Panel from "@/components/Panel";
import StatusPill from "@/components/StatusPill";
import TxNotice from "@/components/TxNotice";
import { executeProtectedAction, getVaultStatus } from "@/lib/contracts";
import { waitForFinalization } from "@/lib/genlayer";

function fmt(ts: number) {
  return ts ? new Date(ts * 1000).toLocaleString() : "—";
}

export default function VaultPage() {
  const { address: account } = useWallet();
  const [status, setStatus] = useState<Record<string, unknown> | null>(null);
  const [statusState, setStatusState] = useState<"LOADING" | "READY" | "UNKNOWN">("LOADING");
  const [error, setError] = useState("");
  const [tx, setTx] = useState("");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState("");

  const load = useCallback(async () => {
    setStatusState("LOADING");
    try {
      const next = await getVaultStatus();
      setStatus(next);
      setError("");
      setStatusState("READY");
    } catch (cause) {
      setStatus(null);
      setStatusState("UNKNOWN");
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function runProtectedAction() {
    if (!account) {
      setError("Connect a wallet first.");
      return;
    }
    setBusy(true);
    setError("");
    setTx("");
    setPhase("Submitting protected action");
    try {
      const actionKey = `ACTION-${Date.now().toString(36).toUpperCase()}`;
      const hash = await executeProtectedAction(account, actionKey);
      setTx(hash);
      setPhase("Waiting for FINALIZED and successful execution");
      await waitForFinalization(hash);
      await load();
      setPhase("Protected action finalized and state refreshed");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setPhase("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  const known = statusState === "READY" && status !== null;
  const paused = known ? Boolean(status?.protected_action_paused) : null;

  return (
    <AppShell>
      <PageIntro eyebrow="Consequential target" title="Protected Action" copy="This target deliberately holds no user GEN. It records a real on-chain operation while open and rejects that operation during a finalized EXIGENT pause, so no external payout or unsupported refund callback is required." />
      {error && <div className="notice bad">{error} <button className="btn-secondary" style={{ marginTop: 10 }} onClick={() => void load()}>Retry reads</button></div>}
      <div className="grid-3">
        <div className="stat"><small>Protected action</small><strong><StatusPill value={!known ? "UNKNOWN / READ FAILED" : paused ? "PAUSED" : "OPEN"} /></strong></div>
        <div className="stat"><small>Executed operations</small><strong>{known ? String(status?.protected_action_count || "0") : "—"}</strong></div>
        <div className="stat"><small>Value custody</small><strong>NONE</strong></div>
      </div>
      <div className="grid-2" style={{ marginTop: 14 }}>
        <Panel eyebrow="Normal user path" title="Execute protected action">
          <div className="panel-body stack">
            <div className="notice">Each click creates a unique, direct-EOA-authorized on-chain operation. It changes authoritative target state but transfers no GEN and cannot strand user credit.</div>
            <button className="btn" onClick={() => void runProtectedAction()} disabled={busy || !known || !account || paused === true}>Execute protected action</button>
          </div>
        </Panel>
        <Panel eyebrow="Emergency consequence" title="Pause behavior">
          <div className="panel-body stack">
            <div className="notice">A finalized capability pauses the protected action itself. There is no administrator bypass, refund path, withdrawal receipt, or browser-only authority state.</div>
            <div className="keyval"><dt>Paused until</dt><dd>{known ? fmt(Number(status?.protected_action_paused_until || 0)) : "—"}</dd></div>
          </div>
        </Panel>
      </div>
      {phase && <div className="notice good" style={{ marginTop: 14 }}>{phase}</div>}
      {tx && <div style={{ marginTop: 14 }}><TxNotice hash={tx} /></div>}
      <Panel eyebrow="Current protected state" title="Protected target authority surface">
        <div className="panel-body"><dl className="keyvals">
          <div className="keyval"><dt>Gate</dt><dd className="digest">{known ? String(status?.gate_address || "Not configured") : "UNKNOWN / READ FAILED"}</dd></div>
          <div className="keyval"><dt>Protected action count</dt><dd className="mono">{known ? String(status?.protected_action_count || "0") : "—"}</dd></div>
          <div className="keyval"><dt>Last emergency</dt><dd className="digest">{known && status?.last_emergency_json ? "Recorded" : "None"}</dd></div>
        </dl></div>
      </Panel>
    </AppShell>
  );
}
