import type { Transport } from "../transport.js";

/** Drop keys whose value is undefined so we never send nulls the API rejects. */
export function compact<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

export class Resource {
  constructor(protected t: Transport) {}
}
