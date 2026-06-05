# API reference

Every method maps to a backend endpoint; all return Promises.

## Convenience (client + module-level)
| Call | Endpoint | Returns |
|---|---|---|
| `check(text, opts?)` | `POST /validate` | `CheckResult` |
| `checkFile({data,fileName})` | `POST /validate/{pdf,image}` | `CheckResult` |
| `checkMany([...])` | `POST /validate/batch` | `CheckResult[]` |
| `classify(text, topics?)` | `POST /ban-topic/classify` | `BanTopicResult` |
| `guard(text)` | `POST /validate` | throws `Blocked` |
| `guardMessages(messages)` | `POST /validate` (+ ban-topic) | `CheckResult` |

## sg.validate
`text`, `file`, `batch`, `stats` → `/validate*`.

## sg.allowlist
`version`, `list`, `add`, `update`, `delete`, `getSettings`, `updateSettings` →
`/ai-allowlist*`.

## sg.registry
`version`, `list`, `add`, `update`, `delete` → `/ai-registry*`.

## sg.banTopic / sg.analytics / sg.setup / sg.health
`/ban-topic*`, `/analytics*`, `/setup*`, `/health` + probes.

## Admin
`sg.keys`, `sg.auth`, `sg.organizations`, `sg.configuration`, `sg.rbac`,
`sg.security`, `sg.backup`, `sg.rateLimits`, `sg.apiMode`.

## CheckResult
`action`, `valid`, `risk`, `score`, `reasons`, `reason`, `jailbreak`, `piiDetected`,
`malicious`, `matches`, `metadata`, `raw`; getters `blocked` / `warned` / `allowed`.
