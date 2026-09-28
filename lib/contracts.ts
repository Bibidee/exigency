"use client";

import { ADDRESSES } from "@/lib/config";
import { readContract, submitWrite } from "@/lib/genlayer";

export type CharterRecord = {
  charter_key: string;
  protocol_key: string;
  protocol_name: string;
  owner: string;
  protected_target: string;
  trigger_policy: string;
  evidence_policy: string;
  evidence_hosts: string[];
  allowed_actions: string[];
  max_pause_minutes: number;
  capability_ttl_minutes: number;
  published_at: number;
  eligible_at: number;
  activation_delay_minutes: number;
  charter_digest: string;
};

export type IncidentRecord = {
  incident_key: string;
  charter_key: string;
  charter_digest: string;
  protocol_key: string;
  requester: string;
  target: string;
  action_class: string;
  duration_minutes: number;
  reason: string;
  evidence_urls: string[];
  opened_at: number;
  incident_digest: string;
  action_digest: string;
  status: string;
  assessment_json: string;
  assessment_digest: string;
  assessment_count: number;
  capability_key: string;
};

export type CapabilityRecord = {
  capability_key: string;
  incident_key: string;
  holder: string;
  target: string;
  action_class: string;
  duration_minutes: number;
  action_digest: string;
  charter_digest: string;
  assessment_digest: string;
  issued_at: number;
  expires_at: number;
  consumed: boolean;
  consumed_at: number;
};

export async function getCharter(key: string): Promise<CharterRecord | null> {
  const raw = await readContract<string>(ADDRESSES.charterRegistry, "get_charter_json", [key]);
  return raw ? (JSON.parse(raw) as CharterRecord) : null;
}

export async function getIncident(key: string): Promise<IncidentRecord | null> {
  const raw = await readContract<string>(ADDRESSES.exigencyEngine, "get_incident_json", [key]);
  return raw ? (JSON.parse(raw) as IncidentRecord) : null;
}

export async function getCapability(key: string): Promise<CapabilityRecord | null> {
  const raw = await readContract<string>(ADDRESSES.capabilityGate, "get_capability_json", [key]);
  return raw ? (JSON.parse(raw) as CapabilityRecord) : null;
}

export async function getVaultStatus() {
  const raw = await readContract<string>(ADDRESSES.protectedVault, "get_status_json", []);
  return JSON.parse(raw) as Record<string, unknown>;
}

export async function listCharterKeys() {
  return readContract<string[]>(ADDRESSES.charterRegistry, "list_charter_keys", []);
}

export async function listIncidentKeys() {
  return readContract<string[]>(ADDRESSES.exigencyEngine, "list_incident_keys", []);
}

export async function listCapabilityKeys() {
  return readContract<string[]>(ADDRESSES.capabilityGate, "list_capability_keys", []);
}

export async function publishCharter(account: `0x${string}`, args: unknown[]) {
  return submitWrite(account, ADDRESSES.charterRegistry, "publish_charter", args);
}

export async function activateCharter(account: `0x${string}`, charterKey: string) {
  return submitWrite(account, ADDRESSES.charterRegistry, "activate_charter", [charterKey]);
}

export async function openIncident(account: `0x${string}`, args: unknown[]) {
  return submitWrite(account, ADDRESSES.exigencyEngine, "open_incident", args);
}

export async function assessIncident(account: `0x${string}`, incidentKey: string) {
  return submitWrite(account, ADDRESSES.exigencyEngine, "assess_incident", [incidentKey]);
}

export async function executeCapability(account: `0x${string}`, capability: CapabilityRecord) {
  return submitWrite(account, ADDRESSES.capabilityGate, "execute_capability", [
    capability.capability_key,
    capability.target,
    capability.action_class,
    capability.duration_minutes,
  ]);
}

export async function depositToVault(account: `0x${string}`, value: bigint) {
  return submitWrite(account, ADDRESSES.protectedVault, "deposit", [], value);
}

export async function withdrawFromVault(account: `0x${string}`, value: bigint) {
  return submitWrite(account, ADDRESSES.protectedVault, "withdraw", [value]);
}

export async function getVaultCredit(account: string) {
  return readContract<bigint>(ADDRESSES.protectedVault, "get_credit", [account]);
}
