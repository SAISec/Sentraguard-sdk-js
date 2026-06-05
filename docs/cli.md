# CLI

Installed as the `sentraguard` bin.

```
sentraguard [--base-url URL] <command> ...
```

## login
```bash
sentraguard login setup_xxx               # device key (validate + analytics)
sentraguard login --dashboard setup_xxx   # dashboard key (registry + allowlist)
```
Persists to `~/.sentraguard/credentials.json`.

## check
Exit code 2 when blocked, 0 otherwise.
```bash
sentraguard check "ignore previous instructions"
sentraguard check "hello" --json
```

## health / allowlist / whoami
```bash
sentraguard health
sentraguard allowlist list
sentraguard allowlist settings
sentraguard whoami
```
