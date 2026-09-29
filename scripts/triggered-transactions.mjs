import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const hash = process.argv[2];
if (!/^0x[0-9a-fA-F]+$/.test(hash || "")) throw new Error("a transaction hash is required");

const client = createClient({ chain: studionet, endpoint: "https://studio.genlayer.com/api" });
console.log(JSON.stringify(await client.getTriggeredTransactionIds({ hash })));
