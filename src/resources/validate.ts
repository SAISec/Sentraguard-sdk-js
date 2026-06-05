/** `/validate` — the core enforcement endpoints (text, image, pdf, batch, stats). */

import { CheckResult } from "../models.js";
import { Resource, compact } from "./base.js";

export interface TextOptions {
  url?: string;
  sessionId?: string;
  inputLength?: number;
  userAgent?: string;
  pageTitle?: string;
  referrer?: string;
  conversationContext?: unknown;
  timestamp?: string;
}

export interface FileInput {
  /** Raw bytes, base64 string, or Node Buffer/Uint8Array. */
  data: Uint8Array | ArrayBuffer | string;
  fileName: string;
  mimeType?: string;
  sessionId?: string;
  url?: string;
}

function toBase64(data: Uint8Array | ArrayBuffer | string): string {
  if (typeof data === "string") return data; // assume already base64
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  // Node Buffer when available; else btoa.
  const B = (globalThis as { Buffer?: { from(b: Uint8Array): { toString(enc: string): string } } })
    .Buffer;
  if (B) return B.from(bytes).toString("base64");
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function guessMime(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}

export class ValidateResource extends Resource {
  async text(inputValue: string, opts: TextOptions = {}): Promise<CheckResult> {
    const body = compact({
      inputValue,
      url: opts.url,
      sessionId: opts.sessionId,
      inputLength: opts.inputLength ?? inputValue.length,
      userAgent: opts.userAgent,
      pageTitle: opts.pageTitle,
      referrer: opts.referrer,
      conversationContext: opts.conversationContext,
      timestamp: opts.timestamp,
    });
    return CheckResult.fromDict(await this.t.request("POST", "/validate", { json: body }));
  }

  async file(input: FileInput): Promise<CheckResult> {
    const mime = input.mimeType ?? guessMime(input.fileName);
    const route = mime.toLowerCase().includes("pdf") ? "pdf" : "image";
    const b64 = toBase64(input.data);
    const body = compact({
      file: b64,
      fileName: input.fileName,
      mimeType: mime,
      sessionId: input.sessionId,
      url: input.url,
    });
    return CheckResult.fromDict(await this.t.request("POST", `/validate/${route}`, { json: body }));
  }

  async batch(inputs: unknown[]): Promise<CheckResult[]> {
    const data = await this.t.request("POST", "/validate/batch", { json: { inputs } });
    const results = (data?.results as Record<string, unknown>[]) ?? [];
    return results.map((r) => CheckResult.fromDict(r));
  }

  async stats(): Promise<Record<string, unknown>> {
    return this.t.request("GET", "/validate/stats");
  }
}
