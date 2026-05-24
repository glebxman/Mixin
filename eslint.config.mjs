// Flat ESLint config for the workspace root.
// Per-package ESLint configs (if any) are not affected and continue to take precedence
// when ESLint is invoked from within those packages.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  {
    ignores: [
      "node_modules",
      "**/node_modules",
      "dist",
      "**/dist",
      ".next",
      "**/.next",
      ".turbo",
      "**/.turbo",
      ".venv",
      "**/.venv",
      "**/*.tsbuildinfo",
      "pnpm-lock.yaml",
      "coverage",
      "**/coverage",
      "build",
      "**/build",
      "out",
      "**/out",
      "services/ai/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,jsx,mjs,cjs,ts,tsx}"],
    plugins: {
      react,
      "react-hooks": reactHooks,
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react-hooks/exhaustive-deps": "error",
    },
  },
];
