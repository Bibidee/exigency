"use client";

import { useEffect, useState } from "react";
import { PlugZap, WalletCards } from "lucide-react";
import { connectWallet } from "@/lib/genlayer";

export default function WalletButton({ compact = false, onConnected }: { compact?: boolean; onConnected?: (address: `0x${string}`) => void }) {
  const [address, setAddress] = useState<`0x${string}` | "">("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const saved = window.sessionStorage.getItem("exigent.wallet") as `0x${string}` | null;
    if (saved) {
      setAddress(saved);
      onConnected?.(saved);
    }
  }, [onConnected]);

  async function connect() {
    setBusy(true); setError("");
    try {
      const wallet = await connectWallet();
      setAddress(wallet.address);
      window.sessionStorage.setItem("exigent.wallet", wallet.address);
      onConnected?.(wallet.address);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  }

  if (address) {
    return <button className={compact ? "wallet-pill compact" : "wallet-pill"} title={address}><WalletCards size={15} /> {address.slice(0, 6)}…{address.slice(-4)}</button>;
  }

  return (
    <div className="wallet-wrap">
      <button className={compact ? "wallet-pill compact" : "wallet-pill"} onClick={connect} disabled={busy}>
        <PlugZap size={15} /> {busy ? "Connecting…" : "Connect wallet"}
      </button>
      {error && !compact ? <div className="inline-error">{error}</div> : null}
    </div>
  );
}
