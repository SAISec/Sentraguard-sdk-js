/**
 * Configuration resolution and credential persistence.
 *
 * Resolution order (first hit wins) so most apps pass nothing:
 *   1. Explicit options.
 *   2. Environment (`SENTRAGUARD_BASE_URL`, `SENTRAGUARD_API_KEY`,
 *      `SENTRAGUARD_SETUP_TOKEN`, `SENTRAGUARD_ACCESS_TOKEN`).
 *   3. `~/.sentraguard/credentials.json` (Node only).
 *   4. Default base URL `http://127.0.0.1:3001`.
 *
 * Node builtins (fs/os/path) are obtained at runtime — never statically
 * imported — so a browser bundle stays clean and simply skips step 3.
 */

export const DEFAULT_BASE_URL = "http://127.0.0.1:3001";

export type OnError = "throw" | "allow" | "block";

export interface ClientConfig {
  baseUrl: string;
  apiKey?: string;
  accessToken?: string;
  setupToken?: string;
  deviceId?: string;
  timeoutMs: number;
  maxRetries: number;
  onError: OnError;
  extraHeaders: Record<string, string>;
}

export interface ResolveOptions {
  baseUrl?: string;
  apiKey?: string;
  accessToken?: string;
  setupToken?: string;
  deviceId?: string;
  timeoutMs?: number;
  maxRetries?: number;
  onError?: OnError;
  extraHeaders?: Record<string, string>;
}

export interface StoredCreds {
  base_url?: string;
  api_key?: string;
  access_token?: string;
  setup_token?: string;
  device_id?: string;
  organization_id?: string;
}

const ENV = {
  BASE_URL: "SENTRAGUARD_BASE_URL",
  API_KEY: "SENTRAGUARD_API_KEY",
  SETUP_TOKEN: "SENTRAGUARD_SETUP_TOKEN",
  ACCESS_TOKEN: "SENTRAGUARD_ACCESS_TOKEN",
  DEVICE_ID: "SENTRAGUARD_DEVICE_ID",
  HOME: "SENTRAGUARD_HOME",
} as const;

function env(name: string): string | undefined {
  const p = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  const v = p?.env?.[name];
  return v && v.length > 0 ? v : undefined;
}

/**
 * Obtain a Node builtin at runtime without a static import, so browser
 * bundlers never see a `node:` dependency. Returns undefined off Node.
 */
function builtin<T = unknown>(name: string): T | undefined {
  const proc = (globalThis as {
    process?: { getBuiltinModule?: (n: string) => unknown; versions?: { node?: string } };
  }).process;
  if (!proc?.versions?.node) return undefined;
  try {
    if (typeof proc.getBuiltinModule === "function") {
      return proc.getBuiltinModule(name) as T;
    }
  } catch {
    /* fall through */
  }
  try {
    // Available in the CJS build (and Node 18 CJS). `typeof` guard is safe even
    // when `require` is undeclared (ESM), returning "undefined" without throwing.
    if (typeof require === "function") {
      return require(name) as T;
    }
  } catch {
    /* fall through */
  }
  return undefined;
}

type FsMod = typeof import("node:fs");
type OsMod = typeof import("node:os");
type PathMod = typeof import("node:path");

function credsDir(): string | undefined {
  const override = env(ENV.HOME);
  if (override) return override;
  const os = builtin<OsMod>("node:os");
  const path = builtin<PathMod>("node:path");
  if (!os || !path) return undefined;
  return path.join(os.homedir(), ".sentraguard");
}

export function credentialsPath(): string | undefined {
  const dir = credsDir();
  const path = builtin<PathMod>("node:path");
  if (!dir || !path) return undefined;
  return path.join(dir, "credentials.json");
}

function readCreds(): StoredCreds {
  const file = credentialsPath();
  const fs = builtin<FsMod>("node:fs");
  if (!file || !fs || !fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as StoredCreds;
  } catch {
    return {};
  }
}

export function saveCredentials(creds: StoredCreds): string | undefined {
  const dir = credsDir();
  const file = credentialsPath();
  const fs = builtin<FsMod>("node:fs");
  if (!dir || !file || !fs) return undefined;
  fs.mkdirSync(dir, { recursive: true });
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(creds)) {
    if (v !== undefined && v !== null) clean[k] = v;
  }
  fs.writeFileSync(file, JSON.stringify(clean, null, 2), { mode: 0o600 });
  try {
    fs.chmodSync(file, 0o600);
  } catch {
    /* non-POSIX */
  }
  return file;
}

export function generateDeviceId(): string {
  const cached = readCreds().device_id || env(ENV.DEVICE_ID);
  if (cached) return cached;
  const rand =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 16)
      : Math.random().toString(36).slice(2, 18);
  return `sdk-${rand}`;
}

export function resolveConfig(opts: ResolveOptions = {}): ClientConfig {
  const creds = readCreds();
  const baseUrl = (
    opts.baseUrl ||
    env(ENV.BASE_URL) ||
    creds.base_url ||
    DEFAULT_BASE_URL
  ).replace(/\/+$/, "");

  return {
    baseUrl,
    apiKey: opts.apiKey ?? env(ENV.API_KEY) ?? creds.api_key,
    accessToken: opts.accessToken ?? env(ENV.ACCESS_TOKEN) ?? creds.access_token,
    setupToken: opts.setupToken ?? env(ENV.SETUP_TOKEN) ?? creds.setup_token,
    deviceId: opts.deviceId ?? env(ENV.DEVICE_ID) ?? creds.device_id,
    timeoutMs: opts.timeoutMs ?? 30_000,
    maxRetries: opts.maxRetries ?? 2,
    onError: opts.onError ?? "throw",
    extraHeaders: opts.extraHeaders ?? {},
  };
}
