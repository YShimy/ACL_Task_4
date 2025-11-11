export default {
  // Keep the search space narrow: only the dedicated test directory is scanned.
  roots: ['<rootDir>/tests'],
  testEnvironment: 'jsdom',
  testMatch: ['**/*.test.jsx'],
  extensionsToTreatAsEsm: ['.jsx'],
  transform: {
    '^.+\\.(t|j)sx?$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' }, modules: false }],
        ['@babel/preset-react', { runtime: 'automatic' }],
        '@babel/preset-typescript'
      ]
    }]
  },
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': '<rootDir>/tests/styleMock.js'
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setupTests.js'],
  collectCoverage: false,  
};
