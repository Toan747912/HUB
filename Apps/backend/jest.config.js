/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: ['src/**/*.js', '!src/server.js'],
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 30,
      functions: 45,
      lines: 70,
    },
  },
};
