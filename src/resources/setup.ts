/** `/setup` — token validation, device exchange, dashboard login. */

import { SetupSession, setupSessionFromDict } from "../models.js";
import { Resource, compact } from "./base.js";

export class SetupResource extends Resource {
  validateToken(
    token: string,
    opts: { deviceId?: string; reserve?: boolean } = {},
  ): Promise<Record<string, unknown>> {
    const body = compact({ token, deviceId: opts.deviceId, reserve: opts.reserve || undefined });
    return this.t.request("POST", "/setup/validate-token", { json: body });
  }

  async exchangeToken(token: string, deviceId: string): Promise<SetupSession> {
    return setupSessionFromDict(
      await this.t.request("POST", "/setup/exchange-token", { json: { token, deviceId } }),
    );
  }

  async dashboardLogin(token: string): Promise<SetupSession> {
    return setupSessionFromDict(
      await this.t.request("POST", "/setup/dashboard-login", { json: { token } }),
    );
  }

  registerDevice(
    deviceId: string,
    opts: { userAgent?: string; token?: string } = {},
  ): Promise<Record<string, unknown>> {
    const body = compact({ deviceId, userAgent: opts.userAgent, token: opts.token });
    return this.t.request("POST", "/setup/register-device", { json: body });
  }

  health(): Promise<Record<string, unknown>> {
    return this.t.request("GET", "/setup/health");
  }
}
