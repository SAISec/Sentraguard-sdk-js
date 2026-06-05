// Drop-in guardrail for an Anthropic app.
//   npm i @anthropic-ai/sdk ; node examples/03-anthropic-dropin.mjs
import { Blocked } from "@sentraguard/sdk";
import { Anthropic } from "@sentraguard/sdk/anthropic";

const client = new Anthropic();
try {
  const resp = await client.messages.create({
    model: "claude-3-5-sonnet-latest",
    max_tokens: 256,
    messages: [{ role: "user", content: "Summarize zero-trust in one sentence." }],
  });
  console.log(resp.content.map((b) => b.text ?? "").join(""));
} catch (e) {
  if (e instanceof Blocked) console.log("Blocked by SentraGuard:", e.result?.reasons);
  else throw e;
}
