// Drop-in guardrail for an existing OpenAI app — change one import.
//   npm i openai ; node examples/02-openai-dropin.mjs
import { Blocked } from "@sentraguard/sdk";
import { OpenAI } from "@sentraguard/sdk/openai"; // was: import OpenAI from "openai";

const client = new OpenAI(); // same constructor & methods
try {
  const resp = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: "Write a haiku about secure AI." }],
  });
  console.log(resp.choices[0].message.content);
} catch (e) {
  if (e instanceof Blocked) console.log("Blocked by SentraGuard:", e.result?.reasons);
  else throw e;
}
