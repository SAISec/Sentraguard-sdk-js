import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", "examples/**", "*.config.*", "coverage/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { process: "readonly", console: "readonly", URL: "readonly", fetch: "readonly" },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      // The universal build deliberately uses a guarded runtime require()
      // (createRequire/CJS) to load optional Node builtins + provider SDKs.
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
);
