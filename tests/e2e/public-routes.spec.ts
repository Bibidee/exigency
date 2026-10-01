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

  test("vault exposes one shared wallet control and no dead payout surface", async ({ page }) => {
    await page.goto("/vault", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Protected Action", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /connect wallet/i })).toHaveCount(1);
    await expect(page.getByText("Value custody", { exact: true })).toBeVisible();
    await expect(page.getByText("NONE", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Execute protected action" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Deposit" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Withdraw" })).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText("FAILED_RECOVERABLE");
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

  test("protected action uses a finalized write and refreshes authoritative state", async ({ page }) => {
    const account = "0x4a7d0000000000000000000000000000000032f5";
    await page.addInitScript(({ account }) => {
      let count = 0;
      window.ethereum = {
        request: async ({ method }: { method: string }) => method === "eth_accounts" ? [account] : method === "eth_chainId" ? "0xf22f" : null,
        on: () => undefined,
        removeListener: () => undefined,
      };
      window.__EXIGENT_E2E_MOCK__ = {
        readContract: async (_address, functionName) => {
          if (functionName === "get_status_json") return JSON.stringify({ gate_address: "0x1111111111111111111111111111111111111111", protected_action_count: String(count), protected_action_paused: false, protected_action_paused_until: 0, last_emergency_json: "" });
          return "";
        },
        submitWrite: async () => {
          count += 1;
          return "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as `0x${string}`;
        },
        waitForFinalization: async () => undefined,
      };
    }, { account });
    await page.goto("/vault", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Execute protected action" }).click();
    await expect(page.getByText("Protected action finalized and state refreshed", { exact: true })).toBeVisible();
    await expect(page.getByText("1", { exact: true }).first()).toBeVisible();
  });

  test("paused protected action is visibly unavailable", async ({ page }) => {
    await page.addInitScript(() => {
      window.__EXIGENT_E2E_MOCK__ = {
        readContract: async (_address, functionName) => functionName === "get_status_json"
          ? JSON.stringify({ gate_address: "0x1111111111111111111111111111111111111111", protected_action_count: "0", protected_action_paused: true, protected_action_paused_until: 4102444800, last_emergency_json: "{}" })
          : "",
      };
    });
    await page.goto("/vault", { waitUntil: "networkidle" });
    await expect(page.getByText("PAUSED", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Execute protected action" })).toBeDisabled();
  });

  test("missing incidents do not remain on an infinite loading state", async ({ page }) => {
    await page.goto("/incident/INC-PLAYWRIGHT-MISSING-20260929", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/was not found on Studionet|No incident record is available/i).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Loading incident from Studionet…", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Open Incident/i })).toBeVisible();
  });
});
