"use client";

import Link from "next/link";
import { useState } from "react";
import AppShell from "@/components/AppShell";
import { useWallet } from "@/components/WalletProvider";
import PageIntro from "@/components/PageIntro";
import Panel from "@/components/Panel";
import TxNotice from "@/components/TxNotice";
import { ADDRESSES, isConfigured } from "@/lib/config";
import { publishCharter } from "@/lib/contracts";
import { waitForFinalization } from "@/lib/genlayer";

const defaultTrigger = "Emergency authority is triggered only when credible, current public evidence establishes an active exploit, a critical dependency compromise, or a material loss of the vault's asset-safety assumptions. Rumour, operator assertion, routine maintenance, market volatility, or reputational concern alone do not qualify.";
const defaultEvidence = "Use approved primary incident notices, security advisories, dependency status pages, or directly relevant public technical evidence. Prefer multiple independent sources when available. Treat unavailable, stale, circular, anonymous, or materially contradictory evidence as insufficient or conflicting rather than assuming an emergency.";

export default function NewCharterPage() {
  const { address: account } = useWallet();
  const [tx, setTx] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const [phase, setPhase] = useState(""); const [finalized, setFinalized] = useState(false);
  const [form, setForm] = useState({
    charterKey: `CHARTER-${new Date().getUTCFullYear()}-01`, protocolKey: "EXIGENT-DEMO", protocolName: "EXIGENT Protected Vault",
    target: ADDRESSES.protectedVault, trigger: defaultTrigger, evidence: defaultEvidence,
    hosts: "raw.githubusercontent.com,github.com", actions: "PAUSE_PROTECTED_ACTION",
    maxPause: "90", ttl: "30", delay: "1"
  });
  const set = (k:string,v:string) => setForm((f)=>({...f,[k]:v}));

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setTx(""); setPhase(""); setFinalized(false);
    if (!account) return setError("Connect the injected wallet first.");
    if (!isConfigured) return setError("Deploy contracts and configure .env.local before publishing.");
    setBusy(true);
    try {
      setPhase("Estimating fees and submitting");
      const hash = await publishCharter(account,[form.charterKey,form.protocolKey,form.protocolName,form.target,form.trigger,form.evidence,form.hosts,form.actions,Number(form.maxPause),Number(form.ttl),Number(form.delay)]);
      setTx(hash); setPhase("Waiting for FINALIZED");
      await waitForFinalization(hash);
      setFinalized(true); setPhase("Charter finalized");
    } catch(e){setError(e instanceof Error?e.message:String(e)); setPhase("");} finally{setBusy(false)}
  }

  return <AppShell>
    <PageIntro eyebrow="Pre-commit authority" title="Publish Charter" copy="Freeze the emergency trigger before a crisis exists. The target, source hosts, semantic policy and hard execution limits become immutable under this charter key." />
    <form onSubmit={submit} className="stack">
      <Panel eyebrow="Identity" title="Protocol and target"><div className="panel-body grid-2">
        <div className="field"><label>Charter key</label><input value={form.charterKey} onChange={e=>set("charterKey",e.target.value)}/><span className="help">Immutable key. A policy change should publish a new version.</span></div>
        <div className="field"><label>Protocol key</label><input value={form.protocolKey} onChange={e=>set("protocolKey",e.target.value)}/><span className="help">The first publisher becomes the protocol owner for this key. Later versions must come from the same wallet.</span></div>
        <div className="field"><label>Protocol name</label><input value={form.protocolName} onChange={e=>set("protocolName",e.target.value)}/></div>
        <div className="field"><label>Protected target</label><input value={form.target} onChange={e=>set("target",e.target.value)} placeholder="0x…"/><span className="help">The capability can never be redirected to another target.</span></div>
      </div></Panel>
      <Panel eyebrow="Semantic boundary" title="When emergency power exists"><div className="panel-body stack">
        <div className="field"><label>Trigger policy</label><textarea value={form.trigger} onChange={e=>set("trigger",e.target.value)}/></div>
        <div className="field"><label>Evidence policy</label><textarea value={form.evidence} onChange={e=>set("evidence",e.target.value)}/></div>
        <div className="field"><label>Approved evidence hosts</label><input value={form.hosts} onChange={e=>set("hosts",e.target.value)}/><span className="help">Comma separated hostnames. Incident URLs outside these hosts are rejected before consensus.</span></div>
      </div></Panel>
      <Panel eyebrow="Deterministic envelope" title="What emergency power can never exceed"><div className="panel-body grid-2">
        <div className="field"><label>Allowed actions</label><input value={form.actions} onChange={e=>set("actions",e.target.value)}/></div>
        <div className="field"><label>Maximum pause (minutes)</label><input type="number" min="5" max="1440" value={form.maxPause} onChange={e=>set("maxPause",e.target.value)}/></div>
        <div className="field"><label>Capability TTL (minutes)</label><input type="number" min="5" max="120" value={form.ttl} onChange={e=>set("ttl",e.target.value)}/></div>
        <div className="field"><label>Activation delay (minutes)</label><input type="number" min="1" max="10080" value={form.delay} onChange={e=>set("delay",e.target.value)}/><span className="help">Demo default is 1 minute. Use a materially longer delay for production governance.</span></div>
      </div></Panel>
      {!isConfigured && <div className="notice">The form is wired to <code>CharterRegistry.publish_charter</code>, but no address is bundled. This prevents a fake or simulated submission path.</div>}
      {phase && <div className={finalized?"notice good":"notice"}>{phase}</div>}
      {error && <div className="notice bad">{error}</div>}{tx && <TxNotice hash={tx} label="Charter publish submitted"/>}
      {finalized && <Link className="data-card" href={`/charter/${encodeURIComponent(form.charterKey)}`}><div><strong>Open finalized charter</strong><small>{form.charterKey}</small></div><span>→</span></Link>}
      <div className="form-actions"><button className="btn" disabled={busy}>{busy?phase||"Working…":"Freeze charter on 61999"}</button></div>
    </form>
  </AppShell>;
}
