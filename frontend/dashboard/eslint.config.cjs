// Flat ESLint config for ESLint v9+ (CommonJS variant for projects with "type": "module").
const path = require("path");
const tsPlugin = require("@typescript-eslint/eslint-plugin");
const tsParser = require("@typescript-eslint/parser");
const prettierPlugin = require("eslint-plugin-prettier");
const unusedImportsPlugin = require("eslint-plugin-unused-imports");
const reactHooksPlugin = require("eslint-plugin-react-hooks");

// Try to load GraphQL ESLint plugin, but make it optional
let graphqlPlugin = null;
let graphqlParser = null;
try {
  graphqlPlugin = require("@graphql-eslint/eslint-plugin");
  graphqlParser = graphqlPlugin.parser;
} catch (err) {
  console.warn("Warning: @graphql-eslint/eslint-plugin not found. GraphQL linting disabled.");
}

module.exports = [
  // TypeScript files
  {
    files: ["**/*.{ts,tsx,mjs}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: path.resolve(__dirname, "./tsconfig.json"),
        tsconfigRootDir: __dirname,
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      prettier: prettierPlugin,
      "unused-imports": unusedImportsPlugin,
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-explicit-any": "off",
      "prettier/prettier": "error",
      "unused-imports/no-unused-imports": "error",
      "space-in-parens": "error",
      "no-empty": "error",
      "no-multiple-empty-lines": "error",
      "no-irregular-whitespace": "error",
      strict: ["error", "never"],
      "linebreak-style": ["error", "unix"],
      quotes: ["error", "double", { avoidEscape: true }],
      semi: ["error", "always"],
      "prefer-const": "error",
      "space-before-function-paren": [
        "error",
        { anonymous: "always", named: "never", asyncArrow: "always" },
      ],
    },
  },

  // JS/TS files
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    plugins: {
      prettier: prettierPlugin,
      "unused-imports": unusedImportsPlugin,
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      "prettier/prettier": "error",
      "unused-imports/no-unused-imports": "error",
      "space-in-parens": "error",
      "no-empty": "error",
      "no-multiple-empty-lines": "error",
      "no-irregular-whitespace": "error",
      strict: ["error", "never"],
      "linebreak-style": ["error", "unix"],
      quotes: ["error", "double", { avoidEscape: true }],
      semi: ["error", "always"],
      "prefer-const": "error",
      "space-before-function-paren": [
        "error",
        { anonymous: "always", named: "never", asyncArrow: "always" },
      ],
    },
  },

  // GraphQL files (only if plugin is available)
  ...(graphqlPlugin && graphqlParser
    ? [
        {
          files: ["**/*.graphql", "**/*.gql"],
          languageOptions: {
            parser: graphqlParser,
          },
          plugins: { "@graphql-eslint": graphqlPlugin },
          rules: {
            ...graphqlPlugin.configs["schema-recommended"].rules,
          },
        },
      ]
    : []),
];
