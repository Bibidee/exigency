"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import AppShell from "@/components/AppShell";
import { useWallet } from "@/components/WalletProvider";
import PageIntro from "@/components/PageIntro";
import Panel from "@/components/Panel";
import StatusPill from "@/components/StatusPill";
import TxNotice from "@/components/TxNotice";
import { assessIncident, challengeIncident, finalizeIncident, getCharter, getIncident, type CharterRecord, type IncidentRecord } from "@/lib/contracts";
import { waitForFinalization } from "@/lib/genlayer";
import { assessmentGuard, assessmentStorageKey, challengeGuard, compareSourceProvenance, finalizationGuard, MAX_ASSESSMENT_ATTEMPTS, type SourceProvenanceChange, type SourceState } from "@/lib/incident-safety";

type Assessment = {
  decision?: string;
  summary?: string;
  trigger_clauses?: string[];
  material_findings?: string[];
  source_states?: SourceState[];
  evidence_commitment_digest?: string;
  assessed_at?: number;
  drift_detected?: boolean;
  drifted_urls?: string[];
};

function fmt(ts: number) { return ts ? new Date(ts * 1000).toLocaleString() : "—"; }

function parseAssessment(record: IncidentRecord | null): Assessment | null {
  if (!record?.assessment_json) return null;
  try { return JSON.parse(record.assessment_json) as Assessment; } catch { return null; }
}

function readPreviousAssessment(key: string): Assessment | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(assessmentStorageKey(key));
    return raw ? JSON.parse(raw) as Assessment : null;
  } catch { return null; }
}

function storeAssessment(key: string, assessment: Assessment | null) {
  if (typeof window === "undefined" || !assessment) return;
  try { window.sessionStorage.setItem(assessmentStorageKey(key), JSON.stringify(assessment)); } catch { /* storage is only a local comparison aid */ }
}

export default function IncidentDetail() {
  const params = useParams<{ incidentKey: string }>();
  const key = decodeURIComponent(params.incidentKey);
  const { address: account } = useWallet();
  const [incident, setIncident] = useState<IncidentRecord | null>(null);
  const [charter, setCharter] = useState<CharterRecord | null>(null);
  const [provenanceChanges, setProvenanceChanges] = useState<SourceProvenanceChange[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [tx, setTx] = useState("");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState("");
  const [challengeInput, setChallengeInput] = useState("");
  const [challengeReason, setChallengeReason] = useState("The provisional result should be reassessed against this additional approved source before authority becomes final.");
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  async function load() {
    setLoading(true);
    setError("");
    try {
      const previous = readPreviousAssessment(key);
      const record = await getIncident(key);
      if (!record) {
        setIncident(null);
        setCharter(null);
        setProvenanceChanges([]);
        setError(`Incident "${key}" was not found on Studionet. The transaction may have rolled back before creating a record.`);
      } else {
        const policy = await getCharter(record.charter_key);
        const current = parseAssessment(record);
        setIncident(record);
        setCharter(policy);
        setProvenanceChanges(current ? compareSourceProvenance(previous?.source_states ?? [], current.source_states ?? [], current.drifted_urls ?? []) : []);
        storeAssessment(key, current);
      }
    } catch (cause) {
      setIncident(null);
      setCharter(null);
      setProvenanceChanges([]);
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally { setLoading(false); }
  }

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [key]);

  const assessment = useMemo(() => parseAssessment(incident), [incident]);
  const provisional = ["ASSESSMENT_PROVISIONAL", "CHALLENGED"].includes(String(incident?.status));
  const retryable = !assessment || ["INSUFFICIENT_EVIDENCE", "CONFLICTING_EVIDENCE"].includes(String(assessment?.decision));
  const assessmentSafety = incident && charter ? assessmentGuard(incident, charter, now) : null;
  const finalizationSafety = incident && provisional ? finalizationGuard(incident, now) : null;
  const challengeSafety = incident && charter && challengeInput.trim() ? challengeGuard(incident, charter, challengeInput) : null;
  const uniqueSourceCount = incident ? new Set([...(incident.evidence_urls ?? []), ...(incident.challenge_evidence_urls ?? [])]).size : 0;
  const maxChallenges = Number(charter?.maximum_challenges ?? 0);
  const remainingAssessments = incident ? Math.max(0, MAX_ASSESSMENT_ATTEMPTS - Number(incident.assessment_count ?? 0)) : MAX_ASSESSMENT_ATTEMPTS;

  async function assess() {
    if (!account) return setError("Connect the incident requester wallet first.");
    if (!incident || !charter) return setError("The incident policy is not available yet.");
    if (!assessmentSafety?.allowed) return setError(assessmentSafety?.message ?? "Assessment is not currently viable.");
    setBusy(true); setError(""); setTx(""); setPhase("Submitting assessment");
    try {
      const hash = await assessIncident(account, key);
      setTx(hash); setPhase("Waiting for FINALIZED"); await waitForFinalization(hash); setPhase("Assessment finalized. Refreshing state"); await load(); setPhase("Finalized");
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); setPhase(""); }
    finally { setBusy(false); }
  }

  async function challenge() {
    if (!account) return setError("Connect the incident requester wallet first.");
    if (!incident || !charter) return setError("The incident policy is not available yet.");
    if (!challengeInput.trim()) return setError("Add a source-group|HTTPS URL for the challenge.");
    if (!challengeSafety?.allowed || !challengeSafety.parsed) return setError(challengeSafety?.message ?? "Challenge source is not permitted.");
    if (!challengeReason.trim()) return setError("Add a reason for the challenge.");
    setBusy(true); setError(""); setTx(""); setPhase("Submitting challenge");
    try {
      const hash = await challengeIncident(account, key, JSON.stringify([challengeSafety.parsed.url]), challengeReason);
      setTx(hash); setPhase("Waiting for challenge FINALIZED"); await waitForFinalization(hash); await load(); setPhase("Challenge recorded; reassessment waits for the bounded window");
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); setPhase(""); }
    finally { setBusy(false); }
  }

  async function finalize() {
    if (!account) return setError("Connect the incident requester wallet first.");
    if (!finalizationSafety?.allowed) return setError(finalizationSafety?.message ?? "Finalization is not currently viable.");
    setBusy(true); setError(""); setTx(""); setPhase("Submitting final reassessment");
    try {
      const hash = await finalizeIncident(account, key);
      setTx(hash); setPhase("Waiting for FINALIZED"); await waitForFinalization(hash); await load(); setPhase("Final assessment finalized");
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); setPhase(""); }
    finally { setBusy(false); }
  }

  return <AppShell>
    <PageIntro eyebrow="Consensus case" title={key} copy="The incident is frozen before assessment. Validators fetch the approved source URLs independently, reconstruct the emergency question and compare substantive source states, trigger clauses and material findings." />
    {error && <div className="notice bad">{error}</div>}
    {loading ? <Panel><div className="empty">Loading incident from Studionet…</div></Panel> : !incident ? <Panel><div className="empty">No incident record is available for this key. Return to <Link href="/incident/new">Open Incident</Link> and submit a new request only after confirming the previous transaction&apos;s result.</div></Panel> : <div className="stack">
      <div className="grid-3"><div className="stat"><small>Incident state</small><strong><StatusPill value={incident.status} /></strong></div><div className="stat"><small>Requested action</small><strong style={{ fontSize: 15 }}>{incident.action_class.replaceAll("_", " ")}</strong></div><div className="stat"><small>Duration</small><strong>{incident.duration_minutes}m</strong></div></div>
      <Panel eyebrow="Frozen request" title="Incident facts"><div className="panel-body"><dl className="keyvals"><div className="keyval"><dt>Charter</dt><dd><Link href={`/charter/${encodeURIComponent(incident.charter_key)}`}>{incident.charter_key}</Link></dd></div><div className="keyval"><dt>Requester</dt><dd className="digest">{incident.requester}</dd></div><div className="keyval"><dt>Protected target</dt><dd className="digest">{incident.target}</dd></div><div className="keyval"><dt>Opened</dt><dd>{fmt(incident.opened_at)}</dd></div><div className="keyval"><dt>Incident expires</dt><dd>{fmt(incident.expires_at)}</dd></div><div className="keyval"><dt>Incident digest</dt><dd className="digest">{incident.incident_digest}</dd></div><div className="keyval"><dt>Action digest</dt><dd className="digest">{incident.action_digest}</dd></div></dl><div className="finding" style={{ marginTop: 14 }}>{incident.reason}</div></div></Panel>
      <Panel eyebrow="Evidence boundary" title="Frozen source URLs"><div className="panel-body stack">{incident.evidence_items?.length ? incident.evidence_items.map((item) => <div className="source-row" key={item.url}><header><code>{item.group}|{item.url}</code><StatusPill value={item.group} /></header></div>) : incident.evidence_urls.map((url) => <div className="source-row" key={url}><code>{url}</code></div>)}{(incident.challenge_evidence_urls ?? []).map((url) => <div className="source-row" key={url}><header><code>{url}</code><StatusPill value="CHALLENGE" /></header></div>)}</div></Panel>
      {assessment ? <Panel eyebrow="Consensus assessment" title={String(assessment.decision ?? "Assessment").replaceAll("_", " ")}><div className="panel-body stack"><div><StatusPill value={String(assessment.decision ?? "")} /></div>{assessment.drift_detected && <div className="notice bad">The contract recorded confirmed source drift for this assessment and failed closed. This is an on-chain finding, distinct from the local provenance warning below.</div>}<p style={{ color: "#c8d7dc", lineHeight: 1.7, margin: 0 }}>{assessment.summary}</p>{(assessment.trigger_clauses ?? []).length > 0 && <><div className="kicker">Trigger clauses</div>{assessment.trigger_clauses!.map((item, index) => <div className="finding" key={index}>{item}</div>)}</>}{(assessment.material_findings ?? []).length > 0 && <><div className="kicker">Material findings</div>{assessment.material_findings!.map((item, index) => <div className="finding" key={index}>{item}</div>)}</>}{(assessment.source_states ?? []).length > 0 && <><div className="kicker">Independent source states</div>{assessment.source_states!.map((source) => <div className="source-row" key={source.url}><header><code>{source.url}</code><StatusPill value={String(source.state ?? "")} /></header><p>{source.finding}</p><small className="source-proof">HTTP {source.http_status ?? 0} · content SHA-256 {source.content_digest || "unavailable"}</small></div>)}</>}{assessment.evidence_commitment_digest && <div className="keyval"><dt>Evidence commitment</dt><dd className="digest">{assessment.evidence_commitment_digest}</dd></div>}</div></Panel> : <Panel eyebrow="Not yet assessed" title="GenLayer has not decided this incident"><div className="panel-body"><div className="notice">No browser or centralized backend substitutes for the assessment. Until a real GenLayer write succeeds, this page has no verdict to show.</div></div></Panel>}
      {provenanceChanges.length > 0 && <Panel eyebrow="Audit provenance" title="Assessment-to-assessment source comparison"><div className="panel-body stack"><div className="notice">This comparison uses assessments previously observed by this browser. It is a transparent warning aid, not an on-chain consensus verdict and cannot invalidate a finalized positive assessment.</div>{provenanceChanges.map((change) => <div className="source-row" key={change.url}><header><code>{change.url}</code><StatusPill value={change.kind} /></header><p>{change.previouslyAvailable ? "Previously available evidence was observed." : "No previous available digest was observed by this browser."}</p>{change.kind === "NEWLY_UNAVAILABLE" && <small className="source-proof">Newly unavailable in the later assessment.</small>}{change.kind === "CHANGED_DIGEST" && <small className="source-proof">Source digest changed between observed assessments.</small>}{change.kind === "UNCHANGED_DIGEST" && <small className="source-proof">Source digest unchanged between observed assessments.</small>}{change.sourceFetchFailure && <small className="source-proof">Later source fetch failed or returned no usable response.</small>}{change.onChainDrift && <small className="source-proof">The contract separately recorded this URL in drifted_urls.</small>}</div>)}</div></Panel>}
      {incident.capability_key && <Link className="data-card" href={`/capability/${encodeURIComponent(incident.capability_key)}`}><div><strong>{incident.capability_key}</strong><small>Open finality-issued capability. It may appear shortly after the parent assessment finalizes.</small></div><ArrowRight size={17} /></Link>}
      {provisional && <Panel eyebrow="Challenge window" title="Review before final authority"><div className="panel-body stack"><div className="notice">Assessment attempts remaining: {remainingAssessments}/{MAX_ASSESSMENT_ATTEMPTS}. Challenge count: {incident.challenge_count ?? 0}/{maxChallenges}. Unique assessment sources: {uniqueSourceCount}/10. Deadline: {fmt(incident.challenge_deadline ?? 0)}. Incident expiry: {fmt(incident.expires_at)}.</div><div className="field"><label htmlFor="challenge-source">Additional approved source</label><input id="challenge-source" value={challengeInput} onChange={(event) => setChallengeInput(event.target.value)} placeholder="source-group|https://…" /><span className="help">V2 challenges require an explicit charter source group. Duplicate URLs, wrong groups and more than ten combined unique sources are blocked before submission.</span></div><div className="field"><label htmlFor="challenge-reason">Challenge reason</label><textarea id="challenge-reason" value={challengeReason} onChange={(event) => setChallengeReason(event.target.value)} /></div>{challengeSafety && <div className={challengeSafety.allowed ? "notice good" : "notice bad"}>{challengeSafety.message}</div>}{finalizationSafety && <div className={finalizationSafety.allowed ? "notice good" : "notice bad"}>{finalizationSafety.message}</div>}<div className="form-actions"><button className="btn-secondary" onClick={challenge} disabled={busy || !challengeSafety?.allowed}>Submit challenge</button><button className="btn" onClick={finalize} disabled={busy || !finalizationSafety?.allowed}>Finalize after window</button></div></div></Panel>}
      {retryable && !provisional && <Panel eyebrow="Consensus write" title={assessment ? "Reassess after evidence changes" : "Request assessment"}><div className="panel-body stack"><div className="notice">Assessment attempts remaining: {remainingAssessments}/{MAX_ASSESSMENT_ATTEMPTS}. A challenge-enabled charter needs one remaining attempt for final reassessment. Direct contract callers are not bound by this frontend guard.</div>{assessmentSafety && <div className={assessmentSafety.allowed ? "notice good" : "notice bad"}>{assessmentSafety.message}</div>}{phase && <div className="notice good">{phase}</div>}{tx && <TxNotice hash={tx} label="Assessment submitted" />}<div className="form-actions"><button className="btn" onClick={assess} disabled={busy || !assessmentSafety?.allowed}>{busy ? phase || "Working…" : "Ask GenLayer to assess"}</button></div></div></Panel>}
    </div>}
  </AppShell>;
}
