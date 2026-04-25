/** @type {import('jest').Config} */
export default {
  testEnvironment: "node",
  roots: ["<rootDir>/tests", "<rootDir>/__tests__"],
  transform: {
    "^.+\\.mjs$": "babel-jest",
  },
  // Ignore the legacy CommonJS integration test that conflicts with the ESM .mjs test
  testPathIgnorePatterns: ["<rootDir>/tests/integration/scripts.integration.test.js"],
  moduleFileExtensions: ["js", "mjs", "cjs", "ts", "tsx", "json"],
  // Include .mjs and .cjs test files so our integration tests are discovered
  testMatch: ["**/*.test.[jt]s?(x)", "**/*.test.mjs", "**/*.test.cjs"],
  setupFilesAfterEnv: [],
  transformIgnorePatterns: ["/node_modules/(?!.*.mjs$)", ".pnp.[^/]+$"],
};
