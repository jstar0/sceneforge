import tsParser from "@typescript-eslint/parser";

export default [
  {
    files: ["**/*.{ts,tsx,js}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: "latest", sourceType: "module" }
    },
    rules: {
      "no-var": "error",
      "prefer-const": "error",
      eqeqeq: ["error", "always"],
      "no-throw-literal": "error",
      "no-return-await": "error",
      "require-atomic-updates": "error"
    }
  },
  { ignores: ["dist/**", "node_modules/**"] }
];
