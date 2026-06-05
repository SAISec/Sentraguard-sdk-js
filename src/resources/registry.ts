/** `/ai-registry` — org AI-site registry entries. */

import { RegistryEntry, registryEntryFromDict } from "../models.js";
import { Resource, compact } from "./base.js";

export interface RegistryEntryInput {
  enabled?: boolean;
  platformId?: string;
  description?: string;
  hostPattern?: string;
}

export class RegistryResource extends Resource {
  version(): Promise<Record<string, unknown>> {
    return this.t.request("GET", "/ai-registry/version");
  }

  async list(): Promise<RegistryEntry[]> {
    const data = await this.t.request("GET", "/ai-registry");
    return ((data?.entries as Record<string, unknown>[]) ?? []).map(registryEntryFromDict);
  }

  async add(hostPattern: string, opts: RegistryEntryInput = {}): Promise<RegistryEntry> {
    const body = compact({
      hostPattern,
      enabled: opts.enabled,
      platformId: opts.platformId,
      description: opts.description,
    });
    return registryEntryFromDict(await this.t.request("POST", "/ai-registry/entries", { json: body }));
  }

  async update(entryId: string, opts: RegistryEntryInput = {}): Promise<RegistryEntry> {
    const body = compact({
      hostPattern: opts.hostPattern,
      enabled: opts.enabled,
      platformId: opts.platformId,
      description: opts.description,
    });
    return registryEntryFromDict(
      await this.t.request("PATCH", `/ai-registry/entries/${entryId}`, { json: body }),
    );
  }

  delete(entryId: string): Promise<Record<string, unknown>> {
    return this.t.request("DELETE", `/ai-registry/entries/${entryId}`);
  }
}
