import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveConfig, saveCredentials, generateDeviceId, DEFAULT_BASE_URL } from "../src/config.js";

let tmp: string;

beforeEach(() => {
  tmp = `/tmp/sg-cfg-${Math.random().toString(36).slice(2)}`;
  process.env.SENTRAGUARD_HOME = tmp;
  delete process.env.SENTRAGUARD_BASE_URL;
  delete process.env.SENTRAGUARD_API_KEY;
  delete process.env.SENTRAGUARD_DEVICE_ID;
});
afterEach(() => {
  delete process.env.SENTRAGUARD_HOME;
});

describe("config resolution", () => {
  it("defaults the base URL", () => {
    expect(resolveConfig().baseUrl).toBe(DEFAULT_BASE_URL);
  });

  it("env beats the creds file", () => {
    saveCredentials({ base_url: "http://file-host:8080", api_key: "file-key" });
    process.env.SENTRAGUARD_BASE_URL = "http://env-host:9000";
    const cfg = resolveConfig();
    expect(cfg.baseUrl).toBe("http://env-host:9000");
    expect(cfg.apiKey).toBe("file-key"); // not overridden by env (no api-key env)
  });

  it("explicit options beat env", () => {
    process.env.SENTRAGUARD_BASE_URL = "http://env-host:9000";
    expect(resolveConfig({ baseUrl: "http://explicit:1234" }).baseUrl).toBe("http://explicit:1234");
  });

  it("reads a persisted creds file (JSON roundtrip, incl. quotes)", () => {
    saveCredentials({ base_url: "http://file-host", api_key: 'abc"x', device_id: "dev-1" });
    const cfg = resolveConfig();
    expect(cfg.baseUrl).toBe("http://file-host");
    expect(cfg.apiKey).toBe('abc"x');
    expect(cfg.deviceId).toBe("dev-1");
  });

  it("generateDeviceId reuses the cached id", () => {
    saveCredentials({ base_url: "http://x", device_id: "stable-id" });
    expect(generateDeviceId()).toBe("stable-id");
  });

  it("generateDeviceId mints a new id when absent", () => {
    expect(generateDeviceId()).toMatch(/^sdk-/);
  });
});
