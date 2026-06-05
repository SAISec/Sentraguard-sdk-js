/** `/health` and liveness/readiness/metrics probes. */

import { HealthStatus, healthStatusFromDict } from "../models.js";
import { Resource } from "./base.js";

export class HealthResource extends Resource {
  async check(): Promise<HealthStatus> {
    return healthStatusFromDict(await this.t.request("GET", "/health"));
  }
  detailed(): Promise<Record<string, unknown>> {
    return this.t.request("GET", "/health/detailed");
  }
  ready(): Promise<Record<string, unknown>> {
    return this.t.request("GET", "/ready");
  }
  live(): Promise<Record<string, unknown>> {
    return this.t.request("GET", "/live");
  }
  telemetry(): Promise<Record<string, unknown>> {
    return this.t.request("GET", "/health/telemetry");
  }
}
