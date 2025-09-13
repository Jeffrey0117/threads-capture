module.exports = {
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts"],
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  moduleFileExtensions: ["ts", "js"],
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts"],
  transformIgnorePatterns: ["node_modules/(?!nanoid)/"],
  extensionsToTreatAsEsm: [".ts"],
  globals: {
    "ts-jest": {
      useESM: true,
    },
  },
};
