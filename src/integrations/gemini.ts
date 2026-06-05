/**
 * Drop-in guardrail for Google's Gemini SDK (`@google/genai`).
 *
 *     // before:  import { GoogleGenAI } from "@google/genai";
 *     import { GoogleGenAI } from "@sentraguard/sdk/gemini";
 *     const client = new GoogleGenAI({ apiKey });
 *     await client.models.generateContent({ model, contents });  // auto-guarded
 */

import type { SentraGuard } from "../client.js";
import { lazyRequire } from "./_require.js";
import { Guard, SentraGuardOverride, coercePolicy, policyFromOption } from "./guard.js";

function requireGenAI(): any {
  return lazyRequire("@google/genai", "npm i @google/genai");
}

function responseText(resp: any): string {
  try {
    if (typeof resp?.text === "string") return resp.text;
    if (typeof resp?.text === "function") return resp.text() ?? "";
    const cands = resp?.candidates ?? [];
    const parts: string[] = [];
    for (const c of cands) {
      for (const p of c?.content?.parts ?? []) {
        if (typeof p?.text === "string") parts.push(p.text);
      }
    }
    return parts.join(" ");
  } catch {
    return "";
  }
}

export interface SentraGuardClientOptions {
  sentraguard?: SentraGuardOverride;
  sentraguardClient?: SentraGuard;
}

function makeGuardedGenerate(realGenerate: (...a: any[]) => any, guard: Guard) {
  return async function generateContent(args: any = {}, ...rest: any[]) {
    const override = "sentraguard" in args ? (args.sentraguard as SentraGuardOverride) : undefined;
    if ("sentraguard" in args) delete args.sentraguard;
    const policy = coercePolicy(override, guard.policy);
    if (policy) await guard.checkInput(args.contents, policy);
    const resp = await realGenerate(args, ...rest);
    if (policy && (policy.direction === "output" || policy.direction === "both")) {
      await guard.checkOutput(responseText(resp), policy);
    }
    return resp;
  };
}

export class GoogleGenAI {
  constructor(options: (Record<string, any> & SentraGuardClientOptions) | undefined = {}) {
    const { sentraguard, sentraguardClient, ...rest } = options;
    const mod = requireGenAI();
    const Real = mod.GoogleGenAI ?? mod.default ?? mod;
    const real = new Real(rest);
    const guard = new Guard(sentraguardClient, policyFromOption(sentraguard));
    if (real.models?.generateContent) {
      const bound = real.models.generateContent.bind(real.models);
      real.models.generateContent = makeGuardedGenerate(bound, guard);
    }
    return real;
  }
}
