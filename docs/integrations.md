# Provider integrations (drop-in guardrails)

Each wrapper mirrors the official provider client; change one import. Prompts (and
optionally responses) flow through SentraGuard's `/validate` and `/ban-topic`
endpoints around the provider call. Provider SDKs are optional peer dependencies,
loaded lazily.

## OpenAI
```ts
import { OpenAI } from "@sentraguard/sdk/openai";   // npm i openai
const client = new OpenAI();
await client.chat.completions.create({ model: "gpt-4o", messages });
```

## Anthropic
```ts
import { Anthropic } from "@sentraguard/sdk/anthropic";   // npm i @anthropic-ai/sdk
const client = new Anthropic();
await client.messages.create({ model, max_tokens, messages });
```

## Gemini (@google/genai)
```ts
import { GoogleGenAI } from "@sentraguard/sdk/gemini";   // npm i @google/genai
const client = new GoogleGenAI({ apiKey });
await client.models.generateContent({ model, contents });
```

## Controlling the guard
Pass `sentraguard` to the constructor or a single `create()`:

| Value | Effect |
|---|---|
| `"block"` (default) | throw `Blocked` |
| `"warn"` | log + proceed |
| `"audit"` | analytics only |
| `false` | skip for this call |
| `{ direction: "both", checks: ["prompt","topics"], topics: [...] }` | fine-grained |

> Node 18 users: the provider drop-ins resolve the provider package via `require`,
> which works in CJS; on ESM-only Node 18 they need Node ≥ 20.16. Most setups are fine.

## Without swapping your client
```ts
import { guardMessages } from "@sentraguard/sdk";
await guardMessages(messages, { mode: "block" });
```
