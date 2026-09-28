"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import AppShell from "@/components/AppShell";
import PageIntro from "@/components/PageIntro";
import Panel from "@/components/Panel";
import StatusPill from "@/components/StatusPill";
import TxNotice from "@/components/TxNotice";
import WalletButton from "@/components/WalletButton";
import { assessIncident, getIncident, type IncidentRecord } from "@/lib/contracts";
import { waitForFinalization } from "@/lib/genlayer";

type Assessment = {decision?:string;summary?:string;trigger_clauses?:string[];material_findings?:string[];source_states?:Array<{url:string;state:string;finding:string;http_status?:number;content_digest?:string}>;evidence_commitment_digest?:string;assessed_at?:number};
function fmt(ts:number){return ts?new Date(ts*1000).toLocaleString():"—"}

export default function IncidentDetail(){
  const params=useParams<{incidentKey:string}>(); const key=decodeURIComponent(params.incidentKey);
  const [incident,setIncident]=useState<IncidentRecord|null>(null); const[account,setAccount]=useState<`0x${string}`|"">("");
  const[error,setError]=useState("");const[tx,setTx]=useState("");const[busy,setBusy]=useState(false);const[phase,setPhase]=useState("");
  async function load(){try{setIncident(await getIncident(key))}catch(e){setError(e instanceof Error?e.message:String(e))}}
  useEffect(()=>{load()},[key]);
  const assessment=useMemo<Assessment|null>(()=>{if(!incident?.assessment_json)return null;try{return JSON.parse(incident.assessment_json)}catch{return null}},[incident]);
  async function assess(){if(!account)return setError("Connect the incident requester wallet first.");setBusy(true);setError("");setTx("");setPhase("Submitting assessment");try{const h=await assessIncident(account,key);setTx(h);setPhase("Waiting for FINALIZED");await waitForFinalization(h);setPhase("Assessment finalized. Refreshing state");await load();setPhase("Finalized") }catch(e){setError(e instanceof Error?e.message:String(e));setPhase("")}finally{setBusy(false)}}
  const retryable=!assessment||["INSUFFICIENT_EVIDENCE","CONFLICTING_EVIDENCE"].includes(String(assessment.decision));
  return <AppShell><PageIntro eyebrow="Consensus case" title={key} copy="The incident is frozen before assessment. Validators fetch the approved source URLs independently, reconstruct the emergency question and compare substantive source states, trigger clauses and material findings." action={<WalletButton onConnected={setAccount}/>}/>
    {error&&<div className="notice bad">{error}</div>}
    {!incident?<Panel><div className="empty">Loading incident from Studionet…</div></Panel>:<div className="stack">
      <div className="grid-3"><div className="stat"><small>Incident state</small><strong><StatusPill value={incident.status}/></strong></div><div className="stat"><small>Requested action</small><strong style={{fontSize:15}}>{incident.action_class.replaceAll("_"," ")}</strong></div><div className="stat"><small>Duration</small><strong>{incident.duration_minutes}m</strong></div></div>
      <Panel eyebrow="Frozen request" title="Incident facts"><div className="panel-body"><dl className="keyvals"><div className="keyval"><dt>Charter</dt><dd><Link href={`/charter/${encodeURIComponent(incident.charter_key)}`}>{incident.charter_key}</Link></dd></div><div className="keyval"><dt>Requester</dt><dd className="digest">{incident.requester}</dd></div><div className="keyval"><dt>Protected target</dt><dd className="digest">{incident.target}</dd></div><div className="keyval"><dt>Opened</dt><dd>{fmt(incident.opened_at)}</dd></div><div className="keyval"><dt>Incident digest</dt><dd className="digest">{incident.incident_digest}</dd></div><div className="keyval"><dt>Action digest</dt><dd className="digest">{incident.action_digest}</dd></div></dl><div className="finding" style={{marginTop:14}}>{incident.reason}</div></div></Panel>
      <Panel eyebrow="Evidence boundary" title="Frozen source URLs"><div className="panel-body stack">{incident.evidence_urls.map(url=><div className="source-row" key={url}><code>{url}</code></div>)}</div></Panel>
      {assessment?<Panel eyebrow="Consensus assessment" title={String(assessment.decision||"Assessment").replaceAll("_"," ")}><div className="panel-body stack"><div><StatusPill value={String(assessment.decision||"")}/></div><p style={{color:"#c8d7dc",lineHeight:1.7,margin:0}}>{assessment.summary}</p>{(assessment.trigger_clauses||[]).length>0&&<><div className="kicker">Trigger clauses</div>{assessment.trigger_clauses!.map((x,i)=><div className="finding" key={i}>{x}</div>)}</>}{(assessment.material_findings||[]).length>0&&<><div className="kicker">Material findings</div>{assessment.material_findings!.map((x,i)=><div className="finding" key={i}>{x}</div>)}</>}{(assessment.source_states||[]).length>0&&<><div className="kicker">Independent source states</div>{assessment.source_states!.map((s)=><div className="source-row" key={s.url}><header><code>{s.url}</code><StatusPill value={s.state}/></header><p>{s.finding}</p><small className="source-proof">HTTP {s.http_status||0} · content SHA-256 {s.content_digest||"unavailable"}</small></div>)}</>}{assessment.evidence_commitment_digest&&<div className="keyval"><dt>Evidence commitment</dt><dd className="digest">{assessment.evidence_commitment_digest}</dd></div>}</div></Panel>:<Panel eyebrow="Not yet assessed" title="GenLayer has not decided this incident"><div className="panel-body"><div className="notice">No browser or centralized backend substitutes for the assessment. Until a real GenLayer write succeeds, this page has no verdict to show.</div></div></Panel>}
      {incident.capability_key&&<Link className="data-card" href={`/capability/${encodeURIComponent(incident.capability_key)}`}><div><strong>{incident.capability_key}</strong><small>Open finality-issued capability. It may appear shortly after the parent assessment finalizes.</small></div><ArrowRight size={17}/></Link>}
      {retryable&&<Panel eyebrow="Consensus write" title={assessment?"Reassess after evidence changes":"Request assessment"}><div className="panel-body stack"><div className="notice">A retry is permitted only after INSUFFICIENT_EVIDENCE or CONFLICTING_EVIDENCE. Conclusive outcomes cannot be rerun under the same incident key.</div>{phase&&<div className="notice good">{phase}</div>}{tx&&<TxNotice hash={tx} label="Assessment submitted"/>}<div className="form-actions"><button className="btn" onClick={assess} disabled={busy}>{busy?phase||"Working…":"Ask GenLayer to assess"}</button></div></div></Panel>}
    </div>}
  </AppShell>
}
