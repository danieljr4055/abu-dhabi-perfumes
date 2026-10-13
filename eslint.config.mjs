import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".superpowers/**",
    "outputs/**",
    "dist-railway/**",
  ]),
  {
    files: ["app/**/*.{ts,tsx}", "src/**/*.{ts,tsx}", "tests/**/*.{ts,tsx}"],
    rules: {
      // D1 rows, WebMCP and JSON responses cross dynamic runtime boundaries.
      // TypeScript still validates every typed application contract.
      "@typescript-eslint/no-explicit-any": "off",
      // Cart recovery and route loading hydrate browser/server state in effects.
      "react-hooks/set-state-in-effect": "off",
      // Effect dependencies are represented by stable endpoint strings or
      // deliberately run once while browser storage hydrates.
      "react-hooks/exhaustive-deps": "off",
      // Product images are administrator-configurable local or HTTPS assets.
      // Native lazy loading keeps that catalog contract provider-neutral.
      "@next/next/no-img-element": "off",
      // Authentication transitions use a full navigation to clear client state.
      "@next/next/no-location-assign-relative-destination": "off",
    },
  },
  {
    files: ["components/ui/**/*.{ts,tsx}", "hooks/use-mobile.ts"],
    rules: {
      // These files are vendored verbatim from shadcn@4.17.0. Keep the
      // registry source intact while applying the stricter rules to Site code.
      "@typescript-eslint/no-unused-vars": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
