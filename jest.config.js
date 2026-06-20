/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
        isolatedModules: true,
        tsconfig: {
          ignoreDeprecations: "6.0",
        },
      },
    ],
  },
  testMatch: ["<rootDir>/converters/node/src/**/*.test.ts"],
  testPathIgnorePatterns: [
    "<rootDir>/pkg/",
    "<rootDir>/converters/rust/pkg/",
    "<rootDir>/frontend/",
    "<rootDir>/external/",
    "<rootDir>/scripts/",
  ],
  modulePathIgnorePatterns: [
    "<rootDir>/pkg/",
    "<rootDir>/converters/rust/pkg/",
    "<rootDir>/frontend/",
    "<rootDir>/external/",
    "<rootDir>/scripts/",
  ],
};
