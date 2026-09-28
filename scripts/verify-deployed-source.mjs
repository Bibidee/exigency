import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const manifestPath = new URL("../deployment-manifest.generated.json", import.meta.url);
if (!existsSync(manifestPath)) {
  throw new Error("deployment-manifest.generated.json is missing. Deploy EXIGENT first.");
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
if (Number(manifest.chainId) !== 61999) throw new Error(`Refusing provenance check for chain ${manifest.chainId}`);

const client = createClient({ chain: studionet, endpoint: "https://studio.genlayer.com/api" });
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const normalizeEol = (value) => Buffer.from(value.toString("utf8").replace(/\r\n/g, "\n"), "utf8");

const specs = [
  ["CharterRegistry", manifest.contracts?.charterRegistry, "contracts/charter_registry.py"],
  ["ExigencyEngine", manifest.contracts?.exigencyEngine, "contracts/exigency_engine.py"],
  ["CapabilityGate", manifest.contracts?.capabilityGate, "contracts/capability_gate.py"],
  ["ProtectedVault", manifest.contracts?.protectedVault, "contracts/protected_vault.py"],
];

const failures = [];
let checked = 0;
for (const [name, address, path] of specs) {
  if (!address) { failures.push(`${name}: missing address`); continue; }
  const repositoryBytes = readFileSync(new URL(`../${path}`, import.meta.url));
  let deployedBytes;
  try {
    const codeB64 = await client.request({ method: "gen_getContractCode", params: [address] });
    if (typeof codeB64 === "string" && codeB64.length) deployedBytes = Buffer.from(codeB64, "base64");
  } catch (error) {
    console.log(`${name}: gen_getContractCode unavailable: ${String(error).split("\n")[0]}`);
  }

  if (!deployedBytes) {
    failures.push(`${name}: deployed source bytes unavailable from current RPC`);
    continue;
  }

  const exact = deployedBytes.equals(repositoryBytes);
  const normalized = normalizeEol(deployedBytes).equals(normalizeEol(repositoryBytes));
  console.log(`${name}: address=${address}`);
  console.log(`  deployed_sha256=${sha256(deployedBytes)}`);
  console.log(`  repository_sha256=${sha256(repositoryBytes)}`);
  console.log(`  exact_byte_match=${exact}`);
  console.log(`  eol_normalized_match=${normalized}`);
  checked += 1;
  if (!normalized) failures.push(`${name}: deployed source differs from repository source`);
}

if (checked !== specs.length) failures.push(`checked ${checked}/${specs.length} deployed sources`);
if (failures.length) {
  console.error(`UNVERIFIED: ${failures.join("; ")}`);
  process.exitCode = 1;
} else {
  console.log("VERIFIED: all deployed sources exactly match repository source bytes.");
}
