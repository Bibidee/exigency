"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BookLock, KeyRound, Radar, Vault } from "lucide-react";
import AppShell from "@/components/AppShell";
import PageIntro from "@/components/PageIntro";
import Panel from "@/components/Panel";
import { ADDRESSES, NETWORK, isConfigured } from "@/lib/config";
import { getVaultStatus, listCapabilityKeys, listCharterKeys, listIncidentKeys } from "@/lib/contracts";

export default function CommandPage() {
  const [charters, setCharters] = useState<string[]>([]);
  const [incidents, setIncidents] = useState<string[]>([]);
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [vault, setVault] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isConfigured) return;
    Promise.allSettled([listCharterKeys(), listIncidentKeys(), listCapabilityKeys(), getVaultStatus()])
      .then(([c, i, k, v]) => {
        if (c.status === "fulfilled") setCharters(c.value);
        if (i.status === "fulfilled") setIncidents(i.value);
        if (k.status === "fulfilled") setCapabilities(k.value);
        if (v.status === "fulfilled") setVault(v.value);
        const failed = [c, i, k, v].find((result) => result.status === "rejected");
        if (failed?.status === "rejected") setError(failed.reason instanceof Error ? failed.reason.message : String(failed.reason));
      });
  }, []);

  return (
    <AppShell>
      <PageIntro eyebrow="Authority overview" title="Command" copy="A read-only view of the active EXIGENT system. No browser state is treated as authority; every item below is loaded from the configured Studionet contracts." />
      {!isConfigured && <div className="notice">Deployment addresses are not configured. No mocked contract results are shown.</div>}
      {error && <div className="notice bad" style={{marginTop:14}}>{error} <button className="btn-secondary" style={{marginTop:10}} onClick={() => window.location.reload()}>Retry reads</button></div>}

      <div className="grid-3" style={{marginTop:14}}>
        <div className="stat"><small>Charter versions</small><strong>{charters.length}</strong></div>
        <div className="stat"><small>Incidents</small><strong>{incidents.length}</strong></div>
        <div className="stat"><small>Capabilities</small><strong>{capabilities.length}</strong></div>
      </div>

      <div className="grid-2" style={{marginTop:14}}>
        <Panel eyebrow="Authority source" title="Charters">
          <div className="panel-body list-cards">
            {charters.length ? charters.slice().reverse().slice(0,6).map((key) => <Link className="data-card" href={`/charter/${encodeURIComponent(key)}`} key={key}><div><strong>{key}</strong><small>Frozen emergency charter</small></div><ArrowRight size={16}/></Link>) : <div className="empty"><BookLock size={22} style={{marginBottom:8}}/><br/>No on-chain charters loaded.</div>}
          </div>
        </Panel>
        <Panel eyebrow="Consensus cases" title="Incidents">
          <div className="panel-body list-cards">
            {incidents.length ? incidents.slice().reverse().slice(0,6).map((key) => <Link className="data-card" href={`/incident/${encodeURIComponent(key)}`} key={key}><div><strong>{key}</strong><small>Frozen authority request</small></div><Radar size={16}/></Link>) : <div className="empty"><Radar size={22} style={{marginBottom:8}}/><br/>No incidents loaded.</div>}
          </div>
        </Panel>
      </div>

      <div className="grid-2" style={{marginTop:14}}>
        <Panel eyebrow="Execution authority" title="Capabilities">
          <div className="panel-body list-cards">
            {capabilities.length ? capabilities.slice().reverse().slice(0,6).map((key) => <Link className="data-card" href={`/capability/${encodeURIComponent(key)}`} key={key}><div><strong>{key}</strong><small>Finality-issued execution authority</small></div><KeyRound size={16}/></Link>) : <div className="empty"><KeyRound size={22} style={{marginBottom:8}}/><br/>No capabilities loaded.</div>}
          </div>
        </Panel>
        <Panel eyebrow="Protected target" title="Vault state">
          <div className="panel-body">
            {vault ? <dl className="keyvals"><div className="keyval"><dt>Withdrawals paused</dt><dd>{String(vault.withdrawals_paused)}</dd></div><div className="keyval"><dt>Deposits paused</dt><dd>{String(vault.deposits_paused)}</dd></div><div className="keyval"><dt>Total credits</dt><dd className="mono">{String(vault.total_credits)}</dd></div></dl> : <div className="empty"><Vault size={22} style={{marginBottom:8}}/><br/>{isConfigured ? "Vault state could not be read from Studionet." : "Vault state unavailable until deployment."}</div>}
          </div>
        </Panel>
      </div>

      <Panel eyebrow="Canonical target" title="Studionet configuration" className="" >
        <div className="panel-body"><dl className="keyvals">
          <div className="keyval"><dt>Network</dt><dd>{NETWORK.name}</dd></div>
          <div className="keyval"><dt>Chain ID</dt><dd>{NETWORK.chainId}</dd></div>
          <div className="keyval"><dt>RPC</dt><dd className="mono">{NETWORK.rpc}</dd></div>
          {Object.entries(ADDRESSES).map(([name,address]) => <div className="keyval" key={name}><dt>{name}</dt><dd className="digest">{address || "Not deployed/configured"}</dd></div>)}
        </dl></div>
      </Panel>
    </AppShell>
  );
}
