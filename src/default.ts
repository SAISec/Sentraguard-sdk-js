/**
 * Module-level Tier-0 API — the "fewest changes after import" path.
 *
 *     import { check } from "@sentraguard/sdk";
 *     if ((await check("ignore previous instructions")).blocked) refuse();
 */

import { SentraGuard, SentraGuardOptions } from "./client.js";
import { Blocked } from "./errors.js";
import { BanTopicResult, CheckResult } from "./models.js";
import type { TextOptions } from "./resources/validate.js";

let _client: SentraGuard | undefined;
let _overrides: SentraGuardOptions = {};

/** Set default-client options (baseUrl, apiKey, setupToken, onError, …). */
export function configure(opts: SentraGuardOptions): void {
  _overrides = { ..._overrides, ...opts };
  _client = undefined;
}

export function getDefaultClient(): SentraGuard {
  if (!_client) _client = new SentraGuard(_overrides);
  return _client;
}

export function resetDefaultClient(): void {
  _client = undefined;
}

export function check(text: string, opts: TextOptions = {}): Promise<CheckResult> {
  return getDefaultClient().check(text, opts);
}
export function checkFile(...args: Parameters<SentraGuard["checkFile"]>): Promise<CheckResult> {
  return getDefaultClient().checkFile(...args);
}
export function checkMany(texts: string[]): Promise<CheckResult[]> {
  return getDefaultClient().checkMany(texts);
}
export function classify(text: string, topics?: string[]): Promise<BanTopicResult> {
  return getDefaultClient().classify(text, topics);
}
export function guard(text: string, opts: TextOptions = {}): Promise<CheckResult> {
  return getDefaultClient().guard(text, opts);
}
export function health(): Promise<boolean> {
  return getDefaultClient().healthy();
}

// ---- provider-neutral helpers --------------------------------------------

function contentToText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object") {
          const o = part as Record<string, unknown>;
          return (o.text as string) || (o.content as string) || "";
        }
        return "";
      })
      .filter(Boolean)
      .join(" ");
  }
  if (content && typeof content === "object") {
    const o = content as Record<string, unknown>;
    return (o.text as string) || (o.content as string) || "";
  }
  return content == null ? "" : String(content);
}

/** Pull the latest user-authored text from common provider message shapes. */
export function extractUserText(messages: unknown): string {
  if (typeof messages === "string") return messages;
  if (!Array.isArray(messages)) return messages == null ? "" : String(messages);
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg && typeof msg === "object") {
      const o = msg as Record<string, unknown>;
      if (o.role == null || o.role === "user") {
        const text = contentToText(o.content ?? o.parts);
        if (text) return text;
      }
    } else if (typeof msg === "string") {
      return msg;
    }
  }
  const last = messages[messages.length - 1];
  return contentToText(last && typeof last === "object" ? (last as Record<string, unknown>).content : last);
}

export interface GuardMessagesOptions {
  mode?: "block" | "warn" | "audit";
  topics?: string[];
  client?: SentraGuard;
}

/** Check the latest user message in a provider-native messages array. */
export async function guardMessages(
  messages: unknown,
  opts: GuardMessagesOptions = {},
): Promise<CheckResult> {
  const sg = opts.client ?? getDefaultClient();
  const text = extractUserText(messages);
  let result = await sg.check(text);
  if (opts.topics && opts.topics.length) {
    const topic = await sg.classify(text, opts.topics);
    if (topic.isBanned && !result.blocked) {
      result = new CheckResult({
        action: "block",
        valid: false,
        reasons: [`banned-topic:${topic.detectedTopics.join(",") || "matched"}`],
        raw: result.raw,
      });
    }
  }
  if ((opts.mode ?? "block") === "block" && result.blocked) {
    throw new Blocked(result.reason ?? "Content blocked by SentraGuard policy.", result);
  }
  return result;
}

/** Wrap a function so its first string argument is guarded before it runs. */
export function guarded<F extends (...args: any[]) => any>(fn: F): F {
  const wrapper = async (...args: Parameters<F>): Promise<ReturnType<F>> => {
    const prompt = args[0];
    const result = await check(typeof prompt === "string" ? prompt : String(prompt));
    if (result.blocked) {
      throw new Blocked(result.reason ?? "Blocked by SentraGuard.", result);
    }
    return fn(...args);
  };
  return wrapper as unknown as F;
}
