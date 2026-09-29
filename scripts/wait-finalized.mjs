import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const hash = process.argv[2];
if (!/^0x[0-9a-fA-F]+$/.test(hash || "")) throw new Error("a transaction hash is required");

const client = createClient({ chain: studionet, endpoint: "https://studio.genlayer.com/api" });
const receipt = await client.waitForTransactionReceipt({ hash, status: "FINALIZED", retries: 360, interval: 5000 });
const leader = receipt?.consensus_data?.leader_receipt?.find((entry) => entry?.execution_result)?.execution_result;
const result = receipt?.txExecutionResultName ?? (leader === "SUCCESS" ? "FINISHED_WITH_RETURN" : leader === "ERROR" ? "FINISHED_WITH_ERROR" : undefined);
if (result !== "FINISHED_WITH_RETURN") throw new Error(`finalized without successful execution: ${hash} (${String(result ?? "unknown")})`);
console.log(JSON.stringify({ hash, result }));
