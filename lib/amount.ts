const WEI = 10n ** 18n;

export function parseGenAmount(value: string): bigint {
  const input = value.trim();
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,18})?$/.test(input)) {
    throw new Error("Enter a positive GEN amount with at most 18 decimal places.");
  }
  const [whole, fraction = ""] = input.split(".");
  const amount = BigInt(whole) * WEI + BigInt((fraction + "0".repeat(18)).slice(0, 18));
  if (amount <= 0n) throw new Error("Amount must be greater than zero.");
  return amount;
}

export function formatGenAmount(value: bigint): string {
  return `${value / WEI}.${(value % WEI).toString().padStart(18, "0").slice(0, 4)}`;
}
