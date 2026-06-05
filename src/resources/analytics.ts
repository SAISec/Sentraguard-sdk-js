/** `/analytics` — event ingestion + dashboard reads. */

import { Resource, compact } from "./base.js";

export interface EventOptions {
  url?: string;
  timestamp?: string;
  userAgent?: string;
  data?: Record<string, unknown>;
}

export class AnalyticsResource extends Resource {
  event(eventType: string, sessionId: string, opts: EventOptions = {}): Promise<Record<string, unknown>> {
    const body = compact({
      eventType,
      sessionId,
      url: opts.url,
      timestamp: opts.timestamp,
      userAgent: opts.userAgent,
      data: opts.data,
    });
    return this.t.request("POST", "/analytics/event", { json: body });
  }

  dashboard(params?: Record<string, string | number | boolean>): Promise<Record<string, unknown>> {
    return this.t.request("GET", "/analytics/dashboard", { params });
  }

  session(sessionId: string): Promise<Record<string, unknown>> {
    return this.t.request("GET", `/analytics/session/${sessionId}`);
  }

  export(params?: Record<string, string | number | boolean>): Promise<unknown> {
    return this.t.request("GET", "/analytics/dashboard/export", { params });
  }
}
