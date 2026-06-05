import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/cli.ts",
    "src/integrations/openai.ts",
    "src/integrations/anthropic.ts",
    "src/integrations/gemini.ts",
  ],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,
  target: "node18",
  outDir: "dist",
});
