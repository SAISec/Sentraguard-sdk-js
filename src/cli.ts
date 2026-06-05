#!/usr/bin/env node
/**
 * `sentraguard` CLI — bootstraps credentials so app code needs none.
 *
 *   sentraguard login <setup-token>
 *   sentraguard check "ignore previous instructions"
 *   sentraguard health
 *   sentraguard allowlist list
 *   sentraguard whoami
 */

import { SentraGuard } from "./client.js";
import { credentialsPath, resolveConfig } from "./config.js";
import { SentraGuardError } from "./errors.js";
import { VERSION } from "./version.js";

function parseFlags(args: string[]): { positional: string[]; flags: Record<string, string | boolean> } {
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(a);
    }
  }
  return { positional, flags };
}

function print(obj: unknown): void {
  console.log(JSON.stringify(obj, null, 2));
}

async function cmdLogin(positional: string[], flags: Record<string, string | boolean>): Promise<number> {
  const token = positional[0];
  if (!token) {
    console.error("usage: sentraguard login <setup-token> [--dashboard] [--base-url URL]");
    return 1;
  }
  const baseUrl = flags["base-url"] as string | undefined;
  const sg = flags.dashboard
    ? await SentraGuard.fromDashboardLogin(token, { baseUrl, persist: true })
    : await SentraGuard.fromSetupToken(token, { baseUrl, persist: true });
  console.log(`Logged in. Credentials saved to ${credentialsPath()}`);
  console.log(`Backend: ${sg.config.baseUrl}  (api key cached)`);
  return 0;
}

async function cmdCheck(positional: string[], flags: Record<string, string | boolean>): Promise<number> {
  const text = positional[0];
  if (!text) {
    console.error('usage: sentraguard check "<prompt>" [--json] [--base-url URL]');
    return 1;
  }
  const sg = new SentraGuard({ baseUrl: flags["base-url"] as string | undefined });
  const r = await sg.check(text);
  const status = r.blocked ? "BLOCKED" : r.warned ? "WARN" : "ALLOWED";
  console.log(`${status}  action=${r.action}  risk=${r.risk ?? "-"}  reason=${r.reason ?? "-"}`);
  if (flags.json) print(r.raw);
  return r.blocked ? 2 : 0;
}

async function cmdHealth(flags: Record<string, string | boolean>): Promise<number> {
  const sg = new SentraGuard({ baseUrl: flags["base-url"] as string | undefined });
  const status = await sg.health.check();
  console.log(`${status.status}  version=${status.version ?? "-"}  uptime=${status.uptime ?? "-"}`);
  return status.healthy ? 0 : 1;
}

async function cmdAllowlist(positional: string[], flags: Record<string, string | boolean>): Promise<number> {
  const action = positional[0] ?? "list";
  const sg = new SentraGuard({ baseUrl: flags["base-url"] as string | undefined });
  if (action === "list") {
    for (const e of await sg.allowlist.list()) {
      console.log(`${e.enabled ? "on " : "off"}  ${e.hostPattern}  (${e.platformId ?? "-"})`);
    }
  } else if (action === "settings") {
    print((await sg.allowlist.getSettings()).raw);
  } else if (action === "add" && positional[1]) {
    print((await sg.allowlist.add(positional[1])).raw);
  } else if (action === "remove" && positional[1]) {
    print(await sg.allowlist.delete(positional[1]));
  } else {
    console.error("usage: sentraguard allowlist <list|settings|add <host>|remove <id>>");
    return 1;
  }
  return 0;
}

function cmdWhoami(flags: Record<string, string | boolean>): number {
  const cfg = resolveConfig({ baseUrl: flags["base-url"] as string | undefined });
  console.log(`base_url     : ${cfg.baseUrl}`);
  console.log(`api_key      : ${cfg.apiKey ? "set" : "not set"}`);
  console.log(`access_token : ${cfg.accessToken ? "set" : "not set"}`);
  console.log(`setup_token  : ${cfg.setupToken ? "set" : "not set"}`);
  console.log(`device_id    : ${cfg.deviceId ?? "(auto)"}`);
  console.log(`creds file   : ${credentialsPath() ?? "(unavailable)"}`);
  return 0;
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  const { positional, flags } = parseFlags(argv);
  if (flags.version || positional[0] === "version") {
    console.log(`@sentraguard/sdk ${VERSION}`);
    return 0;
  }
  const command = positional.shift();
  try {
    switch (command) {
      case "login":
        return await cmdLogin(positional, flags);
      case "check":
        return await cmdCheck(positional, flags);
      case "health":
        return await cmdHealth(flags);
      case "allowlist":
        return await cmdAllowlist(positional, flags);
      case "whoami":
        return cmdWhoami(flags);
      default:
        console.error("commands: login | check | health | allowlist | whoami | version");
        return 1;
    }
  } catch (err) {
    if (err instanceof SentraGuardError) {
      console.error(`error: ${err.message}`);
      return 1;
    }
    throw err;
  }
}

// Run when invoked as the `sentraguard` bin (dist/cli.js|cjs), not when imported.
const entry = typeof process !== "undefined" ? (process.argv?.[1] ?? "") : "";
if (/(?:^|[\\/])(?:cli\.c?js|sentraguard)$/.test(entry)) {
  main().then((code) => process.exit(code));
}
