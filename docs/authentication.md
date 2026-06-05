# Authentication

The SDK reuses the backend's existing auth mechanisms.

## Device key (validate + analytics) — `fromSetupToken`
```ts
const sg = await SentraGuard.fromSetupToken("setup_xxx", { persist: true });
```
`persist: true` writes the API key + a generated device id to
`~/.sentraguard/credentials.json`, so later processes just do `new SentraGuard()`.
The CLI does the same: `sentraguard login setup_xxx`.

## Dashboard key (registry + allowlist) — `fromDashboardLogin`
```ts
const sg = await SentraGuard.fromDashboardLogin("setup_xxx");
await sg.allowlist.updateSettings({ mlRiskProfile: "strong" });
```
`sentraguard login --dashboard setup_xxx`.

## Existing API key
```ts
const sg = new SentraGuard({ baseUrl: "https://sg.example.com", apiKey: "..." });
```
or env: `SENTRAGUARD_BASE_URL`, `SENTRAGUARD_API_KEY`.

## User JWT (org/admin endpoints)
```ts
const sg = new SentraGuard();
await sg.login("user@example.com", "password");
await sg.organizations.list();
```

## Resolution order
explicit options → env → `~/.sentraguard/credentials.json` → `http://127.0.0.1:3001`.
A bare setup token is auto-exchanged for an API key on first use and cached.
