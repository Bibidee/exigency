import { readFileSync } from "node:fs";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const rpc = "https://studio.genlayer.com/api";
const baseUrl = process.env.EXIGENT_HEALTH_BASE_URL || "https://exigency.vercel.app";
const manifest = JSON.parse(readFileSync(new URL("../deployment-manifest.public.json", import.meta.url), "utf8"));
if (Number(manifest.chainId) !== 61999 || manifest.rpc.replace(/\/$/, "") !== rpc) throw new Error("health check refused a non-Studionet manifest");
for (const route of ["/", "/command", "/vault"]) {
  const response = await fetch(`${baseUrl}${route}`, { redirect: "follow" });
  const body = await response.text();
  if (!response.ok || /Application error|This page could not load/i.test(body)) throw new Error(`frontend health failed for ${route}: HTTP ${response.status}`);
}
const buildInfoResponse = await fetch(`${baseUrl}/api/build-info`, { redirect: "follow", cache: "no-store" });
if (!buildInfoResponse.ok) throw new Error(`frontend build provenance failed: HTTP ${buildInfoResponse.status}`);
const buildInfo = await buildInfoResponse.json();
const expectedFrontendCommit = process.env.EXPECTED_FRONTEND_COMMIT || manifest.frontend?.sourceCommit || "";
if (expectedFrontendCommit && buildInfo.gitCommitSha !== expectedFrontendCommit) {
  throw new Error(`frontend commit mismatch: expected ${expectedFrontendCommit}, got ${buildInfo.gitCommitSha}`);
}
const rpcResponse = await fetch(rpc, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "gen_getContractSchema", params: [manifest.contracts.protectedVault] }) });
if (!rpcResponse.ok) throw new Error(`Studionet RPC returned HTTP ${rpcResponse.status}`);
const client = createClient({ chain: studionet, endpoint: rpc });
const charterKeys = await client.readContract({ address: manifest.contracts.charterRegistry, functionName: "list_charter_keys", args: [] });
const incidentKeys = await client.readContract({ address: manifest.contracts.exigencyEngine, functionName: "list_incident_keys", args: [] });
const capabilityKeys = await client.readContract({ address: manifest.contracts.capabilityGate, functionName: "list_capability_keys", args: [] });
const raw = await client.readContract({ address: manifest.contracts.protectedVault, functionName: "get_status_json", args: [] });
const status = JSON.parse(raw);
if (status.gate_address.toLowerCase() !== manifest.contracts.capabilityGate.toLowerCase()) throw new Error("ProtectedVault gate address does not match the deployment manifest");
if (typeof status.protected_action_paused !== "boolean") throw new Error("Protected target status is not from the current non-custodial schema");
if (typeof status.protected_action_count !== "string") throw new Error("Protected target action count is unavailable");
const engine = await client.readContract({ address: manifest.contracts.capabilityGate, functionName: "get_engine_address", args: [] });
if (String(engine).toLowerCase() !== manifest.contracts.exigencyEngine.toLowerCase()) throw new Error("CapabilityGate engine address does not match the deployment manifest");
console.log(JSON.stringify({ baseUrl, buildInfo, network: manifest.network, chainId: manifest.chainId, rpcReachable: true, routes: ["/", "/command", "/vault"], contractsRead: { charterRegistry: true, exigencyEngine: true, capabilityGate: true, protectedVault: true }, counts: { charters: charterKeys.length, incidents: incidentKeys.length, capabilities: capabilityKeys.length }, protectedVault: manifest.contracts.protectedVault, protectedActionPaused: status.protected_action_paused, protectedActionCount: status.protected_action_count }));
