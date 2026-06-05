/** `/ai-allowlist` — org allowlist entries + ML settings. */

import {
  AllowlistEntry,
  AllowlistSettings,
  allowlistEntryFromDict,
  allowlistSettingsFromDict,
} from "../models.js";
import { Resource, compact } from "./base.js";

export interface EntryInput {
  enabled?: boolean;
  platformId?: string;
  description?: string;
}

export interface SettingsInput {
  mlRiskProfile?: string;
  mlBlockUiMode?: string;
  orgUnknownSitePolicy?: string;
}

export class AllowlistResource extends Resource {
  version(): Promise<Record<string, unknown>> {
    return this.t.request("GET", "/ai-allowlist/version");
  }

  async list(): Promise<AllowlistEntry[]> {
    const data = await this.t.request("GET", "/ai-allowlist");
    return ((data?.entries as Record<string, unknown>[]) ?? []).map(allowlistEntryFromDict);
  }

  async add(hostPattern: string, opts: EntryInput = {}): Promise<AllowlistEntry> {
    const body = compact({
      hostPattern,
      enabled: opts.enabled,
      platformId: opts.platformId,
      description: opts.description,
    });
    return allowlistEntryFromDict(await this.t.request("POST", "/ai-allowlist/entries", { json: body }));
  }

  async update(
    entryId: string,
    opts: EntryInput & { hostPattern?: string } = {},
  ): Promise<AllowlistEntry> {
    const body = compact({
      hostPattern: opts.hostPattern,
      enabled: opts.enabled,
      platformId: opts.platformId,
      description: opts.description,
    });
    return allowlistEntryFromDict(
      await this.t.request("PATCH", `/ai-allowlist/entries/${entryId}`, { json: body }),
    );
  }

  delete(entryId: string): Promise<Record<string, unknown>> {
    return this.t.request("DELETE", `/ai-allowlist/entries/${entryId}`);
  }

  async getSettings(): Promise<AllowlistSettings> {
    return allowlistSettingsFromDict(await this.t.request("GET", "/ai-allowlist/settings"));
  }

  async updateSettings(opts: SettingsInput): Promise<AllowlistSettings> {
    // Backend uses snake_case for these fields.
    const body = compact({
      ml_risk_profile: opts.mlRiskProfile,
      ml_block_ui_mode: opts.mlBlockUiMode,
      org_unknown_site_policy: opts.orgUnknownSitePolicy,
    });
    return allowlistSettingsFromDict(
      await this.t.request("PATCH", "/ai-allowlist/settings", { json: body }),
    );
  }
}
