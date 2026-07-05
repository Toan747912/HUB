/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  setupFiles: ['<rootDir>/../jest.setup.ts'],
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: '<rootDir>/../tsconfig.test.json' }]
  },
  collectCoverageFrom: ['**/*.(t|j)s', '!**/*.spec.ts', '!**/*.module.ts', '!main.ts'],
  coverageThreshold: {
    global: {
      statements: 45,
      branches: 28,
      functions: 50,
      lines: 50
    }
  },
  testEnvironment: 'node',
  testTimeout: 60000
};
