/**
 * Load an optional provider package synchronously, working in both the CJS and
 * ESM builds. Provider drop-ins are Node-oriented; this never runs in a browser.
 *
 *  - CJS build / Node 18+: the global `require` resolves it.
 *  - ESM build / Node ≥20.16 or 22: `module.createRequire(import.meta.url)`.
 */
export function lazyRequire(name: string, install: string): any {
  // CJS path (and Node 18 CJS).
  try {
    if (typeof require === "function") return require(name);
  } catch {
    /* fall through */
  }
  // ESM-on-Node path.
  try {
    const proc = (globalThis as { process?: { getBuiltinModule?: (n: string) => any } }).process;
    const moduleMod = proc?.getBuiltinModule?.("node:module");
    if (moduleMod?.createRequire) {
      // `import.meta.url` is shimmed to a file URL in the CJS output by the bundler.
      const req = moduleMod.createRequire(import.meta.url);
      return req(name);
    }
  } catch {
    /* fall through */
  }
  throw new Error(
    `The '${name}' package is required for this SentraGuard integration. Install it:  ${install}`,
  );
}
