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
    await expect(page.getByRole("button", { name: /0x4a7d.*32f5/i })).toBeVisible();
    await expect(page.locator("body")).not.toContainText("[object Object]");
  });
});
