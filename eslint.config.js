const tseslint = {
  parser: require("@typescript-eslint/parser"),
  plugin: require("@typescript-eslint/eslint-plugin"),
};

module.exports = [
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/coverage/**",
      "**/target/**",
      "converters/rust/pkg/**",
      "frontend/subgraph-composer/src/salvaged/wasm/**",
      "frontend/subgraph-composer/dist/**",
      "website/.next/**",
    ],
  },
  {
    files: ["converters/node/src/**/*.ts", "scripts/**/*.js", "scripts/**/*.ts"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      "no-console": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];
