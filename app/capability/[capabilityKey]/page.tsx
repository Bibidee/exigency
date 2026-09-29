"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import { useWallet } from "@/components/WalletProvider";
import PageIntro from "@/components/PageIntro";
import Panel from "@/components/Panel";
import StatusPill from "@/components/StatusPill";
import TxNotice from "@/components/TxNotice";
import { executeCapability, getCapability, reconcileCapability, type CapabilityRecord } from "@/lib/contracts";
import { getTriggeredTransactionIds, waitForFinalization } from "@/lib/genlayer";

function fmt(ts:number){return ts?new Date(ts*1000).toLocaleString():"—"}

export default function CapabilityDetail(){
  const params=useParams<{capabilityKey:string}>();const key=decodeURIComponent(params.capabilityKey);
  const[cap,setCap]=useState<CapabilityRecord|null>(null);const { address: account } = useWallet();const[error,setError]=useState("");const[loadState,setLoadState]=useState<"LOADING"|"FOUND"|"NOT_FOUND"|"READ_FAILED">("LOADING");const[tx,setTx]=useState("");const[busy,setBusy]=useState(false);const[phase,setPhase]=useState("");
  async function load(){setLoadState("LOADING");setError("");try{const record=await getCapability(key);setCap(record);setLoadState(record?"FOUND":"NOT_FOUND")}catch(e){setCap(null);setLoadState("READ_FAILED");setError(e instanceof Error?e.message:String(e))}}
  useEffect(()=>{load()},[key]);
  async function execute(){if(!account)return setError("Connect the capability holder wallet first.");if(!cap)return;setBusy(true);setError("");setPhase("Submitting capability execution");try{const h=await executeCapability(account,cap);setTx(h);setPhase("Waiting for gate transaction to FINALIZE");await waitForFinalization(h);const children=await getTriggeredTransactionIds(h);if(children.length){setPhase(`Waiting for ${children.length} protected-vault child transaction${children.length===1?"":"s"} to FINALIZE`);for(const child of children){await waitForFinalization(child);setTx(child)}}setPhase("Gate and protected-vault child finalized; reconciling authoritative state.");await load()}catch(e){setError(e instanceof Error?e.message:String(e));setPhase("")}finally{setBusy(false)}}
  async function reconcile(){if(!account||!cap)return setError("Connect the capability holder wallet first.");setBusy(true);setError("");setPhase("Submitting child reconciliation");try{const h=await reconcileCapability(account,cap.capability_key);setTx(h);await waitForFinalization(h);setPhase("Capability reconciled from authoritative vault state.");await load()}catch(e){setError(e instanceof Error?e.message:String(e));setPhase("")}finally{setBusy(false)}}
  const expired=cap?Date.now()/1000>cap.expires_at:false;
  const lifecycle=cap?.dispatch_status || (cap?.consumed?"APPLIED":expired?"EXPIRED":"ISSUED");
  return <AppShell><PageIntro eyebrow="Execution authority" title={key} copy="This is not a recommendation or badge. It is a single-use capability issued only by the bound ExigencyEngine after the parent assessment reaches finality." />
    {error&&<div className="notice bad">{error}</div>}
    {loadState==="LOADING"?<Panel><div className="empty">Loading capability from Studionet…</div></Panel>:!cap?<Panel><div className="empty">{loadState==="NOT_FOUND"?"Capability not found on Studionet. If its parent just finalized, the issuance child may still be settling.":"Capability could not be read from Studionet."}</div></Panel>:<div className="stack">
      <div className="grid-3"><div className="stat"><small>State</small><strong><StatusPill value={lifecycle}/></strong></div><div className="stat"><small>Dispatches</small><strong>{cap.dispatch_count ?? 0}</strong></div><div className="stat"><small>Duration</small><strong>{cap.duration_minutes}m</strong></div></div>
      <Panel eyebrow="Bound authority" title="Capability envelope"><div className="panel-body"><dl className="keyvals"><div className="keyval"><dt>Incident</dt><dd>{cap.incident_key}</dd></div><div className="keyval"><dt>Holder</dt><dd className="digest">{cap.holder}</dd></div><div className="keyval"><dt>Target</dt><dd className="digest">{cap.target}</dd></div><div className="keyval"><dt>Issued</dt><dd>{fmt(cap.issued_at)}</dd></div><div className="keyval"><dt>Expires</dt><dd>{fmt(cap.expires_at)}</dd></div><div className="keyval"><dt>Action digest</dt><dd className="digest">{cap.action_digest}</dd></div><div className="keyval"><dt>Charter digest</dt><dd className="digest">{cap.charter_digest}</dd></div><div className="keyval"><dt>Assessment digest</dt><dd className="digest">{cap.assessment_digest}</dd></div></dl></div></Panel>
      <Panel eyebrow="Finality-gated execution" title="Reconcile capability" className="danger-zone"><div className="panel-body stack"><div className="notice">Execution binds the stored incident, charter digest, target, action class and duration. A dispatch is not treated as APPLIED until the protected vault reports the exact capability digest. Initial expiry gates only first dispatch; an exact dispatched recovery remains eligible.</div>{phase&&<div className="notice good">{phase}</div>}{tx&&<TxNotice hash={tx} label="Capability transaction submitted"/>}<div className="form-actions"><button className="btn-danger" onClick={execute} disabled={busy||lifecycle==="APPLIED"||lifecycle==="EXPIRED"}>{lifecycle==="APPLIED"?"Capability applied":lifecycle==="EXPIRED"?"Capability expired":busy?"Executing…":lifecycle==="DISPATCHED"?"Retry exact dispatch":"Execute exact emergency action"}</button>{lifecycle==="DISPATCHED"&&<button className="btn-secondary" onClick={reconcile} disabled={busy}>Reconcile child state</button>}</div></div></Panel>
    </div>}
  </AppShell>
}
