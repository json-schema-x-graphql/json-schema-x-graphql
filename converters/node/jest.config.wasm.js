/**
 * @type {import('jest').Config}
 */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],

  // Define the specific test file to run with this configuration
  testMatch: ['<rootDir>/tests/wasm.test.ts'],

  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },

  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },

  // The default transformIgnorePatterns is ["/node_modules/", "\\.pnp\\.[^/]+$"].
  // The wasm-pack generated JS file is not in node_modules, so Jest tries to transform it.
  // However, it's already a valid ES module and doesn't need transformation. In fact,
  // transforming it can cause issues. This pattern tells Jest to leave it alone,
  // allowing the native Node.js ESM loader to handle it.
  transformIgnorePatterns: [
    '/node_modules/',
    '\\.pnp\\.[^/]+$',
    '<rootDir>/../../rust/pkg/json_schema_graphql_converter.js',
  ],
};
