import { readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const required = {
  "genlayer": "0.39.1",
  "genlayer-js": "1.1.8",
};

for (const [name, version] of Object.entries(required)) {
  const actual = packageJson.devDependencies?.[name] ?? packageJson.dependencies?.[name];
  if (actual !== version) throw new Error(`${name} must remain pinned to ${version}; found ${actual ?? "missing"}`);
}

const config = readFileSync(new URL("../lib/config.ts", import.meta.url), "utf8");
if (!config.includes("61999") || !config.includes("https://studio.genlayer.com/api")) {
  throw new Error("frontend network configuration is not pinned to Studionet 61999");
}
if (config.includes("61997") || config.includes("studio-dev.genlayer.com")) {
  throw new Error("preview GenLayer network configuration is present");
}

console.log("EXIGENT toolchain configuration: Studionet 61999, genlayer 0.39.1, genlayer-js 1.1.8");
