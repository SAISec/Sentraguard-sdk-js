/**
 * Drop-in guardrail for the official `openai` SDK.
 *
 *     // before:  import OpenAI from "openai";
 *     import { OpenAI } from "@sentraguard/sdk/openai";
 *     const client = new OpenAI();
 *     await client.chat.completions.create({ model: "gpt-4o", messages });  // auto-guarded
 *
 * The wrapper delegates everything to the real client; only `chat.completions
 * .create` is intercepted. `openai` is an optional peer dependency.
 */

import type { SentraGuard } from "../client.js";
import { lazyRequire } from "./_require.js";
import {
  DEFAULT_POLICY,
  Guard,
  GuardPolicy,
  SentraGuardOverride,
  coercePolicy,
  policyFromOption,
} from "./guard.js";

function requireOpenAI(): any {
  return lazyRequire("openai", "npm i openai");
}

function responseText(resp: any): string {
  try {
    const choice = resp?.choices?.[0];
    return choice?.message?.content ?? choice?.text ?? "";
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

function wrapClient(real: any, guard: Guard): any {
  const completions = real.chat?.completions;
  if (completions?.create) {
    const bound = completions.create.bind(completions);
    completions.create = makeGuardedCreate(bound, guard);
  }
  return real;
}

export class OpenAI {
  constructor(options: (Record<string, any> & SentraGuardClientOptions) | undefined = {}) {
    const { sentraguard, sentraguardClient, ...rest } = options;
    const mod = requireOpenAI();
    const Real = mod.OpenAI ?? mod.default ?? mod;
    const real = new Real(rest);
    const guard = new Guard(sentraguardClient, policyFromOption(sentraguard));
    return wrapClient(real, guard);
  }
}

export class AzureOpenAI {
  constructor(options: (Record<string, any> & SentraGuardClientOptions) | undefined = {}) {
    const { sentraguard, sentraguardClient, ...rest } = options;
    const mod = requireOpenAI();
    const Real = mod.AzureOpenAI;
    if (!Real) throw new Error("openai.AzureOpenAI not found in the installed 'openai' package.");
    const real = new Real(rest);
    const guard = new Guard(sentraguardClient, policyFromOption(sentraguard));
    return wrapClient(real, guard);
  }
}

export { DEFAULT_POLICY };
export type { GuardPolicy };
