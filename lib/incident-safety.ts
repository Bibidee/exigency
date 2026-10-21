import type { CharterRecord, IncidentRecord } from "@/lib/contracts";

export const MAX_ASSESSMENT_ATTEMPTS = 3;
export const MAX_COMBINED_ASSESSMENT_SOURCES = 10;
export const FRONTEND_FINALITY_BUFFER_SECONDS = 120;

export type GuardResult = {
  allowed: boolean;
  message: string;
};

export type SourceState = {
  url: string;
  state?: string;
  finding?: string;
  http_status?: number;
  content_digest?: string;
};

export type SourceProvenanceChange = {
  url: string;
  kind: "PREVIOUSLY_AVAILABLE" | "NEWLY_UNAVAILABLE" | "CHANGED_DIGEST" | "UNCHANGED_DIGEST" | "SOURCE_FETCH_FAILURE" | "CURRENTLY_UNAVAILABLE";
  previouslyAvailable: boolean;
  sourceFetchFailure: boolean;
  onChainDrift: boolean;
};

type SourceGroup = { name: string; hosts: string[] };

function hostOf(url: string): string {
  return new URL(url).hostname.toLowerCase();
}

export function canonicalEvidenceUrl(raw: string): string {
  const value = raw.trim();
  if (!value.startsWith("https://") || value.includes("%") || value.includes("\\") || value.includes("?") || value.includes("#")) {
    throw new Error("Challenge sources must be canonical HTTPS URLs without query strings, fragments or encoded paths.");
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("Challenge source is not a valid HTTPS URL.");
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.port) {
    throw new Error("Challenge source must use an HTTPS hostname without credentials or a port.");
  }
  const segments = parsed.pathname.split("/");
  if (segments.some((segment) => segment === "." || segment === "..")) {
    throw new Error("Challenge source cannot contain dot path segments.");
  }
  const path = `/${segments.filter(Boolean).join("/")}`;
  return `https://${parsed.hostname.toLowerCase()}${path === "/" ? "/" : path}`;
}

function expectedGroup(url: string, groups: SourceGroup[]): string {
  const host = hostOf(url);
  const matches = groups.filter((group) => group.hosts.some((item) => item.toLowerCase() === host));
  if (matches.length !== 1) throw new Error("Challenge source is not covered by exactly one charter source group.");
  return matches[0].name.toLowerCase();
}

export function parseChallengeSource(raw: string, charter: CharterRecord): { url: string; group: string } {
  const separator = raw.indexOf("|");
  const declaredGroup = separator > 0 ? raw.slice(0, separator).trim().toLowerCase() : "";
  const url = canonicalEvidenceUrl(separator > 0 ? raw.slice(separator + 1) : raw);
  const groups = (charter.source_groups ?? []) as SourceGroup[];
  if (!groups.length) return { url, group: "" };
  if (!declaredGroup) throw new Error("Use the format source-group|https://approved-source.example/path for a V2 challenge.");
  const actualGroup = expectedGroup(url, groups);
  if (declaredGroup !== actualGroup) {
    throw new Error(`Challenge source is grouped as ${declaredGroup}, but the charter assigns it to ${actualGroup}.`);
  }
  return { url, group: actualGroup };
}

export function challengeGuard(incident: IncidentRecord, charter: CharterRecord, raw: string): GuardResult & { parsed?: { url: string; group: string } } {
  const maximum = Number(charter.maximum_challenges ?? 0);
  if (Number(incident.challenge_count ?? 0) >= maximum) {
    return { allowed: false, message: "The charter challenge count is exhausted; the contract will reject another challenge." };
  }

  let parsed: { url: string; group: string };
  try {
    parsed = parseChallengeSource(raw, charter);
  } catch (error) {
    return { allowed: false, message: error instanceof Error ? error.message : String(error) };
  }

  const initial = (incident.evidence_urls ?? []).map((url) => {
    try { return canonicalEvidenceUrl(url); } catch { return url; }
  });
  const previousChallenges = (incident.challenge_evidence_urls ?? []).map((url) => {
    try { return canonicalEvidenceUrl(url); } catch { return url; }
  });
  if ([...initial, ...previousChallenges].includes(parsed.url)) {
    return { allowed: false, message: "This challenge URL is already present in the frozen evidence or an earlier challenge." };
  }
  const combined = new Set([...initial, ...previousChallenges, parsed.url]);
  if (combined.size > MAX_COMBINED_ASSESSMENT_SOURCES) {
    return { allowed: false, message: `This challenge would create ${combined.size} unique assessment sources; the contract limit is ${MAX_COMBINED_ASSESSMENT_SOURCES}.` };
  }
  return { allowed: true, message: `Challenge source accepted (${combined.size}/${MAX_COMBINED_ASSESSMENT_SOURCES} unique sources).`, parsed };
}

export function assessmentGuard(incident: IncidentRecord, charter: CharterRecord, now = Math.floor(Date.now() / 1000)): GuardResult {
  const count = Number(incident.assessment_count ?? 0);
  const remaining = Math.max(0, MAX_ASSESSMENT_ATTEMPTS - count);
  const expiresAt = Number(incident.expires_at ?? 0);
  const secondsRemaining = expiresAt - now;
  if (secondsRemaining <= 0) return { allowed: false, message: "The incident has expired; the contract will reject another assessment." };
  if (count >= MAX_ASSESSMENT_ATTEMPTS) return { allowed: false, message: "Assessment retry limit exhausted (0 assessments remaining). The immutable contract cannot finalize this incident." };
  const challengeWindow = Number(charter.challenge_window_minutes ?? 0);
  if (challengeWindow > 0 && count >= MAX_ASSESSMENT_ATTEMPTS - 1) {
    return { allowed: false, message: `Only ${remaining} assessment remains, but this charter requires a final reassessment after its challenge window. The frontend is blocking a call that could make finalization impossible.` };
  }
  const requiredWindow = challengeWindow * 60;
  if (secondsRemaining <= Math.max(FRONTEND_FINALITY_BUFFER_SECONDS, requiredWindow + FRONTEND_FINALITY_BUFFER_SECONDS)) {
    return { allowed: false, message: "Too little incident time remains for the challenge/finalization sequence. Transaction finality is variable, so the frontend will not offer a known-invalid path." };
  }
  return { allowed: true, message: `${remaining} of ${MAX_ASSESSMENT_ATTEMPTS} assessment attempts remain. Frontend timing checks are advisory; direct contract callers are not restricted.` };
}

export function finalizationGuard(incident: IncidentRecord, now = Math.floor(Date.now() / 1000)): GuardResult {
  const expiresAt = Number(incident.expires_at ?? 0);
  const deadline = Number(incident.challenge_deadline ?? 0);
  const count = Number(incident.assessment_count ?? 0);
  if (count >= MAX_ASSESSMENT_ATTEMPTS) return { allowed: false, message: "Finalization is blocked: assessment retry limit is exhausted." };
  if (now >= expiresAt) return { allowed: false, message: "Finalization is blocked: the incident has expired." };
  if (!deadline || deadline >= expiresAt) return { allowed: false, message: "Finalization is not viable: the challenge deadline reaches incident expiry, leaving no safe finalization window." };
  if (now < deadline) return { allowed: false, message: `The challenge window remains open until ${new Date(deadline * 1000).toLocaleString()}.` };
  if (expiresAt - deadline <= FRONTEND_FINALITY_BUFFER_SECONDS || expiresAt - now <= FRONTEND_FINALITY_BUFFER_SECONDS) {
    return { allowed: false, message: "Finalization is blocked: the remaining expiry margin is too small for variable transaction finality." };
  }
  return { allowed: true, message: "The challenge window is closed and the finalization window is currently viable. Finality timing remains variable." };
}

export function compareSourceProvenance(previous: SourceState[], current: SourceState[], onChainDriftUrls: string[] = []): SourceProvenanceChange[] {
  const before = new Map(previous.map((item) => [item.url, item]));
  const after = new Map(current.map((item) => [item.url, item]));
  const urls = [...new Set([...before.keys(), ...after.keys()])];
  return urls.map((url) => {
    const oldState = before.get(url);
    const newState = after.get(url);
    const oldDigest = String(oldState?.content_digest ?? "");
    const newDigest = String(newState?.content_digest ?? "");
    const previouslyAvailable = Boolean(oldDigest);
    const sourceFetchFailure = Boolean(newState && Number(newState.http_status ?? 0) === 0);
    let kind: SourceProvenanceChange["kind"];
    if (previouslyAvailable && !newDigest) kind = "NEWLY_UNAVAILABLE";
    else if (sourceFetchFailure) kind = "SOURCE_FETCH_FAILURE";
    else if (oldDigest && newDigest && oldDigest !== newDigest) kind = "CHANGED_DIGEST";
    else if (oldDigest && newDigest) kind = "UNCHANGED_DIGEST";
    else if (newState && !newDigest) kind = "CURRENTLY_UNAVAILABLE";
    else kind = "PREVIOUSLY_AVAILABLE";
    return {
      url,
      kind,
      previouslyAvailable,
      sourceFetchFailure,
      onChainDrift: onChainDriftUrls.includes(url),
    };
  });
}

export function assessmentStorageKey(incidentKey: string): string {
  return `exigent.assessment-provenance.${incidentKey}`;
}
