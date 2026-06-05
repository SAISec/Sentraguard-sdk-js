import { afterEach, beforeEach, vi } from "vitest";
import { resetDefaultClient } from "../src/default.js";

export const BASE = "http://testserver";
export const API = `${BASE}/api/v1`;

export function allowPayload(over: Record<string, unknown> = {}) {
  return {
    valid: true,
    action: "allow",
    riskLevel: "low",
    riskScore: 0.01,
    jailbreak: null,
    reasons: [],
    metadata: { analysisId: "a1" },
    ...over,
  };
}

export function blockPayload(reason = "prompt injection detected") {
  return {
    valid: false,
    action: "block",
    riskLevel: "high",
    riskScore: 0.98,
    jailbreak: { detected: true, score: 0.97, method: "heuristic" },
    reasons: [reason],
    metadata: { analysisId: "a2" },
  };
}

interface MockCall {
  url: string;
  method: string;
  body?: string;
  headers: Record<string, string>;
}

export interface FetchMock {
  calls: MockCall[];
  /** Register a handler: matches by method + path suffix. */
  on(method: string, pathSuffix: string, responder: () => { status?: number; json?: unknown; headers?: Record<string, string> }): void;
  /** Sequential responders for the same route (one per call). */
  onSeq(method: string, pathSuffix: string, responders: Array<() => { status?: number; json?: unknown; headers?: Record<string, string> }>): void;
}

/** Install a fetch mock and return a controller. Auto-restored after each test. */
export function installFetchMock(): FetchMock {
  const handlers: Array<{
    method: string;
    suffix: string;
    seq: Array<() => { status?: number; json?: unknown; headers?: Record<string, string> }>;
    idx: number;
    repeat: boolean;
  }> = [];
  const calls: MockCall[] = [];

  const mock: FetchMock = {
    calls,
    on(method, suffix, responder) {
      handlers.push({ method, suffix, seq: [responder], idx: 0, repeat: true });
    },
    onSeq(method, suffix, responders) {
      handlers.push({ method, suffix, seq: responders, idx: 0, repeat: false });
    },
  };

  vi.stubGlobal("fetch", async (url: string, init: RequestInit = {}) => {
    const method = (init.method ?? "GET").toUpperCase();
    const u = String(url).split("?")[0];
    calls.push({
      url: String(url),
      method,
      body: init.body as string | undefined,
      headers: (init.headers as Record<string, string>) ?? {},
    });
    const h = handlers.find((x) => x.method === method && u.endsWith(x.suffix));
    if (!h) {
      return new Response(JSON.stringify({ error: "NotMocked", message: u }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    const responderIdx = h.repeat ? 0 : Math.min(h.idx, h.seq.length - 1);
    if (!h.repeat) h.idx++;
    const out = h.seq[responderIdx]();
    return new Response(out.json !== undefined ? JSON.stringify(out.json) : "", {
      status: out.status ?? 200,
      headers: { "Content-Type": "application/json", ...(out.headers ?? {}) },
    });
  });

  return mock;
}

export function setupIsolation(): void {
  beforeEach(() => {
    process.env.SENTRAGUARD_HOME = `/tmp/sg-test-${Math.random().toString(36).slice(2)}`;
    delete process.env.SENTRAGUARD_BASE_URL;
    delete process.env.SENTRAGUARD_API_KEY;
    delete process.env.SENTRAGUARD_SETUP_TOKEN;
    delete process.env.SENTRAGUARD_ACCESS_TOKEN;
    resetDefaultClient();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    resetDefaultClient();
  });
}
