"use client";

import { useEffect, useRef, useState } from "react";
import { PlugZap, WalletCards } from "lucide-react";
import { connectWallet, walletErrorMessage } from "@/lib/genlayer";

export default function WalletButton({ compact = false, onConnected }: { compact?: boolean; onConnected?: (address: `0x${string}` | "") => void }) {
  const [address, setAddress] = useState<`0x${string}` | "">("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const onConnectedRef = useRef(onConnected);
  onConnectedRef.current = onConnected;

  useEffect(() => {
    let disposed = false;
    const provider = window.ethereum;
    const sync = async () => {
      if (!provider) return;
      try {
        const accounts = await provider.request({ method: "eth_accounts" }) as string[];
        const active = accounts?.[0] as `0x${string}` | undefined;
        if (disposed) return;
        if (active) {
          setAddress(active);
          window.sessionStorage.setItem("exigent.wallet", active);
          onConnectedRef.current?.(active);
        } else {
          setAddress("");
          window.sessionStorage.removeItem("exigent.wallet");
        }
      } catch { /* wallet may be unavailable until the user connects */ }
    };
    void sync();
    const onAccountsChanged = (...args: unknown[]) => {
      const active = Array.isArray(args[0]) ? args[0][0] as `0x${string}` | undefined : undefined;
      if (active) {
        setAddress(active);
        window.sessionStorage.setItem("exigent.wallet", active);
        onConnectedRef.current?.(active);
      } else {
        setAddress("");
        window.sessionStorage.removeItem("exigent.wallet");
        onConnectedRef.current?.("");
      }
    };
    provider?.on?.("accountsChanged", onAccountsChanged);
    provider?.on?.("chainChanged", sync);
    return () => {
      disposed = true;
      provider?.removeListener?.("accountsChanged", onAccountsChanged);
      provider?.removeListener?.("chainChanged", sync);
    };
  }, []);

  async function connect() {
    setBusy(true); setError("");
    try {
      const wallet = await connectWallet();
      setAddress(wallet.address);
      window.sessionStorage.setItem("exigent.wallet", wallet.address);
      onConnected?.(wallet.address);
    } catch (e) {
      setError(walletErrorMessage(e));
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
