"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { connectWallet, getInjectedProvider, walletErrorMessage } from "@/lib/genlayer";

type Address = `0x${string}` | "";
type WalletContextValue = {
  address: Address;
  busy: boolean;
  error: string;
  connect: () => Promise<void>;
  disconnect: () => void;
  clearError: () => void;
};

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<Address>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const applyAddress = useCallback((next: Address) => {
    setAddress(next);
    if (next) window.sessionStorage.setItem("exigent.wallet", next);
    else window.sessionStorage.removeItem("exigent.wallet");
  }, []);

  const sync = useCallback(async () => {
    if (window.sessionStorage.getItem("exigent.wallet.disconnected") === "1") return;
    const provider = getInjectedProvider();
    if (!provider) return;
    try {
      const accounts = await provider.request({ method: "eth_accounts" }) as string[];
      applyAddress((accounts?.[0] as Address | undefined) ?? "");
    } catch {
      // An injected wallet can be unavailable while the extension is starting.
    }
  }, [applyAddress]);

  useEffect(() => {
    const provider = getInjectedProvider();
    if (!provider) return;
    void sync();
    const onAccountsChanged = (...args: unknown[]) => {
      const next = Array.isArray(args[0]) ? args[0][0] as Address | undefined : undefined;
      applyAddress(next ?? "");
    };
    provider.on?.("accountsChanged", onAccountsChanged);
    provider.on?.("chainChanged", sync);
    return () => {
      provider.removeListener?.("accountsChanged", onAccountsChanged);
      provider.removeListener?.("chainChanged", sync);
    };
  }, [applyAddress, sync]);

  const connect = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const wallet = await connectWallet();
      window.sessionStorage.removeItem("exigent.wallet.disconnected");
      applyAddress(wallet.address);
    } catch (cause) {
      setError(walletErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }, [applyAddress]);

  const disconnect = useCallback(() => {
    setError("");
    window.sessionStorage.setItem("exigent.wallet.disconnected", "1");
    applyAddress("");
  }, [applyAddress]);

  const value = useMemo(() => ({ address, busy, error, connect, disconnect, clearError: () => setError("") }), [address, busy, error, connect, disconnect]);
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const value = useContext(WalletContext);
  if (!value) throw new Error("useWallet must be used inside WalletProvider");
  return value;
}
