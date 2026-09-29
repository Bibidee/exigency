"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import { useWallet } from "@/components/WalletProvider";
import PageIntro from "@/components/PageIntro";
import Panel from "@/components/Panel";
import StatusPill from "@/components/StatusPill";
import TxNotice from "@/components/TxNotice";
import { activateCharter, getCharter, type CharterRecord } from "@/lib/contracts";
import { ADDRESSES } from "@/lib/config";
import { readContract, waitForFinalization } from "@/lib/genlayer";

function fmt(ts:number){return ts?new Date(ts*1000).toLocaleString():"—"}

export default function CharterDetail(){
  const params=useParams<{charterKey:string}>(); const key=decodeURIComponent(params.charterKey);
  const [charter,setCharter]=useState<CharterRecord|null>(null); const [active,setActive]=useState(false);
  const { address: account } = useWallet(); const [error,setError]=useState(""); const [loadState,setLoadState]=useState<"LOADING"|"FOUND"|"NOT_FOUND"|"READ_FAILED">("LOADING"); const [tx,setTx]=useState(""); const [busy,setBusy]=useState(false); const [phase,setPhase]=useState("");
  async function load(){setLoadState("LOADING");setError("");try{const c=await getCharter(key);if(!c){setCharter(null);setLoadState("NOT_FOUND");return}setCharter(c);const a=await readContract<string>(ADDRESSES.charterRegistry,"get_active_charter_key",[c.protocol_key]);setActive(a===key);setLoadState("FOUND")}catch(e){setCharter(null);setLoadState("READ_FAILED");setError(e instanceof Error?e.message:String(e))}}
  useEffect(()=>{load()},[key]);
  async function activate(){if(!account)return setError("Connect the charter owner wallet first.");setBusy(true);setError("");setPhase("Submitting activation");try{const h=await activateCharter(account,key);setTx(h);setPhase("Waiting for activation FINALIZED");await waitForFinalization(h);await load();setPhase("Charter activation finalized")}catch(e){setError(e instanceof Error?e.message:String(e));setPhase("")}finally{setBusy(false)}}
  return <AppShell><PageIntro eyebrow="Frozen policy" title={key} copy="This view separates immutable charter content from activation state. Activation selects the charter for future incidents; it does not rewrite the frozen policy." />
    {error&&<div className="notice bad">{error}</div>}
    {loadState==="LOADING"?<Panel><div className="empty">Loading charter from Studionet…</div></Panel>:!charter?<Panel><div className="empty">{loadState==="NOT_FOUND"?<>Charter not found on Studionet. Return to <a href="/charter/new">Publish a charter</a> to create a new immutable version.</>:"Charter could not be read from Studionet."}</div></Panel>:<div className="stack">
      <div className="grid-3"><div className="stat"><small>Activation</small><strong><StatusPill value={active?"ACTIVE":"PENDING"}/></strong></div><div className="stat"><small>Max pause</small><strong>{charter.max_pause_minutes}m</strong></div><div className="stat"><small>Capability TTL</small><strong>{charter.capability_ttl_minutes}m</strong></div></div>
      <Panel eyebrow="Authority identity" title={charter.protocol_name}><div className="panel-body"><dl className="keyvals"><div className="keyval"><dt>Protocol key</dt><dd>{charter.protocol_key}</dd></div><div className="keyval"><dt>Owner</dt><dd className="digest">{charter.owner}</dd></div><div className="keyval"><dt>Protected target</dt><dd className="digest">{charter.protected_target}</dd></div><div className="keyval"><dt>Published</dt><dd>{fmt(charter.published_at)}</dd></div><div className="keyval"><dt>Eligible for activation</dt><dd>{fmt(charter.eligible_at)}</dd></div><div className="keyval"><dt>Charter digest</dt><dd className="digest">{charter.charter_digest}</dd></div></dl></div></Panel>
      <div className="grid-2"><Panel eyebrow="Semantic trigger" title="Emergency threshold"><div className="panel-body"><p style={{lineHeight:1.7,color:"#c5d4da",margin:0}}>{charter.trigger_policy}</p></div></Panel><Panel eyebrow="Source policy" title="Evidence rules"><div className="panel-body"><p style={{lineHeight:1.7,color:"#c5d4da",margin:0}}>{charter.evidence_policy}</p></div></Panel></div>
      <Panel eyebrow="Hard limits" title="Deterministic envelope"><div className="panel-body"><dl className="keyvals"><div className="keyval"><dt>Allowed actions</dt><dd>{charter.allowed_actions.join(", ")}</dd></div><div className="keyval"><dt>Approved hosts</dt><dd>{charter.evidence_hosts.join(", ")}</dd></div><div className="keyval"><dt>Max pause</dt><dd>{charter.max_pause_minutes} minutes</dd></div><div className="keyval"><dt>Activation delay</dt><dd>{charter.activation_delay_minutes} minutes</dd></div></dl></div></Panel>
      {!active&&<Panel eyebrow="One-way selection" title="Activate for new incidents"><div className="panel-body stack"><div className="notice">Activation is available only after the configured delay and only to the protocol owner. Charter selection is monotonic: an older version cannot replace a newer active version. Incidents already opened remain bound to their frozen digest.</div>{phase&&<div className="notice good">{phase}</div>}{tx&&<TxNotice hash={tx} label="Activation submitted"/>}<div className="form-actions"><button className="btn" onClick={activate} disabled={busy}>{busy?"Submitting…":"Activate charter"}</button></div></div></Panel>}
    </div>}
  </AppShell>
}
