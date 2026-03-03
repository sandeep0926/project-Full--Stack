export default {
    testEnvironment: 'node',
    setupFiles: ['dotenv/config'],
    testMatch: ['**/tests/**/*.test.js'],
    collectCoverageFrom: ['src/**/*.js', '!src/tests/**', '!src/utils/seeder.js'],
    coverageDirectory: 'coverage',
    verbose: true,
    forceExit: true,
    detectOpenHandles: true,
    testTimeout: 30000,
    // Disable default Babel transform; we rely on native Node ESM
    transform: {},
};
