module.exports = {
  testEnvironment: 'node',
  clearMocks: true,
  restoreMocks: true,
  // tests/postgres needs a disposable database; run it with `npm run test:integration`.
  testPathIgnorePatterns: ['/node_modules/', '/tests/postgres/']
};
