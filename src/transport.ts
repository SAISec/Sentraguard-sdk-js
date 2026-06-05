/**
 * HTTP transport built on the standard `fetch` (Node 18+, browsers, Deno, Bun).
 *
 *  - Joins the base URL with `/api/v1` and the endpoint path.
 *  - Attaches `x-api-key` and/or `Authorization: Bearer`.
 *  - Per-request timeout via AbortController; retry/backoff on 429 (Retry-After)
 *    and 5xx; maps HTTP errors onto the typed exception taxonomy.
 *
 * API keys are never logged.
 */

import type { ClientConfig } from "./config.js";
import { TransportError, errorFromResponse } from "./errors.js";
import { VERSION } from "./version.js";

const API_PREFIX = "/api/v1";
const RETRY_STATUSES = new Set([429, 502, 503, 504]);

export function joinUrl(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/+$/, "");
  const root = base.endsWith(API_PREFIX) ? base : base + API_PREFIX;
  return root + "/" + path.replace(/^\/+/, "");
}

function authHeaders(config: ClientConfig): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": `sentraguard-sdk-js/${VERSION}`,
  };
  if (config.apiKey) headers["x-api-key"] = config.apiKey;
  if (config.accessToken) headers["Authorization"] = `Bearer ${config.accessToken}`;
  return { ...headers, ...config.extraHeaders };
}

function parseRetryAfter(res: Response): number | undefined {
  const v = res.headers.get("Retry-After");
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function backoffMs(attempt: number, retryAfter?: number): number {
  if (retryAfter != null) return Math.min(retryAfter * 1000, 30_000);
  return Math.min(500 * 2 ** attempt, 8_000);
}

async function decode(res: Response): Promise<unknown> {
  const ctype = res.headers.get("Content-Type") ?? "";
  const text = await res.text();
  if (!text) return undefined;
  if (ctype.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch {
      return undefined;
    }
  }
  return text;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export interface RequestOptions {
  json?: unknown;
  params?: Record<string, unknown>;
}

export class Transport {
  constructor(public config: ClientConfig) {}

  async request(method: string, path: string, opts: RequestOptions = {}): Promise<any> {
    let url = joinUrl(this.config.baseUrl, path);
    if (opts.params) {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(opts.params)) {
        if (v !== undefined) qs.set(k, String(v));
      }
      const s = qs.toString();
      if (s) url += (url.includes("?") ? "&" : "?") + s;
    }

    const headers = authHeaders(this.config);
    const body = opts.json !== undefined ? JSON.stringify(opts.json) : undefined;
    if (body !== undefined) headers["Content-Type"] = "application/json";

    let lastErr: unknown;
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
      let res: Response;
      try {
        res = await fetch(url, { method, headers, body, signal: controller.signal });
      } catch (err) {
        lastErr = err;
        clearTimeout(timer);
        if (attempt < this.config.maxRetries) {
          await sleep(backoffMs(attempt));
          continue;
        }
        throw new TransportError(`Request to ${url} failed: ${String(err)}`);
      } finally {
        clearTimeout(timer);
      }

      if (RETRY_STATUSES.has(res.status) && attempt < this.config.maxRetries) {
        await sleep(backoffMs(attempt, parseRetryAfter(res)));
        continue;
      }

      const payload = await decode(res);
      if (res.status >= 400) {
        const obj =
          payload && typeof payload === "object"
            ? (payload as Record<string, unknown>)
            : { message: payload ? String(payload) : undefined };
        throw errorFromResponse(res.status, obj, parseRetryAfter(res));
      }
      return payload;
    }
    throw new TransportError(`Request to ${url} failed after retries: ${String(lastErr)}`);
  }
}
