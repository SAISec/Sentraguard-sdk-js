/** Admin / auxiliary resource groups (raw dict passthroughs). */

import { Resource, compact } from "./base.js";

export class KeysResource extends Resource {
  current() {
    return this.t.request("GET", "/keys/current");
  }
  list() {
    return this.t.request("GET", "/keys/list");
  }
  generate(description?: string) {
    return this.t.request("POST", "/keys/generate", { json: compact({ description }) });
  }
  revoke(key: string) {
    return this.t.request("DELETE", `/keys/revoke/${key}`);
  }
}

export interface LoginOptions {
  mfaCode?: string;
  organizationId?: string;
}

export class AuthResource extends Resource {
  login(emailOrUsername: string, password: string, opts: LoginOptions = {}) {
    const body = compact({
      emailOrUsername,
      password,
      mfaCode: opts.mfaCode,
      organizationId: opts.organizationId,
    });
    return this.t.request("POST", "/auth/login", { json: body });
  }
  refresh(refreshToken?: string) {
    return this.t.request("POST", "/auth/refresh", { json: compact({ refreshToken }) });
  }
  logout(opts: { sessionId?: string; allSessions?: boolean } = {}) {
    return this.t.request("POST", "/auth/logout", {
      json: compact({ sessionId: opts.sessionId, allSessions: opts.allSessions }),
    });
  }
}

export class OrganizationsResource extends Resource {
  list(params?: Record<string, string | number | boolean>) {
    return this.t.request("GET", "/organizations", { params });
  }
  get(orgId: string) {
    return this.t.request("GET", `/organizations/${orgId}`);
  }
  create(name: string, subdomain: string, opts: { displayName?: string; plan?: string } = {}) {
    return this.t.request("POST", "/organizations", {
      json: compact({ name, subdomain, displayName: opts.displayName, plan: opts.plan }),
    });
  }
}

export class ConfigurationResource extends Resource {
  get() {
    return this.t.request("GET", "/configuration");
  }
  features() {
    return this.t.request("GET", "/configuration/features");
  }
  setFeature(
    featureName: string,
    opts: { enabled: boolean; mode?: string; settings?: Record<string, unknown> },
  ) {
    return this.t.request("PUT", `/configuration/features/${featureName}`, {
      json: compact({ enabled: opts.enabled, mode: opts.mode, settings: opts.settings }),
    });
  }
}

export class RbacResource extends Resource {
  roles() {
    return this.t.request("GET", "/rbac/roles");
  }
  hierarchy() {
    return this.t.request("GET", "/rbac/roles/hierarchy");
  }
  createRole(name: string, permissions: string[], opts: { description?: string; level?: number } = {}) {
    return this.t.request("POST", "/rbac/roles", {
      json: compact({ name, permissions, description: opts.description, level: opts.level }),
    });
  }
  updateRole(roleName: string, permissions: string[]) {
    return this.t.request("PUT", `/rbac/roles/${roleName}`, { json: { permissions } });
  }
  deleteRole(roleName: string) {
    return this.t.request("DELETE", `/rbac/roles/${roleName}`);
  }
}

export class SecurityResource extends Resource {
  metrics(timeRange?: string) {
    return this.t.request("GET", "/security/metrics", { params: compact({ timeRange }) });
  }
  alerts(params?: Record<string, string | number | boolean>) {
    return this.t.request("GET", "/security/alerts", { params });
  }
  acknowledge(alertId: string) {
    return this.t.request("POST", `/security/alerts/${alertId}/acknowledge`);
  }
  export(params?: Record<string, string | number | boolean>) {
    return this.t.request("GET", "/security/export", { params });
  }
}

export class BackupResource extends Resource {
  create(opts: Record<string, unknown> = {}) {
    return this.t.request("POST", "/backup/create", { json: compact(opts) });
  }
  list() {
    return this.t.request("GET", "/backup/list");
  }
  stats() {
    return this.t.request("GET", "/backup/stats");
  }
}

export class RateLimitsResource extends Resource {
  setupTokens() {
    return this.t.request("GET", "/admin/rate-limits/setup-tokens");
  }
  config(setupTokenId: string) {
    return this.t.request("GET", `/admin/rate-limits/config/${setupTokenId}`);
  }
  updateConfig(setupTokenId: string, opts: { rps?: number; rpm?: number; burst?: number }) {
    return this.t.request("PATCH", `/admin/rate-limits/config/${setupTokenId}`, {
      json: compact({ rps: opts.rps, rpm: opts.rpm, burst: opts.burst }),
    });
  }
  usage(setupTokenId: string) {
    return this.t.request("GET", `/admin/rate-limits/usage/${setupTokenId}`);
  }
}

export class ApiModeResource extends Resource {
  /** OpenAI-compatible, non-streaming. `POST /api-mode/openai/chat/completions`. */
  chatCompletions(args: { model: string; messages: unknown[]; [k: string]: unknown }) {
    return this.t.request("POST", "/api-mode/openai/chat/completions", {
      json: { ...args, stream: false },
    });
  }
}
