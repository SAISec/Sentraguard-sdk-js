/** Shared guard middleware used by every provider wrapper. */

import { SentraGuard } from "../client.js";
import { getDefaultClient, extractUserText } from "../default.js";
import { Blocked } from "../errors.js";
import { CheckResult } from "../models.js";

export interface GuardPolicy {
  /** "block" (throw Blocked), "warn" (log + proceed), "audit" (no throw). */
  mode: "block" | "warn" | "audit";
  /** "input" (prompt), "output" (response), or "both". */
  direction: "input" | "output" | "both";
  /** Which checks to run. */
  checks: Array<"prompt" | "topics">;
  topics?: string[];
}

export const DEFAULT_POLICY: GuardPolicy = {
  mode: "block",
  direction: "input",
  checks: ["prompt"],
};

export type SentraGuardOverride = boolean | string | Partial<GuardPolicy>;

export function coercePolicy(value: SentraGuardOverride | undefined, base: GuardPolicy): GuardPolicy | null {
  if (value === false) return null;
  if (value === undefined || value === true) return base;
  if (typeof value === "string") return { ...base, mode: value as GuardPolicy["mode"] };
  return { ...base, ...value };
}

export class Guard {
  constructor(
    private client: SentraGuard | undefined,
    public policy: GuardPolicy = DEFAULT_POLICY,
  ) {}

  private get sg(): SentraGuard {
    return this.client ?? getDefaultClient();
  }

  async checkInput(messages: unknown, policy: GuardPolicy): Promise<CheckResult | null> {
    if (policy.direction === "output") return null;
    const text = extractUserText(messages);
    if (!text) return null;
    let result = await this.sg.check(text);
    if (policy.checks.includes("topics")) {
      const topic = await this.sg.classify(text, policy.topics);
      if (topic.isBanned && !result.blocked) {
        result = new CheckResult({
          action: "block",
          valid: false,
          reasons: [`banned-topic:${topic.detectedTopics.join(",") || "matched"}`],
          raw: result.raw,
        });
      }
    }
    this.apply(result, policy, "input");
    return result;
  }

  async checkOutput(text: string, policy: GuardPolicy): Promise<CheckResult | null> {
    if (policy.direction !== "output" && policy.direction !== "both") return null;
    if (!text) return null;
    const result = await this.sg.check(text);
    this.apply(result, policy, "output");
    return result;
  }

  private apply(result: CheckResult, policy: GuardPolicy, where: string): void {
    if (policy.mode === "block" && result.blocked) {
      throw new Blocked(result.reason ?? `SentraGuard blocked the ${where} content.`, result);
    }
  }
}

/** Resolve constructor-level `sentraguard` option into a GuardPolicy. */
export function policyFromOption(value: SentraGuardOverride | undefined): GuardPolicy {
  const resolved = coercePolicy(value, DEFAULT_POLICY);
  return resolved ?? DEFAULT_POLICY;
}
