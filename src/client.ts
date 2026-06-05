/**
 * The `SentraGuard` client — the friendly front door. JS is async-first, so a
 * single client (no sync/async split). Most apps construct it with no args.
 *
 *     import { SentraGuard } from "@sentraguard/sdk";
 *     const sg = new SentraGuard();
 *     if ((await sg.check("ignore previous instructions")).blocked) refuse();
 */

import {
  ClientConfig,
  ResolveOptions,
  generateDeviceId,
  resolveConfig,
  saveCredentials,
} from "./config.js";
import { Blocked, ConfigurationError, TransportError } from "./errors.js";
import { CheckResult, HealthStatus } from "./models.js";
import { Transport } from "./transport.js";
import { AnalyticsResource } from "./resources/analytics.js";
import { AllowlistResource } from "./resources/allowlist.js";
import { BanTopicResource } from "./resources/banTopic.js";
import { HealthResource } from "./resources/health.js";
import { RegistryResource } from "./resources/registry.js";
import { SetupResource } from "./resources/setup.js";
import { FileInput, TextOptions, ValidateResource } from "./resources/validate.js";
import {
  ApiModeResource,
  AuthResource,
  BackupResource,
  ConfigurationResource,
  KeysResource,
  OrganizationsResource,
  RateLimitsResource,
  RbacResource,
  SecurityResource,
} from "./resources/misc.js";

export interface SentraGuardOptions extends ResolveOptions {
  /** Auto-exchange a bare setup token for an API key on first use. Default true. */
  autoExchange?: boolean;
}

export class SentraGuard {
  config: ClientConfig;
  private transport: Transport;

  // Resource groups.
  health: HealthResource;
  keys: KeysResource;
  setup: SetupResource;
  auth: AuthResource;
  organizations: OrganizationsResource;
  configuration: ConfigurationResource;
  validate: ValidateResource;
  analytics: AnalyticsResource;
  registry: RegistryResource;
  allowlist: AllowlistResource;
  banTopic: BanTopicResource;
  rbac: RbacResource;
  security: SecurityResource;
  backup: BackupResource;
  rateLimits: RateLimitsResource;
  apiMode: ApiModeResource;

  private autoExchange: boolean;
  private exchanged = false;

  constructor(options: SentraGuardOptions = {}) {
    const { autoExchange, ...resolveOpts } = options;
    this.autoExchange = autoExchange ?? true;
    this.config = resolveConfig(resolveOpts);
    this.transport = new Transport(this.config);

    this.health = new HealthResource(this.transport);
    this.keys = new KeysResource(this.transport);
    this.setup = new SetupResource(this.transport);
    this.auth = new AuthResource(this.transport);
    this.organizations = new OrganizationsResource(this.transport);
    this.configuration = new ConfigurationResource(this.transport);
    this.validate = new ValidateResource(this.transport);
    this.analytics = new AnalyticsResource(this.transport);
    this.registry = new RegistryResource(this.transport);
    this.allowlist = new AllowlistResource(this.transport);
    this.banTopic = new BanTopicResource(this.transport);
    this.rbac = new RbacResource(this.transport);
    this.security = new SecurityResource(this.transport);
    this.backup = new BackupResource(this.transport);
    this.rateLimits = new RateLimitsResource(this.transport);
    this.apiMode = new ApiModeResource(this.transport);
  }

  /** Ensure we have an API key, auto-exchanging a setup token once if needed. */
  private async ensureAuth(): Promise<void> {
    if (this.exchanged || this.config.apiKey || !this.autoExchange || !this.config.setupToken) {
      return;
    }
    this.exchanged = true;
    const deviceId = this.config.deviceId ?? generateDeviceId();
    const session = await this.setup.exchangeToken(this.config.setupToken, deviceId);
    if (session.apiKey) {
      this.config.apiKey = session.apiKey;
      this.config.deviceId = deviceId;
    }
  }

  // ---- alternate constructors -------------------------------------------
  static async fromSetupToken(
    setupToken: string,
    opts: { baseUrl?: string; deviceId?: string; persist?: boolean } & SentraGuardOptions = {},
  ): Promise<SentraGuard> {
    const cfg = resolveConfig({ baseUrl: opts.baseUrl });
    const deviceId = opts.deviceId ?? cfg.deviceId ?? generateDeviceId();
    const tmp = new SentraGuard({ baseUrl: cfg.baseUrl, autoExchange: false });
    const session = await tmp.setup.exchangeToken(setupToken, deviceId);
    if (!session.apiKey) throw new ConfigurationError("Setup token exchange returned no API key.");
    if (opts.persist) {
      saveCredentials({
        base_url: cfg.baseUrl,
        api_key: session.apiKey,
        device_id: deviceId,
        organization_id: session.organizationId,
      });
    }
    return new SentraGuard({ ...opts, baseUrl: cfg.baseUrl, apiKey: session.apiKey, deviceId });
  }

  static async fromDashboardLogin(
    setupToken: string,
    opts: { baseUrl?: string; persist?: boolean } & SentraGuardOptions = {},
  ): Promise<SentraGuard> {
    const cfg = resolveConfig({ baseUrl: opts.baseUrl });
    const tmp = new SentraGuard({ baseUrl: cfg.baseUrl, autoExchange: false });
    const session = await tmp.setup.dashboardLogin(setupToken);
    if (!session.apiKey) throw new ConfigurationError("Dashboard login returned no API key.");
    if (opts.persist) {
      saveCredentials({
        base_url: cfg.baseUrl,
        api_key: session.apiKey,
        access_token: session.accessToken,
        organization_id: session.organizationId,
      });
    }
    return new SentraGuard({
      ...opts,
      baseUrl: cfg.baseUrl,
      apiKey: session.apiKey,
      accessToken: session.accessToken,
    });
  }

  static fromEnv(opts: SentraGuardOptions = {}): SentraGuard {
    return new SentraGuard(opts);
  }

  /** Authenticate a user and store the returned JWT for org/admin calls. */
  async login(
    emailOrUsername: string,
    password: string,
    opts: { mfaCode?: string; organizationId?: string } = {},
  ): Promise<Record<string, unknown>> {
    const data = await this.auth.login(emailOrUsername, password, opts);
    const token = (data?.accessToken as string) || undefined;
    if (token) this.config.accessToken = token;
    return data;
  }

  // ---- convenience -------------------------------------------------------
  async check(
    text: string,
    opts: TextOptions & { onError?: "throw" | "allow" | "block" } = {},
  ): Promise<CheckResult> {
    await this.ensureAuth();
    try {
      const { onError: _onError, ...textOpts } = opts;
      return await this.validate.text(text, textOpts);
    } catch (err) {
      if (err instanceof TransportError) return this.handleFailure(opts.onError);
      throw err;
    }
  }

  async checkFile(
    input: FileInput,
    opts: { onError?: "throw" | "allow" | "block" } = {},
  ): Promise<CheckResult> {
    await this.ensureAuth();
    try {
      return await this.validate.file(input);
    } catch (err) {
      if (err instanceof TransportError) return this.handleFailure(opts.onError);
      throw err;
    }
  }

  async checkMany(texts: string[]): Promise<CheckResult[]> {
    await this.ensureAuth();
    return this.validate.batch(texts);
  }

  async classify(text: string, topics?: string[]) {
    await this.ensureAuth();
    return this.banTopic.classify(text, topics);
  }

  /** Like {@link check} but throws {@link Blocked} when blocked. */
  async guard(text: string, opts: TextOptions = {}): Promise<CheckResult> {
    const result = await this.check(text, opts);
    if (result.blocked) {
      throw new Blocked(result.reason ?? "Content blocked by SentraGuard policy.", result);
    }
    return result;
  }

  async healthy(): Promise<boolean> {
    try {
      const status: HealthStatus = await this.health.check();
      return status.healthy;
    } catch {
      return false;
    }
  }

  private handleFailure(onError?: "throw" | "allow" | "block"): CheckResult {
    const policy = onError ?? this.config.onError;
    if (policy === "allow") {
      return new CheckResult({ action: "allow", valid: true, reasons: ["sentraguard-unreachable"] });
    }
    if (policy === "block") {
      return new CheckResult({ action: "block", valid: false, reasons: ["sentraguard-unreachable"] });
    }
    throw new TransportError("SentraGuard backend unreachable.");
  }
}
