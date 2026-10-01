"use client";

import Link from "next/link";
import { useState } from "react";
import AppShell from "@/components/AppShell";
import { useWallet } from "@/components/WalletProvider";
import PageIntro from "@/components/PageIntro";
import Panel from "@/components/Panel";
import TxNotice from "@/components/TxNotice";
import { isConfigured } from "@/lib/config";
import { openIncident } from "@/lib/contracts";
import { waitForFinalization } from "@/lib/genlayer";

export default function NewIncidentPage(){
  const { address: account } = useWallet();const[tx,setTx]=useState("");const[error,setError]=useState("");const[busy,setBusy]=useState(false);const[phase,setPhase]=useState("");const[finalized,setFinalized]=useState(false);
  const [form,setForm]=useState({incidentKey:`INC-${Date.now().toString(36).toUpperCase()}`,charterKey:"CHARTER-2026-01",action:"PAUSE_PROTECTED_ACTION",duration:"60",reason:"A credible security incident has been reported against a critical dependency used by the protected action target. The requested pause is intended only to stop that exact protected action while the approved evidence is independently checked.",urls:"https://raw.githubusercontent.com/OWNER/REPO/main/demo/evidence/active_incident_primary.md\nhttps://raw.githubusercontent.com/OWNER/REPO/main/demo/evidence/active_incident_secondary.md"});
  const set=(k:string,v:string)=>setForm(f=>({...f,[k]:v}));
  async function submit(e:React.FormEvent){e.preventDefault();setError("");setTx("");setPhase("");setFinalized(false);if(!account)return setError("Connect the charter owner wallet first.");if(!isConfigured)return setError("Deploy and configure EXIGENT first.");const urls=form.urls.split(/\n+/).map(x=>x.trim()).filter(Boolean);if(urls.some(x=>x.includes("OWNER/REPO")))return setError("Replace OWNER/REPO with the public repository path (or use other charter-approved evidence URLs) before submitting.");setBusy(true);try{setPhase("Estimating fees and freezing incident");const h=await openIncident(account,[form.incidentKey,form.charterKey,form.action,Number(form.duration),form.reason,JSON.stringify(urls)]);setTx(h);setPhase("Waiting for incident FINALIZED");await waitForFinalization(h);setFinalized(true);setPhase("Incident finalized and ready for assessment")}catch(e){setError(e instanceof Error?e.message:String(e));setPhase("")}finally{setBusy(false)}}
  return <AppShell><PageIntro eyebrow="Freeze the request" title="Open Incident" copy="The requester cannot ask for arbitrary emergency power. The active charter supplies the protected target, approved actions, evidence hosts and maximum duration; this transaction freezes only a request that already fits those hard limits." />
    <form onSubmit={submit} className="stack">
      <Panel eyebrow="Incident identity" title="Authority request"><div className="panel-body grid-2"><div className="field"><label>Incident key</label><input value={form.incidentKey} onChange={e=>set("incidentKey",e.target.value)}/></div><div className="field"><label>Active charter key</label><input value={form.charterKey} onChange={e=>set("charterKey",e.target.value)}/></div><div className="field"><label>Action class</label><select value={form.action} onChange={e=>set("action",e.target.value)}><option>PAUSE_PROTECTED_ACTION</option></select></div><div className="field"><label>Duration (minutes)</label><input type="number" min="1" max="1440" value={form.duration} onChange={e=>set("duration",e.target.value)}/></div></div></Panel>
      <Panel eyebrow="Claim" title="Why emergency authority is being requested"><div className="panel-body"><div className="field"><label>Operator reason</label><textarea value={form.reason} onChange={e=>set("reason",e.target.value)}/><span className="help">This claim is context only. The contract prompt explicitly instructs validators not to treat the operator&apos;s assertion as evidence.</span></div></div></Panel>
      <Panel eyebrow="Frozen source set" title="Approved evidence URLs"><div className="panel-body"><div className="field"><label>One HTTPS URL per line</label><textarea value={form.urls} onChange={e=>set("urls",e.target.value)}/><span className="help">The included OWNER/REPO values are handoff placeholders for the reproducible demo evidence files. Replace them after the repository is public, or use independent charter-approved public sources.</span></div></div></Panel>
      {!isConfigured&&<div className="notice">No contract address is bundled, so the form will not pretend to submit. Deployment configuration is required.</div>}{phase&&<div className={finalized?"notice good":"notice"}>{phase}</div>}{error&&<div className="notice bad">{error}</div>}{tx&&<TxNotice hash={tx} label="Incident freeze submitted"/>}{finalized&&<Link className="data-card" href={`/incident/${encodeURIComponent(form.incidentKey)}`}><div><strong>Open finalized incident</strong><small>{form.incidentKey}</small></div><span>→</span></Link>}<div className="form-actions"><button className="btn" disabled={busy}>{busy?phase||"Working…":"Freeze incident"}</button></div>
    </form>
  </AppShell>
}
