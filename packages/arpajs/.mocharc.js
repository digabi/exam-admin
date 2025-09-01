module.exports = {
  timeout: 5000,
  exit: true,
  spec: ['test/**/*.js', 'test/**/*.ts'],
  reporter: process.env.CI ? 'mocha-ctrf-json-reporter' : 'spec',
  loader: 'ts-node/esm',
  require: ['ts-node/register', 'tsconfig-paths/register', 'test/config.js']
}
