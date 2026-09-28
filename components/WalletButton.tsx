"use client";

import { useWallet } from "@/components/WalletProvider";
import { PlugZap, WalletCards } from "lucide-react";

export default function WalletButton({ compact = false }: { compact?: boolean }) {
  const { address, error, busy, connect } = useWallet();

  if (address) {
    return <button className={compact ? "wallet-pill compact" : "wallet-pill"} title={address}><WalletCards size={15} /> {address.slice(0, 6)}…{address.slice(-4)}</button>;
  }

  return (
    <div className="wallet-wrap">
      <button className={compact ? "wallet-pill compact" : "wallet-pill"} onClick={() => void connect()} disabled={busy}>
        <PlugZap size={15} /> {busy ? "Connecting…" : "Connect wallet"}
      </button>
      {error && !compact ? <div className="inline-error">{error}</div> : null}
    </div>
  );
}
