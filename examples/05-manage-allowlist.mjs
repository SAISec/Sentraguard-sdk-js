// Manage the AI allowlist + ML settings via a dashboard-login client.
//   SENTRAGUARD_SETUP_TOKEN=setup_xxx node examples/05-manage-allowlist.mjs
import { SentraGuard } from "@sentraguard/sdk";

const token = process.env.SENTRAGUARD_SETUP_TOKEN;
const sg = token ? await SentraGuard.fromDashboardLogin(token) : new SentraGuard();

console.log("Allowlist:");
for (const e of await sg.allowlist.list()) {
  console.log(`  [${e.enabled ? "on " : "off"}] ${e.hostPattern} (${e.platformId ?? "-"})`);
}
const s = await sg.allowlist.getSettings();
console.log(`ML settings: profile=${s.mlRiskProfile} ui=${s.mlBlockUiMode} policy=${s.orgUnknownSitePolicy}`);
