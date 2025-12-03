/**
 * Jest configuration for the Node converter package.
 * Uses ts-jest to compile TypeScript sources in ESM mode.
 */
const { defaults } = require('ts-jest/presets');

module.exports = {
  ...defaults,
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: '<rootDir>/tsconfig.json',
      },
    ],
  },
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
};
