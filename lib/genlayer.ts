"use client";

import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionHashVariant } from "genlayer-js/types";
import { NETWORK } from "@/lib/config";

type ProviderError = Error & { code?: number };
type InjectedProvider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
  isBraveWallet?: boolean;
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
  providers?: InjectedProvider[];
};

declare global {
  interface Window {
    ethereum?: InjectedProvider;
  }
}

export type WalletState = {
  address: `0x${string}`;
};

const STUDIONET_HEX = "0xf22f";

function injectedProvider() {
  const injected = window.ethereum;
  if (!injected) return undefined;
  const providers = injected.providers;
  if (!providers?.length) return injected;
  return providers.find((provider) => provider.isBraveWallet || provider.isMetaMask || provider.isCoinbaseWallet) ?? providers[0];
}

export function readClient() {
  return createClient({ chain: studionet, endpoint: NETWORK.rpc });
}

async function ensureStudionet() {
  const provider = injectedProvider();
  if (!provider) throw new Error("No injected EIP-1193 wallet was detected.");

  const current = String(await provider.request({ method: "eth_chainId" })).toLowerCase();
  if (current === STUDIONET_HEX) return;

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: STUDIONET_HEX }],
    });
  } catch (error) {
    const providerError = error as ProviderError;
    if (providerError.code !== 4902) {
      throw new Error(`EXIGENT requires Studionet 61999. Wallet network switch failed: ${providerError.message}`);
    }
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: STUDIONET_HEX,
        chainName: "GenLayer Studionet",
        nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
        rpcUrls: [NETWORK.rpc],
        blockExplorerUrls: [NETWORK.explorer],
      }],
    });
  }

  const after = String(await provider.request({ method: "eth_chainId" })).toLowerCase();
  if (after !== STUDIONET_HEX) {
    throw new Error(`Wallet is on chain ${after}; EXIGENT only supports Studionet 61999 (${STUDIONET_HEX}).`);
  }
}

export async function connectWallet(): Promise<WalletState> {
  const provider = injectedProvider();
  if (!provider) throw new Error("No injected EIP-1193 wallet was detected.");
  await ensureStudionet();
  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  const address = accounts?.[0] as `0x${string}` | undefined;
  if (!address) throw new Error("Wallet returned no account.");
  const client = createClient({ chain: studionet, account: address, provider: provider as never });
  await client.connect("studionet");
  return { address };
}

export function walletClient(address: `0x${string}`) {
  const provider = injectedProvider();
  if (!provider) throw new Error("No injected wallet detected.");
  return createClient({ chain: studionet, account: address, provider: provider as never });
}

export async function readContract<T>(address: string, functionName: string, args: unknown[] = []) {
  if (!address) throw new Error("Contract address is not configured.");
  const client = readClient();
  return client.readContract({
    address: address as `0x${string}`,
    functionName,
    args,
    transactionHashVariant: TransactionHashVariant.LATEST_FINAL,
  } as never) as Promise<T>;
}

export async function submitWrite(
  account: `0x${string}`,
  address: string,
  functionName: string,
  args: unknown[] = [],
  value: bigint = 0n,
) {
  if (!address) throw new Error("Contract address is not configured.");
  await ensureStudionet();
  const client = walletClient(account);
  await client.connect("studionet");
  const call = { address: address as `0x${string}`, functionName, args, value };
  const hash = await client.writeContract(call as never);
  return hash as `0x${string}`;
}

export async function waitForFinalization(hash: `0x${string}`) {
  const client = readClient();
  return client.waitForTransactionReceipt({
    hash: hash as never,
    status: "FINALIZED",
    retries: 360,
    interval: 5000,
    fullTransaction: true,
  } as never);
}

export async function getTransaction(hash: `0x${string}`) {
  return readClient().getTransaction({ hash: hash as never });
}
