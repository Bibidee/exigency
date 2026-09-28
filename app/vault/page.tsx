"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import PageIntro from "@/components/PageIntro";
import Panel from "@/components/Panel";
import StatusPill from "@/components/StatusPill";
import TxNotice from "@/components/TxNotice";
import WalletButton from "@/components/WalletButton";
import { depositToVault, getVaultCredit, getVaultStatus, withdrawFromVault } from "@/lib/contracts";
import { waitForFinalization } from "@/lib/genlayer";

const WEI=10n**18n;
function toWei(v:string){const [whole,frac=""] = v.trim().split(".");const f=(frac+"000000000000000000").slice(0,18);return BigInt(whole||"0")*WEI+BigInt(f||"0")}
function fromWei(v:bigint){return `${v/WEI}.${(v%WEI).toString().padStart(18,"0").slice(0,4)}`}
function fmt(ts:number){return ts?new Date(ts*1000).toLocaleString():"—"}

export default function VaultPage(){
  const[account,setAccount]=useState<`0x${string}`|"">("");const[status,setStatus]=useState<Record<string,unknown>|null>(null);const[credit,setCredit]=useState<bigint>(0n);const[amount,setAmount]=useState("0.10");const[error,setError]=useState("");const[tx,setTx]=useState("");const[busy,setBusy]=useState(false);const[phase,setPhase]=useState("");
  async function load(addr?:string){try{setStatus(await getVaultStatus());if(addr)setCredit(await getVaultCredit(addr))}catch(e){setError(e instanceof Error?e.message:String(e))}}
  useEffect(()=>{load(account||undefined)},[account]);
  async function run(kind:"deposit"|"withdraw"){if(!account)return setError("Connect a wallet first.");setBusy(true);setError("");setTx("");setPhase(kind==="deposit"?"Submitting deposit":"Submitting withdrawal");try{const value=toWei(amount);if(value<=0n)throw new Error("Amount must be greater than zero.");const h=kind==="deposit"?await depositToVault(account,value):await withdrawFromVault(account,value);setTx(h);setPhase("Waiting for FINALIZED");await waitForFinalization(h);await load(account);setPhase("Finalized and state refreshed")}catch(e){setError(e instanceof Error?e.message:String(e));setPhase("")}finally{setBusy(false)}}
  return <AppShell><PageIntro eyebrow="Consequential target" title="Protected Vault" copy="This demo target holds test GEN credits. There is deliberately no administrator pause button: emergency pause methods reject every caller except CapabilityGate." action={<WalletButton onConnected={(a)=>{setAccount(a);load(a)}}/>}/>
    {error&&<div className="notice bad">{error}</div>}
    <div className="grid-3"><div className="stat"><small>Withdrawals</small><strong><StatusPill value={Boolean(status?.withdrawals_paused)?"PAUSED":"OPEN"}/></strong></div><div className="stat"><small>Deposits</small><strong><StatusPill value={Boolean(status?.deposits_paused)?"PAUSED":"OPEN"}/></strong></div><div className="stat"><small>Your credit</small><strong>{fromWei(credit)} GEN</strong></div></div>
    <div className="grid-2" style={{marginTop:14}}><Panel eyebrow="Normal user path" title="Deposit test GEN"><div className="panel-body stack"><div className="field"><label>Amount in GEN</label><input value={amount} onChange={e=>setAmount(e.target.value)} inputMode="decimal"/></div><div className="notice">The payable amount and GenLayer protocol fee are estimated separately. If deposits are paused by a finalized EXIGENT capability, this write reverts.</div><button className="btn" onClick={()=>run("deposit")} disabled={busy}>Deposit</button></div></Panel><Panel eyebrow="Normal user path" title="Withdraw test GEN"><div className="panel-body stack"><div className="field"><label>Amount in GEN</label><input value={amount} onChange={e=>setAmount(e.target.value)} inputMode="decimal"/></div><div className="notice">Withdrawals are the visible consequence of emergency authority. When paused, the contract itself rejects this path until the transaction-time expiry.</div><button className="btn-secondary" onClick={()=>run("withdraw")} disabled={busy}>Withdraw</button></div></Panel></div>
    {phase&&<div className="notice good" style={{marginTop:14}}>{phase}</div>}{tx&&<div style={{marginTop:14}}><TxNotice hash={tx}/></div>}
    <Panel eyebrow="Current protected state" title="Vault authority surface" className="" ><div className="panel-body"><dl className="keyvals"><div className="keyval"><dt>Gate</dt><dd className="digest">{String(status?.gate_address||"Not configured")}</dd></div><div className="keyval"><dt>Withdrawals paused until</dt><dd>{fmt(Number(status?.withdrawals_paused_until||0))}</dd></div><div className="keyval"><dt>Deposits paused until</dt><dd>{fmt(Number(status?.deposits_paused_until||0))}</dd></div><div className="keyval"><dt>Total credited wei</dt><dd className="mono">{String(status?.total_credits||"0")}</dd></div></dl></div></Panel>
  </AppShell>
}
