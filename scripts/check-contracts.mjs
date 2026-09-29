import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const pythonCandidates = process.platform === "win32"
  ? [join(root, ".python312", "python.exe"), "python"]
  : ["python3", "python"];
const lintCandidates = process.platform === "win32"
  ? [join(root, ".python312", "Scripts", "genvm-lint.exe"), "genvm-lint"]
  : ["genvm-lint"];

function command(candidates, args, label) {
  for (const executable of candidates) {
    if (executable.includes("\\") && !existsSync(executable)) continue;
    const result = spawnSync(executable, args, {
      cwd: root,
      stdio: "inherit",
      shell: false,
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    });
    if (result.error?.code === "ENOENT") continue;
    if (result.error) throw result.error;
    if (result.status !== 0) process.exit(result.status ?? 1);
    return;
  }
  throw new Error(`${label} was not found`);
}

const contracts = ["capability_gate.py", "charter_registry.py", "exigency_engine.py", "protected_vault.py"];
for (const contract of contracts) command(pythonCandidates, ["-m", "py_compile", join("contracts", contract)], "Python");
if (process.argv.includes("--compile-only")) process.exit(0);
for (const contract of contracts) {
  const path = join("contracts", contract);
  console.log(`===== ${path}: genvm-lint check =====`);
  command(lintCandidates, ["check", path], "genvm-lint");
  console.log(`===== ${path}: genvm-lint validate =====`);
  command(lintCandidates, ["validate", path], "genvm-lint");
}
