# Configuration

Pass to `new SentraGuard({...})` or set once globally via `configure({...})`.

| Option | Default | Meaning |
|---|---|---|
| `baseUrl` | `http://127.0.0.1:3001` | Backend root (the SDK appends `/api/v1`). |
| `apiKey` | — | `x-api-key` credential. |
| `accessToken` | — | JWT for org/admin endpoints. |
| `setupToken` | — | Auto-exchanged for an API key on first use. |
| `deviceId` | auto | Device identity for setup-token exchange. |
| `timeoutMs` | `30000` | Per-request timeout. |
| `maxRetries` | `2` | Retries on 429 / 502 / 503 / 504 with backoff. |
| `onError` | `"throw"` | Behaviour when the backend is unreachable. |

## Failure policy (`onError`)
- `"throw"` (default) — propagate `TransportError`.
- `"allow"` — return an allowed `CheckResult` (fail-open); reason `sentraguard-unreachable`.
- `"block"` — return a blocked `CheckResult` (fail-closed).

```ts
import { configure, check } from "@sentraguard/sdk";
configure({ onError: "allow" });          // global
await check(text, { onError: "block" });  // per call
```

## Environment variables
`SENTRAGUARD_BASE_URL`, `SENTRAGUARD_API_KEY`, `SENTRAGUARD_SETUP_TOKEN`,
`SENTRAGUARD_ACCESS_TOKEN`, `SENTRAGUARD_DEVICE_ID`, `SENTRAGUARD_HOME`.
