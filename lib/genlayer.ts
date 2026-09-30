"use client";

import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { ExecutionResult, TransactionHashVariant } from "genlayer-js/types";
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

type BrowserE2eMock = {
  readContract?: (address: string, functionName: string, args: unknown[]) => unknown | Promise<unknown>;
  submitWrite?: (account: string, address: string, functionName: string, args: unknown[], value: bigint) => `0x${string}` | Promise<`0x${string}`>;
  waitForFinalization?: (hash: `0x${string}`) => unknown | Promise<unknown>;
  waitForTriggeredValueTransfer?: (parentHash: `0x${string}`, expectedRecipient: string, expectedAmount: bigint) => `0x${string}` | Promise<`0x${string}`>;
  getTransaction?: (hash: `0x${string}`) => unknown | Promise<unknown>;
};

declare global {
  interface Window {
    ethereum?: InjectedProvider;
    __EXIGENT_E2E_MOCK__?: BrowserE2eMock;
  }
}

export type WalletState = {
  address: `0x${string}`;
};

const STUDIONET_HEX = "0xf22f";

export function walletErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  if (error && typeof error === "object") {
    const value = error as { message?: unknown; reason?: unknown; data?: { message?: unknown } };
    for (const candidate of [value.message, value.reason, value.data?.message]) {
      if (typeof candidate === "string" && candidate.trim()) return candidate;
    }
    try { return JSON.stringify(error); } catch { return "The wallet returned an unreadable error."; }
  }
  return "The wallet connection failed.";
}

export function getInjectedProvider() {
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
  const provider = getInjectedProvider();
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
  const provider = getInjectedProvider();
  if (!provider) throw new Error("No injected EIP-1193 wallet was detected.");
  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  const address = accounts?.[0] as `0x${string}` | undefined;
  if (!address) throw new Error("Wallet returned no account.");
  await ensureStudionet();
  return { address };
}

export function walletClient(address: `0x${string}`) {
  const provider = getInjectedProvider();
  if (!provider) throw new Error("No injected wallet detected.");
  return createClient({ chain: studionet, account: address, provider: provider as never });
}

export async function readContract<T>(address: string, functionName: string, args: unknown[] = []) {
  if (!address) throw new Error("Contract address is not configured.");
  if (process.env.NODE_ENV !== "production" && typeof window !== "undefined" && window.__EXIGENT_E2E_MOCK__?.readContract) {
    return await window.__EXIGENT_E2E_MOCK__.readContract(address, functionName, args) as T;
  }
  const client = readClient();
  let lastError: unknown;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await client.readContract({
        address: address as `0x${string}`,
        functionName,
        args,
        transactionHashVariant: TransactionHashVariant.LATEST_FINAL,
      } as never) as T;
    } catch (error) {
      lastError = error;
      if (attempt < 4) await new Promise((resolve) => setTimeout(resolve, 1000 * (2 ** attempt)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(walletErrorMessage(lastError));
}

export async function submitWrite(
  account: `0x${string}`,
  address: string,
  functionName: string,
  args: unknown[] = [],
  value: bigint = 0n,
) {
  if (!address) throw new Error("Contract address is not configured.");
  if (process.env.NODE_ENV !== "production" && typeof window !== "undefined" && window.__EXIGENT_E2E_MOCK__?.submitWrite) {
    return await window.__EXIGENT_E2E_MOCK__.submitWrite(account, address, functionName, args, value);
  }
  await ensureStudionet();
  const client = walletClient(account);
  const call = { address: address as `0x${string}`, functionName, args, value };
  const hash = await client.writeContract(call as never);
  return hash as `0x${string}`;
}

type TransactionReceiptRecord = Record<string, unknown>;

function asWei(value: unknown) {
  try {
    return BigInt(String(value ?? "0"));
  } catch {
    return 0n;
  }
}

export async function waitForFinalization(
  hash: `0x${string}`,
  options: { allowValueTransfer?: boolean } = {},
) {
  if (process.env.NODE_ENV !== "production" && typeof window !== "undefined" && window.__EXIGENT_E2E_MOCK__?.waitForFinalization) {
    return await window.__EXIGENT_E2E_MOCK__.waitForFinalization(hash);
  }
  const client = readClient();
  const receipt = await client.waitForTransactionReceipt({
    hash: hash as never,
    status: "FINALIZED",
    retries: 360,
    interval: 5000,
    fullTransaction: true,
  } as never);
  const value = receipt as unknown as TransactionReceiptRecord;
  const directResult = (receipt as { txExecutionResultName?: ExecutionResult }).txExecutionResultName;
  const consensus = value.consensus_data as { leader_receipt?: Array<{ execution_result?: string }> } | undefined;
  const leaderResult = consensus?.leader_receipt?.find((entry) => entry.execution_result)?.execution_result;
  const executionResult = directResult ?? (leaderResult === "SUCCESS" ? ExecutionResult.FINISHED_WITH_RETURN : leaderResult === "ERROR" ? ExecutionResult.FINISHED_WITH_ERROR : undefined);
  const statusName = String(value.statusName ?? value.status_name ?? "").toUpperCase();
  const valueCredited = value.value_credited === true || value.valueCredited === true;
  const nativeValueTransferFinalized = options.allowValueTransfer
    && statusName === "FINALIZED"
    && valueCredited
    && asWei(value.value) > 0n;
  if (executionResult === ExecutionResult.FINISHED_WITH_ERROR) {
    throw new Error(`Studionet finalized the transaction with a contract execution error (${hash}).`);
  }
  if (executionResult !== ExecutionResult.FINISHED_WITH_RETURN && !nativeValueTransferFinalized) {
    throw new Error(`Studionet finalized the transaction without a successful execution result (${hash}).`);
  }
  return receipt;
}

export async function waitForValueTransferFinalization(
  hash: `0x${string}`,
  expectedRecipient: string,
  expectedAmount: bigint,
  expectedParent?: string,
) {
  const receipt = await waitForFinalization(hash, { allowValueTransfer: true });
  const value = receipt as unknown as TransactionReceiptRecord;
  const recipient = String(value.recipient ?? value.to_address ?? "").toLowerCase();
  const triggeredBy = String(value.triggered_by ?? value.triggeredBy ?? "").toLowerCase();
  const actualAmount = asWei(value.value);
  if (recipient !== expectedRecipient.toLowerCase()) {
    throw new Error(`Payout child recipient mismatch for ${hash}.`);
  }
  if (actualAmount !== expectedAmount) {
    throw new Error(`Payout child amount mismatch for ${hash}: expected ${expectedAmount}, got ${actualAmount}.`);
  }
  if (expectedParent && triggeredBy !== expectedParent.toLowerCase()) {
    throw new Error(`Payout child parent mismatch for ${hash}.`);
  }
  if (!(value.value_credited === true || value.valueCredited === true)) {
    throw new Error(`Payout child value was not credited for ${hash}.`);
  }
  return receipt;
}

export async function getTransaction(hash: `0x${string}`) {
  if (process.env.NODE_ENV !== "production" && typeof window !== "undefined" && window.__EXIGENT_E2E_MOCK__?.getTransaction) {
    return await window.__EXIGENT_E2E_MOCK__.getTransaction(hash);
  }
  return readClient().getTransaction({ hash: hash as never });
}

export async function getTriggeredTransactionIds(hash: `0x${string}`): Promise<`0x${string}`[]> {
  const client = readClient() as typeof readClient extends () => infer T ? T : never;
  const ids = await (client as unknown as { getTriggeredTransactionIds(args: { hash: `0x${string}` }): Promise<string[]> }).getTriggeredTransactionIds({ hash });
  return (ids ?? []).filter((id): id is `0x${string}` => typeof id === "string" && id.startsWith("0x")) as `0x${string}`[];
}

export async function waitForTriggeredTransactionIds(
  hash: `0x${string}`,
  retries = 60,
  interval = 2000,
): Promise<`0x${string}`[]> {
  let lastError: unknown;
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const ids = await getTriggeredTransactionIds(hash);
      if (ids.length > 0) return ids;
    } catch (error) {
      lastError = error;
    }
    if (attempt < retries - 1) await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error(`No child transaction was discovered for finalized parent ${hash}.${lastError ? ` ${walletErrorMessage(lastError)}` : ""}`);
}

export async function waitForTriggeredChildren(hash: `0x${string}`): Promise<`0x${string}`[]> {
  const children = await waitForTriggeredTransactionIds(hash);
  for (const child of children) await waitForFinalization(child);
  return children;
}

export async function waitForTriggeredValueTransfer(
  parentHash: `0x${string}`,
  expectedRecipient: string,
  expectedAmount: bigint,
): Promise<`0x${string}`> {
  if (process.env.NODE_ENV !== "production" && typeof window !== "undefined" && window.__EXIGENT_E2E_MOCK__?.waitForTriggeredValueTransfer) {
    return await window.__EXIGENT_E2E_MOCK__.waitForTriggeredValueTransfer(parentHash, expectedRecipient, expectedAmount);
  }
  const children = await waitForTriggeredTransactionIds(parentHash);
  const matches: `0x${string}`[] = [];
  for (const child of children) {
    try {
      await waitForValueTransferFinalization(child, expectedRecipient, expectedAmount, parentHash);
      matches.push(child);
    } catch {
      // A parent may emit other children. Only the uniquely matching, credited payout is acceptable.
    }
  }
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one successful payout child for ${parentHash}, found ${matches.length}.`);
  }
  return matches[0];
}
