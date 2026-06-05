/** `/ban-topic` — banned-topic classification. */

import { BanTopicResult } from "../models.js";
import { Resource, compact } from "./base.js";

export class BanTopicResource extends Resource {
  async classify(text: string, customTopics?: string[]): Promise<BanTopicResult> {
    const body = compact({ text, customTopics });
    return BanTopicResult.fromDict(
      await this.t.request("POST", "/ban-topic/classify", { json: body }),
    );
  }

  async classifyBatch(texts: string[], customTopics?: string[]): Promise<BanTopicResult[]> {
    const body = compact({ texts, customTopics });
    const data = await this.t.request("POST", "/ban-topic/classify/batch", { json: body });
    return ((data?.results as Record<string, unknown>[]) ?? []).map((r) =>
      BanTopicResult.fromDict(r),
    );
  }

  async metrics(): Promise<Record<string, unknown>> {
    return this.t.request("GET", "/ban-topic/metrics");
  }

  async health(): Promise<Record<string, unknown>> {
    return this.t.request("GET", "/ban-topic/health");
  }
}
