import { expect, test, type Page } from "@playwright/test";

const routes = ["/", "/command", "/vault"];
const owner = "0x4a7d0000000000000000000000000000000032f5";
const official = "https://raw.githubusercontent.com/Bibidee/exigency/main/demo/evidence/active_incident_primary_v2.md";
const independent = "https://github.com/Bibidee/exigency/raw/refs/heads/main/demo/evidence/active_incident_secondary_v2.md";

function mockCharter(overrides: Record<string, unknown> = {}) {
  return {
    charter_key: "CHARTER-E2E-SAFETY",
    protocol_key: "EXIGENT-E2E",
    protocol_name: "EXIGENT E2E safety charter",
    owner,
    protected_target: "0x1e6e9699dD76fc1d3825914e9B8ff5AeF3d140C0",
    trigger_policy: "A bounded trigger policy with enough detail for the test fixture.",
    evidence_policy: "Approved public evidence must be independently retrievable.",
    evidence_hosts: ["raw.githubusercontent.com", "github.com"],
    allowed_actions: ["DISABLE_PROTECTED_ROUTE"],
    max_pause_minutes: 90,
    capability_ttl_minutes: 30,
    published_at: 1,
    eligible_at: 1,
    activation_delay_minutes: 1,
    charter_digest: "a".repeat(64),
    source_groups: [{ name: "official", hosts: ["raw.githubusercontent.com"] }, { name: "independent", hosts: ["github.com"] }],
    minimum_source_groups: 2,
    challenge_window_minutes: 15,
    maximum_challenges: 1,
    ...overrides,
  };
}

function mockIncident(overrides: Record<string, unknown> = {}) {
  const now = Math.floor(Date.now() / 1000);
  return {
    incident_key: "INC-E2E-SAFETY",
    charter_key: "CHARTER-E2E-SAFETY",
    charter_digest: "a".repeat(64),
    protocol_key: "EXIGENT-E2E",
    requester: owner,
    target: "0x1e6e9699dD76fc1d3825914e9B8ff5AeF3d140C0",
    action_class: "DISABLE_PROTECTED_ROUTE",
    duration_minutes: 30,
    reason: "A sufficiently detailed test incident reason that is longer than the contract minimum.",
    evidence_urls: [official, independent],
    opened_at: now - 60,
    expires_at: now + 3600,
    incident_digest: "b".repeat(64),
    action_digest: "c".repeat(64),
    status: "ASSESSMENT_PROVISIONAL",
    assessment_json: JSON.stringify({ decision: "TRIGGER_CONFIRMED", summary: "test assessment", source_states: [] }),
    assessment_digest: "d".repeat(64),
    assessment_count: 1,
    capability_key: "",
    assessment_stage: "PROVISIONAL",
    challenge_deadline: now - 10,
    challenge_count: 0,
    challenge_evidence_urls: [],
    challenge_reasons: [],
    ...overrides,
  };
}

async function installIncidentMock(page: Page, incident: Record<string, unknown>, charter: Record<string, unknown>, previous?: Record<string, unknown>) {
  await page.addInitScript(({ incident, charter, previous, key, owner }) => {
    if (previous) window.sessionStorage.setItem(`exigent.assessment-provenance.${key}`, JSON.stringify(previous));
    window.ethereum = {
      request: async ({ method }: { method: string }) => method === "eth_accounts" ? [owner] : method === "eth_chainId" ? "0xf22f" : null,
      on: () => undefined,
      removeListener: () => undefined,
    };
    window.__EXIGENT_E2E_MOCK__ = {
      readContract: async (_address, functionName) => functionName === "get_incident_json" ? JSON.stringify(incident) : functionName === "get_charter_json" ? JSON.stringify(charter) : "",
    };
  }, { incident, charter, previous, key: String(incident.incident_key), owner });
}

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

  test("assessment guard reserves the final reassessment budget", async ({ page }) => {
    await installIncidentMock(page, mockIncident({ status: "ASSESSMENT_RETRYABLE", assessment_count: 2, assessment_json: JSON.stringify({ decision: "INSUFFICIENT_EVIDENCE", source_states: [] }), challenge_deadline: 0 }), mockCharter());
    await page.goto("/incident/INC-E2E-SAFETY", { waitUntil: "networkidle" });
    await expect(page.getByText(/Assessment attempts remaining: 1\/3/)).toBeVisible();
    await expect(page.getByText(/requires a final reassessment/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Ask GenLayer to assess" })).toBeDisabled();
  });

  test("finalization is available only inside a viable expiry window", async ({ page }) => {
    await installIncidentMock(page, mockIncident(), mockCharter());
    await page.goto("/incident/INC-E2E-SAFETY", { waitUntil: "networkidle" });
    await expect(page.getByText(/finalization window is currently viable/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Finalize after window" })).toBeEnabled();
  });

  test("finalization blocks a deadline that reaches incident expiry", async ({ page }) => {
    const now = Math.floor(Date.now() / 1000);
    await installIncidentMock(page, mockIncident({ challenge_deadline: now + 900, expires_at: now + 900 }), mockCharter());
    await page.goto("/incident/INC-E2E-SAFETY", { waitUntil: "networkidle" });
    await expect(page.getByText(/challenge deadline reaches incident expiry/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Finalize after window" })).toBeDisabled();
  });

  test("finalization blocks an expired or too-close incident", async ({ page }) => {
    const now = Math.floor(Date.now() / 1000);
    await installIncidentMock(page, mockIncident({ challenge_deadline: now - 200, expires_at: now + 60 }), mockCharter());
    await page.goto("/incident/INC-E2E-SAFETY", { waitUntil: "networkidle" });
    await expect(page.getByText(/remaining expiry margin is too small/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Finalize after window" })).toBeDisabled();
  });

  test("finalization blocks an already expired incident", async ({ page }) => {
    const now = Math.floor(Date.now() / 1000);
    await installIncidentMock(page, mockIncident({ challenge_deadline: now - 300, expires_at: now - 1 }), mockCharter());
    await page.goto("/incident/INC-E2E-SAFETY", { waitUntil: "networkidle" });
    await expect(page.getByText(/incident has expired/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Finalize after window" })).toBeDisabled();
  });

  test("challenge guard rejects an incorrectly grouped source", async ({ page }) => {
    await installIncidentMock(page, mockIncident({ challenge_deadline: Math.floor(Date.now() / 1000) + 600 }), mockCharter());
    await page.goto("/incident/INC-E2E-SAFETY", { waitUntil: "networkidle" });
    await page.getByLabel("Additional approved source").fill(`independent|${official}`);
    await expect(page.getByText(/grouped as independent, but the charter assigns it to official/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Submit challenge" })).toBeDisabled();
  });

  test("challenge guard rejects duplicates across frozen evidence and challenges", async ({ page }) => {
    await installIncidentMock(page, mockIncident({ challenge_deadline: Math.floor(Date.now() / 1000) + 600, challenge_evidence_urls: [independent] }), mockCharter({ maximum_challenges: 3 }));
    await page.goto("/incident/INC-E2E-SAFETY", { waitUntil: "networkidle" });
    await page.getByLabel("Additional approved source").fill(`official|${official}`);
    await expect(page.getByText(/already present in the frozen evidence or an earlier challenge/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Submit challenge" })).toBeDisabled();
  });

  test("challenge guard rejects a second challenge over the ten-source limit", async ({ page }) => {
    const initial = Array.from({ length: 8 }, (_, index) => `https://raw.githubusercontent.com/Bibidee/exigency/main/demo/evidence/source-${index}.md`);
    await installIncidentMock(page, mockIncident({ evidence_urls: initial, challenge_evidence_urls: [independent, "https://github.com/Bibidee/exigency/raw/refs/heads/main/demo/evidence/older.md"], challenge_count: 2, challenge_deadline: Math.floor(Date.now() / 1000) + 600 }), mockCharter({ maximum_challenges: 3 }));
    await page.goto("/incident/INC-E2E-SAFETY", { waitUntil: "networkidle" });
    await page.getByLabel("Additional approved source").fill("official|https://raw.githubusercontent.com/Bibidee/exigency/main/demo/evidence/new.md");
    await expect(page.getByText(/would create 11 unique assessment sources/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Submit challenge" })).toBeDisabled();
  });

  test("challenge guard enforces the charter challenge count", async ({ page }) => {
    await installIncidentMock(page, mockIncident({ challenge_count: 1, challenge_deadline: Math.floor(Date.now() / 1000) + 600 }), mockCharter());
    await page.goto("/incident/INC-E2E-SAFETY", { waitUntil: "networkidle" });
    await page.getByLabel("Additional approved source").fill(`official|https://raw.githubusercontent.com/Bibidee/exigency/main/demo/evidence/new.md`);
    await expect(page.getByText(/challenge count is exhausted/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Submit challenge" })).toBeDisabled();
  });

  test("source provenance warns when previously available evidence becomes unavailable", async ({ page }) => {
    const current = JSON.stringify({ decision: "INSUFFICIENT_EVIDENCE", summary: "later fetch failed", source_states: [{ url: official, state: "UNAVAILABLE", http_status: 0, content_digest: "" }] });
    await installIncidentMock(page, mockIncident({ status: "ASSESSED_NO_AUTHORITY", assessment_json: current, assessment_count: 1, challenge_deadline: 0 }), mockCharter({ challenge_window_minutes: 0 }), { source_states: [{ url: official, state: "SUPPORTS_TRIGGER", http_status: 200, content_digest: "a".repeat(64) }] });
    await page.goto("/incident/INC-E2E-SAFETY", { waitUntil: "networkidle" });
    await expect(page.getByText("NEWLY UNAVAILABLE", { exact: true })).toBeVisible();
    await expect(page.getByText(/Later source fetch failed/i)).toBeVisible();
    await expect(page.getByText(/not an on-chain consensus verdict/i)).toBeVisible();
  });
});
