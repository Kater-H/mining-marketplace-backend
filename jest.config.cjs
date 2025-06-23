/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  modulePaths: ['<rootDir>'],
  moduleDirectories: ['node_modules', 'src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/types/**',
    '!src/index.ts',
    '!src/app.ts'
  ],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        isolatedModules: true,
        diagnostics: {
          ignoreCodes: [
            1343, // TS1343: The 'import.meta' meta-property is only allowed when the '--module' option is 'esnext' or 'system'.
            2304, // TS2304: Cannot find name 'X'.
            2307, // TS2307: Cannot find module 'X' or its corresponding type declarations.
            2339, // TS2339: Property 'X' does not exist on type 'Y'.
            2345, // TS2345: Argument of type 'X' is not assignable to parameter of type 'Y'.
            2554, // TS2554: Expected X arguments, but got Y.
            7016, // TS7016: Could not find a declaration file for module 'X'.
            7034  // TS7034: Variable 'X' implicitly has type 'any' in some locations where its type cannot be determined.
          ],
          warnOnly: true
        }
      }
    ]
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
}
