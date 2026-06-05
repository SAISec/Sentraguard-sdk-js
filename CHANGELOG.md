# Changelog

All notable changes to `@sentraguard/sdk` are documented here. This project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1]

### Changed
- Release pipeline switched to npm OIDC Trusted Publishing with provenance
  (tokenless). No functional/API changes to the SDK.

## [0.1.0]

### Added
- Zero-config module API: `check`, `checkFile`, `checkMany`, `classify`, `guard`,
  `guardMessages`, `guarded`, `health`, `configure`.
- `SentraGuard` client covering all backend resource groups; auto-resolved config
  (args -> env -> `~/.sentraguard/credentials.json` -> localhost) with setup-token
  auto-exchange; `fromSetupToken` / `fromDashboardLogin` / `fromEnv` / `login`.
- Drop-in provider guardrails: `@sentraguard/sdk/openai`, `/anthropic`, `/gemini`.
- `sentraguard` CLI: `login`, `check`, `health`, `allowlist`, `whoami`.
- `CheckResult` with `.blocked/.allowed/.warned`; configurable failure policy
  (`onError`), timeouts, and retry/backoff on 429 / 5xx.
- Universal build (Node 18+ and browser) — ESM + CJS + type declarations.
