module.exports = {
  require: ['ts-node/register', 'test/setup.ts'],
  reporter: process.env.CI ? 'mocha-ctrf-json-reporter' : 'spec',
  exit: true,
  spec: ['test/**/*.js', 'test/**/*.ts']
}
