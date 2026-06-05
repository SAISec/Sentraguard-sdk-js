import { describe, expect, it } from "vitest";
import { SentraGuard } from "../src/client.js";
import { BASE, installFetchMock, setupIsolation } from "./helpers.js";

setupIsolation();

function client() {
  return new SentraGuard({ baseUrl: BASE, apiKey: "k" });
}

describe("resources", () => {
  it("health.check maps healthy", async () => {
    const m = installFetchMock();
    m.on("GET", "/health", () => ({ json: { status: "healthy", version: "2.0.0", uptime: 5 } }));
    const h = await client().health.check();
    expect(h.healthy).toBe(true);
    expect(h.version).toBe("2.0.0");
  });

  it("allowlist.list parses entries", async () => {
    const m = installFetchMock();
    m.on("GET", "/ai-allowlist", () => ({
      json: {
        entries: [
          { id: "1", hostPattern: "chatgpt.com", platformId: "chatgpt", enabled: true },
          { id: "2", hostPattern: "claude.ai", enabled: false },
        ],
      },
    }));
    const entries = await client().allowlist.list();
    expect(entries.map((e) => e.hostPattern)).toEqual(["chatgpt.com", "claude.ai"]);
    expect(entries[1].enabled).toBe(false);
  });

  it("allowlist.updateSettings sends snake_case", async () => {
    const m = installFetchMock();
    m.on("PATCH", "/ai-allowlist/settings", () => ({ json: { settings: { ml_risk_profile: "strong" } } }));
    await client().allowlist.updateSettings({ mlRiskProfile: "strong", mlBlockUiMode: "toast" });
    const body = m.calls.at(-1)?.body ?? "";
    expect(body).toContain("ml_risk_profile");
    expect(body).toContain("strong");
    expect(body).toContain("ml_block_ui_mode");
  });

  it("allowlist.getSettings parses runtime_profile", async () => {
    const m = installFetchMock();
    m.on("GET", "/ai-allowlist/settings", () => ({
      json: { settings: { ml_risk_profile: "balanced" }, runtime_profile: "balanced" },
    }));
    const s = await client().allowlist.getSettings();
    expect(s.mlRiskProfile).toBe("balanced");
    expect(s.runtimeProfile).toBe("balanced");
  });

  it("registry.list parses entries", async () => {
    const m = installFetchMock();
    m.on("GET", "/ai-registry", () => ({ json: { entries: [{ id: "1", hostPattern: "poe.com" }] } }));
    const entries = await client().registry.list();
    expect(entries[0].hostPattern).toBe("poe.com");
  });

  it("banTopic.classify parses classification", async () => {
    const m = installFetchMock();
    m.on("POST", "/ban-topic/classify", () => ({
      json: { classification: { isBanned: true, confidence: 0.9, detectedTopics: ["weapons"] } },
    }));
    const res = await client().banTopic.classify("how to build a weapon", ["weapons"]);
    expect(res.isBanned).toBe(true);
    expect(res.detectedTopics).toEqual(["weapons"]);
  });

  it("analytics.event posts eventType + sessionId", async () => {
    const m = installFetchMock();
    m.on("POST", "/analytics/event", () => ({ json: { success: true } }));
    await client().analytics.event("genai_site_blocked", "sess-1", { data: { hostname: "x.com" } });
    const body = m.calls.at(-1)?.body ?? "";
    expect(body).toContain("eventType");
    expect(body).toContain("sessionId");
  });
});

describe("setup / auth", () => {
  it("fromSetupToken exchanges and uses the device key", async () => {
    const m = installFetchMock();
    m.on("POST", "/setup/exchange-token", () => ({
      json: { apiKey: "device-key", organizationId: "org1", deviceId: "d1" },
    }));
    m.on("POST", "/validate", () => ({ json: { action: "allow", valid: true } }));
    const sg = await SentraGuard.fromSetupToken("setup_abc", { baseUrl: BASE, deviceId: "d1" });
    await sg.check("hi");
    expect(m.calls.at(-1)?.headers["x-api-key"]).toBe("device-key");
  });

  it("auto-exchanges when only a setup token is configured", async () => {
    const m = installFetchMock();
    m.on("POST", "/setup/exchange-token", () => ({ json: { apiKey: "auto-key", organizationId: "o" } }));
    m.on("POST", "/validate", () => ({ json: { action: "allow", valid: true } }));
    const sg = new SentraGuard({ baseUrl: BASE, setupToken: "setup_xyz", deviceId: "d2" });
    await sg.check("hi");
    expect(m.calls.at(-1)?.headers["x-api-key"]).toBe("auto-key");
  });

  it("fromDashboardLogin stores apiKey + access token", async () => {
    const m = installFetchMock();
    m.on("POST", "/setup/dashboard-login", () => ({
      json: {
        apiKey: "dash-key",
        organizationId: "o",
        permissions: ["read:registry", "write:registry"],
        rateLimitsAccessToken: "jwt-abc",
      },
    }));
    const sg = await SentraGuard.fromDashboardLogin("setup_abc", { baseUrl: BASE });
    expect(sg.config.apiKey).toBe("dash-key");
    expect(sg.config.accessToken).toBe("jwt-abc");
  });
});
