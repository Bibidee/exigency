"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { explorerTx } from "@/lib/config";
import { getTransaction } from "@/lib/genlayer";

function extractStatus(tx: unknown): string {
  if (!tx || typeof tx !== "object") return "SUBMITTED";
  const record = tx as Record<string, unknown>;
  return String(record.statusName ?? record.status_name ?? record.status ?? "SUBMITTED").toUpperCase();
}

function isTerminal(status: string) {
  return ["FINALIZED", "UNDETERMINED", "CANCELED", "CANCELLED", "FAILED", "7"].includes(status);
}

export default function TxNotice({ hash, label = "Transaction submitted" }: { hash: string; label?: string }) {
  const [status, setStatus] = useState("SUBMITTED");

  useEffect(() => {
    if (!/^0x[0-9a-fA-F]+$/.test(hash)) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      try {
        const tx = await getTransaction(hash as `0x${string}`);
        if (cancelled) return;
        const next = extractStatus(tx);
        setStatus(next);
        if (!isTerminal(next)) timer = setTimeout(poll, 4000);
      } catch {
        if (!cancelled) timer = setTimeout(poll, 5000);
      }
    }

    poll();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [hash]);

  return (
    <div className="tx-notice">
      <div><span className="pulse-dot" /><b>{label}</b><small>{hash}</small><small className="tx-status">Consensus: {status}</small></div>
      <a href={explorerTx(hash)} target="_blank" rel="noreferrer">Explorer <ExternalLink size={13} /></a>
    </div>
  );
}
