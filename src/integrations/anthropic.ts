/**
 * Drop-in guardrail for the official `@anthropic-ai/sdk`.
 *
 *     // before:  import Anthropic from "@anthropic-ai/sdk";
 *     import { Anthropic } from "@sentraguard/sdk/anthropic";
 *     const client = new Anthropic();
 *     await client.messages.create({ model, max_tokens, messages });  // auto-guarded
 */

import type { SentraGuard } from "../client.js";
import { lazyRequire } from "./_require.js";
import { Guard, SentraGuardOverride, coercePolicy, policyFromOption } from "./guard.js";

function requireAnthropic(): any {
  return lazyRequire("@anthropic-ai/sdk", "npm i @anthropic-ai/sdk");
}

function responseText(resp: any): string {
  try {
    const blocks = resp?.content ?? [];
    return blocks
      .map((b: any) => (typeof b?.text === "string" ? b.text : ""))
      .filter(Boolean)
      .join(" ");
  } catch {
    return "";
  }
}

export interface SentraGuardClientOptions {
  sentraguard?: SentraGuardOverride;
  sentraguardClient?: SentraGuard;
}

function makeGuardedCreate(realCreate: (...a: any[]) => any, guard: Guard) {
  return async function create(args: any = {}, ...rest: any[]) {
    const override = "sentraguard" in args ? (args.sentraguard as SentraGuardOverride) : undefined;
    if ("sentraguard" in args) delete args.sentraguard;
    const policy = coercePolicy(override, guard.policy);
    if (policy) await guard.checkInput(args.messages, policy);
    const resp = await realCreate(args, ...rest);
    if (policy && (policy.direction === "output" || policy.direction === "both") && !args.stream) {
      await guard.checkOutput(responseText(resp), policy);
    }
    return resp;
  };
}

export class Anthropic {
  constructor(options: (Record<string, any> & SentraGuardClientOptions) | undefined = {}) {
    const { sentraguard, sentraguardClient, ...rest } = options;
    const mod = requireAnthropic();
    const Real = mod.Anthropic ?? mod.default ?? mod;
    const real = new Real(rest);
    const guard = new Guard(sentraguardClient, policyFromOption(sentraguard));
    if (real.messages?.create) {
      const bound = real.messages.create.bind(real.messages);
      real.messages.create = makeGuardedCreate(bound, guard);
    }
    return real;
  }
}
