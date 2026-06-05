import { describe, expect, it } from "vitest";
import { joinUrl } from "../src/transport.js";
import { SentraGuard } from "../src/client.js";
import {
  AuthError,
  BadRequestError,
  PermissionError,
  RateLimitError,
  ServerError,
  TransportError,
} from "../src/errors.js";
import { API, BASE, allowPayload, installFetchMock, setupIsolation } from "./helpers.js";

setupIsolation();

describe("joinUrl", () => {
  it("adds the /api/v1 prefix", () => {
    expect(joinUrl("http://h:3001", "/validate")).toBe("http://h:3001/api/v1/validate");
  });
  it("does not double the prefix", () => {
    expect(joinUrl("http://h:3001/api/v1", "validate")).toBe("http://h:3001/api/v1/validate");
  });
});

describe("transport", () => {
  it("sends the x-api-key header", async () => {
    const m = installFetchMock();
    m.on("POST", "/validate", () => ({ json: allowPayload() }));
    const sg = new SentraGuard({ baseUrl: BASE, apiKey: "test-key" });
    await sg.check("hi");
    expect(m.calls.at(-1)?.headers["x-api-key"]).toBe("test-key");
  });

  it.each([
    [400, BadRequestError],
    [401, AuthError],
    [403, PermissionError],
    [500, ServerError],
  ])("maps HTTP %s to the right error", async (status, Cls) => {
    const m = installFetchMock();
    m.on("POST", "/validate", () => ({ status, json: { error: "X", message: "boom" } }));
    const sg = new SentraGuard({ baseUrl: BASE, apiKey: "k", maxRetries: 0 });
    await expect(sg.validate.text("hi")).rejects.toBeInstanceOf(Cls);
  });

  it("surfaces Retry-After on 429", async () => {
    const m = installFetchMock();
    m.on("POST", "/validate", () => ({
      status: 429,
      headers: { "Retry-After": "0" },
      json: { message: "slow down" },
    }));
    const sg = new SentraGuard({ baseUrl: BASE, apiKey: "k", maxRetries: 0 });
    await expect(sg.validate.text("hi")).rejects.toBeInstanceOf(RateLimitError);
  });

  it("retries a 503 then succeeds", async () => {
    const m = installFetchMock();
    m.onSeq("POST", "/validate", [
      () => ({ status: 503, json: { message: "starting" } }),
      () => ({ json: allowPayload() }),
    ]);
    const sg = new SentraGuard({ baseUrl: BASE, apiKey: "k", maxRetries: 2 });
    const r = await sg.check("hi");
    expect(r.allowed).toBe(true);
    expect(m.calls.filter((c) => c.url.includes("/validate")).length).toBe(2);
  });

  it("wraps a network error as TransportError", async () => {
    const { vi } = await import("vitest");
    vi.stubGlobal("fetch", async () => {
      throw new Error("no route");
    });
    const sg = new SentraGuard({ baseUrl: BASE, apiKey: "k", maxRetries: 0 });
    await expect(sg.validate.text("hi")).rejects.toBeInstanceOf(TransportError);
  });
});

void API;
