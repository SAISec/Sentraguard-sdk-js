// Drop-in guardrail for a Gemini app (@google/genai).
//   npm i @google/genai ; node examples/04-gemini-dropin.mjs
import { Blocked } from "@sentraguard/sdk";
import { GoogleGenAI } from "@sentraguard/sdk/gemini";

const client = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
try {
  const resp = await client.models.generateContent({
    model: "gemini-1.5-flash",
    contents: "Give one tip for safe prompt design.",
  });
  console.log(resp.text ?? resp);
} catch (e) {
  if (e instanceof Blocked) console.log("Blocked by SentraGuard:", e.result?.reasons);
  else throw e;
}
