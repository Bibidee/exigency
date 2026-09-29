"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { useWallet } from "@/components/WalletProvider";
import PageIntro from "@/components/PageIntro";
import Panel from "@/components/Panel";
import StatusPill from "@/components/StatusPill";
import TxNotice from "@/components/TxNotice";
import { depositToVault, getVaultCredit, getVaultStatus, withdrawFromVault } from "@/lib/contracts";
import { waitForFinalization } from "@/lib/genlayer";
import { formatGenAmount, parseGenAmount } from "@/lib/amount";

function fmt(ts:number){return ts?new Date(ts*1000).toLocaleString():"—"}

export default function VaultPage(){
  const { address: account } = useWallet();const[status,setStatus]=useState<Record<string,unknown>|null>(null);const[statusState,setStatusState]=useState<"LOADING"|"READY"|"UNKNOWN">("LOADING");const[credit,setCredit]=useState<bigint>(0n);const[amount,setAmount]=useState("0.10");const[error,setError]=useState("");const[tx,setTx]=useState("");const[busy,setBusy]=useState(false);const[phase,setPhase]=useState("");
  const load=useCallback(async(addr?:string)=>{setStatusState("LOADING");try{const next=await getVaultStatus();const nextCredit=addr?await getVaultCredit(addr):0n;setStatus(next);setCredit(nextCredit);setError("");setStatusState("READY")}catch(e){setStatus(null);setCredit(0n);setStatusState("UNKNOWN");setError(e instanceof Error?e.message:String(e))}},[]);
  useEffect(()=>{void load(account||undefined)},[account,load]);
  async function run(kind:"deposit"|"withdraw"){if(!account)return setError("Connect a wallet first.");setBusy(true);setError("");setTx("");setPhase(kind==="deposit"?"Submitting deposit":"Submitting withdrawal");try{const value=parseGenAmount(amount);const h=kind==="deposit"?await depositToVault(account,value):await withdrawFromVault(account,value);setTx(h);setPhase("Waiting for FINALIZED and successful execution");await waitForFinalization(h);await load(account);setPhase("Finalized successfully and state refreshed")}catch(e){setError(e instanceof Error?e.message:String(e));setPhase("")}finally{setBusy(false)}}
  const known= statusState === "READY" && status !== null;
  const validAmount = (() => { try { parseGenAmount(amount); return true; } catch { return false; } })();
  const stateLabel=(paused:unknown)=>!known?"UNKNOWN / READ FAILED":Boolean(paused)?"PAUSED":"OPEN";
  return <AppShell><PageIntro eyebrow="Consequential target" title="Protected Vault" copy="This demo target holds test GEN credits. There is deliberately no administrator pause button: emergency pause methods reject every caller except CapabilityGate." />
    {error&&<div className="notice bad">{error} <button className="btn-secondary" style={{marginTop:10}} onClick={()=>load(account||undefined)}>Retry reads</button></div>}
    <div className="grid-3"><div className="stat"><small>Withdrawals</small><strong><StatusPill value={stateLabel(status?.withdrawals_paused)}/></strong></div><div className="stat"><small>Deposits</small><strong><StatusPill value={stateLabel(status?.deposits_paused)}/></strong></div><div className="stat"><small>Your credit</small><strong>{known?formatGenAmount(credit):"—"} GEN</strong></div></div>
    <div className="grid-2" style={{marginTop:14}}><Panel eyebrow="Normal user path" title="Deposit test GEN"><div className="panel-body stack"><div className="field"><label>Amount in GEN</label><input value={amount} onChange={e=>setAmount(e.target.value)} inputMode="decimal"/></div><div className="notice">The payable amount and GenLayer protocol fee are estimated separately. If deposits are paused by a finalized EXIGENT capability, this write reverts.</div><button className="btn" onClick={()=>run("deposit")} disabled={busy||!known||!account||!validAmount}>Deposit</button></div></Panel><Panel eyebrow="Normal user path" title="Withdraw test GEN"><div className="panel-body stack"><div className="field"><label>Amount in GEN</label><input value={amount} onChange={e=>setAmount(e.target.value)} inputMode="decimal"/></div><div className="notice">Withdrawals are the visible consequence of emergency authority. When paused, the contract itself rejects this path until the transaction-time expiry.</div><button className="btn-secondary" onClick={()=>run("withdraw")} disabled={busy||!known||!account||!validAmount}>Withdraw</button></div></Panel></div>
    {phase&&<div className="notice good" style={{marginTop:14}}>{phase}</div>}{tx&&<div style={{marginTop:14}}><TxNotice hash={tx}/></div>}
    <Panel eyebrow="Current protected state" title="Vault authority surface" className="" ><div className="panel-body"><dl className="keyvals"><div className="keyval"><dt>Gate</dt><dd className="digest">{known?String(status?.gate_address||"Not configured"):"UNKNOWN / READ FAILED"}</dd></div><div className="keyval"><dt>Withdrawals paused until</dt><dd>{known?fmt(Number(status?.withdrawals_paused_until||0)):"—"}</dd></div><div className="keyval"><dt>Deposits paused until</dt><dd>{known?fmt(Number(status?.deposits_paused_until||0)):"—"}</dd></div><div className="keyval"><dt>Total credited wei</dt><dd className="mono">{known?String(status?.total_credits||"0"):"—"}</dd></div></dl></div></Panel>
  </AppShell>
}
