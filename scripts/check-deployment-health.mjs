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
const rpcResponse = await fetch(rpc, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "gen_getChainId", params: [] }) });
if (!rpcResponse.ok) throw new Error(`Studionet RPC returned HTTP ${rpcResponse.status}`);
const client = createClient({ chain: studionet, endpoint: rpc });
const raw = await client.readContract({ address: manifest.contracts.protectedVault, functionName: "get_status_json", args: [] });
const status = JSON.parse(raw);
if (status.gate_address.toLowerCase() !== manifest.contracts.capabilityGate.toLowerCase()) throw new Error("ProtectedVault gate address does not match the deployment manifest");
const engine = await client.readContract({ address: manifest.contracts.capabilityGate, functionName: "get_engine_address", args: [] });
if (String(engine).toLowerCase() !== manifest.contracts.exigencyEngine.toLowerCase()) throw new Error("CapabilityGate engine address does not match the deployment manifest");
console.log(JSON.stringify({ baseUrl, network: manifest.network, chainId: manifest.chainId, routes: ["/", "/command", "/vault"], protectedVault: manifest.contracts.protectedVault, withdrawalsPaused: status.withdrawals_paused, depositsPaused: status.deposits_paused }));
