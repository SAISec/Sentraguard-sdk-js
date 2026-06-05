# @sentraguard/sdk — documentation

- **[Quickstart](quickstart.md)** — install and run your first check.
- **[Authentication](authentication.md)** — setup tokens, dashboard login, API keys, env.
- **[Provider integrations](integrations.md)** — OpenAI / Anthropic / Gemini drop-ins.
- **[Configuration](configuration.md)** — base URL, timeouts, retries, failure policy.
- **[API reference](api-reference.md)** — every method mapped to its backend endpoint.
- **[Errors](errors.md)** — the exception taxonomy.
- **[CLI](cli.md)** — the `sentraguard` command.

## The 10-second mental model

```ts
import { check, guard } from "@sentraguard/sdk";
(await check(text)).blocked;   // boolean
await guard(text);             // throws Blocked if blocked
```
