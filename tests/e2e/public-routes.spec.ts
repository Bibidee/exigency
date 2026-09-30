import { expect, test } from "@playwright/test";

const routes = ["/", "/command", "/vault"];

test.describe("public EXIGENT browser regression", () => {
  for (const route of routes) {
    test(`${route} renders without a browser crash`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(response?.status(), `${route} must be publicly reachable`).toBeLessThan(400);
      await expect(page.locator("body")).not.toContainText("Application error");
      await expect(page.locator("body")).not.toContainText("This page could not load");
    });
  }

  test("vault exposes one shared wallet control and a safe read state", async ({ page }) => {
    await page.goto("/vault", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Protected Vault" })).toBeVisible();
    await expect(page.getByRole("button", { name: /connect wallet/i })).toHaveCount(1);
    await expect(page.getByText("Withdrawals", { exact: true })).toBeVisible();
    await expect(page.getByText("Deposits", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Deposit" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Withdraw" })).toBeVisible();
  });

  test("wallet account restoration is centralized and reacts before reads", async ({ page }) => {
    const account = "0x4a7d0000000000000000000000000000000032f5";
    await page.addInitScript(({ account }) => {
      window.sessionStorage.setItem("exigent.wallet", account);
      window.ethereum = {
        request: async ({ method }: { method: string }) => {
          if (method === "eth_accounts") return [account];
          if (method === "eth_chainId") return "0xf22f";
          return null;
        },
        on: () => undefined,
        removeListener: () => undefined,
      };
    }, { account });
    await page.goto("/vault", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/0x4a7d.*32f5/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /disconnect wallet/i })).toBeVisible();
    await expect(page.locator("body")).not.toContainText("[object Object]");
  });

  test("application disconnect survives reload until reconnect", async ({ page }) => {
    const account = "0x4a7d0000000000000000000000000000000032f5";
    await page.addInitScript(({ account }) => {
      window.ethereum = {
        request: async ({ method }: { method: string }) => method === "eth_accounts" ? [account] : "0xf22f",
        on: () => undefined,
        removeListener: () => undefined,
      };
    }, { account });
    await page.goto("/vault", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: /disconnect wallet/i })).toBeVisible();
    await page.getByRole("button", { name: /disconnect wallet/i }).click({ force: true });
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: /connect wallet/i })).toBeVisible();
  });

  test("vault rejects malformed GEN amounts before any wallet write", async ({ page }) => {
    const account = "0x4a7d0000000000000000000000000000000032f5";
    await page.addInitScript(({ account }) => {
      window.ethereum = {
        request: async ({ method }: { method: string }) => method === "eth_accounts" ? [account] : "0xf22f",
        on: () => undefined,
        removeListener: () => undefined,
      };
    }, { account });
    await page.goto("/vault", { waitUntil: "networkidle" });
    await page.locator('input[inputmode="decimal"]').first().fill("-0.1");
    await expect(page.getByRole("button", { name: "Deposit" })).toBeDisabled();
  });

  test("missing or rolled-back incidents do not remain on an infinite loading state", async ({ page }) => {
    await page.goto("/incident/INC-PLAYWRIGHT-MISSING-20260929", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/was not found on Studionet|No incident record is available/i).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Loading incident from Studionet…", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Open Incident/i })).toBeVisible();
  });

  test("acknowledged payout can be re-proven after reload before success closure", async ({ page }) => {
    const account = "0x4a7d0000000000000000000000000000000032f5";
    await page.addInitScript(({ account }) => {
      let closed = false;
      const withdrawal = () => ({
        withdrawal_id: "W-ACK-RELOAD-01",
        holder: account,
        destination: account,
        amount: "5000000000000000",
        status: closed ? "SUCCESS_CLOSED" : "ACKNOWLEDGED",
        requested_at: 1,
        retry_count: 0,
        recovery_pending: !closed,
      });
      window.sessionStorage.setItem("exigent.wallet", account);
      window.sessionStorage.setItem("exigent.withdrawal.id", "W-ACK-RELOAD-01");
      window.sessionStorage.setItem("exigent.withdrawal.parent", "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
      window.ethereum = {
        request: async ({ method }: { method: string }) => method === "eth_accounts" ? [account] : method === "eth_chainId" ? "0xf22f" : null,
        on: () => undefined,
        removeListener: () => undefined,
      };
      window.__EXIGENT_E2E_MOCK__ = {
        readContract: async (_address, functionName) => {
          if (functionName === "get_status_json") return JSON.stringify({ gate_address: "0x1111111111111111111111111111111111111111", total_credits: "10000000000000000", withdrawals_paused: false, deposits_paused: false, withdrawals_paused_until: 0, deposits_paused_until: 0 });
          if (functionName === "get_credit") return "5000000000000000";
          if (functionName === "get_active_withdrawal_key") return "";
          if (functionName === "get_holder_withdrawal_keys") return ["W-ACK-RELOAD-01"];
          if (functionName === "get_withdrawal_json") return JSON.stringify(withdrawal());
          return "";
        },
        waitForFinalization: async () => undefined,
        waitForTriggeredValueTransfer: async () => "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as `0x${string}`,
        getTransaction: async () => ({ statusName: "FINALIZED" }),
        submitWrite: async (_account, _address, functionName) => {
          if (functionName === "close_successful_withdrawal") closed = true;
          return "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc" as `0x${string}`;
        },
      };
    }, { account });

    await page.goto("/vault", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("ACKNOWLEDGED", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Close successful payout" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Re-prove successful payout" })).toBeVisible();

    await page.getByRole("button", { name: "Re-prove successful payout" }).click();
    await expect(page.getByText(/Payout child finalized/).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Close successful payout" })).toBeEnabled();

    await page.getByRole("button", { name: "Close successful payout" }).click();
    await expect(page.getByText("SUCCESS CLOSED", { exact: true })).toBeVisible();
  });

  test("a rejected success-close leaves ACKNOWLEDGED state retryable", async ({ page }) => {
    const account = "0x4a7d0000000000000000000000000000000032f5";
    await page.addInitScript(({ account }) => {
      const withdrawalId = "W-CLOSE-RETRY-01";
      const parent = "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";
      const child = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
      window.sessionStorage.setItem("exigent.wallet", account);
      window.sessionStorage.setItem("exigent.withdrawal.id", withdrawalId);
      window.sessionStorage.setItem("exigent.withdrawal.parent", parent);
      window.sessionStorage.setItem("exigent.withdrawal.child", child);
      if (!window.sessionStorage.getItem("mock.withdrawal.status")) window.sessionStorage.setItem("mock.withdrawal.status", "DISPATCHED");
      if (!window.sessionStorage.getItem("mock.close.attempts")) window.sessionStorage.setItem("mock.close.attempts", "0");
      window.ethereum = {
        request: async ({ method }: { method: string }) => method === "eth_accounts" ? [account] : method === "eth_chainId" ? "0xf22f" : null,
        on: () => undefined,
        removeListener: () => undefined,
      };
      window.__EXIGENT_E2E_MOCK__ = {
        readContract: async (_address, functionName) => {
          if (functionName === "get_status_json") return JSON.stringify({ gate_address: "0x1111111111111111111111111111111111111111", total_credits: "10000000000000000", withdrawals_paused: false, deposits_paused: false, withdrawals_paused_until: 0, deposits_paused_until: 0 });
          if (functionName === "get_credit") return "5000000000000000";
          if (functionName === "get_active_withdrawal_key") return window.sessionStorage.getItem("mock.withdrawal.status") === "DISPATCHED" ? withdrawalId : "";
          if (functionName === "get_holder_withdrawal_keys") return [withdrawalId];
          if (functionName === "get_withdrawal_json") return JSON.stringify({ withdrawal_id: withdrawalId, holder: account, destination: account, amount: "5000000000000000", status: window.sessionStorage.getItem("mock.withdrawal.status") || "DISPATCHED", requested_at: 1, retry_count: 0, recovery_pending: true });
          return "";
        },
        waitForFinalization: async () => undefined,
        waitForTriggeredValueTransfer: async () => child as `0x${string}`,
        getTransaction: async () => ({ statusName: "FINALIZED" }),
        submitWrite: async (_account, _address, functionName) => {
          if (functionName === "settle_withdrawal") {
            window.sessionStorage.setItem("mock.withdrawal.status", "ACKNOWLEDGED");
            return "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
          }
          if (functionName === "close_successful_withdrawal") {
            const attempts = Number(window.sessionStorage.getItem("mock.close.attempts") || "0");
            window.sessionStorage.setItem("mock.close.attempts", String(attempts + 1));
            if (attempts === 0) throw new Error("Wallet rejected the success-close transaction.");
            window.sessionStorage.setItem("mock.withdrawal.status", "SUCCESS_CLOSED");
          }
          return "0x9999999999999999999999999999999999999999999999999999999999999999";
        },
      };
    }, { account });

    await page.goto("/vault", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("DISPATCHED", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Acknowledge and close payout" }).click();
    await expect(page.getByText("Wallet rejected the success-close transaction.", { exact: false })).toBeVisible();
    await expect(page.getByText("ACKNOWLEDGED", { exact: true })).toBeVisible();
    await expect(page.getByText("Payout acknowledged and success-closed", { exact: false })).toHaveCount(0);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByText("ACKNOWLEDGED", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Close successful payout" })).toBeEnabled();
    await page.getByRole("button", { name: "Close successful payout" }).click();
    await expect(page.getByText("SUCCESS CLOSED", { exact: true })).toBeVisible();
  });
});
