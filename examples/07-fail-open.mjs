// Make checks non-fatal (fail-open) in one line.
//   node examples/07-fail-open.mjs
import { configure, check } from "@sentraguard/sdk";

configure({ onError: "allow" }); // or "block" for fail-closed
const r = await check("hello world");
if (r.reasons.includes("sentraguard-unreachable")) console.log("Backend unreachable — failed open.");
else console.log(r.blocked ? "Blocked: " + r.reason : "Allowed.");
