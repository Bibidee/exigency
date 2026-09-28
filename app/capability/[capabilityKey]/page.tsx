"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import PageIntro from "@/components/PageIntro";
import Panel from "@/components/Panel";
import StatusPill from "@/components/StatusPill";
import TxNotice from "@/components/TxNotice";
import WalletButton from "@/components/WalletButton";
import { executeCapability, getCapability, type CapabilityRecord } from "@/lib/contracts";
import { waitForFinalization } from "@/lib/genlayer";

function fmt(ts:number){return ts?new Date(ts*1000).toLocaleString():"—"}

export default function CapabilityDetail(){
  const params=useParams<{capabilityKey:string}>();const key=decodeURIComponent(params.capabilityKey);
  const[cap,setCap]=useState<CapabilityRecord|null>(null);const[account,setAccount]=useState<`0x${string}`|"">("");const[error,setError]=useState("");const[tx,setTx]=useState("");const[busy,setBusy]=useState(false);const[phase,setPhase]=useState("");
  async function load(){try{setCap(await getCapability(key))}catch(e){setError(e instanceof Error?e.message:String(e))}}
  useEffect(()=>{load()},[key]);
  async function execute(){if(!account)return setError("Connect the capability holder wallet first.");if(!cap)return;setBusy(true);setError("");setPhase("Submitting capability execution");try{const h=await executeCapability(account,cap);setTx(h);setPhase("Waiting for gate transaction to FINALIZE");await waitForFinalization(h);setPhase("Gate finalized. Protected-vault child action has been emitted on finality.");await load()}catch(e){setError(e instanceof Error?e.message:String(e));setPhase("")}finally{setBusy(false)}}
  const expired=cap?Date.now()/1000>cap.expires_at:false;
  return <AppShell><PageIntro eyebrow="Execution authority" title={key} copy="This is not a recommendation or badge. It is a single-use capability issued only by the bound ExigencyEngine after the parent assessment reaches finality." action={<WalletButton onConnected={setAccount}/>}/>
    {error&&<div className="notice bad">{error}</div>}
    {!cap?<Panel><div className="empty">Capability not found yet. If its parent just finalized, the issuance child transaction may still be settling.</div></Panel>:<div className="stack">
      <div className="grid-3"><div className="stat"><small>State</small><strong><StatusPill value={cap.consumed?"CONSUMED":expired?"EXPIRED":"ISSUED"}/></strong></div><div className="stat"><small>Action</small><strong style={{fontSize:15}}>{cap.action_class.replaceAll("_"," ")}</strong></div><div className="stat"><small>Duration</small><strong>{cap.duration_minutes}m</strong></div></div>
      <Panel eyebrow="Bound authority" title="Capability envelope"><div className="panel-body"><dl className="keyvals"><div className="keyval"><dt>Incident</dt><dd>{cap.incident_key}</dd></div><div className="keyval"><dt>Holder</dt><dd className="digest">{cap.holder}</dd></div><div className="keyval"><dt>Target</dt><dd className="digest">{cap.target}</dd></div><div className="keyval"><dt>Issued</dt><dd>{fmt(cap.issued_at)}</dd></div><div className="keyval"><dt>Expires</dt><dd>{fmt(cap.expires_at)}</dd></div><div className="keyval"><dt>Action digest</dt><dd className="digest">{cap.action_digest}</dd></div><div className="keyval"><dt>Charter digest</dt><dd className="digest">{cap.charter_digest}</dd></div><div className="keyval"><dt>Assessment digest</dt><dd className="digest">{cap.assessment_digest}</dd></div></dl></div></Panel>
      <Panel eyebrow="Finality-gated execution" title="Consume capability" className="danger-zone"><div className="panel-body stack"><div className="notice">Execution recomputes the action digest from the stored incident, charter digest, target, action class and duration. Changing any execution parameter fails. The capability is marked consumed before CapabilityGate emits the protected-vault child message <code>on=&quot;finalized&quot;</code>.</div>{phase&&<div className="notice good">{phase}</div>}{tx&&<TxNotice hash={tx} label="Capability execution submitted"/>}<div className="form-actions"><button className="btn-danger" onClick={execute} disabled={busy||cap.consumed||expired}>{cap.consumed?"Capability already consumed":expired?"Capability expired":busy?"Executing…":"Execute exact emergency action"}</button></div></div></Panel>
    </div>}
  </AppShell>
}
