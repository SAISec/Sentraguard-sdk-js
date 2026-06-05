# Errors

All errors extend `SentraGuardError`.

| Class | When |
|---|---|
| `ConfigurationError` | No usable config (e.g. exchange returned no key). |
| `TransportError` | The request never got an HTTP response. |
| `APIError` | Base for HTTP error responses. |
| `BadRequestError` | 400 |
| `AuthError` | 401 |
| `PermissionError` | 403 |
| `NotFoundError` | 404 |
| `PayloadTooLargeError` | 413 |
| `UnsupportedMediaError` | 415 |
| `RateLimitError` | 429 — has `.retryAfter` |
| `ServerError` / `ServiceUnavailableError` | 5xx / 503 |
| `Blocked` | A guarded call was blocked — has `.result` (`CheckResult`). |

Each `APIError` carries `.statusCode`, `.errorType`, `.message`, `.response`.

```ts
import { guard, Blocked, RateLimitError } from "@sentraguard/sdk";
try { await guard(text); }
catch (e) {
  if (e instanceof Blocked) console.log(e.result?.reasons);
  else if (e instanceof RateLimitError) console.log("retry after", e.retryAfter);
}
```
