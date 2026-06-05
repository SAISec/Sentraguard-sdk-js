/**
 * Typed, friendly return values. Each preserves the raw backend payload in
 * `.raw`. The star is {@link CheckResult} — `.blocked` / `.allowed` make the
 * common branch a one-liner.
 */

const BLOCK_ACTIONS = new Set(["block", "blocked", "deny", "denied"]);
const WARN_ACTIONS = new Set(["warn", "warning"]);

function asList<T = unknown>(v: unknown): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? (v as T[]) : [v as T];
}

export class CheckResult {
  action: string;
  valid: boolean;
  risk?: string;
  score?: number;
  reasons: string[];
  jailbreak?: Record<string, unknown> | null;
  piiDetected?: boolean;
  malicious?: boolean;
  matches?: unknown[];
  metadata: Record<string, unknown>;
  raw: Record<string, unknown>;

  constructor(init: Partial<CheckResult> & { action?: string } = {}) {
    this.action = init.action ?? "allow";
    this.valid = init.valid ?? this.action !== "block";
    this.risk = init.risk;
    this.score = init.score;
    this.reasons = init.reasons ?? [];
    this.jailbreak = init.jailbreak;
    this.piiDetected = init.piiDetected;
    this.malicious = init.malicious;
    this.matches = init.matches;
    this.metadata = init.metadata ?? {};
    this.raw = init.raw ?? {};
  }

  get blocked(): boolean {
    return BLOCK_ACTIONS.has((this.action || "").toLowerCase());
  }
  get warned(): boolean {
    return WARN_ACTIONS.has((this.action || "").toLowerCase());
  }
  get allowed(): boolean {
    return !this.blocked;
  }
  get reason(): string | undefined {
    return this.reasons[0];
  }

  static fromDict(data: Record<string, unknown> | undefined): CheckResult {
    const d = data ?? {};
    const pii = asList(d.piiMatches);
    const mal = asList(d.maliciousMatches);
    return new CheckResult({
      action: String(d.action ?? "allow"),
      valid: typeof d.valid === "boolean" ? d.valid : d.action !== "block",
      risk: d.riskLevel as string | undefined,
      score: d.riskScore as number | undefined,
      reasons: asList(d.reasons).map((r) => String(r)),
      jailbreak: (d.jailbreak as Record<string, unknown> | null) ?? null,
      piiDetected: d.piiDetected as boolean | undefined,
      malicious: d.maliciousContentDetected as boolean | undefined,
      matches: pii.length || mal.length ? [...pii, ...mal] : undefined,
      metadata: (d.metadata as Record<string, unknown>) ?? {},
      raw: d,
    });
  }
}

export class BanTopicResult {
  isBanned: boolean;
  confidence: number;
  detectedTopics: string[];
  raw: Record<string, unknown>;

  constructor(init: Partial<BanTopicResult> = {}) {
    this.isBanned = init.isBanned ?? false;
    this.confidence = init.confidence ?? 0;
    this.detectedTopics = init.detectedTopics ?? [];
    this.raw = init.raw ?? {};
  }

  static fromDict(data: Record<string, unknown> | undefined): BanTopicResult {
    const d = data ?? {};
    const c = (d.classification as Record<string, unknown>) ?? d;
    return new BanTopicResult({
      isBanned: Boolean(c.isBanned),
      confidence: Number(c.confidence ?? 0),
      detectedTopics: asList(c.detectedTopics).map((t) => String(t)),
      raw: d,
    });
  }
}

export interface AllowlistEntry {
  id?: string;
  hostPattern?: string;
  platformId?: string | null;
  enabled: boolean;
  description?: string | null;
  raw: Record<string, unknown>;
}

export function allowlistEntryFromDict(data: Record<string, unknown> | undefined): AllowlistEntry {
  const d = data ?? {};
  return {
    id: d.id as string | undefined,
    hostPattern: d.hostPattern as string | undefined,
    platformId: (d.platformId as string | null) ?? null,
    enabled: d.enabled !== false,
    description: (d.description as string | null) ?? null,
    raw: d,
  };
}

// Registry entries share the allowlist wire shape.
export type RegistryEntry = AllowlistEntry;
export const registryEntryFromDict = allowlistEntryFromDict;

export interface AllowlistSettings {
  mlRiskProfile?: string;
  mlBlockUiMode?: string;
  orgUnknownSitePolicy?: string;
  runtimeProfile?: string;
  updatedAt?: string;
  raw: Record<string, unknown>;
}

export function allowlistSettingsFromDict(
  data: Record<string, unknown> | undefined,
): AllowlistSettings {
  const d = data ?? {};
  const s = (d.settings as Record<string, unknown>) ?? {};
  return {
    mlRiskProfile: s.ml_risk_profile as string | undefined,
    mlBlockUiMode: s.ml_block_ui_mode as string | undefined,
    orgUnknownSitePolicy: s.org_unknown_site_policy as string | undefined,
    runtimeProfile: d.runtime_profile as string | undefined,
    updatedAt: d.updatedAt as string | undefined,
    raw: d,
  };
}

export interface HealthStatus {
  status: string;
  version?: string;
  uptime?: number;
  services: Record<string, unknown>;
  healthy: boolean;
  raw: Record<string, unknown>;
}

export function healthStatusFromDict(data: Record<string, unknown> | undefined): HealthStatus {
  const d = data ?? {};
  const status = String(d.status ?? "unknown");
  return {
    status,
    version: d.version as string | undefined,
    uptime: d.uptime as number | undefined,
    services: (d.services as Record<string, unknown>) ?? {},
    healthy: ["healthy", "ok", "up"].includes(status.toLowerCase()),
    raw: d,
  };
}

export interface SetupSession {
  apiKey?: string;
  organizationId?: string;
  deviceId?: string;
  permissions: string[];
  accessToken?: string;
  expiresAt?: string;
  organization?: Record<string, unknown>;
  raw: Record<string, unknown>;
}

export function setupSessionFromDict(data: Record<string, unknown> | undefined): SetupSession {
  const d = data ?? {};
  return {
    apiKey: d.apiKey as string | undefined,
    organizationId: d.organizationId as string | undefined,
    deviceId: d.deviceId as string | undefined,
    permissions: asList(d.permissions).map((p) => String(p)),
    accessToken: (d.rateLimitsAccessToken as string) ?? (d.accessToken as string | undefined),
    expiresAt: d.expiresAt as string | undefined,
    organization: d.organization as Record<string, unknown> | undefined,
    raw: d,
  };
}
