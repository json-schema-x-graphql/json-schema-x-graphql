export default {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.js'],
  moduleNameMapper: {
    '\\.(css)$': '<rootDir>/src/__tests__/__mocks__/styleMock.js',
    '^@json-schema-x-graphql/core$': '<rootDir>/src/__tests__/__mocks__/coreMock.js',
  },
  transform: {
    '^.+\\.(jsx?|mjs)$': 'babel-jest',
  },
  transformIgnorePatterns: ['node_modules/(?!(@json-schema-x-graphql/core|@graphql-tools))'],
  globals: {
    'babel-jest': {
      useESM: true,
    },
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.test.{js,jsx}',
    '<rootDir>/src/**/*.test.{js,jsx}',
  ],
  moduleFileExtensions: ['js', 'jsx', 'json', 'mjs'],
};
